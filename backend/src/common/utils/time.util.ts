/**
 * Time helpers. Our timestamps are stored/served in UTC; ops read logs in IST,
 * so we render a precise IST string alongside the raw value where it helps.
 * India Standard Time is a fixed UTC+05:30 (no DST), so a constant offset is exact.
 */
const IST_OFFSET_MIN = 5 * 60 + 30; // +05:30

/** e.g. "2026-07-02 18:45:12.345 IST" — millisecond-precise, sortable. */
export function toIstString(date: Date | null | undefined): string | null {
  if (!date) return null;
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.toISOString().replace('T', ' ').replace('Z', ' IST');
}

/**
 * The IST wall-clock parts (hour 0-23, minute 0-59, and the IST calendar date as
 * YYYY-MM-DD) for an instant. Used for time-of-day gating (e.g. the breakfast order
 * window) so decisions are made against India's local clock, never the server's TZ.
 */
export function istParts(date: Date = new Date()): {
  hour: number;
  minute: number;
  dateStr: string;
} {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return {
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    dateStr: shifted.toISOString().slice(0, 10),
  };
}

/** Current IST hour of day (0-23). */
export function istHour(date: Date = new Date()): number {
  return istParts(date).hour;
}

/** Current IST calendar date as YYYY-MM-DD. */
export function istDateStr(date: Date = new Date()): string {
  return istParts(date).dateStr;
}

/** Add (or subtract, with a negative n) whole days to a YYYY-MM-DD string. */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The UTC instant for an IST wall-clock time: `dateStr` (YYYY-MM-DD, an IST calendar date)
 * at `minutes` past IST midnight. IST is UTC+05:30, so we subtract the offset.
 * e.g. istWallclockToUtc('2026-07-11', 1080) → 2026-07-11T12:30:00Z (18:00 IST).
 */
export function istWallclockToUtc(dateStr: string, minutes: number): Date {
  return new Date(Date.parse(`${dateStr}T00:00:00.000Z`) + (minutes - IST_OFFSET_MIN) * 60_000);
}
