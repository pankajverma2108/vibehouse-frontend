# UI Handoff: Booking Flow (UI-Only)

Date: 2026-04-15
Scope: Frontend continuity for booking payment, web check-in, and confirmation flows while backend APIs are unavailable.

## Why This Handoff Exists

Backend APIs are currently down, so this handoff focuses on:

- what UI behavior is already implemented,
- what route and flow conventions are now canonical,
- what still needs backend-online validation in the next session.

## Current UI State (Implemented)

1. Canonical booking routes are in place.
2. Legacy alias routes now redirect to the web check-in route.
3. Web check-in is gated when booking payment is still pending.
4. Booking cards and detail pages route users toward the new confirmation/check-in journey.
5. Calendar next-month navigation issue was fixed at CSS layer level.
6. Shared UI helper utilities were introduced for safer error and cache handling.

## Canonical Route Map

- Web check-in page: `/bookings/[eri]/web-check-in`
  - Route entry file: `app/bookings/[eri]/web-check-in/page.tsx`
  - Renders `PreArrivalPage` with decoded reservation ID.

- Confirmation page: `/bookings/[eri]/confirmed`
  - Route entry file: `app/bookings/[eri]/confirmed/page.tsx`
  - Renders `BookingConfirmedPage` with decoded reservation ID.

- Redirect rules (non-permanent):
  - `/bookings/:eri/pre-arrival` -> `/bookings/:eri/web-check-in`
  - `/bookings/:eri` -> `/bookings/:eri/web-check-in`
  - Config file: `next.config.mjs`

Notes:

- Legacy files were removed:
  - `app/bookings/[eri]/page.tsx`
  - `app/bookings/[eri]/pre-arrival/page.tsx`
- The folder `app/bookings/[eri]/pre-arrival/` currently exists but is empty. This is safe but can be removed in a cleanup pass.

## Key UI Behavior Changes

### 1) Payment-First Check-In Gating

File: `components/booking/pre-arrival-page.tsx`

Implemented behavior:

- `isPaymentPendingStatus()` treats these as unpaid:
  - `PENDING_PAYMENT`
  - `PAYMENT_PENDING`
  - `UNPAID`
- During slot loading, booking status is read from `linkGuestBooking(...).booking.status`.
- If status is unpaid:
  - check-in slots are not loaded,
  - editor flow is not shown,
  - user sees a payment-pending state with CTA to view booking status.

Expected UX copy:

- Title: `Payment pending`
- Empty-state heading: `Finish payment to unlock web check-in`

### 2) Checkout Success -> Web Check-In

File: `components/booking/booking-checkout-page.tsx`

After successful payment verification, UI pushes users to:

- `/bookings/{eri}/web-check-in?fresh=1`

### 3) Booking List and Detail CTA Alignment

Files:

- `app/bookings/page.tsx`
- `components/booking/booking-detail-page.tsx`
- `lib/branding.ts`

Implemented behavior:

- Booking card primary CTA opens canonical check-in link.
- Secondary CTA opens canonical confirmation page.
- Shared helper `toBrandCheckinLink()` ensures check-in links resolve to `/bookings/{eri}/web-check-in`.

### 4) Calendar Month Navigation Fix

File: `app/globals.css`

React Day Picker nav layering/pointer behavior was adjusted so next/previous month controls remain clickable:

- caption/nav container uses `pointer-events: none`
- actual arrow buttons use `pointer-events: auto`
- nav button z-index is elevated (`z-index: 30`)

Outcome: next-month navigation works in the property booking calendar.

### 5) Shared UI Safety Helpers

Files:

- `lib/ui-error.ts`
- `lib/client-cache.ts`
- `lib/branding.ts`

Purpose:

- normalize user-safe frontend error messages,
- standardize short-lived sessionStorage caching,
- centralize brand-safe link and display mapping.

### 6) Incoming Stay Confirmed Receipt Design Package

The final confirmation receipt design will be implemented on the Stay Confirmed page.

Target page:

- `/bookings/[eri]/confirmed`

Source package note:

- The user will provide final designs, implementation code, text styles, and assets in the mentioned folder.
- Next session should treat that folder as the source of truth for receipt visual language and typography decisions.

Implementation expectation for next session:

- Apply the provided design package to `BookingConfirmedPage` while preserving current route behavior and booking data bindings.
- Keep the existing confirmation flow intact (payment success -> web check-in -> stay confirmed), and update only presentation layer details unless explicitly requested.

## Backend-Down Constraints (What Cannot Be Fully Validated Right Now)

The following paths need backend availability for complete verification:

1. KYC slot fetch/add/delete behavior.
2. KYC upload URL, upload, OCR extraction, and submit.
3. Booking link status freshness and status transitions.
4. End-to-end completion modal behavior after submit.

Known recent backend symptom to re-check later:

- Submit action previously surfaced a server-side `500` for reservation `EZEE-BAN-50`, with UI fallback message:
  - `Unable to submit web check-in right now.`

## Regression Checklist for Next Session (When APIs Are Back)

1. Sign in with the shared test account.
2. Open `/bookings` and verify card CTAs:
   - Open booking -> web check-in route
   - Stay confirmed -> confirmed route
3. Open a booking with unpaid status:
   - confirm payment-pending gate is shown
   - confirm KYC form is not accessible
4. Open a paid booking:
   - confirm full web check-in form is available
   - validate all 3 steps and slot switching
5. Submit web check-in:
   - expect success toast
   - expect completion modal
   - verify "View Booking" path after modal action
6. Re-test property calendar next-month button on desktop and mobile breakpoints.

## Useful Commands

- `npm run lint`
- `npm run build`

Both were passing at last UI verification pass.

## Suggested Next-Session Order

1. Restore backend/API availability and sanity-check auth/booking endpoints.
2. Execute the regression checklist above in browser.
3. Ingest the new design package from the mentioned folder and apply the confirmation receipt design to the Stay Confirmed page UI.
4. If submit still fails with 500, capture payload + response shape and split issue into frontend vs backend ownership.
5. Clean up empty legacy folder (`app/bookings/[eri]/pre-arrival/`) after final sign-off.
