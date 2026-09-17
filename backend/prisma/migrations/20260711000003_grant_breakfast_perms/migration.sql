-- Data migration: grant breakfast.view / breakfast.edit (added to seed.ts in 41fda8b) to the
-- existing admin roles, IDEMPOTENTLY. Applied to every environment by CI's `prisma migrate
-- deploy`, so prod picks it up on the next deploy WITHOUT running the full `prisma db seed`
-- (which also inserts dev admin users/guests/bookings with a repo-known password and must never
-- touch prod).
--
-- Guarded by jsonb containment (@>) so a re-run is a no-op and existing permissions + their order
-- are preserved (only the missing entries are appended). Scoped to the five roles that get
-- breakfast access — owner, manager, reception, housekeeping-lead, tech-ops (NOT maintenance-lead).
--
-- NOTE: permissions are baked into the admin JWT at LOGIN. After this runs, a logged-in admin must
-- log out/in (or wait for the ~15-min access token to refresh) before the breakfast nav/route stops
-- 403'ing — the DB grant alone does not retro-actively widen an already-issued token.

UPDATE "admin_roles"
   SET permissions = permissions || '["breakfast.view"]'::jsonb
 WHERE id IN ('role-owner', 'role-manager', 'role-reception', 'role-housekeeping-lead', 'role-tech-ops')
   AND NOT (permissions @> '["breakfast.view"]'::jsonb);

UPDATE "admin_roles"
   SET permissions = permissions || '["breakfast.edit"]'::jsonb
 WHERE id IN ('role-owner', 'role-manager', 'role-reception', 'role-housekeeping-lead', 'role-tech-ops')
   AND NOT (permissions @> '["breakfast.edit"]'::jsonb);
