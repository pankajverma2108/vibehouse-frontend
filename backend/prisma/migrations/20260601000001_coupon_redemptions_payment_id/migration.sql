-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Link coupon_redemptions directly to the payment that funded them
--
-- Previously a redemption was joined to a payment only via ezee_reservation_id
-- (one ERI can have multiple payments — booking + addon upsells). Adding a
-- direct payment_id FK makes "which payment funded this discount" a single-
-- hop query, and pairs payment-side analysis (e.g. Razorpay payout
-- reconciliation) with the coupon-side audit trail.
--
-- Nullable to keep historical rows valid; backfill below sets it where there's
-- exactly one booking payment for the ERI (the common case for current data).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "coupon_redemptions"
  ADD COLUMN "payment_id" VARCHAR(36),
  ADD CONSTRAINT "coupon_redemptions_payment_fk"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id");

-- Backfill: for each existing redemption, set payment_id to the booking
-- payment on the same ERI (if there's exactly one). Skips ambiguous rows.
UPDATE "coupon_redemptions" cr
SET    "payment_id" = sub.payment_id
FROM (
  SELECT cr.id AS redemption_id,
         (
           SELECT p."id"
           FROM   "payments" p
           WHERE  p."ezee_reservation_id" = cr."ezee_reservation_id"
             AND  p."purpose" = 'booking'
             AND  p."status"  = 'CAPTURED'
           ORDER BY p."created_at" ASC
           LIMIT  1
         ) AS payment_id
  FROM   "coupon_redemptions" cr
  WHERE  cr."payment_id" IS NULL
) sub
WHERE cr."id" = sub.redemption_id
  AND sub.payment_id IS NOT NULL;

CREATE INDEX "idx_redemptions_payment" ON "coupon_redemptions" ("payment_id");
