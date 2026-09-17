import { Injectable, Logger } from '@nestjs/common';
import { toIndianMsisdn } from '../common/utils/phone.util';
import { flattenTemplateParams } from '../common/utils/whatsapp-param.util';
import { brandDisplayName } from '../common/property-resolver';

/**
 * Standard guest reassurance when a request is routed to a human (Reception)
 * rather than answered by the bot — used both when no department staff are
 * available and when the classifier can't safely handle a message on its own.
 * Sent as a free-text session message (the guest is inside the 24h window), so
 * it needs NO approved WATI template.
 */
export const GUEST_RECEPTION_ACK =
  '✅ Your request has been sent to the Reception team.\n' +
  'Someone will be in touch regarding your request as soon as possible.\n' +
  'Thank you for your patience! 🙏';

/**
 * Acknowledgement for an UNFULFILLED (T-1) request — something we don't offer, or an
 * ask we couldn't confidently understand. A human still picks it up and replies, so it
 * is a real ticket with a real SLA; what it must NOT do is promise delivery. The normal
 * ack names a staff member and says "our team is on it", which for "send me a sandwich"
 * is a promise we cannot keep, and the guest waits for something that never arrives.
 *
 * Free text, not a template: the guest has just messaged us, so we are inside WhatsApp's
 * 24-hour session window and no WATI template approval is involved.
 */
export const GUEST_UNFULFILLED_ACK =
  '✅ Thanks for letting us know.\n' +
  'Someone from our Reception team will contact you about your request shortly. 🙏';

/**
 * Closing message for an UNFULFILLED (T-1) ticket, whoever closed it — the staff "done"
 * button, the admin dashboard, or an agent marking it Closed/Resolved inside Zoho Desk
 * (all four routes run through TicketsService.complete()).
 *
 * The normal completion template says the request was "completed by <staff>", which is
 * untrue for something we never offered. This says nothing was delivered and nothing was
 * promised — it just closes the conversation politely and leaves the door open.
 *
 * Brand-aware: a TDS guest must not be thanked for contacting Buteak. Sent as a free-text
 * session message so it needs no WATI template approval; `GUEST_DONE_SOFT` is the backstop
 * for the rare close that lands after WhatsApp's 24-hour session window has shut.
 */
export function guestUnfulfilledDone(brand: string | null | undefined): string {
  return `Thank you for contacting ${brandDisplayName(brand ?? 'TDS')}. Please let us know if you need anything.`;
}

/**
 * WATI (WhatsApp) client — per-brand.
 *
 * TDS and BUTEAK are DIFFERENT WATI tenants/numbers, so every send must say
 * which brand it's for. Config is read from env, one pair per brand:
 *
 *   WATI_TDS_BASE_URL     e.g. https://live-mt-server.wati.io/446388
 *   WATI_TDS_TOKEN        Bearer access token
 *   WATI_BUTEAK_BASE_URL
 *   WATI_BUTEAK_TOKEN
 *
 * Graceful degradation: if a brand's creds are missing, sends are logged and
 * skipped (never throw). This lets Phase 1 run end-to-end before the WATI
 * templates are approved — the ticket + escalation logic still works, only the
 * actual WhatsApp delivery is a no-op until creds land.
 */
@Injectable()
export class WatiService {
  private readonly logger = new Logger(WatiService.name);

  private config(brand: string): { baseUrl: string; token: string } | null {
    const b = (brand || 'TDS').toUpperCase();
    const baseUrl = process.env[`WATI_${b}_BASE_URL`];
    const token = process.env[`WATI_${b}_TOKEN`];
    if (!baseUrl || !token) return null;
    return { baseUrl: baseUrl.replace(/\/$/, ''), token };
  }

  /** True when this brand has WATI creds configured. */
  isConfigured(brand: string): boolean {
    return this.config(brand) !== null;
  }

