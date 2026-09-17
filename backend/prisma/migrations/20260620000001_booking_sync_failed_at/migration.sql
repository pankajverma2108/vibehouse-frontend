-- Mark when an eZee InsertBooking has *terminally* failed for a paid booking.
--
-- A booking is CONFIRMED + payment CAPTURED the moment Razorpay capture lands
-- (see PaymentService.fulfilBookingOrder), but the room is only written to eZee
-- later, asynchronously, by the eZee-sync worker (InsertBooking). If eZee is
-- down or the room is out of inventory, that insert fails and — after the SQS
-- retries are exhausted — the message goes to the DLQ with no signal to the
-- guest.
--
-- This column is stamped by the worker ONLY on the terminal SQS attempt
-- (ApproximateReceiveCount >= maxReceiveCount), so a transient blip that
-- recovers within the retry window never flips a booking to "failed". It lets us
-- derive a `booking_sync_status` the website can poll:
--   ezee_reservation_no set -> SYNCED  (takes precedence; self-heals on redrive)
--   ezee_sync_failed_at set -> FAILED
--   neither                 -> PENDING (still finalizing)
--
-- Nullable; legacy rows stay null (treated as PENDING/SYNCED via the derivation).

ALTER TABLE ezee_booking_cache
  ADD COLUMN IF NOT EXISTS ezee_sync_failed_at TIMESTAMP(6);
