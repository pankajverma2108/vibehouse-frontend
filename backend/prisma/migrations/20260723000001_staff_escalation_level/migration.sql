-- Position-based escalation ladder.
--
-- The escalation ladder used to be resolved by ROLE NAME: escalation_levels(property,
-- level) held a `role` string, and the engine paged "staff whose role == that string".
-- That coupled the ladder to role names — renaming/replacing a role orphaned the ladder.
--
-- New model: a staff member holds a ladder POSITION directly. The engine pages "whoever
-- is at position N for this property", resolved by this integer alone. Role names become
-- irrelevant to escalation (they still drive department assignment, a separate concern).

-- 1. The position column (NULL = not on the ladder).
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "escalation_level" INTEGER;

-- 2. Resolution index (property + position + active).
CREATE INDEX IF NOT EXISTS "idx_staff_escalation"
  ON "staff" ("property_id", "escalation_level", "is_active");

-- 3. Backfill positions from the existing staff-backed ladder so nothing regresses.
--    Each staff member inherits the LOWEST level their (property, role) occupied.
--    (admin_users-backed rungs are intentionally NOT migrated — the ladder is now
--    staff-only; managers/owners who must be paged get a staff row with a position.)
UPDATE "staff" s
   SET "escalation_level" = sub.min_level
  FROM (
        SELECT el."property_id", el."role", MIN(el."level") AS min_level
          FROM "escalation_levels" el
         WHERE el."lookup_source" = 'staff'
           AND el."is_active" = true
         GROUP BY el."property_id", el."role"
       ) sub
 WHERE sub."property_id" = s."property_id"
   AND sub."role" = s."role"
   AND s."escalation_level" IS NULL;
