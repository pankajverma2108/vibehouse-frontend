import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Zoho Desk → our system status sync (the inbound half of the bidirectional
 * mirror). So when an agent manually Closes/Resolves a ticket *inside Zoho*,
 * we stop our SLA timers + escalation ladder instead of climbing it.
 *
 * Configure in Zoho Desk under **Setup → Developer Space → Webhooks → New Webhook**
 * (the modern webhook; the old "Automation → Workflow → Webhook action" is retired).
 * That webhook CANNOT send custom headers and CANNOT reshape the body, so:
 *
 *   URL to notify: https://api.thedailysocial.co.in/webhooks/zoho-desk?token=<ZOHO_WEBHOOK_SECRET>
 *     (auth rides in the query string because headers aren't configurable there)
 *   Choose Event:  module = Tickets, event = Ticket Update (fires on field changes)
 *
 * Zoho posts its own fixed payload — a JSON **array** with ticket data under `payload`:
 *   [{ "eventType":"Ticket_Update",
 *      "payload":{ "id":"31138...","ticketNumber":"1161","status":"Closed" },
 *      "prevState":{ "status":"Open", ... } }]
 * We also still accept the legacy flat shape { ticketId, ticketNumber, status } and a
 * header token, so a Deluge custom-function sender keeps working too.
 *
 * Status mapping:
 *   "In Progress"          → acknowledge()  (holds escalation, arms completion timer)
 *   "Closed" | "Resolved"  → complete()     (stops timers, notifies the guest)
 *
 * Loop-safe: acknowledge()/complete() are no-ops once the local ticket is already
 * IN_PROGRESS/COMPLETED, so our own outbound status PATCH can't ping-pong.
 */
@Controller('webhooks/zoho-desk')
export class ZohoWebhookController {
  private readonly logger = new Logger(ZohoWebhookController.name);

  constructor(
    private readonly tickets: TicketsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verification probe. When you Save the webhook, Zoho Desk first sends a GET
   * (and, failing that, a POST) to the callback URL and requires a 200 OK — else
   * it refuses with "invalid Callback URL". This performs no action and touches no
   * data, so it needs no auth. If Zoho passes a challenge query param we echo it.
   */
  @Get()
  @HttpCode(200)
  verifyRoot(@Query() query: Record<string, string>) {
    return this.verify(query);
  }

  @Get(':token')
  @HttpCode(200)
  verifyPath(@Query() query: Record<string, string>) {
    return this.verify(query);
  }

  private verify(query: Record<string, string>) {
    // Some Zoho flows expect a challenge string echoed back to prove ownership.
    const challenge = query?.challenge ?? query?.hookToken ?? query?.crc_token;
    return challenge ? { challenge } : { ok: true };
  }

  // Two routes, same handler: query/header token (…/zoho-desk?token=) and a
  // path token (…/zoho-desk/<secret>) for Zoho editions that reject query strings.
  @Post()
  @HttpCode(200)
  async handleRoot(
    @Headers('x-webhook-token') headerToken: string | undefined,
    @Query('token') queryToken: string | undefined,
    @Body() body: unknown,
  ) {
    return this.handle(queryToken ?? headerToken, body);
  }

  @Post(':token')
  @HttpCode(200)
  async handlePath(
    @Param('token') pathToken: string | undefined,
    @Headers('x-webhook-token') headerToken: string | undefined,
    @Query('token') queryToken: string | undefined,
    @Body() body: unknown,
  ) {
    return this.handle(pathToken ?? queryToken ?? headerToken, body);
  }

  private async handle(
    token: string | undefined,
    body: unknown,
  ): Promise<{ ok: boolean; action?: string; reason?: string; count?: number }> {
    const secret = process.env.ZOHO_WEBHOOK_SECRET;
    // Fail closed: without a configured secret the endpoint stays inert (rejects),
    // so it can be deployed before the Zoho webhook + secret are set up.
    if (!secret) {
      this.logger.warn('Zoho webhook hit but ZOHO_WEBHOOK_SECRET is not set — ignoring');
      return { ok: false, reason: 'not_configured' };
    }
    // Token arrives via path, query param, or header (see the two routes above).
    if (token !== secret) throw new UnauthorizedException('bad webhook token');

    const events = this.normalize(body);
    if (events.length === 0) return { ok: false, reason: 'missing_ticket_ref' };

    let handled = 0;
    let lastAction = 'ignored';
    for (const ev of events) {
      const zohoId = ev.ticketId?.toString().trim();
      const ticketNumber = ev.ticketNumber?.toString().trim();
      const status = (ev.status ?? '').toString().trim().toLowerCase();
      if (!zohoId && !ticketNumber) continue;

      const ticket = await this.prisma.zoho_ticket_ref.findFirst({
        where: zohoId ? { zoho_ticket_id: zohoId } : { zoho_ticket_id: ticketNumber },
        select: { id: true, status: true },
      });
      if (!ticket) {
        this.logger.warn(`Zoho webhook: no local ticket for zohoId=${zohoId ?? ticketNumber}`);
        continue;
      }

      try {
        if (status === 'in progress') {
          await this.tickets.acknowledge(ticket.id);
          this.logger.log(`Zoho→sync: ${ticket.id} acknowledged (Zoho "In Progress")`);
          handled++;
          lastAction = 'acknowledge';
        } else if (status === 'closed' || status === 'resolved') {
          await this.tickets.complete(ticket.id);
          this.logger.log(`Zoho→sync: ${ticket.id} completed (Zoho "${ev.status}")`);
          handled++;
          lastAction = 'complete';
        } else {
          this.logger.debug(`Zoho→sync: ${ticket.id} unmapped_status:${status} — ignored`);
        }
      } catch (err) {
        this.logger.error(`Zoho webhook action failed for ${ticket.id}: ${(err as Error).message}`);
        return { ok: false, reason: 'action_error' };
      }
    }

    return { ok: true, action: lastAction, count: handled };
  }

  /**
   * Flatten whatever Zoho (or a legacy sender) posted into a list of
   * { ticketId, ticketNumber, status } events. Handles:
   *  - native array:  [{ payload: { id, ticketNumber, status } }, ...]
   *  - native object: { payload: { id, ticketNumber, status } }
   *  - legacy flat:   { ticketId, ticketNumber, status }
   */
  private normalize(body: unknown): NormalizedEvent[] {
    const entries = Array.isArray(body) ? body : body ? [body] : [];
    const out: NormalizedEvent[] = [];
    for (const raw of entries) {
      if (!raw || typeof raw !== 'object') continue;
      const rec = raw as Record<string, unknown>;
      const p = (rec.payload as Record<string, unknown> | undefined) ?? rec;
      const ticketId = (p.id ?? rec.ticketId) as string | number | undefined;
      const ticketNumber = (p.ticketNumber ?? rec.ticketNumber) as string | number | undefined;
      const status = (p.status ?? rec.status) as string | undefined;
      if (ticketId === undefined && ticketNumber === undefined && status === undefined) continue;
      out.push({ ticketId, ticketNumber, status });
    }
    return out;
  }
}

interface NormalizedEvent {
  ticketId?: string | number;
  ticketNumber?: string | number;
  status?: string;
}
