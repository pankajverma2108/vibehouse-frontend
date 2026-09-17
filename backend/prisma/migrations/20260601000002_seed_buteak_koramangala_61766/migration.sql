-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Seed Buteak Koramangala (eZee hotel 61766) as 3rd property
--
-- Third Vibe House property:
--   - id           : 61766  (= eZee hotel code, per properties.id_numeric_check)
--   - brand        : BUTEAK (same brand as 55402 — shared logo/colors/SES)
--   - SES region   : ap-south-2 (inherits Buteak BTM's setup)
--   - Has EP + CP rate plans per room type (first property with multi-plan)
--
-- Room/plan IDs + rates were discovered live from eZee on 2026-06-01 via
--   RoomList / RetrievePayMethods / RetrieveCurrency
-- (Cash PaymentID 6176600000000000013, INR CurrencyID 6176600000000000001
--  — resolved per-property at runtime by EzeeService.resolvePaymentContext;
--  documented here for reference, not stored in DB.)
--
-- Schema choice for EP/CP: Option A — separate room_types row per
-- (room × plan). 3 physical rooms × 2 plans = 6 rows. Each row carries its
-- own ezee_rate_plan_id + base_price_per_night. Note that EP and CP rows of
-- the same physical room reference the SAME 16/13/5 underlying inventory
-- in eZee — our `total_rooms` column is a display field; eZee's RoomList
-- (called live by getRoomAvailability) is the source of truth for "is this
-- bookable right now."
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Property row (branding_config copied from Buteak BTM, brand_name overridden) ──
INSERT INTO "properties" (id, name, address, city, brand, branding_config, created_at)
SELECT
  '61766',
  'BUTEAK KORAMANGALA',
  'Building #526, BHCS Layout 6th Block, Koramangala, Bengaluru, Karnataka 560095 (G+5 building, BBMP e-PID 4334568549)',
  'Bengaluru',
  'BUTEAK',
  COALESCE("branding_config", '{}'::jsonb) || '{"brand_name":"Buteak Koramangala"}'::jsonb,
  NOW()
FROM "properties"
WHERE id = '55402'
ON CONFLICT (id) DO NOTHING;

-- ── 2. eZee connection (real AUTH_CODE) ──
INSERT INTO "ezee_connection" (id, property_id, hotel_code, api_key, api_endpoint, is_active, created_at)
VALUES (
  'ezeeconn-buteak-kor-001',
  '61766',
  '61766',
  '6238127337189ffefe-58ce-11f1-8',
  'https://live.ipms247.com/',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Room types: 6 rows (3 physical rooms × {EP, CP}) ──
-- EP = "Room Only" (no meal),  CP = "Continental Plan" (breakfast included).
-- Slugs: 'cozy-1br-{ep|cp}', 'spacious-1br-{ep|cp}', 'spacious-2br-{ep|cp}'.
-- amenities/floor_range left empty/null; ops can fill via admin UI later.
INSERT INTO "room_types" (
  id, property_id, name, slug, type,
  total_rooms, beds_per_room, total_beds,
  base_price_per_night, floor_range, amenities,
  ezee_room_type_id, ezee_rate_plan_id, ezee_rate_type_id,
  is_active
) VALUES
  ('rt-bk-kor-cozy-1br-ep', '61766',
   'Cozy One Bedroom Suite with Balcony — EP', 'cozy-1br-ep', 'PRIVATE',
   16, 2, 32,
   3000, NULL, '[]'::jsonb,
   '6176600000000000001', '6176600000000000001', '6176600000000000001',
   true),
  ('rt-bk-kor-cozy-1br-cp', '61766',
   'Cozy One Bedroom Suite with Balcony — CP', 'cozy-1br-cp', 'PRIVATE',
   16, 2, 32,
   4000, NULL, '[]'::jsonb,
   '6176600000000000001', '6176600000000000002', '6176600000000000002',
   true),
  ('rt-bk-kor-spacious-1br-ep', '61766',
   'Spacious One Bedroom Suite with Balcony — EP', 'spacious-1br-ep', 'PRIVATE',
   13, 2, 26,
   3500, NULL, '[]'::jsonb,
   '6176600000000000002', '6176600000000000003', '6176600000000000001',
   true),
  ('rt-bk-kor-spacious-1br-cp', '61766',
   'Spacious One Bedroom Suite with Balcony — CP', 'spacious-1br-cp', 'PRIVATE',
   13, 2, 26,
   4500, NULL, '[]'::jsonb,
   '6176600000000000002', '6176600000000000004', '6176600000000000002',
   true),
  ('rt-bk-kor-spacious-2br-ep', '61766',
   'Spacious Two Bedroom Suite with Balcony — EP', 'spacious-2br-ep', 'PRIVATE',
   5, 2, 10,
   5000, NULL, '[]'::jsonb,
   '6176600000000000003', '6176600000000000005', '6176600000000000001',
   true),
  ('rt-bk-kor-spacious-2br-cp', '61766',
   'Spacious Two Bedroom Suite with Balcony — CP', 'spacious-2br-cp', 'PRIVATE',
   5, 2, 10,
   6000, NULL, '[]'::jsonb,
   '6176600000000000003', '6176600000000000006', '6176600000000000002',
   true)
ON CONFLICT (id) DO UPDATE SET
  ezee_room_type_id    = EXCLUDED.ezee_room_type_id,
  ezee_rate_plan_id    = EXCLUDED.ezee_rate_plan_id,
  ezee_rate_type_id    = EXCLUDED.ezee_rate_type_id,
  base_price_per_night = EXCLUDED.base_price_per_night,
  is_active            = EXCLUDED.is_active;
