import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TicketsService } from './tickets.service';

/**
 * SLA Watchdog — the durable, restart-safe replacement for the in-memory
 * setTimeout escalation chain in escalation_inspiration/.
 *
 * Every tick it asks the DB for tickets whose `next_deadline` has passed and
 * advances each one escalation step. Because all state (escalation_level,
 * next_deadline) lives in zoho_ticket_ref, a redeploy/crash loses nothing — the
 * next tick simply picks up whatever is due. No Redis keyspace events required;
 * this DB poll IS the durable backstop the launch plan calls for.
 *
 * Gating: runs only where workers run — when SQS_CONSUMERS_ENABLED=true (unless
 * SLA_WATCHDOG_ENABLED is explicitly 'false'). Set SLA_WATCHDOG_ENABLED=true to
 * force-enable independently.
 */
@Injectable()
export class SlaWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlaWatchdogService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly tickets: TicketsService) {}

  private get enabled(): boolean {
    if (process.env.SLA_WATCHDOG_ENABLED === 'true') return true;
    if (process.env.SLA_WATCHDOG_ENABLED === 'false') return false;
    return process.env.SQS_CONSUMERS_ENABLED === 'true';
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('SLA watchdog disabled (set SLA_WATCHDOG_ENABLED=true to enable).');
      return;
    }
    const intervalMs = Number(process.env.SLA_WATCHDOG_INTERVAL_MS ?? 30_000);
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(`SLA watchdog started (every ${intervalMs}ms).`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One sweep. Guarded so overlapping ticks can't double-process. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.tickets.findDueTickets(50);
      if (due.length === 0) return;
      this.logger.log(`Watchdog: ${due.length} ticket(s) due for escalation`);
      for (const t of due) {
        try {
          await this.tickets.advanceEscalation(t.id);
        } catch (err) {
          this.logger.error(
            `Watchdog: failed to advance ticket ${t.id}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Watchdog tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
