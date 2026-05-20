# Source Audit Checklist

## Purpose

Provide a source-repo-oriented checklist for extracting auth and booking architecture from `Vibehouse_frontend` without mixing in target-side implementation work.

## Status

Foundation checklist created.

## Why This Exists

`docs/migration/checklist.md` is useful as target migration context, but it mixes source analysis with target implementation work.

This checklist exists to keep the source repo focused on:

- architecture extraction
- behavioral analysis
- flow documentation
- state lifecycle mapping
- route analysis
- API orchestration analysis
- reusable abstraction identification

## Source Audit Checklist

- [x] Confirm source scope remains auth and booking only
  Verified against `docs/booking-auth-migration/MASTERPLAN.md`, `docs/booking-auth-migration/MIGRATION_RULES.md`, and the live audited source surfaces. Guest-store and other adjacent modules were only included when they directly proved booking-scoped route behavior.
- [x] Identify source auth entry points
  Verified in `components/auth/guest-auth-provider.tsx`, `components/auth/guest-auth-modal.tsx`, `components/marketing/navigation.tsx`, `app/profile/page.tsx`, `app/bookings/page.tsx`, `components/booking/booking-checkout-page.tsx`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, and `components/guest/guest-route-gate.tsx`.
- [x] Identify source booking entry points
  Verified in `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `components/marketing/property.tsx`, `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `app/reviewnew/page.tsx`, and `app/bookings/page.tsx`.
- [x] Map route protection and redirect behavior
  Verified in `app/profile/page.tsx`, `components/marketing/navigation.tsx`, `app/guest/page.tsx`, `components/guest/guest-route-gate.tsx`, `app/[bookingId]/guest/layout.tsx`, `app/auth/google/success/page.tsx`, and `app/auth/google/error/google-auth-error-content.tsx`.
- [x] Map session lifecycle and persistence boundaries
  Verified in `components/auth/guest-auth-provider.tsx`, `lib/guest-auth-api.ts`, `lib/property-selection-session.ts`, `lib/booking-session.ts`, `lib/client-cache.ts`, `app/bookings/page.tsx`, and `components/booking/pre-arrival-page.tsx`.
- [x] Map booking draft and booking recovery boundaries
  Verified in `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `components/booking/booking-confirmed-page.tsx`, and `lib/booking-session.ts`.
- [x] Map API orchestration relevant to auth and booking
  Verified in `lib/vibehouse-api.ts`, `lib/guest-auth-api.ts`, `lib/cx-api.ts`, `app/api/cx/rooms/route.ts`, `lib/booking-api.ts`, and `lib/receipt-api.ts`.
- [x] Separate reusable abstractions from source-specific UI structure
  Documented in `AUTH_ARCHITECTURE.md`, `BOOKING_ARCHITECTURE.md`, and `API_PATTERNS.md` using the `directly reusable`, `conceptually reusable`, and `source-specific` classifications.
- [x] Populate architecture docs only from audited source evidence
  Completed in the current pass. Live runtime files were read before documentation changes were made.
- [x] Mark all unresolved areas as pending instead of inferred
  Open items such as token refresh, logout API, profile-update API, and some backend contract details are explicitly marked as `Not found during this pass` or `Pending deeper audit`.
