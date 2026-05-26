# Implementation Log

## Purpose

Track progress for the source-side booking/auth migration documentation effort in `Vibehouse_frontend`.

## Status

Initialized.

## Project Start Note

Epic 1 documentation foundation started in the source/reference repo.

## Current Status

- documentation foundation created under `docs/booking-auth-migration/`
- master planning rules established
- unaudited architecture files intentionally left as placeholders

## Source Repo Role

This repo is the source architecture reference for auth and booking migration work targeting `buteak_website`.

The current effort documents how to audit and extract behavior safely. It does not implement target-side migration inside this repo.

## Next Step

Generate source repo intelligence for:

- auth architecture
- booking architecture
- route behavior
- session lifecycle
- persistence behavior
- API orchestration behavior

## Log Entry Template

Use the following format for future updates:

### YYYY-MM-DD - Short Title

- status:
- objective:
- files reviewed:
- findings:
- blockers:
- next step:

### 2026-05-26 - Source route and API reference for Buteak canonical routing

- status: completed
- objective: create a docs-only source-reference note explaining how `Vibehouse_frontend` currently handles property, room, booking, auth, payment, confirmation, and guest APIs so `buteak_website` can adapt the backend-facing behavior while keeping its own canonical route set.
- files reviewed: `docs/booking-auth-migration/BOOKING_ARCHITECTURE.md`, `docs/booking-auth-migration/BOOKING_FLOW_MAP.md`, `docs/booking-auth-migration/API_PATTERNS.md`, `docs/booking-auth-migration/BOOKING_STATE_MACHINE.md`, `docs/booking-auth-migration/SESSION_LIFECYCLE.md`, `docs/booking-auth-migration/IMPLEMENTATION_LOG.md`, `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `app/bookingreview/page.tsx`, `app/bookings/page.tsx`, `app/guest/page.tsx`, `app/[bookingId]/guest/layout.tsx`, `app/auth/google/success/page.tsx`, `components/auth/guest-auth-provider.tsx`, `components/guest/guest-route-gate.tsx`, `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `lib/vibehouse-api.ts`, `lib/guest-auth-api.ts`, `lib/property-resolver.ts`, `lib/cx-api.ts`, `app/api/cx/rooms/route.ts`, `lib/booking-api.ts`, `lib/booking-session.ts`, and `lib/property-selection-session.ts`
- findings: Vibehouse source behavior remains centered on numeric `property_id` resolution, frontend-persisted nightly booking drafts, `POST /guest/booking/create-order` followed by `POST /payment/create-booking-order`, Razorpay modal checkout, frontend-triggered `POST /payment/verify`, and booking-identity-driven post-booking routes using `ezee_reservation_id`; Buteak can reuse the sequencing, identity boundaries, and persistence patterns conceptually, but must not copy Vibehouse route names, source host and brand mappings, hardcoded property defaults, Colive branches, or temporary guest-hub override behavior directly.
- docs changed: `docs/booking-auth-migration/SOURCE_ROUTE_API_REFERENCE_FOR_BUTEAK.md` and `docs/booking-auth-migration/IMPLEMENTATION_LOG.md`
- blockers: no runtime blockers; remaining unknowns are backend-owned details already called out in the source docs, including coupon validation ownership, webhook reconciliation, and any future target-side route rewiring decisions.
- next step: use `SOURCE_ROUTE_API_REFERENCE_FOR_BUTEAK.md` as the source-side bridge doc when mapping Buteak canonical routes onto the shared backend flow, without treating Vibehouse route names as canonical target requirements.

### 2026-05-20 - Source auth and booking architecture audit

