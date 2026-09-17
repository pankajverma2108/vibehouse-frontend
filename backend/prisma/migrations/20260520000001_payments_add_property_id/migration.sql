-- Denormalize property_id onto payments so ops queries don't have to JOIN
-- ezee_booking_cache every time. With two live properties (TDS 60765 and
-- Buteak 55402) sharing one Razorpay merchant account, "show me all Buteak
-- captured payments this week" needs to be a single-table query.

ALTER TABLE "payments" ADD COLUMN "property_id" VARCHAR(36);

-- Backfill from the booking cache. Every existing payment row references a
-- booking; the booking knows its property.
UPDATE "payments" p
SET "property_id" = c."property_id"
FROM "ezee_booking_cache" c
WHERE p."ezee_reservation_id" = c."ezee_reservation_id"
  AND p."property_id" IS NULL;

-- Index supports ops queries like:
--   SELECT * FROM payments WHERE property_id = '55402' AND status = 'CAPTURED'
--     AND created_at > now() - interval '30 days' ORDER BY created_at DESC;
CREATE INDEX "idx_payments_property_status_created"
  ON "payments" ("property_id", "status", "created_at" DESC);

-- Intentionally NOT adding a FK constraint here. If any legacy payment row
-- ends up pointing to a stale property_id (e.g., orphaned by manual fixup),
-- the FK would block deploys. Once data is verified clean in a few weeks,
-- a follow-up migration can add: ADD CONSTRAINT payments_property_id_fkey
-- FOREIGN KEY (property_id) REFERENCES properties(id).
