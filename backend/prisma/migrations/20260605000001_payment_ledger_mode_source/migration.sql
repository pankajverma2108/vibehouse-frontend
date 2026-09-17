-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: payments ledger — test/live mode + recording source + eZee method
--
-- Adds three nullable columns to `payments` and relaxes `guest_id` so we can
-- mirror eZee-side payments (OTAs / front-desk Razorpay captures) into our
-- table even when the autosync push hasn't yet auto-linked a guest.
--
-- - `payment_mode` ('TEST' / 'LIVE') — stamped at order creation from the
--   brand's Razorpay key prefix. Lets ops filter test vs real revenue once
--   both modes are active side-by-side (TDS test + BUTEAK live currently).
--
-- - `source` ('PWA' / 'AUTOSYNC') — distinguishes payments our backend
--   recorded directly (from a guest checkout flow) from those we mirrored
--   from an eZee autosync push (OTA / front-desk / channel).
--
-- - `ezee_method` (e.g. 'Ezeepayrazorpay', 'Cash') — for AUTOSYNC rows, the
--   `PaymentDetail.method` string eZee gave us. NULL for PWA rows.
--
-- - `guest_id` becomes nullable: OTA / front-desk bookings frequently arrive
--   via autosync before we have a guests row to link them to (per the
--   no-shell-guest design decision in the autosync plan). Existing PWA rows
--   always have a guest_id set so back-compat is preserved.
--
-- Existing rows are backfilled assuming PWA / TEST since that's the entire
-- history of this table prior to today's BUTEAK live cutover.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "payments"
  ADD COLUMN "payment_mode" VARCHAR(10),
  ADD COLUMN "source"       VARCHAR(20),
  ADD COLUMN "ezee_method"  VARCHAR(50);

-- Backfill: every row that exists right now was a PWA-originated payment on
-- the test Razorpay account.
UPDATE "payments"
SET    "payment_mode" = 'TEST',
       "source"       = 'PWA'
WHERE  "payment_mode" IS NULL;

-- Allow OTA / autosync-mirrored payments where no guest is linked yet.
ALTER TABLE "payments"
  ALTER COLUMN "guest_id" DROP NOT NULL;

-- Indexes that make the new columns useful for dashboard filtering.
CREATE INDEX "idx_payments_mode_status_created"
  ON "payments" ("payment_mode", "status", "created_at" DESC);

CREATE INDEX "idx_payments_source"
  ON "payments" ("source");
