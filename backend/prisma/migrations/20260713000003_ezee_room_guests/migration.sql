-- Per-sub-booking room + guest snapshot for multi-room eZee reservations.
-- A reservation with N rooms arrives as ONE payload (UniqueID) with N BookingTrans; we cache it
-- as ONE row, so everything past BookingTran[0] (room number, guest name, guest phone) was being
-- dropped. That made the 2nd room's guest unrecognisable on WhatsApp and mislabelled the 1st.
ALTER TABLE "ezee_booking_cache"
  ADD COLUMN "ezee_room_guests_json" JSONB;
