-- Brand-wide catalog of staff role types, so ops can add roles (e.g. SUPERVISOR)
-- via /admin/staff-roles instead of re-seeding / code changes.

CREATE TABLE "staff_roles" (
    "id"         VARCHAR(36)  NOT NULL,
    "name"       VARCHAR(30)  NOT NULL,
    "label"      VARCHAR(60),
    "is_active"  BOOLEAN      NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_roles_name_key" ON "staff_roles" ("name");

-- Backfill in SQL so prod is correct even if the ts-node seed is skipped
-- (ts-node is broken in the prod image — see setup doc).
-- 1) the canonical launch roles.
INSERT INTO "staff_roles" ("id", "name", "label")
VALUES
    (gen_random_uuid()::text, 'HOUSEKEEPING', 'Housekeeping'),
    (gen_random_uuid()::text, 'MAINTENANCE',  'Maintenance'),
    (gen_random_uuid()::text, 'FRONT_OFFICE', 'Front Office'),
    (gen_random_uuid()::text, 'TEAM_LEAD',    'Team Lead')
ON CONFLICT ("name") DO NOTHING;

-- 2) any role already in use on the staff roster, so no existing staff row becomes
--    unvalidatable against the new catalog.
INSERT INTO "staff_roles" ("id", "name")
SELECT gen_random_uuid()::text, s."role"
FROM (SELECT DISTINCT "role" FROM "staff" WHERE "role" IS NOT NULL AND "role" <> '') s
ON CONFLICT ("name") DO NOTHING;
