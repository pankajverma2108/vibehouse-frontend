import { BadRequestException } from '@nestjs/common';
import type {
  EzeeAutosyncMessage,
  EzeeAutosyncReservation,
} from './ezee-autosync.types';

/**
 * eZee's outbound IP for the autosync push, captured live on 2026-06-04.
 * Anything else hitting /ezee/webhook/autosync is rejected as unauthenticated.
 *
 * If eZee changes / adds outbound IPs, append them here and redeploy. The
 * trade-off discussed at decision time: we deliberately don't use a path-token
 * because that would force eZee support to reconfigure the webhook URL on
 * their side, and we want to keep the integration stable.
 */
export const EZEE_AUTOSYNC_ALLOWED_IPS: ReadonlyArray<string> = [
  '50.17.189.228',
];

/**
 * Extracts the true source IP of an inbound webhook request.
 *
 * SECURITY: a single AWS ALB sits directly in front of the ECS task (no
 * CloudFront on api.thedailysocial.co.in). The ALB APPENDS the real TCP peer
 * to `x-forwarded-for`, so the trustworthy address is the LAST entry. We must
 * NOT read `[0]` — a caller can forge leading entries (e.g. send
 * `X-Forwarded-For: 50.17.189.228` themselves), which the old first-entry logic
 * would have accepted, defeating the allowlist. Taking the last hop makes the
 * allowlist spoof-resistant because an attacker cannot append after the ALB.
 */
export function extractClientIp(headers: Record<string, unknown>): string | null {
  const raw = headers['x-forwarded-for'];
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

export function isIpAllowed(ip: string | null): boolean {
  if (!ip) return false;
  return EZEE_AUTOSYNC_ALLOWED_IPS.includes(ip);
}

/**
 * Parses the raw request body into a typed autosync message. Throws
 * BadRequestException for malformed JSON or for the wrong shape (missing
 * `hotel_code` or `data.Reservations`). The Reservation array itself may be
 * empty — that's a valid heartbeat-style push and we just ack it.
 */
export function parseAutosyncMessage(rawBody: string): EzeeAutosyncMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (err) {
    throw new BadRequestException(
      `Malformed JSON: ${(err as Error).message.slice(0, 200)}`,
    );
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new BadRequestException('Body must be a JSON object');
  }
  const msg = parsed as EzeeAutosyncMessage;
  if (typeof msg.hotel_code !== 'string' || msg.hotel_code.length === 0) {
    throw new BadRequestException('Missing or invalid hotel_code');
  }
  if (!msg.data || typeof msg.data !== 'object') {
    throw new BadRequestException('Missing data envelope');
  }
  return msg;
}

/**
 * Normalises the optional `data.Reservations.Reservation` field into a flat
 * array, regardless of whether eZee sent zero, one, or many.
 */
export function reservationsOf(msg: EzeeAutosyncMessage): EzeeAutosyncReservation[] {
  const raw = msg.data?.Reservations?.Reservation;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return [raw as EzeeAutosyncReservation];
  return [];
}
