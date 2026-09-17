import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { toIstString } from '../common/utils/time.util';

/**
 * Admin/ops ticket actions for Phase 1.
 *
 * Acknowledge/complete here STOP the escalation ladder (the watchdog skips
 * tickets that aren't OPEN/PENDING). In Phase 2 staff will also be able to do
 * this by replying on WhatsApp via the inbound WATI webhook; for now ops drives
 * it from the dashboard.
 *
 * Guarded by AdminJwtGuard only (any authenticated admin). A finer-grained
 * `tickets.manage` permission can be added once it's seeded into admin_roles.
 */
@Controller('admin/tickets')
@UseGuards(AdminJwtGuard)
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Query('status') status?: string, @Query('property_id') propertyId?: string) {
    return this.prisma.zoho_ticket_ref.findMany({
      where: {
        ticket_type: 'SERVICE_REQUEST',
        ...(status ? { status } : {}),
        ...(propertyId
          ? { ezee_booking_cache: { property_id: propertyId } }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.prisma.zoho_ticket_ref.findUnique({
      where: { id },
      include: { staff: true, guests: { select: { name: true, phone: true } } },
    });
  }

  /**
   * Full module-by-module flow trace for a ticket (webhook → classify → identity →
   * assign → ticket → zoho → notify → escalate → ack/complete), ordered oldest-first.
   * Matches on ticket_id (pre-ticket steps are back-linked) or trace_id as a fallback.
   */
  @Get(':id/flow-log')
  async flowLog(@Param('id') id: string) {
    const rows = await this.prisma.flow_log.findMany({
      where: { OR: [{ ticket_id: id }, { trace_id: id }] },
      orderBy: { created_at: 'asc' },
      select: {
        module: true,
        input: true,
        output: true,
        status: true,
        error: true,
        latency_ms: true,
        created_at: true,
      },
    });
    // created_at is UTC; also expose the exact IST trigger time for ops.
    return rows.map((r) => ({ ...r, created_at_ist: toIstString(r.created_at) }));
  }

  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string) {
    return this.tickets.acknowledge(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.tickets.complete(id);
  }
}
