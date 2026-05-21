# Source Audit Checklist

## Purpose

Provide a source-repo-only checklist for extracting audited auth and booking architecture from `Vibehouse_frontend`.

## Status

Auth and booking audit updated on 2026-05-21 from inspected source files only.

## Source Audit Checklist

- [x] Confirm source scope remains auth and booking only
  Verified against `docs/booking-auth-migration/MASTERPLAN.md`, `docs/booking-auth-migration/MIGRATION_RULES.md`, and the inspected auth and booking surfaces.

- [x] Identify mounted auth provider and hook ownership
  Verified in `app/layout.tsx`, `components/auth/guest-auth-provider.tsx`, and `components/auth/guest-auth-modal.tsx`.

- [x] Identify login entry points
  Verified in `components/marketing/navigation.tsx`, `app/profile/page.tsx`, `app/bookings/page.tsx`, `components/marketing/property.tsx`, `components/colive/colive-flow.tsx`, `components/booking/booking-checkout-page.tsx`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, `components/guest/guest-access-state.tsx`, `components/guest/guest-route-gate.tsx`, `modules/guest/dashboard.tsx`, `modules/guest/services.tsx`, `modules/guest/addons.tsx`, and `modules/guest/checkout.tsx`.

- [x] Identify signup entry points
  Verified in `components/auth/guest-auth-modal.tsx` and `components/auth/guest-auth-provider.tsx`.

- [x] Identify guest verification entry points
  Verified in `components/auth/guest-verification-banner.tsx`, `components/auth/guest-auth-modal.tsx`, and `components/auth/guest-auth-provider.tsx`.

- [x] Identify Google OAuth entry points and callback handling
  Verified in `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, `lib/guest-auth-api.ts`, `app/auth/google/success/page.tsx`, and `app/auth/google/error/google-auth-error-content.tsx`.

- [x] Identify navigation, profile, and account entry points
  Verified in `components/marketing/navigation.tsx` and `app/profile/page.tsx`.

- [x] Identify auth modal ownership
  Verified in `components/auth/guest-auth-provider.tsx` and `components/auth/guest-auth-modal.tsx`.

- [x] Map login flow
  Verified in `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, and `lib/guest-auth-api.ts`.

- [x] Map signup flow
  Verified in `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, and `lib/guest-auth-api.ts`.

- [x] Map OTP and 2FA flow where present
  Verified in `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, and `lib/guest-auth-api.ts`.

- [x] Map forgot-password and reset-password flow
  Verified in `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, `app/profile/page.tsx`, and `lib/guest-auth-api.ts`.

- [x] Map Google OAuth success and error flow
  Verified in `app/auth/google/success/page.tsx` and `app/auth/google/error/google-auth-error-content.tsx`.

- [x] Identify logout lifecycle
  Verified in `components/auth/guest-auth-provider.tsx`, `components/marketing/navigation.tsx`, and `app/profile/page.tsx`.

- [x] Identify session token creation points
  Verified in `components/auth/guest-auth-provider.tsx` and `app/auth/google/success/page.tsx`.

- [x] Identify token storage medium and storage keys
  Verified in `lib/guest-auth-api.ts` and `components/auth/guest-auth-provider.tsx`.

- [x] Identify session hydration timing and restore behavior
  Verified in `app/layout.tsx` and `components/auth/guest-auth-provider.tsx`.

- [x] Identify session validation behavior
  Verified in `components/auth/guest-auth-provider.tsx`, `lib/guest-auth-api.ts`, and `app/auth/google/success/page.tsx`.

- [x] Identify expired or invalid session cleanup
  Verified in `components/auth/guest-auth-provider.tsx`, `app/auth/google/success/page.tsx`, `components/booking/pre-arrival-page.tsx`, and guest-hub action modules.

- [x] Identify auth state dependencies on booking and guest flows
  Verified in `lib/guest-auth-api.ts`, `app/bookings/page.tsx`, `components/guest/guest-route-gate.tsx`, `app/[bookingId]/guest/layout.tsx`, and `state/guest-experience-provider.tsx`.

- [x] Identify protected-route or soft-gate behavior
  Verified in `app/profile/page.tsx`, `app/bookings/page.tsx`, `app/guest/page.tsx`, `components/guest/guest-route-gate.tsx`, and `app/[bookingId]/guest/layout.tsx`.

- [x] Identify redirect restoration and return-path behavior
  Verified in `lib/guest-auth-api.ts`, `app/auth/google/success/page.tsx`, `components/marketing/property.tsx`, `components/colive/colive-flow.tsx`, and `components/booking/booking-checkout-page.tsx`.

- [x] Identify auth API wrapper files and endpoint usage
  Verified in `lib/vibehouse-api.ts` and `lib/guest-auth-api.ts`.

- [x] Identify request shapes and response shapes visible in source
  Verified in `lib/guest-auth-api.ts`.

- [x] Identify auth error normalization behavior
  Verified in `lib/vibehouse-api.ts` and `components/auth/guest-auth-provider.tsx`.

- [x] Add text diagrams for auth lifecycle, modal flow, Google callback flow, hydration, redirect restore, and auth-state dependency
  Documented in `AUTH_ARCHITECTURE.md`, `AUTH_FLOW_MAP.md`, and `SESSION_LIFECYCLE.md`.

- [x] Document migration risks and source-specific assumptions
  Documented in `AUTH_ARCHITECTURE.md`, `SESSION_LIFECYCLE.md`, and `API_PATTERNS.md`.

- [x] Mark uncertain or missing auth behavior explicitly
  `Not found during this pass.` or scoped uncertainty notes were added where refresh-token behavior, logout endpoint, profile update API, and backend decision rules were not confirmed.

- [ ] Verify backend-side rule for when `signupGuest()` returns `otp_sent`
  Pending deeper audit. Frontend branching is confirmed in `components/auth/guest-auth-provider.tsx`, but the backend rule was not proven from live frontend source.

- [ ] Verify a dedicated refresh-token or silent re-auth flow
  Not found during this pass.

- [ ] Verify a dedicated logout endpoint
  Not found during this pass.

- [ ] Verify a backend profile update endpoint for the profile editor
  Not found during this pass.

- [ ] Verify a formal server-side protected-route system or middleware guard
  Not found during this pass.

## Booking System Audit Checklist

- [x] Identify booking entry points, booking CTAs, and navigation triggers
  Verified in `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `components/marketing/widgets/booking-widget.tsx`, `components/marketing/navigation.tsx`, `components/marketing/mobile-staggered-menu.tsx`, `components/marketing/pages/home-sections.tsx`, `components/marketing/property.tsx`, `components/standalone/partner-upcoming-pages.tsx`, and `content/nav-menu.ts`.

