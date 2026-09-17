import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminStaffRolesService } from '../staff-roles/admin-staff-roles.service';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import { CreateSlaConfigDto } from './dto/create-sla-config.dto';
import { UpdateSlaConfigDto } from './dto/update-sla-config.dto';
import { UpsertEscalationLevelDto } from './dto/upsert-escalation-level.dto';

/**
 * AdminSlaConfigService — admin CRUD for the ticketing knobs that were previously
 * seed-only.
 *
 *  - **sla_config** is GLOBAL and keyed by `task_category` ALONE (one row per class,
 *    T-1 through T4 — see src/tickets/task-classes.ts). The turn-around time depends
 *    only on the task class, never on the department (a T0 is 10 min whether
 *    Housekeeping delivers a towel or Reception sends an invoice) nor on priority.
 *    Department is decided separately and only drives assignment.
 *  - **escalation_levels** stays PER-PROPERTY in the schema, but the config is the
 *    same role at every property (the engine resolves that role to the ticket's own
 *    property at fire time). So writes fan out to every property; reads collapse to
 *    one entry per level.
 */
@Injectable()
export class AdminSlaConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffRoles: AdminStaffRolesService,
  ) {}

  // ─── SLA CONFIG (global, one row per task_category) ──────────────────────────

  /** List the SLA timing for every task class (T-1 … T4). */
  listSlaConfig() {
    return this.prisma.sla_config.findMany({ orderBy: { task_category: 'asc' } });
  }

  async createSlaConfig(dto: CreateSlaConfigDto) {
    const existing = await this.prisma.sla_config.findUnique({
      where: { task_category: dto.task_category },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `SLA config for ${dto.task_category} already exists — update it instead.`,
      );
    }

    return this.prisma.sla_config.create({
      data: {
        id: uuidv4(),
        task_category: dto.task_category,
        completion_timeout_min: dto.completion_timeout_min,
        ack_percent: dto.ack_percent,
        escalation_gap_min: dto.escalation_gap_min,
        snooze_percent: dto.snooze_percent ?? 100,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateSlaConfig(taskCategory: string, dto: UpdateSlaConfigDto) {
    const current = await this.prisma.sla_config.findUnique({
      where: { task_category: taskCategory },
    });
    if (!current) throw new NotFoundException(`No SLA config for ${taskCategory}.`);

    return this.prisma.sla_config.update({
      where: { task_category: taskCategory },
      data: {
        ...(dto.completion_timeout_min !== undefined && { completion_timeout_min: dto.completion_timeout_min }),
        ...(dto.ack_percent !== undefined && { ack_percent: dto.ack_percent }),
        ...(dto.escalation_gap_min !== undefined && { escalation_gap_min: dto.escalation_gap_min }),
        ...(dto.snooze_percent !== undefined && { snooze_percent: dto.snooze_percent }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      },
    });
  }

  async deleteSlaConfig(taskCategory: string) {
    const res = await this.prisma.sla_config.deleteMany({ where: { task_category: taskCategory } });
    if (res.count === 0) throw new NotFoundException(`No SLA config for ${taskCategory}.`);
    return { deleted: true };
  }

  // ─── ESCALATION LEVELS (per hotel / property) ────────────────────────────────

  /** One hotel's escalation ladder (level → role), ordered by level. */
  async listEscalationLevels(propertyId: string, actor: AdminJwtPayload) {
    this.assertPropertyAccess(actor, propertyId);
    return this.prisma.escalation_levels.findMany({
      where: { property_id: propertyId },
      orderBy: { level: 'asc' },
    });
  }

  async upsertEscalationLevel(
    propertyId: string,
    level: number,
    dto: UpsertEscalationLevelDto,
    actor: AdminJwtPayload,
  ) {
    this.assertPropertyAccess(actor, propertyId);
    if (!Number.isInteger(level) || level < 1 || level > 9) {
      throw new BadRequestException('level must be an integer between 1 and 9.');
    }
    const role = await this.assertRoleResolvable(dto.role, dto.lookup_source);

    return this.prisma.escalation_levels.upsert({
      where: { property_id_level: { property_id: propertyId, level } },
      update: {
        role,
        lookup_source: dto.lookup_source,
        ...(dto.channel !== undefined && { channel: dto.channel }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
      create: {
        id: uuidv4(),
        property_id: propertyId,
        level,
        role,
        lookup_source: dto.lookup_source,
        channel: dto.channel ?? 'WATI',
        is_active: dto.is_active ?? true,
      },
    });
  }

  async deleteEscalationLevel(propertyId: string, level: number, actor: AdminJwtPayload) {
    this.assertPropertyAccess(actor, propertyId);
    const res = await this.prisma.escalation_levels.deleteMany({
      where: { property_id: propertyId, level },
    });
    if (res.count === 0) {
      throw new NotFoundException(`No escalation level ${level} for property ${propertyId}.`);
    }
    return { deleted: true };
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  /** The admin must be authorised on the target hotel (property). */
  private assertPropertyAccess(actor: AdminJwtPayload, propertyId: string) {
    if (!actor.property_ids?.includes(propertyId)) {
      throw new ForbiddenException(`You are not authorised on property ${propertyId}.`);
    }
  }

  /**
   * Sanity-check that the configured escalation target is resolvable (so the admin
   * can't point a level at a role that will never match anyone), and return the
   * canonical role name to store.
   *   - staff       → the role must exist (and be active) in the staff_roles catalog
   *   - admin_users → the role must be an existing admin_roles.name
   */
  private async assertRoleResolvable(role: string, lookupSource: string): Promise<string> {
    if (lookupSource === 'staff') {
      return this.staffRoles.assertActiveRole(role);
    }
    // admin_users
    const exists = await this.prisma.admin_roles.findFirst({
      where: { name: role },
      select: { id: true },
    });
    if (!exists) {
      throw new BadRequestException(
        `lookup_source=admin_users but no admin role named "${role}" exists.`,
      );
    }
    return role;
  }
}
