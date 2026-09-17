-- Revert the position-based escalation ladder (migration 20260723000001).
--
-- The ladder goes back to being configured ONCE PER PROPERTY in `escalation_levels`
-- (level → role), with staff inheriting their rung from their role. That table, its
-- admin API (/admin/escalation-levels) and the engine's role lookup were never removed —
-- only the resolver had been switched to read this per-person column instead.
--
-- Why revert: tagging each staff member with their own position meant the ladder had no
-- single place to see or edit, and every new hire needed their rung set by hand. Under
-- the role mapping, adding a receptionist with the role mapped to L1 puts them on the
-- ladder automatically.
--
-- The column is DROPPED rather than left in place: the admin UI renders a staff member's
-- rung, and a column the engine no longer reads would show a number that does nothing.
-- One source of truth, so nothing can silently disagree.

DROP INDEX IF EXISTS "idx_staff_escalation";

ALTER TABLE "staff" DROP COLUMN IF EXISTS "escalation_level";
