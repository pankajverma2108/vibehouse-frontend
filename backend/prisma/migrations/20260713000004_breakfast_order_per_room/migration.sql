-- Breakfast orders are per ROOM, not per RESERVATION.
--
-- A multi-room eZee booking is ONE reservation (UniqueID, e.g. "109") carrying one BookingTran
-- per room ("109-1" = room 206, "109-2" = room 207) — and we cache it as a SINGLE
-- ezee_booking_cache row. breakfast_order was unique on (ezee_reservation_id, service_date), so
-- the whole reservation had exactly one order: the first room to order consumed it and every
-- other room in the booking was locked out entirely.
--
-- Key each order to its sub-booking instead. Existing rows are single-room in practice, so their
-- sub_booking_id backfills to the reservation id (which is also what the room key falls back to
-- when eZee gives us no sub-booking).

ALTER TABLE "breakfast_order" ADD COLUMN "sub_booking_id" VARCHAR(100);

UPDATE "breakfast_order" SET "sub_booking_id" = "ezee_reservation_id" WHERE "sub_booking_id" IS NULL;

ALTER TABLE "breakfast_order" ALTER COLUMN "sub_booking_id" SET NOT NULL;

DROP INDEX IF EXISTS "uq_breakfast_order_eri_date";

CREATE UNIQUE INDEX "uq_breakfast_order_eri_sub_date"
    ON "breakfast_order" ("ezee_reservation_id", "sub_booking_id", "service_date");
