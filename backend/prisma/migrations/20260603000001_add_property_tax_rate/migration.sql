-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Per-property tax engine
--
-- Adds tax_rate_pct to properties (single canonical rate per property) and
-- snapshot columns to ezee_booking_cache so that the rate in effect AT THE
-- TIME of order creation is preserved even if ops later edits the property's
-- rate. The booking total is then re-derivable from the snapshot without
-- reading the live property row — important for replayability and audit.
--
-- All three existing properties are backfilled to 5.00% per the initial
-- ask. The constraint pins the rate to a sensible inclusive range; future
-- exempt rate plans can be modelled by adding nullable per-row overrides
-- before lifting the floor.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Property-level tax rate (canonical).
ALTER TABLE "properties"
  ADD COLUMN "tax_rate_pct" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "properties"
  ADD CONSTRAINT "properties_tax_rate_range"
  CHECK ("tax_rate_pct" >= 0 AND "tax_rate_pct" <= 100);

UPDATE "properties"
SET    "tax_rate_pct" = 5.00
WHERE  "id" IN ('60765', '55402', '61766');

-- 2. Snapshot the rate + computed tax amount on each booking row so the
--    grand total is replayable even if the property's rate changes later.
ALTER TABLE "ezee_booking_cache"
  ADD COLUMN "tax_rate_pct" DECIMAL(5, 2),
  ADD COLUMN "tax_total"    DECIMAL(10, 2);
