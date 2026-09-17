-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: date_of_birth on guests
--
-- Backs the new self-service guest profile-edit endpoint (PATCH /guest/auth/me),
-- which lets an authenticated guest set their legal name, mobile, and DOB.
-- Until now the guests table had no birth-date column at all.
--
-- DATE (date-only, no time/TZ) so it round-trips as YYYY-MM-DD cleanly.
-- Nullable: existing guests stay NULL until they fill it in; the column is
-- optional everywhere (no booking flow requires it).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "guests"
  ADD COLUMN "date_of_birth" DATE;
