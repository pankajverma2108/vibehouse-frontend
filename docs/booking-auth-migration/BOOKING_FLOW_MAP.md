# Booking Flow Map

## Purpose

Document the audited booking flow map used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-20 from live source files only.

## Flow 1: Route Normalization Into `/property`

- Evidence: `app/page.tsx`, `app/rooms/page.tsx`, `lib/cx-api.ts` -> `getDefaultPropertyDestinationHref`
- Sequence:
  1. `/` redirects to `/property` when `checkin`, `checkout`, or `property_id` are missing.
  2. `/rooms` also redirects to `/property`, preserving any incoming query params.
  3. `getDefaultPropertyDestinationHref` injects a canonical `property_id` plus today/tomorrow dates if not supplied.
- Reuse: Directly reusable
- Uncertainty: The default property ID source comes from current environment/config helpers and is source-specific.

## Flow 2: Property Page Catalog And Availability Load

- Evidence: `app/property/page.tsx`, `components/marketing/property.tsx`, `app/api/cx/rooms/route.ts`, `lib/cx-api.ts`
- Sequence:
  1. `PropertyPage` validates date query params and resolves the server-side `property_id`.
  2. Without a valid date range, it preloads a room catalog snapshot from `getRoomCatalogSnapshot`.
  3. With a valid date range, it preloads a live availability snapshot from `getRoomAvailabilitySnapshot`.
  4. The client `Property` component continues loading from the internal `/api/cx/rooms` route, which validates `property_id`, `checkin`, and `checkout` before delegating to `lib/cx-api.ts`.
  5. Availability responses are cached in-memory in the component unless the source is `local_db_estimate`.
- Reuse: Directly reusable
- Uncertainty: Fallback room presentation inside `lib/cx-api.ts` is source-specific and should not be treated as a target requirement.

## Flow 3: Room Selection Persistence And Review Handoff

- Evidence: `components/marketing/property.tsx`, `lib/property-selection-session.ts`, `lib/booking-session.ts`
- Sequence:
  1. The property page restores prior room counts for the same property via `getPropertySelection("nightly")`.
  2. Selection changes are saved to both sessionStorage and localStorage through `savePropertySelection(...)`.
  3. When the guest clicks review/checkout, the property page validates date range, inventory, and age confirmation.
  4. A normalized `BookingDraft` is saved into sessionStorage with `saveBookingDraft(...)`.
  5. If the guest is signed out, a `saveReviewResumeIntent(...)` payload is persisted and the sign-in modal opens.
  6. After auth, the property page consumes the resume intent and only routes to `/bookingreview` when the saved selection signature still matches the live property/date/room context.
  7. If the guest is already authenticated, the property page pushes directly to `/bookingreview`.
- Reuse: Directly reusable
- Uncertainty: This pass confirmed the nightly path. Colive uses the same persistence primitives but a separate flow branch.

## Flow 4: Review Page Hydration

- Evidence: `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts`
- Sequence:
  1. Both `/booking` and `/bookingreview` mount `BookingCheckoutPage`.
  2. On mount, the page reads `getStoredBookingState()` from sessionStorage.
  3. If a draft exists, it rehydrates the booking draft plus any saved review guest data.
  4. If authenticated guest data is available, the review form merges guest identity into the restored guest form.
  5. Guest form changes are persisted back into the draft state through `saveBookingReviewGuest(...)`.
- Reuse: Directly reusable
- Uncertainty: If no draft exists, the page falls back to a "No active booking draft" shell instead of rebuilding state from URL params.

## Flow 5: Review To Nightly Booking Order

- Evidence: `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts`
- Sequence:
  1. Before payment, the page validates guest details and updates the local guest profile cache.
  2. If the guest is signed out, `resumePaymentAfterAuthRef` is set and the auth modal opens.
  3. Once authenticated, the page resumes `handlePayment()` automatically.
  4. The nightly branch either reuses a saved `pendingOrder` for the matching draft signature or calls `createGuestBookingOrder(...)`.
  5. The resulting order summary is saved with `savePendingBookingOrder(...)`.
- Reuse: Directly reusable
- Uncertainty: Coupon validation exists client-side in this file and is isolated from backend booking orchestration.

## Flow 6: Nightly Payment Order, Razorpay, And Verification