- status: completed
- objective: populate source-side auth, booking, route, session, and API intelligence for `Vibehouse_frontend` using inspected live source files only.
- files reviewed: `app/layout.tsx`, `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `app/reviewnew/page.tsx`, `app/bookings/page.tsx`, `app/bookings/loading.tsx`, `app/bookings/[eri]/confirmed/page.tsx`, `app/bookings/[eri]/loading.tsx`, `app/bookings/[eri]/web-check-in/page.tsx`, `app/auth/google/success/page.tsx`, `app/auth/google/error/page.tsx`, `app/auth/google/error/google-auth-error-content.tsx`, `app/guest/page.tsx`, `app/guest/layout.tsx`, `app/guest/services/page.tsx`, `app/guest/addons/page.tsx`, `app/guest/guide/page.tsx`, `app/guest/checkout/page.tsx`, `app/guest/review/page.tsx`, `app/guest/error.tsx`, `app/[bookingId]/guest/layout.tsx`, `app/[bookingId]/guest/page.tsx`, `app/[bookingId]/guest/services/page.tsx`, `app/[bookingId]/guest/addons/page.tsx`, `app/[bookingId]/guest/guide/page.tsx`, `app/[bookingId]/guest/checkout/page.tsx`, `app/[bookingId]/guest/review/page.tsx`, `components/auth/guest-auth-provider.tsx`, `components/auth/guest-auth-modal.tsx`, `components/auth/guest-verification-banner.tsx`, `components/marketing/navigation.tsx`, `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, `components/guest/guest-route-gate.tsx`, `hooks/use-download-receipt.ts`, `lib/vibehouse-api.ts`, `lib/guest-auth-api.ts`, `lib/cx-api.ts`, `app/api/cx/rooms/route.ts`, `lib/booking-api.ts`, `lib/booking-session.ts`, `lib/property-selection-session.ts`, `lib/client-cache.ts`, `lib/receipt-api.ts`, `lib/guest-hub.ts`, `state/guest-experience-provider.tsx`, `modules/guest/dashboard.tsx`, `modules/guest/services.tsx`, `modules/guest/addons.tsx`, `modules/guest/guide.tsx`, and `modules/guest/checkout.tsx`
- findings: auth is a client-token model mounted globally through `GuestAuthProvider`, restored through `/guest/auth/me`, and routed through modal-based sign-in/sign-up/OTP/2FA/forgot-password plus a Google callback validator; nightly booking is a `/property` -> `BookingDraft` -> `/bookingreview` -> booking order -> payment order -> Razorpay -> `/payment/verify` -> `/bookings` flow with sessionStorage draft persistence, pending-order reuse, local confirmation fallback, and pre-arrival KYC routing; guest hub routing is booking-scoped and adjacent to booking, with a temporary date-range-based eligibility override in `lib/guest-hub.ts`.
- docs changed: `docs/booking-auth-migration/AUTH_ARCHITECTURE.md`, `docs/booking-auth-migration/BOOKING_ARCHITECTURE.md`, `docs/booking-auth-migration/AUTH_FLOW_MAP.md`, `docs/booking-auth-migration/BOOKING_FLOW_MAP.md`, `docs/booking-auth-migration/SESSION_LIFECYCLE.md`, `docs/booking-auth-migration/BOOKING_STATE_MACHINE.md`, `docs/booking-auth-migration/API_PATTERNS.md`, `docs/booking-auth-migration/SOURCE_AUDIT_CHECKLIST.md`, and `docs/booking-auth-migration/IMPLEMENTATION_LOG.md`
- blockers: no runtime blockers; unresolved items are documentation gaps only, mainly the absence of an audited token refresh flow, logout API, backend profile update API, and some backend-side decision rules such as when signup returns `otp_sent`
- next step: use these audited source docs as the source-of-truth evidence set for any later source-vs-target comparison, and keep any new claims gated behind another inspected-source pass.

### 2026-05-21 - Epic 3 Auth System Audit

- phase: Epic 3 Auth System Audit
- status: completed
- objective: deepen and tighten the auth-system audit using inspected source files only, expand the auth docs with entry-point coverage, flow diagrams, session lifecycle detail, API shapes, risk notes, and checklist/log updates, while modifying only `docs/booking-auth-migration/`.
- files reviewed: `app/layout.tsx`, `app/auth/google/success/page.tsx`, `app/auth/google/error/google-auth-error-content.tsx`, `app/profile/page.tsx`, `app/bookings/page.tsx`, `app/guest/page.tsx`, `app/guest/services/page.tsx`, `app/guest/addons/page.tsx`, `app/guest/guide/page.tsx`, `app/guest/checkout/page.tsx`, `app/guest/review/page.tsx`, `app/guest/borrow/page.tsx`, `app/guest/extend/page.tsx`, `app/guest/lost-found/page.tsx`, `app/[bookingId]/guest/layout.tsx`, `components/auth/guest-auth-provider.tsx`, `components/auth/guest-auth-modal.tsx`, `components/auth/guest-verification-banner.tsx`, `components/marketing/navigation.tsx`, `components/marketing/property.tsx`, `components/colive/colive-flow.tsx`, `components/booking/booking-checkout-page.tsx`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, `components/guest/guest-route-gate.tsx`, `components/guest/guest-access-state.tsx`, `state/guest-experience-provider.tsx`, `modules/guest/dashboard.tsx`, `modules/guest/services.tsx`, `modules/guest/addons.tsx`, `modules/guest/checkout.tsx`, `lib/guest-auth-api.ts`, and `lib/vibehouse-api.ts`
- key findings: mounted auth is still owned entirely by `GuestAuthProvider` plus `GuestAuthModal`; the app uses bearer-token storage in localStorage or sessionStorage with `/guest/auth/me` as the restore/validation path; Google auth is a callback-token restore flow rather than a cookie-session flow; route protection is client-side and mixed between redirects, soft gates, and modal prompts; booking and guest-hub flows depend directly on `guest.bookings`, booking-specific resume intent, and token presence; no verified refresh-token flow, logout endpoint, middleware guard, or backend profile update endpoint was found during this pass.
- docs changed: `docs/booking-auth-migration/AUTH_ARCHITECTURE.md`, `docs/booking-auth-migration/AUTH_FLOW_MAP.md`, `docs/booking-auth-migration/SESSION_LIFECYCLE.md`, `docs/booking-auth-migration/API_PATTERNS.md`, `docs/booking-auth-migration/SOURCE_AUDIT_CHECKLIST.md`, and `docs/booking-auth-migration/IMPLEMENTATION_LOG.md`
- blockers/unknowns: backend rule for when signup returns `otp_sent` remains unverified from frontend source; refresh-token lifecycle, logout endpoint, formal server-side route protection, and backend profile update behavior were not found during this pass.
- next action: use these docs as the source-auth evidence set for later source-vs-target comparison work, and only add new auth claims after another inspected-source pass.

