import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminStaffRolesService } from '../staff-roles/admin-staff-roles.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

/** Ticket statuses that still have an escalation timer / staff buttons hanging off the assignee. */
const LIVE_TICKET_STATUSES = ['OPEN', 'PENDING', 'IN_PROGRESS'];

/**
 * Admin CRUD for the `staff` roster (San Fierro / sanfierroheist1).
 * Lets ops populate staff name/role/phone/department per property — the same
 * data the ticketing pipeline uses for least-loaded assignment + escalation.
 */
@Injectable()
export class AdminStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffRoles: AdminStaffRolesService,
  ) {}

  list(propertyId?: string, includeInactive = false) {
    return this.prisma.staff.findMany({
      where: {
        ...(propertyId ? { property_id: propertyId } : {}),
        ...(includeInactive ? {} : { is_active: true }),
      },
      orderBy: [{ property_id: 'asc' }, { department: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateStaffDto) {
    const property = await this.prisma.properties.findUnique({ where: { id: dto.property_id } });
    if (!property) throw new NotFoundException('property_id not found');
    const role = await this.staffRoles.assertActiveRole(dto.role);
    try {
      return await this.prisma.staff.create({
        data: {
          id: uuidv4(),
          property_id: dto.property_id,
          name: dto.name,
          phone: dto.phone,
          role,
          department: dto.department,
          is_available: dto.is_available ?? false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A staff member with this phone already exists at this property');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.getOrThrow(id);
    const role = dto.role !== undefined ? await this.staffRoles.assertActiveRole(dto.role) : undefined;
    // Deactivating an account also takes them off shift: an inactive staff must never
    // stay `is_available` (and thus assignable / counted on-duty). Mirrors deactivate()
    // and wins over any is_available also sent in the same request.
    const forceOffShift = dto.is_active === false ? { is_available: false } : {};
    try {
      return await this.prisma.staff.update({
        where: { id },
        data: { ...dto, ...(role !== undefined && { role }), ...forceOffShift, updated_at: new Date() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Another staff member at this property already uses this phone');
      }
      throw e;
    }
  }

  /** Convenience for the WhatsApp/web login-logout toggle (on/off shift). */
  async setAvailability(id: string, isAvailable: boolean) {
    await this.getOrThrow(id);
    return this.prisma.staff.update({
      where: { id },
      data: { is_available: isAvailable, updated_at: new Date() },
    });
  }

  /** Soft-delete: keep the row (tickets reference it) but take them off the roster. */
  async deactivate(id: string) {
    await this.getOrThrow(id);
    return this.prisma.staff.update({
      where: { id },
      data: { is_active: false, is_available: false, updated_at: new Date() },
    });
  }

  /**
   * Undo a "Remove" — put a deactivated staff member back on the roster.
   *
   * They come back **off shift** (`is_available: false`): being on the roster is an admin
   * decision, being on shift is theirs — they log in from WhatsApp, same as any other day.
   * Their role must still exist in the catalog (it may have been retired while they were
   * off), and `active_ticket_count` is re-derived from live tickets, since the counter
   * drifts while a ticket completes/reassigns during their absence.
   */
  async restore(id: string) {
    const staff = await this.getOrThrow(id);
    if (staff.is_active) {
      throw new ConflictException(`${staff.name} is already on the roster`);
    }
    try {
      await this.staffRoles.assertActiveRole(staff.role);
    } catch {
      throw new ConflictException(
        `${staff.name}'s role "${staff.role}" is no longer in the staff-role catalog. Restore the role, or edit them onto a current role first.`,
      );
    }

    const liveTickets = await this.prisma.zoho_ticket_ref.count({
      where: { assigned_staff_id: id, status: { in: LIVE_TICKET_STATUSES } },
    });

    return this.prisma.staff.update({
      where: { id },
      data: {
        is_active: true,
        is_available: false,
        active_ticket_count: liveTickets,
        updated_at: new Date(),
      },
    });
  }

  /**
   * What would a hard delete of this staff member entail? Lets the confirm dialog say
   * exactly what happens instead of guessing, and lets the FE show a reassign picker
   * only when there's live work to move.
   */
  async deletionPreflight(id: string) {
    const target = await this.getOrThrow(id);
    const [liveTickets, totalTickets] = await Promise.all([
      this.prisma.zoho_ticket_ref.count({
        where: { assigned_staff_id: id, status: { in: LIVE_TICKET_STATUSES } },
      }),
      this.prisma.zoho_ticket_ref.count({ where: { assigned_staff_id: id } }),
    ]);
    const reassignCandidates = liveTickets
      ? await this.prisma.staff.findMany({
          where: { property_id: target.property_id, is_active: true, id: { not: id } },
          select: { id: true, name: true, role: true, department: true, active_ticket_count: true },
          orderBy: [{ active_ticket_count: 'asc' }, { name: 'asc' }],
        })
      : [];

    return {
      staff_id: id,
      name: target.name,
      can_delete: liveTickets === 0,
      live_tickets: liveTickets,
      historic_tickets: totalTickets - liveTickets,
      requires_reassign: liveTickets > 0,
      reassign_candidates: reassignCandidates,
    };
  }

  /**
   * Permanently remove a staff row.
   *
   * Finished tickets are NOT a blocker: `assigned_staff_name` pins the assignee's name on
   * the ticket at assignment (and Zoho Desk holds `cf_handled_by` / `cf_assigned_staff`),
   * so we can null the FK and still show who worked it. What we must not strand is LIVE
   * work — an open ticket has an escalation timer and staff WhatsApp buttons hanging off
   * its assignee. So: live tickets must first be reassigned (`reassignTo`) or resolved;
   * everything else is detached and the row is deleted.
   */
  async hardDelete(id: string, reassignTo?: string) {
    const target = await this.getOrThrow(id);

    const liveWhere = {
      assigned_staff_id: id,
      status: { in: LIVE_TICKET_STATUSES },
    };
    const liveCount = await this.prisma.zoho_ticket_ref.count({ where: liveWhere });

    let successor: { id: string; name: string } | null = null;
    if (liveCount > 0) {
      if (!reassignTo) {
        throw new ConflictException(
          `${target.name} still has ${liveCount} open ticket(s). Reassign them to another staff member (or wait for them to be completed) before deleting.`,
        );
      }
      if (reassignTo === id) {
        throw new BadRequestException('Cannot reassign tickets to the staff member being deleted');
      }
      const candidate = await this.prisma.staff.findUnique({ where: { id: reassignTo } });
      if (!candidate) throw new NotFoundException('reassign_to staff member not found');
      if (candidate.property_id !== target.property_id) {
        throw new BadRequestException('reassign_to must be a staff member at the same property');
      }
      if (!candidate.is_active) {
        throw new BadRequestException('reassign_to must be an active staff member');
      }
      successor = { id: candidate.id, name: candidate.name };
    }

    await this.prisma.$transaction(async (tx) => {
      if (successor) {
        // Move the live work over, name snapshot included, and carry the load with it so
        // least-loaded assignment stays honest.
        await tx.zoho_ticket_ref.updateMany({
          where: liveWhere,
          data: { assigned_staff_id: successor.id, assigned_staff_name: successor.name },
        });
        await tx.staff.update({
          where: { id: successor.id },
          data: { active_ticket_count: { increment: liveCount } },
        });
      }

      // Detach the finished tickets — assigned_staff_name keeps the attribution.
      await tx.zoho_ticket_ref.updateMany({
        where: { assigned_staff_id: id },
        data: { assigned_staff_id: null },
      });

      await tx.staff.delete({ where: { id } });
    });

    return {
      message: 'Staff member permanently deleted',
      reassigned_tickets: successor ? liveCount : 0,
      reassigned_to: successor?.name ?? null,
    };
  }

  private async getOrThrow(id: string) {
    const row = await this.prisma.staff.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Staff member not found');
    return row;
  }
}
