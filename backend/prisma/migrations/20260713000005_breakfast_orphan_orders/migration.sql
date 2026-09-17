-- Drop breakfast orders orphaned by the move to per-room keys.
--
-- Before 20260713000004, a multi-room reservation could hold only ONE order, keyed on the
-- reservation id; that migration backfilled sub_booking_id = ezee_reservation_id. For a booking
-- whose rooms are real sub-bookings ("109-1", "109-2") that backfilled row now matches no room:
-- the guest re-places their order under the correct room key, and the old row lingers — showing
-- the room twice on the kitchen board and DOUBLE-COUNTING its plates in the forecast (seen live:
-- reservation 109 listing room 206 twice, Omelette x2 for one omelette).
--
-- Only rows that (a) are still keyed on the reservation id AND (b) belong to a reservation whose
-- room snapshot names different sub-bookings are orphans. Anything for a past service date is left
-- alone as history.

DELETE FROM "breakfast_order" o
 WHERE o."sub_booking_id" = o."ezee_reservation_id"
   AND o."service_date" >= CURRENT_DATE
   AND EXISTS (
         SELECT 1
           FROM "ezee_booking_cache" b
          WHERE b."ezee_reservation_id" = o."ezee_reservation_id"
            AND jsonb_array_length(coalesce(b."ezee_room_guests_json", '[]'::jsonb)) > 0
            AND NOT EXISTS (
                  SELECT 1
                    FROM jsonb_array_elements(b."ezee_room_guests_json") rg
                   WHERE rg->>'sub_id' = o."sub_booking_id"
                )
       );
