-- Test bookings: an admin-made booking that drives the guest flows (WhatsApp bot, breakfast)
-- against a LIVE property without occupying a sellable room.
--
-- Purely additive. Every column defaults FALSE, so every existing row — and every row eZee
-- ingests from here on — is real and behaves exactly as before. Only POST /admin/bookings/test
-- ever sets the flag true. Reverting the application code leaves these columns inert.
--
-- The flag is denormalised onto tickets and breakfast orders rather than joined back to the
-- booking: breakfast_order.ezee_reservation_id is a scalar-only cross-domain FK with no Prisma
-- relation to join through, and pinning it on the ticket follows the assigned_staff_name
-- precedent (the ticket keeps its own truth) while keeping every hot-path filter single-table.

ALTER TABLE "ezee_booking_cache" ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "staff"              ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "zoho_ticket_ref"    ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "breakfast_order"    ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;

-- Serves the reporting exclusions (dashboard bookings/revenue, breakfast participation), which
-- all filter property_id + is_test.
CREATE INDEX "idx_ezee_cache_test" ON "ezee_booking_cache" ("property_id", "is_test");
