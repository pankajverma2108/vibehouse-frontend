-- Brand isolation — promote properties.brand from branding_config JSON to a
-- top-level column so guest-scoped reads can filter by brand via JOIN without
-- paying a JSON-scan cost. This enables:
--   - getMyBookings scoped to the brand of the website the user is on
--   - autoLinkBookings scoped to current brand (no cross-brand contamination)
--   - JWT-claim-driven brand scoping at the auth layer

ALTER TABLE "properties" ADD COLUMN "brand" VARCHAR(20) NOT NULL DEFAULT 'TDS';

-- Backfill: 60765 is TDS (covered by default), 55402 is BUTEAK.
UPDATE "properties" SET "brand" = 'BUTEAK' WHERE "id" = '55402';

-- Enum-like CHECK. Easy to extend with another migration if/when a 3rd brand arrives.
ALTER TABLE "properties"
  ADD CONSTRAINT "properties_brand_check"
  CHECK ("brand" IN ('TDS', 'BUTEAK'));

-- Index supports filter joins like:
--   SELECT b.* FROM ezee_booking_cache b
--   JOIN properties p ON p.id = b.property_id
--   WHERE p.brand = 'BUTEAK' AND b.guest_id = '...'
CREATE INDEX "idx_properties_brand" ON "properties" ("brand");

-- Surface an OAuth redirect override on Buteak's branding_config so the
-- backend can pick a working OAuth success URL until Buteak FE migrates to
-- a dynamic stack. Set to TDS frontend for now — flip to www.buteak.in
-- when Buteak FE has a /auth/google/success route. Idempotent merge.
UPDATE "properties"
SET "branding_config" = COALESCE("branding_config", '{}'::jsonb) || '{
  "oauth_redirect_url": "https://www.thedailysocial.co.in"
}'::jsonb
WHERE "id" = '55402';
