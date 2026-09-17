-- Booking occupancy breakdown — adults vs children per booking.
--
-- Today ezee_booking_cache.no_of_guests stores the total but with no split,
-- and the eZee worker hardcodes adults=1, children=0 per room. The FE
-- (BUTEAK first) now captures aggregate adults + children at search time;
-- this migration lets us persist that split so the worker can distribute
-- it across rooms when calling eZee InsertBooking.
--
-- Both columns are nullable so existing rows + the legacy path stay
-- backwards-compatible: when null, the worker falls back to its previous
-- "1 adult per room" behaviour.

ALTER TABLE ezee_booking_cache
  ADD COLUMN IF NOT EXISTS no_of_adults INTEGER,
  ADD COLUMN IF NOT EXISTS no_of_children INTEGER;
