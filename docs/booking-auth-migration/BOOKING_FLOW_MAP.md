# Booking Flow Map

## Purpose

Document the audited booking flow map used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-21 from inspected source files only.

## Entry Matrix

| Entry surface | Evidence | Trigger behavior | Next route/state | `property_id` behavior | Reusable classification |
| --- | --- | --- | --- | --- | --- |
| Home route guard | `app/page.tsx`, `lib/cx-api.ts` | Missing `checkin`, `checkout`, or `property_id` redirects immediately. | `/property?...` via `getDefaultPropertyDestinationHref(propertyId, "/")`. | Uses `resolveServerPropertyId()` before redirect. | conceptually reusable |
| Hero/home/CTA widgets | `components/marketing/widgets/booking-widget.tsx`, `components/marketing/pages/home-sections.tsx` | Date picker builds a `Link` after ensuring `checkout > checkin`. | `/property?...` by default. | Preserves the `property_id` already present in `destinationHref`. | conceptually reusable |
| Legacy `/rooms` route | `app/rooms/page.tsx` | Redirect-only entry that preserves incoming params. | `/property?...`. | Carries forward `property_id` or injects the default property helper output. | directly reusable |
| Navigation and mobile menu | `components/marketing/navigation.tsx`, `components/marketing/mobile-staggered-menu.tsx`, `content/nav-menu.ts` | `Book Now`, hostel cards, and `My Bookings` / `My Hub` links route into the booking system. | `/property`, `/bookings`, `/guest`. | The primary property CTA defaults to hostel ID `60765`; some nav items still point to `/upcoming`. | conceptually reusable |
| Property-page continue action | `components/marketing/property.tsx` | Validates selection, saves a draft, then routes or opens auth. | `/bookingreview` or auth modal. | Copies `resolvedPropertyId` into `BookingDraft.propertyId` and `ReviewResumeIntent.propertyId`. | directly reusable |
| Direct review aliases | `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `app/reviewnew/page.tsx` | Review routes mount `BookingCheckoutPage`; `/reviewnew` redirects to `/bookingreview`. | `BookingCheckoutPage`. | Consume the stored draft only. | directly reusable |
| Bookings index | `app/bookings/page.tsx` | Opens from navigation/profile and after payment verification. | Booking cards route to `/bookings/[eri]/confirmed` or `/bookings/[eri]/web-check-in`. | Uses `property_id` only for display/branding, not routing. | directly reusable |
| Confirmation and pre-arrival routes | `app/bookings/[eri]/confirmed/page.tsx`, `app/bookings/[eri]/web-check-in/page.tsx` | Route wrappers decode the reservation ID and mount booking pages. | `BookingConfirmedPage` or `PreArrivalPage`. | `property_id` is fetched from booking APIs, not from route params. | directly reusable |
| Guest hub | `app/guest/page.tsx`, `app/[bookingId]/guest/layout.tsx`, `components/guest/guest-route-gate.tsx` | Resolves the active booking-scoped guest route and gates booking-specific guest pages. | `/:bookingId/guest/*`. | Uses `bookingId === ezee_reservation_id`, not `property_id`. | conceptually reusable |

## Flow 1: Route Normalization Into `/property`

- Evidence: `app/page.tsx`, `app/rooms/page.tsx`, `lib/cx-api.ts`, `lib/property-resolver.ts`
- Sequence:
  1. `/` resolves a server-side `property_id` from search params, host, or env.
  2. If `checkin`, `checkout`, or `property_id` are missing, the page redirects to `getDefaultPropertyDestinationHref(...)`.
  3. `/rooms` normalizes any incoming params and also redirects to `/property?...`.
  4. `getDefaultPropertyDestinationHref()` injects `checkin=today`, `checkout=tomorrow`, and a sanitized `property_id`.
- Reuse: directly reusable
- Uncertainty: the exact fallback property defaults come from source host/env mapping and are source-specific.

## Flow 2: Property Page Catalog / Availability Load

- Evidence: `app/property/page.tsx`, `components/marketing/property.tsx`, `app/api/cx/rooms/route.ts`, `lib/cx-api.ts`
- Sequence:
  1. `PropertyPage` chooses nightly `Property` vs source-specific `ColiveFlow`.
  2. The nightly branch validates `checkin`/`checkout` and preloads either `getRoomCatalogSnapshot()` or `getRoomAvailabilitySnapshot()`.
  3. The client `Property` component keeps `resolvedPropertyId`, `dateRange`, and `availabilityRequestedByUser` in local state.
  4. Client fetches go through `/api/cx/rooms`, which validates `property_id`, date range completeness, and ISO date format before calling `lib/cx-api.ts`.
  5. `lib/cx-api.ts` fans out to `/guest/booking/rooms` for catalog mode and `/guest/booking/availability` for dated mode, then normalizes room payloads into `CxRoomCategory[]`.
  6. In-memory client caching keeps catalog data for 5 minutes and live availability for 60 seconds, except when the upstream marks the payload as `local_db_estimate`.
- Reuse: directly reusable
- Uncertainty: room presentation, hardcoded fallback room types, and event previews are source-specific.

## Flow 3: Room Selection Persistence And Review Handoff

- Evidence: `components/marketing/property.tsx`, `lib/property-selection-session.ts`, `lib/booking-session.ts`
- Sequence:
  1. `selectedCounts: Record<string, number>` and `isAgeConfirmed` are the selection owners.
  2. `selectedRoomDrafts` is derived from the current room list plus `selectedCounts`.
  3. `savePropertySelection()` writes `vh_property_selection_v1` with the current property, dates, normalized counts, age flag, and signature.
  4. Returning to the same property restores the saved counts, then `applyRoomCategories()` clamps them back to current availability.
  5. `continueToCheckout()` blocks missing property context, missing dates, zero rooms, sold-out/price-unavailable rooms, and missing age confirmation.
  6. A valid selection becomes a `BookingDraft`, which is saved to `vh_booking_draft`.
  7. Signed-out users also save `vh_review_resume_v1` before opening the auth modal.
  8. Signed-in users route directly to `/bookingreview`.
- Reuse: directly reusable
- Uncertainty: the source behavior intentionally restores room counts for the same property even if dates changed.

## Flow 4: Post-Auth Review Resume

- Evidence: `components/marketing/property.tsx`, `lib/property-selection-session.ts`
- Sequence:
  1. After auth succeeds, the property page consumes `vh_review_resume_v1`.
  2. Resume only continues when `propertyId`, `checkin`, `checkout`, and the recomputed selection signature all still match.
  3. Matching intent routes to `/bookingreview`.
  4. Mismatched or expired intent is discarded silently and the user stays on `/property`.
- Reuse: directly reusable
- Uncertainty: generic post-auth redirect storage also exists elsewhere, but nightly review resume uses the booking-specific signature path.

## Flow 5: Review Hydration And Guest Details

- Evidence: `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts`
- Sequence:
  1. `/booking` and `/bookingreview` both mount `BookingCheckoutPage`.
  2. On mount, `getStoredBookingState()` rehydrates the draft and any saved guest-form snapshot from `vh_booking_draft`.
  3. Authenticated guest identity is merged into the restored form through `mergeGuestIdentityIntoForm()`.
  4. Guest-field edits call `saveBookingReviewGuest(draft.signature, guestForm)`.
  5. Missing draft renders the explicit `No active booking draft` state and links back to `/property`.
- Reuse: directly reusable
- Uncertainty: the review route cannot rebuild state from URL params alone.

## Flow 6: Add-Ons, Pricing, And Local Draft Mutation

- Evidence: `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts`
- Sequence:
  1. Nightly booking loads add-ons from `GET /guest/store/catalog?property_id=...`.
  2. The page filters out `BORROWABLE` items and splits the rest into commodity/returnable vs service sections.
  3. `setAddonQuantity()` rewrites `draft.addons` and persists the updated `BookingDraft`.
  4. Coupon validation is local-only and asynchronous by interface, but it currently uses in-file `PROMO_CODES` instead of a real API.
  5. `calculatePricingBreakdown()` derives room subtotal, add-on subtotal, coupon discount, taxes, and `estimatedGrandTotal` from the current draft every render.
- Reuse: conceptually reusable
- Uncertainty: a backend coupon contract was not found during this pass.

## Flow 7: Review To Nightly Booking Order

- Evidence: `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts`, `lib/booking-session.ts`
- Sequence:
  1. `openPaymentFlow()` validates guest details and updates the auth guest cache.
  2. If the guest is signed out, `resumePaymentAfterAuthRef` is set and the auth modal opens.
  3. After auth, an effect re-invokes `handlePayment()`.
  4. Nightly checkout reuses `pendingOrder` when `pendingOrder.signature === draft.signature`.
  5. Otherwise it calls `createGuestBookingOrder(token, { property_id, checkin_date, checkout_date, rooms, addons })`.
  6. The resulting order summary is stored back into `vh_booking_draft.pendingOrder`.
- Reuse: directly reusable
- Uncertainty: the source-specific Colive branch uses a different order path and is not the nightly reference flow.

## Flow 8: Nightly Payment Order, Razorpay, And Verification

- Evidence: `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts`
- Sequence:
  1. Checkout computes `payableGrandTotal` from the local pricing breakdown.
  2. `createBookingPaymentOrder()` creates the Razorpay order payload.
  3. `loadRazorpayCheckout()` injects `https://checkout.razorpay.com/v1/checkout.js`.
  4. Razorpay dismiss and `payment.failed` both call `failBookingPayment()`, clear the pending order, and keep the draft alive for retry.
  5. Razorpay success calls `verifyBookingPayment()`.
  6. Successful verification clears the pending order and draft, writes `vh_confirmed_booking:<eri>`, and routes to `/bookings?fresh=<eri>`.
  7. Verification failure clears the pending order and surfaces a pending-verification toast, but does not auto-retry or poll.
- Reuse: directly reusable
- Uncertainty: no backend webhook or reconciliation worker was found in this repo.

## Flow 9: Bookings List And Booking Routing

- Evidence: `app/bookings/page.tsx`, `lib/client-cache.ts`, `lib/booking-api.ts`
- Sequence:
  1. `/bookings` first builds fallback summaries from `guest.bookings`.
  2. If authenticated, it loads `GET /guest/booking/mine` and caches the result under `vh:guest-bookings:<guestId>` for 3 minutes.
  3. The page groups bookings into `upcoming`, `active`, and `past` using booking status plus `checkin_date` / `checkout_date`.
  4. `bookingCardHref()` routes active/upcoming bookings to confirmation when `kyc_completed_slots >= total_slots`; otherwise it routes to `toBrandCheckinLink(ezee_reservation_id)`.
  5. Post-payment `fresh=<eri>` displays a one-shot success toast on the next bookings-page mount.
- Reuse: directly reusable
- Uncertainty: fallback booking completeness depends on the auth payload shape returned by `/guest/auth/me`.

## Flow 10: Confirmation View, Receipt, And Local Snapshot Fallback

- Evidence: `components/booking/booking-confirmed-page.tsx`, `hooks/use-download-receipt.ts`, `lib/receipt-api.ts`, `lib/booking-session.ts`
- Sequence:
  1. `/bookings/[eri]/confirmed` decodes `eri` and mounts `BookingConfirmedPage`.
  2. Signed-in loads call `linkGuestBooking(token, ezeeReservationId)` for live booking details.
  3. Regardless of live fetch success, the page re-reads `getConfirmedBookingSnapshot(ezeeReservationId)` in `finally`.
  4. If both live data and the local snapshot are absent, confirmation falls back to an empty state with a CTA back to `/bookings`.
  5. Receipt download requires auth, fetches `GET /guest/booking/receipt/:eri`, generates a PDF in-browser, and downloads `receipt-<booking_id>.pdf`.
  6. Confirmation also exposes the pre-arrival route through `toBrandCheckinLink(ezeeReservationId)`.
- Reuse: directly reusable
- Uncertainty: the local snapshot exists only if checkout verification previously succeeded in the same browser.

## Flow 11: Web Check-In / Pre-Arrival

- Evidence: `components/booking/pre-arrival-page.tsx`, `lib/booking-api.ts`, `lib/client-cache.ts`
- Sequence:
  1. `/bookings/[eri]/web-check-in` mounts `PreArrivalPage`.
  2. Signed-out guests get an auth modal request immediately.
  3. Slot lists and slot detail are restored from `sessionStorage` caches first, then refreshed from `linkGuestBooking()` and `getBookingKycSlots()`.
  4. Payment-pending bookings short-circuit into a `Payment pending` empty state that routes back to confirmation.
  5. Fully completed slot sets immediately redirect to `/bookings/[eri]/confirmed`.
  6. Editable slots load detail through `getBookingKycDetail()`.
  7. Document upload uses `getBookingKycUploadUrl()` + `uploadFileToPresignedUrl()`, OCR uses `runBookingKycOcr()`, and final submit uses `submitBookingKyc()`.
  8. Successful submission reloads slots and opens a completion modal whose CTA routes back to confirmation.
- Reuse: conceptually reusable
- Uncertainty: detailed KYC field rules, OCR expectations, and document security helpers are source-specific.

## Flow 12: Guest Hub Booking Routes

- Evidence: `app/guest/page.tsx`, `components/guest/guest-route-gate.tsx`, `app/[bookingId]/guest/layout.tsx`, `lib/guest-hub.ts`
- Sequence:
  1. `/guest` checks `guest.bookings` first for an active guest-hub-eligible booking.
  2. If no active booking is already present, it calls `getGuestBookings()` and `linkGuestBooking()` to resolve fallback eligibility.
  3. Matching eligible stays redirect to `/:bookingId/guest`.
  4. Scoped guest pages wrap children in `GuestExperienceProvider(initialBookingId)` and `GuestBookingGate(bookingId)`.
  5. `GuestBookingGate` denies access for unauthenticated guests, unlinked bookings, upcoming stays, or past stays.
- Reuse: conceptually reusable
- Uncertainty: guest-hub eligibility is widened by `TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS = true`.
