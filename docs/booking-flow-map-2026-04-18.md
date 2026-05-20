# Booking Flow Map

Date: 2026-04-18
Owner: Booking/Web Check-In flow

## Canonical Flow (Current)

- Payment success sends user to `/bookings?fresh={reservationId}`.
- On My Bookings, each Confirmation Receipt card decides destination by KYC completion state:
  - KYC complete -> `/bookings/{eri}/confirmed`
  - KYC incomplete -> `/bookings/{eri}/web-check-in`
- During web check-in, unpaid booking statuses are gated and user cannot proceed with KYC form.
- During web check-in, multi-slot reservations now require explicit guest-slot selection before KYC form steps begin.
- Legacy route `/bookings/:eri/pre-arrival` still redirects to `/bookings/:eri/web-check-in`.
- `/bookings/:eri` page route has been removed from active flow.

## Mermaid Diagram

```mermaid
flowchart TD
    A[Checkout payment verified] --> B[/bookings?fresh={eri}]
    B --> C[My Bookings page]
    C --> D[User clicks Confirmation Receipt]
    D --> E{kyc_completed_slots >= total_slots?}

    E -- Yes --> F[/bookings/{eri}/confirmed]
    E -- No --> G[/bookings/{eri}/web-check-in]

    G --> H{booking.status unpaid?\nPENDING_PAYMENT|PAYMENT_PENDING|UNPAID}
    H -- Yes --> I[Show Payment Pending gate\nNo KYC form access]
    H -- No --> J{Multiple editable slots?}
    J -- Yes --> K[Select guest slot first]
    J -- No --> L[Open the only editable slot]
    K --> M[Complete Web Check-In\nBasic Info -> Gov ID -> Time]
    L --> M
    M --> N[Submit KYC success]
    N --> F
```

## Source of Truth in Code

- Payment success redirect:
  - `components/booking/booking-checkout-page.tsx`
- Confirmation receipt destination decision (`bookingCardHref`):
  - `app/bookings/page.tsx`
- Check-in link helper:
  - `lib/branding.ts` (`toBrandCheckinLink`)
- Web check-in route entry:
  - `app/bookings/[eri]/web-check-in/page.tsx`
- Stay confirmed route entry:
  - `app/bookings/[eri]/confirmed/page.tsx`
- Payment-pending gating logic:
  - `components/booking/pre-arrival-page.tsx`

## Quick Regression Checks

1. Complete payment and verify redirect to `/bookings?fresh={eri}`.
2. Confirm toast appears on My Bookings for `fresh` reservation.
3. Click receipt where KYC incomplete -> lands on `/bookings/{eri}/web-check-in`.
4. Click receipt where KYC complete -> lands on `/bookings/{eri}/confirmed`.
5. For unpaid status in web check-in route, verify payment-pending gate renders and KYC form is blocked.
6. For bookings with 2+ editable slots, verify guest-slot picker appears before stepper/form.
7. For bookings with a single editable slot, verify web check-in opens directly without slot-picker friction.
