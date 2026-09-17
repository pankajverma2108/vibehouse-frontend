-- Onboard Buteak Suites (eZee hotel code 55402) as the second property.
-- Buteak is a separately branded property on its own domain (buteak.in) with:
--   - eZee for PMS (no MyGate smart locks)
--   - Email from noreply@buteak.in (SES domain identity verified separately)
--   - No events, no amenities sections, no colive long-stay (features flagged off)
--
-- The eZee api_key is a PLACEHOLDER. The real AUTH_CODE lives in SSM at
-- /tds/prod/EZEE_AUTH_CODE_55402 and is patched in via a post-migration
-- UPDATE so the secret never enters the git history.

-- ─── Property ──────────────────────────────────────────────────────────────
INSERT INTO "properties" ("id", "name", "address", "city", "branding_config", "created_at")
VALUES (
  '55402',
  'Buteak Suites',
  'BTM Layout, Bangalore, Karnataka',
  'Bangalore',
  '{
    "brand": "buteak",
    "brand_name": "Buteak Suites",
    "domain": "www.buteak.in",
    "primary_color_hex": "#d4a437",
    "secondary_color_hex": "#0b3c49",
    "accent_color_hex": "#ffffff",
    "logo_url": "/brands/buteak/logo.png",
    "support_email": "noreply@buteak.in",
    "features": {
      "events": false,
      "amenities": false,
      "colive": false,
      "smart_lock": false
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- ─── eZee connection (placeholder api_key — patch from SSM after migration) ─
INSERT INTO "ezee_connection" ("id", "property_id", "hotel_code", "api_key", "api_endpoint", "is_active", "created_at")
VALUES (
  'ezeeconn-buteak-001',
  '55402',
  '55402',
  'PLACEHOLDER_REPLACE_FROM_SSM_EZEE_AUTH_CODE_55402',
  'https://live.ipms247.com/',
  true,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- ─── Patch TDS property branding_config to add the features block ──────────
-- (idempotent — uses jsonb merge so existing keys like brand_name are preserved)
UPDATE "properties"
SET "branding_config" = COALESCE("branding_config", '{}'::jsonb) || '{
  "domain": "www.thedailysocial.co.in",
  "support_email": "noreply@thedailysocial.co.in",
  "features": {
    "events": true,
    "amenities": true,
    "colive": true,
    "smart_lock": true
  }
}'::jsonb
WHERE "id" = '60765';
