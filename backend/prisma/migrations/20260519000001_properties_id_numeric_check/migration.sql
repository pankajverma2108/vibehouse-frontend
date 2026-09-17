-- Formalize the convention that properties.id is the eZee hotel code.
-- Existing rows already follow this format ("60765"); Buteak will be "55402".
-- This CHECK constraint prevents accidental insertion of slug-style IDs
-- like "prop-bandra-001" (which lives in branding_config, not as PK).

ALTER TABLE "properties"
  ADD CONSTRAINT "properties_id_numeric_check"
  CHECK ("id" ~ '^[0-9]+$');
