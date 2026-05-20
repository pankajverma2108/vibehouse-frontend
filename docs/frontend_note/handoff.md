# Goal
Document how guest check-in status from eZee is captured in the frontend, including which APIs are hit and how a guest with an active booking and arrived/checked-in status gets access to the Guest Hub.

## Current State
We have a written capture of the flow in `docs/status_capture.md`. The frontend logic is already identified: guest auth restores the profile, bookings arrive through the auth responses, and `lib/guest-hub.ts` decides whether a booking is eligible for Guest Hub access based on status and stay dates.

## Files in flight 
- `docs/status_capture.md`
- `docs/frontend_note/handoff.md`

## Changed
- Added `docs/status_capture.md` with the captured API flow, response shape, eligibility rules, and eZee-to-frontend status path.
- Added this handoff note for the current chat only.

## Failed attempts 
- Live browser interaction was partially unreliable during simulation: evaluator scripts errored, and some form targeting calls did not resolve correctly.
- I did not get a clean terminal-driven dev session from `npm run dev` in the current context; it exited with code 1.

# chat2
Purpose: capture the add-ons/catalog mismatch investigation, the room-selection persistence fix, and the backend handoff notes for this chat only.

## Goal
Document the add-ons and services flow, keep room selections persistent across navigation, and hand off the backend catalog mismatch clearly so the backend team can fix the response contract without guessing.

## Current State
The frontend code now restores room selections for the same property even when dates change, and the booking review catalog code is typed safely after the recent TS fixes. The add-ons fetch issue is still blocked on the backend returning the wrong response shape from `/guest/store/catalog`.

## Files in flight 
- `components/booking/booking-checkout-page.tsx`
- `components/marketing/property.tsx`
- `lib/booking-api.ts`
- `docs/fe_to_be/guest_store_catalog_mismatch_handoff_2026-05-14.md`

## Changed
- Fixed the booking review catalog response handling so it no longer trips TS diagnostics on wrapped payloads.
- Fixed the property-page room restore flow so it no longer sets state synchronously in the effect body.
- Added a detailed FE-to-BE handoff for the store catalog mismatch.
- Kept the earlier UI changes in place: section rename, ordering, and the Add Services StickerTag.

## Failed attempts 
- Trying to treat the store catalog response as a room availability payload did not work because that would mix two different API domains.
- Keeping the room-selection restore logic tied to exact check-in/check-out dates was too strict and prevented persistence across navigation.
- Leaving typed access to wrapped catalog payloads unguarded caused the `never`-type diagnostics in the booking checkout file.

