import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';

/**
 * Brand-wide catalog of staff role types. Lets ops add a new role (e.g. SUPERVISOR)
 * without a re-seed / code change. Both the staff roster (`/admin/staff`) and the
 * escalation ladder (`/admin/escalation-levels`) validate `role` (for staff lookups)
 * against this catalog, so a typo/casing mismatch can't silently page nobody.
 */
@Injectable()
export class AdminStaffRolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Canonical form: trim, upper-case, collapse internal whitespace/dashes to a single
   * underscore. "Night Supervisor" → "NIGHT_SUPERVISOR". Rejects anything left with
   * chars outside A–Z 0–9 _.
   */
  static normalizeName(raw: string): string {
    const name = (raw ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!/^[A-Z0-9_]{2,30}$/.test(name)) {
      throw new BadRequestException(
        'Role name must be 2–30 chars of letters, digits, spaces or dashes (stored as UPPER_SNAKE).',
      );
    }
    return name;
  }

  list(includeInactive = false) {
    return this.prisma.staff_roles.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateStaffRoleDto) {
    const name = AdminStaffRolesService.normalizeName(dto.name);
    const existing = await this.prisma.staff_roles.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(`Role "${name}" already exists.`);
    }
    return this.prisma.staff_roles.create({
      data: {
        id: uuidv4(),
        name,
        label: dto.label?.trim() || null,
      },
    });
  }

  async update(name: string, dto: UpdateStaffRoleDto) {
    const key = AdminStaffRolesService.normalizeName(name);
    await this.getOrThrow(key);
    return this.prisma.staff_roles.update({
      where: { name: key },
      data: {
        ...(dto.label !== undefined && { label: dto.label?.trim() || null }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      },
    });
  }

  /** Soft-retire: keep the row (existing staff/ladder still reference it) but hide it
   * from pickers and block new staff from being created with it. */
  async deactivate(name: string) {
    const key = AdminStaffRolesService.normalizeName(name);
    await this.getOrThrow(key);
    return this.prisma.staff_roles.update({
      where: { name: key },
      data: { is_active: false, updated_at: new Date() },
    });
  }

  /**
   * Assert a role name exists in the catalog and is active — used by the staff roster
   * and the escalation-ladder validator. Returns the canonical name.
   */
  async assertActiveRole(rawName: string): Promise<string> {
    const name = AdminStaffRolesService.normalizeName(rawName);
    const row = await this.prisma.staff_roles.findUnique({ where: { name } });
    if (!row) {
      throw new BadRequestException(
        `Unknown staff role "${name}". Add it via /admin/staff-roles first.`,
      );
    }
    if (!row.is_active) {
      throw new BadRequestException(`Staff role "${name}" is inactive.`);
    }
    return name;
  }

  private async getOrThrow(name: string) {
    const row = await this.prisma.staff_roles.findUnique({ where: { name } });
    if (!row) throw new NotFoundException(`Role "${name}" not found.`);
    return row;
  }
}
