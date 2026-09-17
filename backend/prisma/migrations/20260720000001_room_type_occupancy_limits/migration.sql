-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Per-room-type occupancy limits (base/max adults + children)
--
-- Why: the booking API had no authoritative per-room-type occupancy cap. The
-- only guard was a generic "booked units × 6" combined ceiling, which cannot
-- tell "4 adults in one 2BHK" (allowed at Buteak Koramangala) apart from
-- "4 adults in one 1BHK" (not allowed). FE handoff:
--   docs/FEtoBEHandoff/buteak_koramangala_2bhk_four_adult_occupancy_handoff_2026-07-17.md
--
-- Columns are NULLABLE with NO backfill: NULL means "unconfigured", and every
-- read path falls back to the legacy generous ceiling. So every existing
-- property (TDS 60765, Buteak BTM 55402) behaves EXACTLY as before this
-- migration until its rooms are explicitly seeded. Only the rows updated below
-- get the tighter, eZee-aligned enforcement.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "room_types" ADD COLUMN "base_adults"   INTEGER;
ALTER TABLE "room_types" ADD COLUMN "base_children" INTEGER;
ALTER TABLE "room_types" ADD COLUMN "max_adults"    INTEGER;
ALTER TABLE "room_types" ADD COLUMN "max_children"  INTEGER;

-- ── Seed Buteak Koramangala (61766), business-confirmed eZee Max A/C ──────────
-- Keyed by (property_id, ezee_room_type_id) so BOTH the EP and CP rate-plan
-- rows of a physical room type receive identical limits (rate-plan parity).
--
--   ezee_room_type_id            Room type                         base A/C  max A/C
--   6176600000000000001          Cozy One Bedroom Suite            1/1       2/2
--   6176600000000000002          Spacious One Bedroom Suite        1/1       2/2
--   6176600000000000003          Spacious Two Bedroom Suite        1/1       4/2

UPDATE "room_types"
SET "base_adults" = 1, "base_children" = 1, "max_adults" = 2, "max_children" = 2
WHERE "property_id" = '61766'
  AND "ezee_room_type_id" IN ('6176600000000000001', '6176600000000000002');

UPDATE "room_types"
SET "base_adults" = 1, "base_children" = 1, "max_adults" = 4, "max_children" = 2
WHERE "property_id" = '61766'
  AND "ezee_room_type_id" = '6176600000000000003';
