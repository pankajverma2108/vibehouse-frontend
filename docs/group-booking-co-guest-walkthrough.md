# Group Booking Co-Guest Walkthrough

Date: 2026-04-22
Owner: Booking / Web Check-In

## Goal

Provide a dynamic and safe co-guest check-in flow for all reservation types and room types without hardcoding reservation patterns.

This applies to all room types, including but not limited to:
- 4 Bed Mixed Dormitory
- Deluxe Room (2 pax max)
- 6 Bed Mixed Dormitory
- 4 Bed Dormitory Female
- 6 Bed Dormitory Female

## Key Concept: Reservation-Level Link, Slot-Level Check-In

- Shared link stays reservation-level: `/bookings/{eri}/web-check-in`
- Slot handling is fully dynamic from API response (`/guest/kyc/:eri/slots`)
- No hardcoded assumptions on reservation suffixes (for example `65-1`, `65-2`, `65-3`)

## eZee Parent/Child Reservation IDs

In eZee PMS, group booking can appear as:
- Parent reservation number (for example `65`)
- Child/sub-reservations (for example `65-1`, `65-2`, `65-3`)

On Vibehouse frontend, we use reservation ERI as the route key and derive editable guest slots from API contracts, not from string parsing of reservation numbers.

## Runtime Flow

1. Primary guest opens My Bookings and clicks Confirmation Receipt.
2. App routes to `/bookings/{eri}/web-check-in`.
3. Web check-in loads reservation + slot data via:
- `POST /guest/booking/link`
- `GET /guest/kyc/:eri/slots`
4. Payment safety gate runs first:
- If booking status is pending payment, KYC is blocked and payment state is shown.
5. Slot behavior:
- If exactly one editable slot exists: auto-open that slot.
- If multiple editable slots exist: show guest-slot picker and require explicit selection.
6. After slot selection, KYC detail is loaded for that slot:
- `GET /guest/kyc/:eri/slots/:slotId`
7. User completes KYC steps and submits:
- `POST /guest/kyc/:eri/slots/:slotId/submit`
8. If all slots become completed (`PRE_VERIFIED`/`VERIFIED`), route to confirmed page.

## Why Guest 2 May Not Auto-Land Without Picker

A reservation-level shared link does not contain slot identity by design.

With multiple editable slots, auto-selecting the first slot can open the wrong guest context. The slot-picker gate removes this ambiguity safely.

## Safety and Error Handling

- Authentication required for all KYC APIs.
- Slot edit permissions rely on backend `can_edit` and slot status checks.
- If no editable slots are available, user sees a clear blocked state with next action.
- If slot open fails, inline and toast errors are shown.
- If payment is pending, KYC is blocked before any slot actions.

## QA Checklist

1. Single-slot booking:
- Open web-check-in and verify direct form load (no picker).

2. Multi-slot booking (2 or more guests):
- Open web-check-in and verify slot picker appears first.
- Select each slot and verify correct detail loads.

3. Secondary guest path:
- Open shared link with secondary account.
- Verify only backend-authorized editable slots are selectable.

4. Completion behavior:
- Mark all slots completed and verify redirect to `/bookings/{eri}/confirmed`.

5. Payment gate:
- Set status to pending payment and verify KYC form is blocked.

6. Domain/share consistency:
- Confirm share links resolve to live origin, not preview domain.

## Source References

- `components/booking/pre-arrival-page.tsx`
- `components/booking/booking-confirmed-page.tsx`
- `lib/booking-api.ts`
- `guidelines/Vibehouse_docs/api_routes/05_booking_linking_and_kyc.md`
- `guidelines/Vibehouse_docs/api_routes/07_guest_booking.md`
- `guidelines/Vibehouse_docs/api_routes/11_ezee_pms (1).md`
