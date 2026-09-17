-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Seed room_types for Buteak Suites (property 55402)
--
-- Context: Buteak's `room_types` table is empty. When the FE calls
--   GET /guest/booking/availability?property_id=55402&...
-- the response falls through to live eZee data with `bookable_online: false`
-- (set at backend/src/guest/booking/guest-booking.service.ts:398 — flag is
-- !!db, false when no matching DB row).
--
-- The Buteak FE team's controlled E2E gates on this field client-side and
-- refuses to call create-order. The field is NOT enforced by the backend
-- (create-order proceeds regardless — verified 2026-05-23), but seeding
-- room_types resolves the symptom AND was a documented follow-up from the
-- original multi-property rollout (see docs/setup/multi_property_rollout.md
-- "Pending follow-ups: Seed Buteak's room_types, product_catalog, colive_*").
--
-- Buteak has 2 apartment-style room types confirmed via eZee API:
--   - 5540200000000000001 → Apartment 1 (8 beds)
--   - 5540200000000000002 → Apartment 2 (8 beds)
-- Both at Rs. 3499/night per eZee live rate (Dec/Jul 2026 sampled).
--
-- Floor range, amenities not authoritatively known yet — populated with safe
-- placeholders that can be refined via admin UI (or a later seed update)
-- once the operations team confirms the property fit-out.
--
-- Idempotent: ON CONFLICT DO UPDATE so re-running is safe.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "room_types" (
  "id", "property_id", "name", "slug", "type",
  "total_rooms", "beds_per_room", "total_beds",
  "base_price_per_night", "floor_range", "amenities",
  "ezee_room_type_id", "ezee_rate_plan_id", "ezee_rate_type_id",
  "is_active"
) VALUES
  (
    'rt-bk-apt1', '55402', 'Apartment 1', 'apartment-1', 'PRIVATE',
    1, 8, 8,
    3499, NULL,
    '["AC","Attached Bathroom","WiFi","Kitchenette","TV","Workspace"]'::jsonb,
    '5540200000000000001', '5540200000000000001', '5540200000000000001',
    true
  ),
  (
    'rt-bk-apt2', '55402', 'Apartment 2', 'apartment-2', 'PRIVATE',
    1, 8, 8,
    3499, NULL,
    '["AC","Attached Bathroom","WiFi","Kitchenette","TV","Workspace"]'::jsonb,
    '5540200000000000002', '5540200000000000002', '5540200000000000001',
    true
  )
ON CONFLICT ("id") DO UPDATE SET
  "ezee_room_type_id"    = EXCLUDED."ezee_room_type_id",
  "ezee_rate_plan_id"    = EXCLUDED."ezee_rate_plan_id",
  "ezee_rate_type_id"    = EXCLUDED."ezee_rate_type_id",
  "base_price_per_night" = EXCLUDED."base_price_per_night",
  "is_active"            = EXCLUDED."is_active";
