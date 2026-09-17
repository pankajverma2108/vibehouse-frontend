-- BUTEAK anonymous-booking feature (per plan in reactive-popping-kernighan.md)
--
-- Three column additions. No new tables. No constraint changes.
-- Seeds the BUTEAK property rows to enable the feature.

-- 1. guests: mark rows created via the anonymous path so analytics + ops can tell them apart
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- 2. properties: per-property flag so ops can toggle without code change
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS allow_anonymous_booking BOOLEAN NOT NULL DEFAULT false;

UPDATE properties
   SET allow_anonymous_booking = true
 WHERE id IN ('55402', '61766');

-- 3. ezee_booking_cache: short token returned to the anonymous client so payment endpoints
--    can be called without a guest JWT. Cleared on first CAPTURED webhook (single-use).
ALTER TABLE ezee_booking_cache
  ADD COLUMN IF NOT EXISTS payment_token CHAR(32);