- Evidence: `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts`
- Sequence:
  1. The page computes a payable total and calls `createBookingPaymentOrder(...)`.
  2. Razorpay is loaded lazily in-browser.
  3. On modal dismissal or `payment.failed`, the page calls `failBookingPayment(...)`, clears the pending order snapshot, and stops the flow.
  4. On Razorpay success, the page calls `verifyBookingPayment(...)`.
  5. After verification, it clears the pending order and draft, writes a `ConfirmedBookingSnapshot` into localStorage, and routes to `/bookings?fresh=<ezee_reservation_id>`.
- Reuse: Directly reusable
- Uncertainty: Payment vendor specifics are source-specific, but the orchestration stages are explicit in source.

## Flow 7: Bookings List And Booking Routing

- Evidence: `app/bookings/page.tsx`, `lib/client-cache.ts`, `lib/booking-api.ts`
- Sequence:
  1. `/bookings` first uses `guest?.bookings` from auth state as a fallback summary source.
  2. If authenticated, it also loads live data from `getGuestBookings(token)`.
  3. Successful live results are cached in sessionStorage for 3 minutes with `setClientCache(...)`.
  4. Bookings are grouped into `upcoming`, `active`, and `past` using check-in/check-out dates plus status.
  5. For active/upcoming bookings, the card destination is:
     - `/bookings/[eri]/confirmed` when `kyc_completed_slots >= total_slots`
     - `/bookings/[eri]/web-check-in` otherwise
  6. Past bookings route back to `/bookings`.
- Reuse: Directly reusable
- Uncertainty: Fallback booking completeness depends on what `/guest/auth/me` includes in `guest.bookings`.

## Flow 8: Confirmation View And Local Snapshot Fallback

- Evidence: `components/booking/booking-confirmed-page.tsx`, `lib/booking-session.ts`, `lib/booking-api.ts`
- Sequence:
  1. `/bookings/[eri]/confirmed` decodes the route param and mounts `BookingConfirmedPage`.
  2. If signed in, the page tries to refresh booking details via `linkGuestBooking(token, ezeeReservationId)`.
  3. Regardless of live fetch success or failure, it rereads `getConfirmedBookingSnapshot(ezeeReservationId)` as a local fallback.
  4. If both live and local data are absent, the page shows an empty state.
  5. If local data exists, the page can still render stay details, pricing, and receipt download even when live refresh failed.
- Reuse: Directly reusable
- Uncertainty: The local snapshot only exists if checkout verification previously succeeded in this browser.

## Flow 9: Web Check-In / Pre-Arrival

- Evidence: `components/booking/pre-arrival-page.tsx`, `lib/booking-api.ts`, `lib/client-cache.ts`
- Sequence:
  1. `/bookings/[eri]/web-check-in` mounts `PreArrivalPage`.
  2. If the guest is signed out, the page opens the sign-in modal and waits.
  3. Once authenticated, the page loads cached slot data if available, then refreshes live state via `linkGuestBooking(...)` and `getBookingKycSlots(...)`.
  4. If booking status is payment-pending, the page routes the guest back to confirmation/status instead of exposing KYC.
  5. If all slots are already completed, the page redirects to `/bookings/[eri]/confirmed`.
  6. Otherwise, the page loads slot detail, uploads documents to presigned URLs, optionally runs OCR, validates the KYC payload, and submits it.
  7. Completion routes the guest back to the confirmation page.
- Reuse: Conceptually reusable
- Uncertainty: Exact KYC document field rules are source-specific and only relevant if target scope includes pre-arrival.

## Flow 10: Guest Hub Booking Routes

- Evidence: `app/guest/page.tsx`, `components/guest/guest-route-gate.tsx`, `app/[bookingId]/guest/layout.tsx`
- Sequence:
  1. `/guest` resolves the current active booking and redirects into `/:bookingId/guest`.
  2. Booking-scoped guest routes are wrapped in `GuestExperienceProvider(initialBookingId)` and `GuestBookingGate(bookingId)`.
  3. Legacy `/guest/*` routes redirect into the active booking-scoped route via `GuestLegacyRouteRedirect`.
- Reuse: Conceptually reusable
- Uncertainty: Guest-hub eligibility currently depends on a temporary date-range-only frontend override in `lib/guest-hub.ts`.
