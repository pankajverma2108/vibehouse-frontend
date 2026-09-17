/**
 * Classification of `ezee_booking_cache.source` strings into channels, for the
 * admin dashboard's bookings-by-source breakdown.
 *
 * `source` is whatever eZee gave us (autosync sets it to `reservation.BookedBy`;
 * our own bookings set "VibeHouse" / "Buteak" / "The Daily Social"). Comparison
 * is case-insensitive + trimmed, so ops can add variants without worrying about
 * exact casing.
 *
 * Anything not in either set classifies as OTHER — surfaced as-is in the
 * by-source list so ops can spot a new channel and add it here.
 */

/** OTA channels — guest paid the OTA; the OTA settles with the property out of band (no Razorpay row on our side). */
export const OTA_SOURCES = new Set(
  [
    'Booking.com',
    'MakeMyTrip',
    'Hostelworld',
    'Agoda',
    'Goibibo',
    'Yatra',
    'EaseMyTrip',
    'Expedia',
    'Cleartrip',
    'OTA',
  ].map((s) => s.toLowerCase()),
);

/** Direct / walk-in channels — booking originated at the property or by phone, no online payment captured by us. */
export const DIRECT_SOURCES = new Set(
  [
    'Direct',
    'Hotel Front Desk',
    'Walk-In',
    'WALK_IN',
    'Phone',
    'Front Desk',
  ].map((s) => s.toLowerCase()),
);

/** Sources our own PWA / Buteak FE stamp on bookings funnelled through Razorpay. */
export const OWN_CHANNEL_SOURCES = new Set(
  ['VibeHouse', 'Buteak', 'The Daily Social'].map((s) => s.toLowerCase()),
);

export type BookingChannel = 'ota' | 'direct' | 'own' | 'other';

export function classifyBookingSource(source: string | null | undefined): BookingChannel {
  if (!source) return 'direct'; // null source = walk-in entered at the desk
  const key = source.trim().toLowerCase();
  if (OTA_SOURCES.has(key)) return 'ota';
  if (DIRECT_SOURCES.has(key)) return 'direct';
  if (OWN_CHANNEL_SOURCES.has(key)) return 'own';
  return 'other';
}
