import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

/**
 * FlowLogService — per-ticket flow trace across every module (webhook → classify →
 * identity → assign → ticket → zoho → notify → escalate → ack/complete).
 *
 * Design rules:
 *  - **Never breaks the flow.** Every write is wrapped; a logging failure is swallowed
 *    (warn only) so observability can't take down the ticketing pipeline.
 *  - `trace_id` groups a whole request; `ticket_id` is stamped once known. Pre-ticket
 *    steps are back-linked via `linkTicket`, so the flow is queryable ticket-wise.
 *  - Store summaries only — no secrets/tokens.
 */
@Injectable()
export class FlowLogService {
  private readonly logger = new Logger(FlowLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Record one module step. Fire-safe: returns void, never throws. */
  async log(entry: {
    trace_id: string;
    ticket_id?: string | null;
    brand?: string | null;
    module: string;
    input?: string | null;
    output?: string | null;
    status?: 'OK' | 'ERROR' | 'SKIP';
    error?: string | null;
    latency_ms?: number | null;
  }): Promise<void> {
    try {
      await this.prisma.flow_log.create({
        data: {
          id: uuidv4(),
          trace_id: entry.trace_id,
          ticket_id: entry.ticket_id ?? null,
          brand: entry.brand ?? null,
          module: entry.module,
          input: trunc(entry.input),
          output: trunc(entry.output),
          status: entry.status ?? 'OK',
          error: trunc(entry.error),
          latency_ms: entry.latency_ms ?? null,
        },
      });
    } catch (e) {
      this.logger.warn(`flow_log write failed (${entry.module}): ${(e as Error).message}`);
    }
  }

  /**
   * Time an async operation and log it (OK with output, or ERROR with the message).
   * Re-throws the original error so control flow is unchanged.
   */
  async timed<T>(
    ctx: { trace_id: string; ticket_id?: string | null; brand?: string | null; module: string; input?: string | null },
    fn: () => Promise<T>,
    describe?: (result: T) => string,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      await this.log({
        ...ctx,
        output: describe ? describe(result) : undefined,
        latency_ms: Date.now() - start,
        status: 'OK',
      });
      return result;
    } catch (e) {
      await this.log({ ...ctx, error: (e as Error).message, latency_ms: Date.now() - start, status: 'ERROR' });
      throw e;
    }
  }

  /** Back-link all steps of a trace to the ticket once it exists. Fire-safe. */
  async linkTicket(traceId: string, ticketId: string): Promise<void> {
    try {
      await this.prisma.flow_log.updateMany({
        where: { trace_id: traceId, ticket_id: null },
        data: { ticket_id: ticketId },
      });
    } catch (e) {
      this.logger.warn(`flow_log linkTicket failed: ${(e as Error).message}`);
    }
  }
}

/** Keep individual fields bounded so a stray large payload can't bloat the table. */
function trunc(v?: string | null): string | null {
  if (v == null) return null;
  return v.length > 2000 ? v.slice(0, 2000) + '…' : v;
}