- [x] Identify direct booking routes, booking review routes, checkout routes, confirmation routes, and guest or pre-arrival routes
  Verified in `app/property/page.tsx`, `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `app/reviewnew/page.tsx`, `app/bookings/page.tsx`, `app/bookings/[eri]/confirmed/page.tsx`, `app/bookings/[eri]/web-check-in/page.tsx`, `app/guest/page.tsx`, and `app/[bookingId]/guest/layout.tsx`.

- [x] Identify room and property data sources plus property_id propagation rules
  Verified in `components/marketing/property.tsx`, `app/api/cx/rooms/route.ts`, `lib/cx-api.ts`, and `lib/property-resolver.ts`.

- [x] Identify selection ownership, selected-room shape, selected-property shape, and route or search-param coupling
  Verified in `components/marketing/property.tsx`.

- [x] Identify selection persistence, restore logic, and fallback behavior
  Verified in `components/marketing/property.tsx` and `lib/property-selection-session.ts`.

- [x] Identify nightly booking draft creation, draft shape, persistence medium, hydration, mutation, and confirmation snapshot behavior
  Verified in `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, and `lib/booking-session.ts`.

- [x] Identify checkout page ownership, form-state ownership, guest-data collection, add-on handling, and validation
  Verified in `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `components/booking/booking-checkout-page.tsx`, `components/auth/guest-auth-provider.tsx`, and `lib/booking-api.ts`.

- [x] Identify pricing recalculation, booking-order submission, payment-order submission, Razorpay orchestration, and failure handling
  Verified in `components/booking/booking-checkout-page.tsx` and `lib/booking-api.ts`.

- [x] Identify booking recovery and resume behavior across reload, auth interruption, missing draft, pending order, and duplicate submission protection
  Verified in `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `components/auth/guest-auth-provider.tsx`, `lib/booking-session.ts`, and `lib/property-selection-session.ts`.

- [x] Identify bookings-list retrieval, confirmation lifecycle, receipt handling, and post-confirmation routing
  Verified in `app/bookings/page.tsx`, `app/bookings/[eri]/confirmed/page.tsx`, `components/booking/booking-confirmed-page.tsx`, `hooks/use-download-receipt.ts`, `lib/receipt-api.ts`, and `lib/booking-api.ts`.

- [x] Identify pre-arrival KYC API usage, cache behavior, submit flow, and completion routing
  Verified in `app/bookings/[eri]/web-check-in/page.tsx`, `components/booking/pre-arrival-page.tsx`, `lib/booking-api.ts`, and `lib/client-cache.ts`.

- [x] Identify booking-scoped guest access dependency and guest-hub eligibility coupling
  Verified in `app/guest/page.tsx`, `app/[bookingId]/guest/layout.tsx`, `components/guest/guest-route-gate.tsx`, `state/guest-experience-provider.tsx`, and `lib/guest-hub.ts`.

- [x] Identify booking API wrapper files, endpoint usage, visible request shapes, visible response shapes, normalization, and error behavior
  Verified in `lib/vibehouse-api.ts`, `lib/cx-api.ts`, `app/api/cx/rooms/route.ts`, `lib/booking-api.ts`, `lib/receipt-api.ts`, and `components/booking/booking-checkout-page.tsx`.

- [x] Add text-based booking flow and booking state-machine diagrams
  Documented in `docs/booking-auth-migration/BOOKING_FLOW_MAP.md` and `docs/booking-auth-migration/BOOKING_STATE_MACHINE.md`.

- [x] Document booking coupling, dependency analysis, and migration risks
  Documented in `docs/booking-auth-migration/BOOKING_ARCHITECTURE.md`, `docs/booking-auth-migration/SESSION_LIFECYCLE.md`, and `docs/booking-auth-migration/API_PATTERNS.md`.

- [x] Mark uncertain or missing booking behavior explicitly
  `Not found during this pass.` or `Pending deeper audit` notes were added where server-side nightly draft expiry, backend coupon validation, asynchronous payment reconciliation, invoice-specific delivery, and backend ownership of temporary guest-hub rules were not confirmed.

- [ ] Verify a server-side abandoned-draft expiry or cleanup process for nightly booking
  Not found during this pass.

- [ ] Verify a backend coupon or promo validation endpoint for nightly booking
  Not found during this pass.

- [ ] Verify webhook or asynchronous payment reconciliation beyond `POST /payment/verify` and `POST /payment/fail`
  Not found during this pass.

- [ ] Verify invoice or email-delivery implementation beyond the receipt fetch and UI copy
  Not found during this pass.

- [ ] Verify the backend rule set behind temporary guest-hub eligibility widening
  Pending deeper audit. The frontend override is visible in `lib/guest-hub.ts`, but backend alignment was not proven from inspected frontend source.
