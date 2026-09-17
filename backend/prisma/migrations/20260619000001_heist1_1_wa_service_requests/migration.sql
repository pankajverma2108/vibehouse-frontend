-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: heist1.1 — WhatsApp Service-Request Front Door ("San Fierro" v1.1)
--
-- Adds wa_service_request: the lifecycle record for a service request raised by a
-- checked-in guest over WhatsApp (the Miro "Live" frame front door). One row per
-- inbound request, carried from RECEIVED → CLASSIFIED → (PENDING_PAYMENT) →
-- FULFILLED/TICKETED, giving idempotency (dedupe on wati_message_id) + an audit
-- trail without changing the v1 ticket engine (zoho_ticket_ref / staff / sla_config
-- are reused as-is).
--
-- Lanes (set by the LLM classifier + catalog match):
--   ANONYMOUS  — not in catalog → straight to a service ticket
--   FREE       — catalog item, base_price = 0 → (inventory-- if physical) → ticket
--   CHARGEABLE — catalog item, base_price > 0 → Razorpay Payment Link over WhatsApp
--                → on capture: inventory-- → ticket  (no ticket before capture)
--   BORROWABLE — catalog BORROWABLE item → ticket
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "wa_service_request" (
  "id"                       VARCHAR(36)  NOT NULL,
  "brand"                    VARCHAR(20)  NOT NULL,            -- TDS | BUTEAK (which WATI tenant received it)
  "wa_id"                    VARCHAR(20)  NOT NULL,            -- sender WhatsApp number (digits, country code)
  "wati_message_id"          VARCHAR(100),                     -- WATI inbound id, for retry dedupe
  "guest_id"                 VARCHAR(36),                      -- resolved checked-in guest (null if unresolved)
  "ezee_reservation_id"      VARCHAR(100),                     -- active booking the request belongs to
  "property_id"              VARCHAR(36),
  "raw_text"                 TEXT         NOT NULL,            -- the guest's original message
  "intent"                   VARCHAR(40),                      -- classifier intent (request_new / ambiguous / ...)
  "request_type"             VARCHAR(20),                      -- FREE | CHARGEABLE | BORROWABLE | ANONYMOUS
  "product_id"               VARCHAR(36),                      -- matched catalog product (null = anonymous)
  "department"               VARCHAR(30),                      -- HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE
  "status"                   VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED',
  "payment_id"               VARCHAR(36),                      -- set for the CHARGEABLE lane
  "addon_order_id"           VARCHAR(36),                      -- cart backing the paid item
  "razorpay_payment_link_id" VARCHAR(100),                     -- plink_… returned by Razorpay
  "ticket_id"                VARCHAR(36),                      -- zoho_ticket_ref.id once handed to the v1 engine
  "created_at"               TIMESTAMP(6) NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT "wa_service_request_pkey" PRIMARY KEY ("id")
);

-- Dedupe WATI retries of the same inbound message.
CREATE UNIQUE INDEX "uq_wa_service_request_wati_message_id"
  ON "wa_service_request"("wati_message_id");
-- Recent requests per sender (conversation lookups).
CREATE INDEX "idx_wa_service_request_wa_id" ON "wa_service_request"("wa_id", "created_at");
-- Operational scans by lifecycle state.
CREATE INDEX "idx_wa_service_request_status" ON "wa_service_request"("status");

-- Integrity FKs (all nullable, set as the request progresses; NO ACTION matches the
-- rest of the schema's cache-style relations).
ALTER TABLE "wa_service_request"
  ADD CONSTRAINT "wa_service_request_guest_id_fkey"
  FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "wa_service_request"
  ADD CONSTRAINT "wa_service_request_ezee_reservation_id_fkey"
  FOREIGN KEY ("ezee_reservation_id") REFERENCES "ezee_booking_cache"("ezee_reservation_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "wa_service_request"
  ADD CONSTRAINT "wa_service_request_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "wa_service_request"
  ADD CONSTRAINT "wa_service_request_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "product_catalog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "wa_service_request"
  ADD CONSTRAINT "wa_service_request_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "wa_service_request"
  ADD CONSTRAINT "wa_service_request_addon_order_id_fkey"
  FOREIGN KEY ("addon_order_id") REFERENCES "addon_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "wa_service_request"
  ADD CONSTRAINT "wa_service_request_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "zoho_ticket_ref"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
