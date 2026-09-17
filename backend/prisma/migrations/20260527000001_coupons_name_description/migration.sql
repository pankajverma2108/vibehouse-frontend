-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Add guest-facing name + description to coupons
--
-- Auto coupons (STAY_LENGTH, NEW_GUEST) had no guest-facing label, so the FE
-- couldn't show "WELCOME discount applied because you're new". This adds:
--   - name        : guest-facing display title (card title for auto coupons).
--                   ONE_TIME_CODE coupons keep using their `code` as the title,
--                   so name is optional for them but REQUIRED for auto types.
--   - description : short guest-facing one-liner under the title (all types).
--
-- The check constraint enforces "auto coupons must have a name" going forward.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "coupons"
  ADD COLUMN "name"        VARCHAR(60),
  ADD COLUMN "description" VARCHAR(255);

-- Backfill existing auto coupons with a sensible default name so the new
-- constraint passes. Admins can rename via PATCH afterwards.
UPDATE "coupons" SET "name" = 'New Guest Offer'  WHERE "type" = 'NEW_GUEST'   AND "name" IS NULL;
UPDATE "coupons" SET "name" = 'Long Stay Offer'  WHERE "type" = 'STAY_LENGTH' AND "name" IS NULL;

-- Going forward: auto coupons must carry a name. ONE_TIME_CODE may omit it
-- (the FE uses `code` as the display title for those).
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_auto_name_check" CHECK (
  ("type" = 'ONE_TIME_CODE') OR ("name" IS NOT NULL)
);
