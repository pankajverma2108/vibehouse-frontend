-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: restrict `dashboard.view` permission to OWNER + MANAGER only.
--
-- Previously every role (including RECEPTION, HOUSEKEEPING_LEAD, MAINTENANCE_LEAD)
-- carried `dashboard.view`, which would let those roles call the new
-- /admin/dashboard/* BI endpoints. Business rule is: only owners and property
-- managers see the BI dashboard. Revoke the permission from everyone else.
--
-- OWNER and MANAGER also have `dashboard.analytics` (kept untouched).
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE "admin_roles"
SET "permissions" = (
  SELECT jsonb_agg(p)
  FROM jsonb_array_elements_text("permissions") AS p
  WHERE p NOT IN ('dashboard.view', 'dashboard.analytics')
)
WHERE "id" IN ('role-reception', 'role-housekeeping-lead', 'role-maintenance-lead');

-- Defensive: in case the role had ONLY `dashboard.view` permission, jsonb_agg
-- returns NULL — coerce back to an empty array so the column never goes NULL.
UPDATE "admin_roles"
SET "permissions" = '[]'::jsonb
WHERE "permissions" IS NULL;