  /**
   * Send an approved WATI template message.
   *
   * Parameter values are flattened to a single line before they go out: WhatsApp
   * rejects the whole send if any parameter carries a newline, a tab, or a run of
   * more than four spaces, and the rejection is invisible to guest and staff
   * alike. A guest typing their request across three lines used to silently kill
   * every escalation on that ticket (#477/#478). See whatsapp-param.util.ts.
   *
   * @param parameters ordered template params, e.g. [{ name: 'roomNo', value: '101' }]
   */
  async sendTemplateMessage(
    brand: string,
    whatsappNumber: string,
    templateName: string,
    parameters: { name: string; value: string }[],
    broadcastName = 'vibehouse_ticketing',
  ): Promise<{ ok: boolean; skipped?: boolean }> {
    const cfg = this.config(brand);
    if (!cfg) {
      this.logger.warn(
        `[SKIP] WATI not configured for brand=${brand}; would send template="${templateName}" to ${whatsappNumber}`,
      );
      return { ok: false, skipped: true };
    }

    // WATI needs the full MSISDN (country code + national number). eZee often stores
    // a bare 10-digit number; sending that as-is silently fails to deliver (this was
    // why front-desk guests never got their "assigned to XYZ" message). Assume +91.
    const phone = toIndianMsisdn(whatsappNumber);
    if (!phone) {
      this.logger.warn(`[SKIP] WATI template="${templateName}": unusable number "${whatsappNumber}"`);
      return { ok: false, skipped: true };
    }
    const url = `${cfg.baseUrl}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`;

    // Single chokepoint for the newline/tab/space-run rule — every template send
    // in the codebase funnels through here, so no caller can reintroduce it.
    const safeParams = flattenTemplateParams(parameters);
    const rewritten = safeParams
      .filter((p, i) => p.value !== parameters[i].value)
      .map((p) => p.name);
    if (rewritten.length) {
      this.logger.log(
        `WATI template="${templateName}": flattened multi-line param(s) [${rewritten.join(', ')}] ` +
          `— WhatsApp would have rejected the send`,
      );
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.token}`,
        },
        body: JSON.stringify({
          template_name: templateName,
          broadcast_name: broadcastName,
          parameters: safeParams,
        }),
      });
      const bodyText = await res.text().catch(() => '');
      if (!res.ok) {
        this.logger.error(
          `WATI send failed (${res.status}) brand=${brand} template=${templateName}: ${bodyText.slice(0, 200)}`,
        );
        return { ok: false };
      }
      if (!this.watiBodyOk(bodyText)) {
        this.logger.error(
          `WATI template rejected (200) brand=${brand} template=${templateName} to ${phone}: ${bodyText.slice(0, 300)}`,
        );
        return { ok: false };
      }
      this.logger.log(
        `WATI template "${templateName}" sent to ${phone} (brand=${brand})`,
      );
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `WATI send error brand=${brand} template=${templateName}: ${(err as Error).message}`,
      );
      return { ok: false };
    }
  }

  /**
   * Send a free-text WhatsApp session message (only valid inside the 24h window
   * opened by the guest's last inbound message). Used by the heist1.1 WhatsApp
   * front door for acks, clarifications, and the Razorpay payment link — none of
   * which need an approved template because the guest just messaged us.
   *
   * Mirrors the make.com flow's `POST /api/v1/sendSessionMessage/{number}`.
   * Graceful: skips (never throws) when the brand has no WATI creds.
   */
  async sendSessionMessage(
    brand: string,
    whatsappNumber: string,
    message: string,
  ): Promise<{ ok: boolean; skipped?: boolean }> {
    const cfg = this.config(brand);
    if (!cfg) {
      this.logger.warn(
        `[SKIP] WATI not configured for brand=${brand}; would send session message to ${whatsappNumber}`,
      );
      return { ok: false, skipped: true };
    }

    const phone = toIndianMsisdn(whatsappNumber);
    if (!phone) {
      this.logger.warn(`[SKIP] WATI session message: unusable number "${whatsappNumber}"`);
      return { ok: false, skipped: true };
    }
    // WATI's sendSessionMessage takes `messageText` as a QUERY PARAMETER, not a
    // JSON body field (unlike sendTemplateMessage which is a JSON body). Passing it
    // in the body makes WATI receive an empty message: it returns HTTP 200 but the
    // message is silently dropped and never appears in the chat. This was why every
    // free-text reply (greeting, "assigned to XYZ", clarifications) vanished while
    // template sends delivered fine. Ref: docs.wati.io sendSessionMessage.
    const url =
      `${cfg.baseUrl}/api/v1/sendSessionMessage/${phone}` +
      `?messageText=${encodeURIComponent(message)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json-patch+json',
          Authorization: `Bearer ${cfg.token}`,
        },
      });
      const bodyText = await res.text().catch(() => '');
      if (!res.ok) {
        this.logger.error(
          `WATI session send failed (${res.status}) brand=${brand}: ${bodyText.slice(0, 300)}`,
        );
        return { ok: false };
      }
      // WATI returns HTTP 200 even when it REJECTS the message (e.g. `{"result":false,
      // "info":"..."}`). Treat a falsey result flag as failure so callers/logs never
      // record a phantom "[sent]" for a message the guest never received.
      if (!this.watiBodyOk(bodyText)) {
        this.logger.error(
          `WATI session send rejected (200) brand=${brand} to ${phone}: ${bodyText.slice(0, 300)}`,
        );
        return { ok: false };
      }
      this.logger.log(`WATI session message sent to ${phone} (brand=${brand})`);
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `WATI session send error brand=${brand}: ${(err as Error).message}`,
      );
      return { ok: false };
    }
  }

  /**
   * WATI answers HTTP 200 even when it drops a message, signalling the real outcome
   * only in the body (`result`/`ok` flag). Returns false when the body clearly says
   * the send failed; defaults to true when the shape is unrecognised (so we don't
   * regress genuinely-successful sends whose bodies we can't parse).
   */
  private watiBodyOk(bodyText: string): boolean {
    if (!bodyText) return true;
    let j: any;
    try {
      j = JSON.parse(bodyText);
    } catch {
      return true; // non-JSON 200 — assume ok
    }
    if (j?.result === false || j?.ok === false) return false;
    if (typeof j?.result === 'string' && /fail|error|false/i.test(j.result)) return false;
    return true;
  }
}
