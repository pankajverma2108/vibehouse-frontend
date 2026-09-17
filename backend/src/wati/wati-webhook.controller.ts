import {
  Controller,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { parseWatiInbound, type WatiInboundRaw } from './wati-inbound.types';
import { WaServiceService } from './wa-service.service';

/**
 * Inbound WhatsApp webhook (heist1.1 — "San Fierro" v1.1).
 *
 * WATI is configured (per brand) to POST every received message here:
 *   https://api.thedailysocial.co.in/wati/webhook/tds?secret=<WATI_TDS_WEBHOOK_SECRET>
 *   https://api.thedailysocial.co.in/wati/webhook/buteak?secret=<WATI_BUTEAK_WEBHOOK_SECRET>
 *
 * WATI does not sign its webhooks, so we authenticate with a per-brand shared
 * secret embedded in the URL (same defensive posture as the eZee IP allowlist).
 *
 * We ACK 200 immediately and process in the BACKGROUND. The handler does a
 * multi-second LLM classify (+ Zoho + SQS), which exceeded WATI's webhook
 * delivery timeout — WATI then flagged the endpoint as "constantly failing" and
 * threatened to auto-disable it, even though our processing actually succeeded.
 * Acking first and running handleInbound detached fixes that. Idempotency is
 * handled by the wa_service_request row (deduped on the WATI message id).
 */
@Controller('wati/webhook')
@SkipThrottle()
export class WatiWebhookController {
  private readonly logger = new Logger(WatiWebhookController.name);

  constructor(private readonly waService: WaServiceService) {}

  @Post(':brand')
  @HttpCode(200) // WATI treats anything but 200 as a failed delivery and retries (was 201 → 125 retries).
  async inbound(
    @Param('brand') brandParam: string,
    @Query('secret') secret: string,
    @Req() req: any,
  ) {
    const brand = (brandParam || '').toUpperCase();
    if (brand !== 'TDS' && brand !== 'BUTEAK') {
      throw new UnauthorizedException();
    }
    if (!this.secretOk(brand, secret)) {
      this.logger.warn(`WATI webhook rejected: bad secret for brand=${brand}`);
      throw new UnauthorizedException();
    }

    let raw: WatiInboundRaw;
    try {
      raw = req.rawBody
        ? JSON.parse(req.rawBody.toString('utf8'))
        : (req.body ?? {});
    } catch {
      // Malformed body — ack so WATI doesn't retry; nothing to process.
      return { status: 'ok', ignored: 'bad_json' };
    }

    let msg: ReturnType<typeof parseWatiInbound>;
    try {
      msg = parseWatiInbound(raw);
    } catch {
      return { status: 'ok', ignored: 'unparseable' };
    }
    if (!msg) {
      return { status: 'ok', ignored: 'not_actionable' };
    }

    // Fire-and-forget: ACK WATI now, process the (slow) pipeline in the background.
    // The wa_service_request dedupe makes reprocessing safe if this ever runs twice.
    const actionable = msg;
    void this.waService.handleInbound(brand, actionable).catch((err) => {
      this.logger.error(
        `WATI inbound async handling failed (brand=${brand}, wa=${actionable.waId}): ${(err as Error).message}`,
      );
    });
    return { status: 'ok', accepted: true };
  }

  private secretOk(brand: string, provided: string | undefined): boolean {
    const expected = process.env[`WATI_${brand}_WEBHOOK_SECRET`];
    if (!expected || !provided) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
