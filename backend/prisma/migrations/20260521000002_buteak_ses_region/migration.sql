-- Route Buteak (55402) emails through SES in ap-south-2.
-- TDS stays on the existing default (ap-south-1, picked up from AWS_REGION env
-- var by EmailService when branding_config.ses_region is missing).
--
-- Why ap-south-2: the original ap-south-1 production-access case for TDS is
-- stuck in a UI loop (case 177625154900816 expired before we could respond).
-- Buteak gets a fresh production-access path in ap-south-2 — independent of
-- the Mumbai stuck case. Full context: docs/miscellenous/ses_production_access_status.md
-- Migration plan: docs/plans/ses_buteak_ap_south_2_migration.md
--
-- Note: this is purely a JSON merge — no schema change required. Idempotent.

UPDATE "properties"
SET "branding_config" = COALESCE("branding_config", '{}'::jsonb)
  || '{"ses_region": "ap-south-2"}'::jsonb
WHERE "id" = '55402';
