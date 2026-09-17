/**
 * TypeScript interfaces for all SQS message payloads.
 * Each message has a `type` discriminator, `payload`, and `timestamp`.
 */

// ── Base envelope ───────────────────────────────────────────────────────────

export interface SqsMessageEnvelope<T extends string = string, P = unknown> {
  type: T;
  payload: P;
  timestamp: number;
}

// ── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogPayload {
  actor_type: 'ADMIN' | 'GUEST' | 'SYSTEM';
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
}

// ── Payment Success ─────────────────────────────────────────────────────────

export interface PaymentSuccessPayload {
  eri: string;
  payment_id: string;
  razorpay_payment_id: string;
  amount: number;
  purpose: string;
  guest_id: string;
  property_id: string;
  items?: {
    product_name: string;
    quantity: number;
    total: number;
  }[];
}

// ── Booking Confirmed ───────────────────────────────────────────────────────

export interface BookingConfirmedPayload {
  eri: string;
  payment_id: string;
  guest_id: string;
  room_type: string | null;
  checkin: Date | string | null;
  checkout: Date | string | null;
}

// ── Ticket Created ──────────────────────────────────────────────────────────

export interface TicketCreatedPayload {
  ticket_id?: string; // zoho_ticket_ref.id — set by the Phase-1 ticketing flow
  eri: string;
  guest_id: string;
  property_id: string;
  request_type: 'FREE' | 'BORROWABLE' | 'CHARGEABLE' | 'MAINTENANCE';
  service_name: string;
  room_number: string | null;
  unit_code: string | null;
  department: string;
  priority: string;
  /**
   * Whether the ops worker should send the guest the "request received / assigned"
   * message. Default (undefined ⇒ true) keeps the worker as the notifier for tickets
   * raised outside a live WhatsApp session (payment capture, PWA store). The WhatsApp
   * service front door sets this `false` because it acks the guest synchronously with
   * the resolved assignee's name — so the worker must NOT also message them.
   */
  notify_guest?: boolean;
}

// ── Low Stock Alert ─────────────────────────────────────────────────────────

export interface LowStockAlertPayload {
  property_id: string;
  product_id: string;
  product_name: string;
  available_stock: number;
  threshold: number;
}

// ── eZee Sync Messages ─────────────────────────────────────────────────────

export interface EzeeInsertBookingPayload {
  eri: string;
  guest_id: string;
  property_id: string;
  room_type: string | null;
  checkin: string | null;
  checkout: string | null;
  amount: number;
  /**
   * Payment trace metadata used by the eZee worker to populate
   * `Room_N.SpecialRequest` and `Booking_Payment_Mode` on InsertBooking so
   * the eZee folio surfaces our Razorpay payment reference.
   * All fields optional for backwards compatibility with messages in-flight
   * at the time of the deploy.
   */
  razorpay_payment_id?: string;
  property_name?: string;
  purpose_label?: string;
  /**
   * Booking-level discount (₹) from coupons. The eZee worker bakes this into
   * the room base rates so the eZee folio room charge nets to the amount the
   * guest actually paid (no phantom balance). 0 / undefined = no discount.
   */
  discount_total?: number;
  /**
   * Short, human-readable summary of the applied coupon(s) — e.g. "WELCOME",
   * "TEST91", "WELCOME+TEST91". The worker stamps this into the eZee
   * `SpecialRequest` tag so ops reading the folio can see which coupon was
   * applied without joining tables. Undefined when no coupon applied.
   */
  coupon_summary?: string;
}

export interface EzeeAddExtraChargePayload {
  eri: string;
  property_id: string;
  items: {
    product_name: string;
    quantity: number;
    amount: number;
  }[];
  razorpay_payment_id: string;
}

export interface EzeeUpdateReservationPayload {
  eri: string;
  property_id: string;
  updates: Record<string, unknown>;
}

/**
 * Per-reservation message enqueued by the inbound eZee autosync webhook
 * (one envelope per Reservation in the eZee push so FIFO MessageGroupId
 * = UniqueID guarantees per-booking ordering when multiple operations land
 * in the same 5-min batch). The worker (`handleAutosyncWebhook`) consumes
 * these and upserts `ezee_booking_cache` per the operation matrix in
 * docs/setup/ezee_autosync_webhook.md, preserving PWA-side enrichment
 * (guest_id, coupons, tax, booking_rooms_json).
 *
 * Reservation typed as `unknown` here to keep the sqs/types layer
 * decoupled from ezee/webhook types — the worker casts back to the
 * concrete EzeeAutosyncReservation when it processes the payload.
 */
export interface EzeeAutosyncWebhookPayload {
  hotel_code: string;
  property_id: string;
  operation: string;
  reservation: unknown;
  received_at: string;
}

export interface EzeeInsertColiveBookingPayload {
  draft_booking_id: string;
  property_id: string;
  room_type_id: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;
  move_in_date: string;     // YYYY-MM-DD
  move_out_date: string;    // YYYY-MM-DD
  rate_per_night: number;
  total_nights: number;
  amount: number;
}

// ── Notification Messages ───────────────────────────────────────────────────

export interface NotifyGuestPayload {
  guest_id: string;
  guest_phone?: string;
  guest_email?: string;
  brand?: string; // resolves which WATI tenant/token to send from (TDS | BUTEAK)
  template: string;
  variables: Record<string, string>;
}

export interface NotifyStaffPayload {
  staff_phone: string;
  staff_name: string;
  brand?: string; // resolves which WATI tenant/token to send from (TDS | BUTEAK)
  template: string;
  variables: Record<string, string>;
}

// ── SLA Escalation ──────────────────────────────────────────────────────────

export interface SlaEscalatePayload {
  ticket_id: string;
  zoho_ticket_id: string;
  escalation_level: 'L0' | 'L1' | 'L2' | 'L3';
}
