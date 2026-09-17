-- Drop staff.is_test, added one migration ago and never used in anger.
--
-- The original design routed a test booking's tickets to test-only staff so a real staffer could
-- never be paged about a room that doesn't exist. That was the wrong trade: it made the test
-- diverge from the real path at exactly the point worth rehearsing (assignment, SLA, escalation),
-- and it needed a parallel roster per property to work at all.
--
-- Test tickets now go to real staff and escalate normally, exactly like a live request. Staff
-- recognise them by the "Test-" room number and are instructed to ignore them. ezee_booking_cache
-- .is_test / zoho_ticket_ref.is_test / breakfast_order.is_test all remain — they still label the
-- Zoho board (cf_is_test) and keep tests out of reported figures. Only the ROUTING split is gone.
--
-- IF EXISTS so this is safe whether or not 20260717000001 reached this database first.

DROP INDEX IF EXISTS "idx_staff_test";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "is_test";
