import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { toIstString } from '../../common/utils/time.util';

/**
 * Admin view of EVERY inbound WhatsApp conversation — not just the ones that became
 * tickets. Each inbound guest message is a `wa_service_request` row (id == the flow
 * log's trace_id), so the list is the conversation log and the trace is the per-row
 * flow log (webhook → identity → classify → route → reply), including the routes that
 * only reply (greeting / status-check / feedback) and never open a ticket.
 */
@Controller('admin/conversations')
@UseGuards(AdminJwtGuard)
export class AdminConversationsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Recent conversations, newest first. Optional filters: intent, status, wa_id, brand. */
  @Get()
  async list(
    @Query('intent') intent?: string,
    @Query('status') status?: string,
    @Query('wa_id') waId?: string,
    @Query('brand') brand?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const rows = await this.prisma.wa_service_request.findMany({
      where: {
        ...(intent ? { intent } : {}),
        ...(status ? { status } : {}),
        ...(waId ? { wa_id: waId } : {}),
        ...(brand ? { brand: brand.toUpperCase() } : {}),
      },
      orderBy: { created_at: 'desc' },
      take,
      select: {
        id: true,
        brand: true,
        wa_id: true,
        raw_text: true,
        intent: true,
        department: true,
        task_category: true,
        request_type: true,
        status: true,
        ticket_id: true,
        created_at: true,
      },
    });
    return rows.map((r) => ({ ...r, created_at_ist: toIstString(r.created_at) }));
  }

  /**
   * Full module-by-module trace for one conversation, oldest-first. `:id` is the
   * conversation id (== trace_id); also matches ticket_id so a ticketed conversation
   * resolves either way. Same shape as GET /admin/tickets/:id/flow-log.
   */
  @Get(':id/flow-log')
  async flowLog(@Param('id') id: string) {
    const rows = await this.prisma.flow_log.findMany({
      where: { OR: [{ trace_id: id }, { ticket_id: id }] },
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
    return rows.map((r) => ({ ...r, created_at_ist: toIstString(r.created_at) }));
  }
}
