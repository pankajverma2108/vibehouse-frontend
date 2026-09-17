-- Persist eZee folio totals on the booking cache so the admin dashboard can
-- report TOTAL revenue (incl. OTA + walk-in) and not just Razorpay-captured.
--
-- Today the dashboard's "Gross revenue" reads only `payments` (CAPTURED), which
-- is empty for OTA / walk-in bookings (the guest paid the OTA, not us). The
-- eZee autosync payload carries the per-sub-reservation folio totals
-- (BookingTran[].TotalAmountAfterTax / TotalAmountBeforeTax); we currently
-- discard them. These columns let the worker persist the booking-level sum.
--
-- IMPORTANT (reporting caveat, documented for whoever reads this later):
-- For OTA bookings the folio total is the GUEST-FACING rate — gross of the
-- OTA's commission, which is deducted out of band. So a "total revenue" tile
-- built on this is gross-of-commission, not the hotel's net collection.
--
-- Both nullable: only set once an autosync push (or our own InsertBooking
-- confirmation) carries the totals. Legacy rows + bookings made before this
-- migration stay null and are simply excluded from the OTA-revenue sum.

ALTER TABLE ezee_booking_cache
  ADD COLUMN IF NOT EXISTS folio_total_after_tax  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS folio_total_before_tax NUMERIC(10,2);