### 2026-05-21 - Epic 4 Booking System Audit

- phase: Epic 4 Booking System Audit
- status: completed
- objective: perform a deep source-only audit of booking entry points, room or property selection, nightly booking draft lifecycle, checkout sequencing, payment orchestration, confirmation and pre-arrival behavior, recovery rules, booking state transitions, API surface, and migration risks, while modifying only `docs/booking-auth-migration/`.
- files reviewed: `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `app/reviewnew/page.tsx`, `app/bookings/page.tsx`, `app/bookings/[eri]/confirmed/page.tsx`, `app/bookings/[eri]/web-check-in/page.tsx`, `app/guest/page.tsx`, `app/[bookingId]/guest/layout.tsx`, `app/layout.tsx`, `app/api/cx/rooms/route.ts`, `components/marketing/widgets/booking-widget.tsx`, `components/marketing/pages/home-sections.tsx`, `components/marketing/navigation.tsx`, `components/marketing/mobile-staggered-menu.tsx`, `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, `components/guest/guest-route-gate.tsx`, `components/standalone/partner-upcoming-pages.tsx`, `components/auth/guest-auth-provider.tsx`, `hooks/use-download-receipt.ts`, `lib/vibehouse-api.ts`, `lib/cx-api.ts`, `lib/booking-api.ts`, `lib/receipt-api.ts`, `lib/booking-session.ts`, `lib/property-selection-session.ts`, `lib/client-cache.ts`, `lib/property-resolver.ts`, `lib/guest-hub.ts`, `state/guest-experience-provider.tsx`, and `content/nav-menu.ts`
- key findings: nightly booking entry is centered on `/property` and normalized through `property_id`, `checkin`, and `checkout` handling across `app/page.tsx`, `app/rooms/page.tsx`, `components/marketing/widgets/booking-widget.tsx`, and `components/marketing/property.tsx`; room discovery is a two-layer model where `app/api/cx/rooms/route.ts` validates query input and `lib/cx-api.ts` merges `/guest/booking/rooms` catalog data with `/guest/booking/availability` live data; nightly draft persistence is frontend-only through `lib/booking-session.ts` and `lib/property-selection-session.ts`, with no verified server-side draft API or expiry worker found during this pass; checkout is owned by `components/booking/booking-checkout-page.tsx` and sequences guest detail validation, add-on selection, `POST /guest/booking/create-order`, `POST /payment/create-booking-order`, Razorpay modal checkout, `POST /payment/verify`, local confirmation snapshot save, and `/bookings` transition; confirmation, receipt, pre-arrival KYC, and guest-hub access all reuse `ezee_reservation_id` as the main booking identifier through `lib/booking-api.ts`, `lib/receipt-api.ts`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, and `components/guest/guest-route-gate.tsx`.
- docs changed: `docs/booking-auth-migration/BOOKING_ARCHITECTURE.md`, `docs/booking-auth-migration/BOOKING_FLOW_MAP.md`, `docs/booking-auth-migration/BOOKING_STATE_MACHINE.md`, `docs/booking-auth-migration/SESSION_LIFECYCLE.md`, `docs/booking-auth-migration/API_PATTERNS.md`, `docs/booking-auth-migration/SOURCE_AUDIT_CHECKLIST.md`, and `docs/booking-auth-migration/IMPLEMENTATION_LOG.md`
- blockers/unknowns: no frontend-confirmed nightly coupon-validation endpoint, webhook-style payment reconciliation path, invoice-specific delivery pipeline, or server-side abandoned-draft cleanup process was found during this pass; the temporary guest-hub eligibility widening in `lib/guest-hub.ts` is visible, but backend ownership of that rule remains pending deeper audit.
- next action: use these Epic 4 booking docs as the source-of-truth evidence set for later source-vs-target comparison and keep any additional booking claims gated behind another inspected-source pass.
