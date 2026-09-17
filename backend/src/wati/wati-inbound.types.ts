/**
 * Tolerant shape of a WATI inbound webhook payload. WATI posts a flat JSON object
 * for each event; field presence varies by message type, so everything is optional
 * and we normalise in `parseWatiInbound`.
 *
 * For an incoming guest text message WATI sends roughly:
 *   { id, waId, senderName, text, type: "text", owner: false, eventType: "message" }
 * `owner: true` means the business sent it (echo) — we ignore those.
 */
export interface WatiInboundRaw {
  id?: string;
  whatsappMessageId?: string;
  waId?: string;
  senderName?: string;
  text?: string;
  type?: string; // text | button | interactive | image | ...
  owner?: boolean; // true = sent by business
  eventType?: string; // message | sessionMessageSent | ...
  [k: string]: unknown;
}

export interface WatiInboundMessage {
  messageId: string | null;
  waId: string;
  senderName: string | null;
  text: string;
  type: string;
}

/** Pull a button/list reply title out of the WATI payloads that nest it (not `text`). */
function buttonTitleOf(raw: WatiInboundRaw): string {
  const pick = (o: unknown): string => {
    if (!o || typeof o !== 'object') return '';
    const r = o as Record<string, unknown>;
    const v = r.text ?? r.title ?? r.buttonText;
    return typeof v === 'string' ? v.trim() : '';
  };
  return (
    pick(raw.buttonReply) ||
    pick(raw.interactiveButtonReply) ||
    pick(raw.listReply) ||
    (typeof raw.buttonText === 'string' ? raw.buttonText.trim() : '')
  );
}

/**
 * Returns the normalised guest message, or null if this event is not an
 * actionable inbound guest text (echoes, status callbacks, empty bodies, etc.).
 */
export function parseWatiInbound(raw: WatiInboundRaw | null | undefined): WatiInboundMessage | null {
  if (!raw || typeof raw !== 'object') return null;

  // Ignore business-sent echoes and non-message events.
  if (raw.owner === true) return null;
  if (raw.eventType && raw.eventType !== 'message') return null;

  const waId = typeof raw.waId === 'string' ? raw.waId.replace(/[^0-9]/g, '') : '';
  // Button/quick-reply taps usually arrive with the title in `text`, but some WATI
  // interactive payloads nest it under buttonReply/interactiveButtonReply/listReply —
  // fall back to those so a Good/Bad tap is never silently dropped for an empty `text`.
  const text = (typeof raw.text === 'string' ? raw.text.trim() : '') || buttonTitleOf(raw);
  if (!waId || !text) return null;

  // Plain text plus quick-reply button taps (Good/Bad feedback): WATI delivers a
  // tapped quick-reply as type "button"/"interactive" with the button title. Other
  // types (image, location, status callbacks) aren't actionable here.
  const type = typeof raw.type === 'string' ? raw.type : 'text';
  if (type !== 'text' && type !== 'button' && type !== 'interactive') return null;

  return {
    messageId:
      (typeof raw.whatsappMessageId === 'string' && raw.whatsappMessageId) ||
      (typeof raw.id === 'string' && raw.id) ||
      null,
    waId,
    senderName: typeof raw.senderName === 'string' ? raw.senderName : null,
    text,
    type,
  };
}
