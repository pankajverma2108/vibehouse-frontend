-- Admin multi-property: replace the single nullable admin_users.property_id
-- with a many-to-many join table so one admin can manage multiple properties.
--
-- Backfill rules:
--   - Non-owner admins: copy their existing property_id (or '60765' if NULL).
--   - Owners (role_id = 'role-owner'): inserted for every row in properties.
--
-- After backfill we drop admin_users.property_id. The "active property" is no
-- longer a column on admin_users — it is bound at login time and carried in
-- the JWT.

CREATE TABLE "admin_user_properties" (
  "admin_user_id" VARCHAR(36)  NOT NULL,
  "property_id"   VARCHAR(36)  NOT NULL,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "admin_user_properties_pkey" PRIMARY KEY ("admin_user_id", "property_id"),
  CONSTRAINT "admin_user_properties_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "admin_user_properties_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE INDEX "idx_admin_user_properties_property"
  ON "admin_user_properties" ("property_id");

-- Backfill non-owners: keep their assigned property, default to 60765 if NULL.
INSERT INTO "admin_user_properties" ("admin_user_id", "property_id")
SELECT "id", COALESCE("property_id", '60765')
  FROM "admin_users"
 WHERE "role_id" <> 'role-owner'
ON CONFLICT DO NOTHING;

-- Backfill owners: every property in the system.
INSERT INTO "admin_user_properties" ("admin_user_id", "property_id")
SELECT au."id", p."id"
  FROM "admin_users" au
  CROSS JOIN "properties" p
 WHERE au."role_id" = 'role-owner'
ON CONFLICT DO NOTHING;

-- Drop the legacy single-property column. The FK is unnamed-default; Postgres
-- will drop the implicit constraint with the column.
ALTER TABLE "admin_users" DROP COLUMN "property_id";
