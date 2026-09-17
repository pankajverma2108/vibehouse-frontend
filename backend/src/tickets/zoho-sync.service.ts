import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ZohoDeskService } from '../zoho-desk/zoho-desk.service';

/**
 * Zoho → our-system reverse-sync poller.
 *
 * Zoho Desk (on this plan) has no webhook/custom-function action that can call our
 * endpoint, so instead of a push we PULL: every tick we ask Zoho for the current
 * status of our still-open tickets and reflect any change a staff/agent made
 * directly inside Zoho (In Progress → acknowledge, Closed/Resolved → complete).
 *
 * Gating: OFF unless ZOHO_SYNC_ENABLED='true' AND Zoho Desk creds are present.
 * Set ZOHO_SYNC_ENABLED=true only where you want the pull to run (prod), so dev
 * never polls the shared Zoho org against a different DB. Interval = 60s default.
 */
@Injectable()
export class ZohoSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ZohoSyncService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly tickets: TicketsService,
    private readonly zohoDesk: ZohoDeskService,
  ) {}

  private get enabled(): boolean {
    if (process.env.ZOHO_SYNC_ENABLED !== 'true' || !this.zohoDesk.isConfigured()) return false;
    // The ZohoWebhookController (webhooks/zoho-desk) is the PUSH-based reverse-sync path.
    // Once that webhook is configured in Zoho Desk, this pull loop is redundant AND
    // expensive: every tick issues one GET /tickets/{id} per still-open ticket (up to 50)
    // every 60s ≈ 72k GET calls/day — which is exactly what was exhausting the Zoho API
    // credit budget (a single GET dwarfing every other call). So when the webhook secret is
    // present we skip polling entirely. Set ZOHO_SYNC_FORCE_POLL=true to re-enable the pull
    // as a manual backstop if a webhook delivery issue is ever suspected.
    if (process.env.ZOHO_WEBHOOK_SECRET && process.env.ZOHO_SYNC_FORCE_POLL !== 'true') {
      return false;
    }
    return true;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      const reason =
        process.env.ZOHO_WEBHOOK_SECRET && process.env.ZOHO_SYNC_ENABLED === 'true'
          ? 'webhook is configured (push-based) — polling skipped to conserve Zoho API credits; set ZOHO_SYNC_FORCE_POLL=true to force the pull backstop'
          : 'needs ZOHO_SYNC_ENABLED=true + Zoho Desk creds';
      this.logger.log(`Zoho reverse-sync disabled (${reason}).`);
      return;
    }
    const intervalMs = Number(process.env.ZOHO_SYNC_INTERVAL_MS ?? 60_000);
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(`Zoho reverse-sync started (every ${intervalMs}ms).`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One sweep. Guarded so overlapping ticks can't double-process. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const { checked, changed } = await this.tickets.syncOpenTicketsFromZoho(50);
      if (changed > 0) {
        this.logger.log(`Zoho reverse-sync: ${changed} ticket(s) synced (of ${checked} checked)`);
      }
    } catch (err) {
      this.logger.error(`Zoho reverse-sync tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
