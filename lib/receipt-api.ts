import { requestJson } from "@/lib/vibehouse-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single line item on the receipt (room or add-on).
 */
export type ReceiptLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

/**
 * The full receipt payload returned by GET /guest/booking/receipt/:ezeeReservationId
 */
export type BookingReceiptData = {
  // ── Booking identity ──────────────────────────────────────────────────
  booking_id: string;
  confirmation_code: string;
  ezee_reservation_id: string;
  booking_date: string; // ISO 8601 — e.g. "2026-09-14T10:30:00Z"

  // ── Property ──────────────────────────────────────────────────────────
  property_name: string;
  property_address: string;
  property_email: string;
  property_phone: string;

  // ── Guest ─────────────────────────────────────────────────────────────
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;

  // ── Stay details ──────────────────────────────────────────────────────
  checkin_date: string;  // ISO 8601 date string — e.g. "2026-10-12"
  checkout_date: string;
  checkin_time: string;  // human-readable — e.g. "14:00"
  checkout_time: string;
  no_of_nights: number;
  no_of_guests: number;
  room_type_name: string;
  room_number?: string | null;

  // ── Pricing breakdown ─────────────────────────────────────────────────
  line_items: ReceiptLineItem[];
  subtotal_rooms: number;
  subtotal_addons: number;
  taxes: number;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  currency: string; // "INR"

  // ── Payment reference ─────────────────────────────────────────────────
  payment_id?: string | null;
  payment_method?: string | null; // e.g. "Razorpay", "Cash"

  // ── Terms & Conditions ────────────────────────────────────────────────
  terms?: string[] | null;
};

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

/**
 * Fetches the full receipt for a confirmed booking.
 *
 * @param token     Guest auth bearer token
 * @param ezeeReservationId  The eZee reservation ID from the booking snapshot
 *
 * Endpoint: GET /guest/booking/receipt/:ezeeReservationId
 *
 * @throws {Error} if the network request fails or the server returns 4xx/5xx
 */
export async function fetchBookingReceipt(
  token: string,
  ezeeReservationId: string,
): Promise<BookingReceiptData> {
  return requestJson<BookingReceiptData>(
    `/guest/booking/receipt/${encodeURIComponent(ezeeReservationId)}`,
    { method: "GET", token },
  );
}
