/**
 * Phone helpers — eZee stores guest numbers inconsistently ("+91 9999999999",
 * "919999999999", or a bare "9999999999"), while WhatsApp/WATI delivers the sender
 * as digits with the country code ("919999999999"). We reconcile them by comparing
 * the **last 10 digits** (the national number), which is stable across all formats.
 */

/** Strip everything but digits. */
export function phoneDigits(raw?: string | null): string {
  return (raw ?? '').replace(/\D/g, '');
}

/**
 * The last 10 digits — the stable match key across +91 / 91 / bare formats.
 * Returns '' if there aren't at least 10 digits.
 */
export function phoneLast10(raw?: string | null): string {
  const d = phoneDigits(raw);
  return d.length >= 10 ? d.slice(-10) : '';
}

/**
 * Best-effort canonical Indian MSISDN (country code + national number, digits only).
 * A bare 10-digit number is assumed to be +91 — the best we can do when eZee omits
 * the country code. Numbers that already carry a country code are returned as digits.
 */
export function toIndianMsisdn(raw?: string | null): string | null {
  const d = phoneDigits(raw).replace(/^0+/, ''); // drop leading 00 / trunk zeros
  if (!d) return null;
  if (d.length === 10) return '91' + d;
  return d;
}
