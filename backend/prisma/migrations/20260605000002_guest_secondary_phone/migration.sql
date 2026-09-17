-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: secondary_phone on guests
--
-- Supports the email-priority guest-matching policy for the autosync flow
-- (see docs/setup/guest-matching-policy.md):
--
-- - Case (iv): a registered guest (e1, p1) gets an OTA booking under (e1, p2).
--   The autosync worker matches by email and stores p2 on `secondary_phone`
--   instead of overwriting the verified primary `phone`.
--
-- - Case (v): an OTA booking arrives with (e2, p1) where p1 is already on
--   another guest's primary phone. We create a shell guest for e2; primary
--   `phone` falls back to NULL (due to the existing `@unique` constraint)
--   and we stash p1 on `secondary_phone` instead so we don't lose it.
--
-- No uniqueness constraint on secondary_phone — multiple guests can share a
-- secondary contact (family member, shared business number, etc.) and we
-- don't want the autosync worker to throw on creation.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "guests"
  ADD COLUMN "secondary_phone" VARCHAR(20);
