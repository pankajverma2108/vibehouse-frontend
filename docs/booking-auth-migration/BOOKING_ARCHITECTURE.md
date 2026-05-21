# Booking Architecture

## Purpose

Document the audited booking architecture used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-21 from inspected source files only.

## Primary Booking Routes

| Route | File path | Owner | Trigger behavior | Route behavior | `property_id` behavior | Reusable classification |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | `HomePage` | Direct browser entry or brand-home navigation. | Redirects to `getDefaultPropertyDestinationHref(propertyId, "/")` when `checkin`, `checkout`, or `property_id` are missing; otherwise renders hero + booking widget + room/event previews. | `resolveServerPropertyId({ explicit, hostname })` resolves the active property before redirects and SSR room/event loads. | conceptually reusable |
| `/rooms` | `app/rooms/page.tsx` | `RoomsPage` | Legacy/direct route. | Normalizes incoming params and redirects to `/property?...`. | Preserves incoming `property_id`; otherwise starts from `getDefaultPropertyDestinationHref(params?.property_id)`. | directly reusable |
| `/property` | `app/property/page.tsx` | `PropertyPage` | Main nightly booking route and most `Book Now` destinations. | Chooses nightly `Property` vs `ColiveFlow`, validates the date window, preloads catalog or live availability, and renders the booking surface. | Resolves `property_id` from search params, host mapping, or env fallback before SSR data fetches. | directly reusable |
| `/booking` | `app/booking/page.tsx` | `BookingPage` | Direct/legacy review route. | Mounts `BookingCheckoutPage` without extra guards. | Consumes the existing `BookingDraft.propertyId`; no route param carries it. | conceptually reusable |
| `/bookingreview` | `app/bookingreview/page.tsx` | `BookingReviewPage` | Main review/checkout route from `Property.continueToCheckout()`. | Mounts `BookingCheckoutPage`. | Consumes the stored draft only. | directly reusable |
| `/reviewnew` | `app/reviewnew/page.tsx` | `ReviewNewRedirectPage` | Compatibility route. | Redirects to `/bookingreview`. | No separate `property_id` handling. | directly reusable |
| `/bookings` | `app/bookings/page.tsx` | `BookingsPage` | Profile/navigation entry or post-payment redirect target. | Lists bookings, syncs `/guest/booking/mine`, and routes each card to confirmation or web check-in. | Reads `property_id` from booking summaries returned by auth or `/guest/booking/mine`. | directly reusable |
| `/bookings/[eri]/confirmed` | `app/bookings/[eri]/confirmed/page.tsx` | `BookingConfirmedRoute` | Booking card click or post-check-in CTA. | Decodes `eri` and renders `BookingConfirmedPage`. | Uses `ezeeReservationId` only; property name fallback comes from live link data or the confirmed snapshot. | directly reusable |
| `/bookings/[eri]/web-check-in` | `app/bookings/[eri]/web-check-in/page.tsx` | `WebCheckInRoute` | Booking card click when KYC is incomplete or confirmation CTA. | Decodes `eri` and renders `PreArrivalPage`. | Uses `ezeeReservationId`; property context is re-fetched through `linkGuestBooking()`. | directly reusable |
| `/guest` | `app/guest/page.tsx` | `GuestPage` | Guest-hub entry point. | Mounts `GuestHubEntryGate`, which redirects to the active booking-scoped guest route when eligible. | Uses `guest.bookings` first, then `/guest/booking/mine` + `/guest/booking/link` fallback. | conceptually reusable |
| `/:bookingId/guest/*` | `app/[bookingId]/guest/layout.tsx` | `ScopedGuestLayout` | Booking-scoped guest navigation. | Wraps child pages with `GuestExperienceProvider`, `GuestHubShell`, and `GuestBookingGate(bookingId)`. | Uses `bookingId === ezee_reservation_id`, not `property_id`. | conceptually reusable |

## Booking CTAs And Navigation Triggers

| Trigger surface | File path | Symbol | Trigger behavior | Next route/state | `property_id` behavior | Reusable classification |
| --- | --- | --- | --- | --- | --- | --- |
| Hero booking widget | `components/marketing/widgets/booking-widget.tsx` | `BookingWidget` | Builds a `Link` to `destinationHref` after validating `checkin < checkout`. | Usually `/property?checkin=...&checkout=...&property_id=...`. | Preserves any existing `property_id` already embedded in `destinationHref`. | conceptually reusable |
| Home CTA block | `components/marketing/pages/home-sections.tsx` | `CtaSection` | Renders `BookingWidget` with `submitLabel="Book Now"`. | Usually `/property`. | Inherits the `destinationHref` built upstream. | conceptually reusable |
| Top navigation desktop/mobile CTA | `components/marketing/navigation.tsx` | `Navigation` | Uses `propertyHref` for the pink `Book Now` CTA and exposes `My Bookings` / `My Hub` / `Profile` links. | `/property`, `/bookings`, `/guest`, `/profile`. | `propertyHref` is built by `getDefaultPropertyDestinationHref(hostelNavItems[0]?.id, "/property", currentCheckin, currentCheckout)`. | conceptually reusable |
| Mobile staggered menu | `components/marketing/mobile-staggered-menu.tsx` | `resolveHostelHref`, `propertyHref` | Rewrites hostel cards and the primary property card to booking-aware `/property` links. | `/property` or source-specific `/upcoming`. | Injects current `checkin` / `checkout` and a hostel `propertyId` when the target begins with `/property`. | conceptually reusable |
| Hostel nav config | `content/nav-menu.ts` | `hostelNavItems` | Seeds navigation with one live booking property and two `/upcoming` placeholders. | `/property?...` or `/upcoming`. | First item hardcodes `id: "60765"` and builds `href` immediately; later items are not booking-ready. | source-specific |
| Standalone marketing pages | `components/standalone/partner-upcoming-pages.tsx` | `getBookNowHref()` | Hardcoded `Book Now` CTA for standalone pages. | `/property?checkin=today&checkout=tomorrow&property_id=60765`. | Hardcodes `property_id=60765`. | source-specific |
| Property-page continue CTA | `components/marketing/property.tsx` | `continueToCheckout()` | Validates property/date/room/age state, saves the draft, and either opens auth or routes to review. | `/bookingreview` or auth modal. | Writes `propertyId` into `BookingDraft.propertyId` and `ReviewResumeIntent.propertyId`. | directly reusable |
| Bookings page new-booking CTA | `app/bookings/page.tsx` | `BookingsPage` | `New Booking` button and empty-state CTA. | `/property?...`. | Delegates to `getDefaultPropertyDestinationHref()`. | directly reusable |
| Confirmation CTA | `components/booking/booking-confirmed-page.tsx` | `checkinLink` | Opens the pre-arrival dashboard after payment. | `/bookings/[eri]/web-check-in`. | Uses `ezeeReservationId`; property name is display-only. | directly reusable |

## Room / Property Selection Flow

| Topic | Evidence | Verified behavior | Reusable classification |
| --- | --- | --- | --- |
| Server-side selection entry | `app/property/page.tsx`, `lib/property-resolver.ts` | `PropertyPage` resolves `property_id` in priority order `explicit -> host -> env`, validates dates, and preloads either a catalog snapshot or a live availability snapshot before hydrating the client component. | directly reusable |
| Client-side owner | `components/marketing/property.tsx` | `Property` owns `resolvedPropertyId`, `dateRange`, `selectedCounts: Record<string, number>`, `isAgeConfirmed`, `availabilityRequestedByUser`, and the derived `selectedRoomDrafts: BookingDraftRoom[]`. | directly reusable |
| Room/property data sources | `components/marketing/property.tsx`, `app/api/cx/rooms/route.ts`, `lib/cx-api.ts` | The client fetches `/api/cx/rooms`, which validates params and delegates to `getRoomAvailabilitySnapshot()`. `lib/cx-api.ts` fans out to `/guest/booking/rooms`, `/guest/booking/availability`, and `/public/events`. | directly reusable |
| Route/search params | `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `components/marketing/property.tsx` | The nightly flow uses `checkin`, `checkout`, `property_id`, `type`, and `location`. `syncAvailabilityQueryParams()` only writes `checkin`, `checkout`, and `property_id` into the current URL after the user has requested availability. | directly reusable |
| Property selection persistence | `lib/property-selection-session.ts`, `components/marketing/property.tsx` | `savePropertySelection()` stores `source`, `propertyId`, `checkin`, `checkout`, normalized `selectedCounts`, `isAgeConfirmed`, and `signature` in both `sessionStorage` and `localStorage` under `vh_property_selection_v1` with a 24-hour TTL. | directly reusable |
| Restore behavior | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | The property page restores room counts and `isAgeConfirmed` for the same `propertyId` even if the date range changed. `applyRoomCategories(..., true)` then clamps restored counts back to current live availability. | directly reusable |
| Availability dependency | `components/marketing/property.tsx`, `lib/cx-api.ts` | `updateCount()` clamps quantities to `availableCount` only when the room has live availability, is not sold out, and the price is available. Availability refresh keeps the current room list visible on fetch failure and only shows a toast. | directly reusable |
| Price dependency | `components/marketing/property.tsx`, `lib/cx-api.ts` | The property page allows checkout to proceed with `availabilitySource === "local_db_estimate"` only after a warning toast; otherwise it blocks sold-out or price-unavailable selections. | conceptually reusable |
| Property ID propagation | `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `components/marketing/property.tsx`, `lib/booking-session.ts`, `lib/booking-api.ts` | `property_id` starts in route/search params, is resolved again on server and client, is persisted in `PropertySelectionState`, is copied into `BookingDraft.propertyId`, is sent to `/guest/booking/create-order`, and is later surfaced again through booking APIs. | directly reusable |
| Fallback behavior | `lib/cx-api.ts`, `components/marketing/property.tsx` | Missing/invalid `property_id` falls back to the resolver default. Missing catalog/live payloads produce fallback room types, sold-out live projections, or a retained room list plus toast. No separate global state store is involved. | conceptually reusable |

## Booking Draft Lifecycle

| Lifecycle area | Evidence | Verified behavior |
| --- | --- | --- |
| Draft creation | `components/marketing/property.tsx` | `continueToCheckout()` builds a nightly `BookingDraft` with `propertyId`, `checkinDate`, `checkoutDate`, `rooms`, `addons: []`, `signature`, and `createdAt`, then stores it with `saveBookingDraft()`. |
| Draft state shape | `lib/booking-session.ts` | `StoredBookingState` stores `draft`, optional `pendingOrder`, and optional `review.guest`. `BookingDraftRoom`, `BookingReviewGuest`, `PendingBookingSnapshot`, and `ConfirmedBookingSnapshot` are all typed in this file. |
| Persistence medium | `lib/booking-session.ts` | `vh_booking_draft` lives in `sessionStorage`. Confirmed snapshots live in `localStorage` under `vh_confirmed_booking:<ezeeReservationId>`. |
| Draft hydration | `components/booking/booking-checkout-page.tsx` | On mount, `BookingCheckoutPage` calls `getStoredBookingState()`, rehydrates the draft, and seeds `guestForm` from `stored.review?.guest`. |
| Draft mutation | `components/booking/booking-checkout-page.tsx` | Guest form edits call `saveBookingReviewGuest(draft.signature, guestForm)`. Add-on edits rebuild `draft.addons` and re-save the draft. Catalog refresh also remaps existing add-ons and persists the normalized draft. |
| Pending order mutation | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | The nightly checkout writes `pendingOrder` into the same `vh_booking_draft` payload so retries can reuse a matching order by `signature`. |
| Cleanup on success | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Payment verification clears the pending order, clears the draft, writes a confirmed snapshot, and routes to `/bookings?fresh=...`. |
| Cleanup on failure/cancel | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Nightly checkout calls `/payment/fail` on dismiss or failure, then clears only `pendingOrder`; the draft remains available for another attempt. |
| Resume after auth | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | Signed-out review attempts write `vh_review_resume_v1`. After auth, the property page consumes that intent and only routes to `/bookingreview` when the stored selection signature still matches the live property/date/room context. |
| Resume after reload/navigation | `components/booking/booking-checkout-page.tsx` | Reloading the review page restores the draft and saved guest form from `sessionStorage`. Missing draft renders the explicit `No active booking draft` empty state and routes back to `/property`. |
| Formal draft expiry | `lib/booking-session.ts` | Not found during this pass. `vh_booking_draft` has no TTL or timestamp-based eviction. |
| Formal abandoned-booking sweeper | Inspected booking surfaces only | Not found during this pass. Abandoned nightly drafts persist until overwritten, cleared on success, or lost with the browser session. |
| Validation before save/use | `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx` | The property page validates property context, date range, inventory, and age confirmation before saving the draft. The checkout page validates guest details before opening the add-ons tab or payment flow. |

## Checkout Sequencing

| Step | Evidence | Verified behavior |
| --- | --- | --- |
| Review route mount | `app/booking/page.tsx`, `app/bookingreview/page.tsx`, `components/booking/booking-checkout-page.tsx` | Both review routes mount the same `BookingCheckoutPage`; no route param rebuilds draft state. |
| Draft + guest hydration | `components/booking/booking-checkout-page.tsx` | The page rehydrates `draft` and `guestForm`, then merges authenticated guest identity into the form when available. |
| Guest/customer collection | `components/booking/booking-checkout-page.tsx`, `components/auth/guest-auth-provider.tsx` | Guest details collect first name, last name, email, phone, coupon, accepted terms, and additional guests. `validateAndStoreGuestDetails()` pushes the normalized identity into `updateGuestProfile()`. |
| Add-on/service selection | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | Nightly booking loads `/guest/store/catalog`, filters out `BORROWABLE`, splits the catalog into `COMMODITY`/`RETURNABLE` vs `SERVICE`, and stores selected add-ons back into the draft. |
| Pricing recalculation | `components/booking/booking-checkout-page.tsx` | Pricing is always derived from `roomSubtotal`, `activeAddons`, coupon discount, room tax, and add-on tax. No separate server pricing poll exists between draft hydration and payment order creation. |
| Validation | `components/booking/booking-checkout-page.tsx` | Guest-form validation blocks tab progression and payment; service quantity rules clamp certain add-ons to one per booking; missing draft returns the user to `/property`. |
| Auth interruption | `components/booking/booking-checkout-page.tsx` | If payment starts while signed out, `resumePaymentAfterAuthRef.current = true` and `openAuthModal("signin")` run. After auth, an effect re-invokes `handlePayment()`. |
| Booking order creation | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | Nightly checkout reuses `pendingOrder` when the stored signature matches; otherwise it calls `createGuestBookingOrder(token, { property_id, checkin_date, checkout_date, rooms, addons })`. |
| Payment order creation | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | Nightly checkout then calls `createBookingPaymentOrder(token, { ezee_reservation_id, grand_total, addon_order_id? })`. |
| Loading/error states | `components/booking/booking-checkout-page.tsx` | The explicit `flowStage` union is `idle`, `creating-order`, `creating-payment-order`, `opening-razorpay`, `verifying-payment`, `confirmed`, `failed`. UI blocking uses `isPaying` plus toast copy; there is no centralized reducer. |
| Success transition | `components/booking/booking-checkout-page.tsx`, `app/bookings/page.tsx` | Successful verification stores a confirmed snapshot and routes to `/bookings?fresh=<ezeeReservationId>`, where a one-shot toast announces the new booking. |
| Failure/cancel behavior | `components/booking/booking-checkout-page.tsx` | Cancel/dismiss and `payment.failed` call `/payment/fail`, clear the pending order, keep the draft, and leave the user on the review surface for retry. Verification failure also clears the pending order but does not automatically retry. |

## Payment Orchestration

| Concern | Evidence | Verified behavior | Reusable classification |
| --- | --- | --- | --- |
| Provider | `components/booking/booking-checkout-page.tsx` | The nightly flow loads `https://checkout.razorpay.com/v1/checkout.js` and opens a Razorpay modal. | conceptually reusable |
| Booking order dependency | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | Nightly payment always depends on a prior booking order from `/guest/booking/create-order`, or a reused `pendingOrder` snapshot with the same draft signature. | directly reusable |
| Payment order/session creation | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | Payment order creation uses `POST /payment/create-booking-order`. | directly reusable |
| Cancel/failure handling | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | Razorpay dismiss or failure routes through `POST /payment/fail`, then clears the pending order. | directly reusable |
| Success handling | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | Razorpay success routes through `POST /payment/verify`, then clears transient state and stores a confirmed snapshot. | directly reusable |
| Backend verification dependency | `components/booking/booking-checkout-page.tsx` | Confirmation and `/bookings?fresh=...` navigation happen only after frontend-initiated verification succeeds. | directly reusable |
| Retry behavior | `components/booking/booking-checkout-page.tsx` | Retry is manual. `pendingOrder` reuse prevents duplicate order creation for the same signature; `paymentHandledRef` prevents double-handling inside one modal session. No polling or background reconcile loop was found. | directly reusable |
| Vendor-specific branch | `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts` | `draft.source === "colive"` uses a separate quote/draft/payment/verify flow and should not be copied into the nightly booking migration blindly. | source-specific |

## Booking Confirmation Lifecycle

| Concern | Evidence | Verified behavior |
| --- | --- | --- |
| Confirmation route/page | `app/bookings/[eri]/confirmed/page.tsx`, `components/booking/booking-confirmed-page.tsx` | The wrapper decodes `eri` and renders `BookingConfirmedPage`. |
| Confirmation data source | `components/booking/booking-confirmed-page.tsx`, `lib/booking-api.ts`, `lib/booking-session.ts` | The page tries `linkGuestBooking(token, ezeeReservationId)` first, then re-reads `getConfirmedBookingSnapshot(ezeeReservationId)` in `finally` as a browser-local fallback. |
| Booking ID handling | `app/bookings/[eri]/confirmed/page.tsx`, `app/bookings/[eri]/web-check-in/page.tsx`, `app/[bookingId]/guest/layout.tsx` | Confirmation and pre-arrival routes use `eri === ezee_reservation_id`; booking-scoped guest routes use `bookingId === ezee_reservation_id`. |
| Receipt/invoice handling | `hooks/use-download-receipt.ts`, `lib/receipt-api.ts`, `components/booking/booking-confirmed-page.tsx` | Receipt download requires an auth token, calls `GET /guest/booking/receipt/:ezeeReservationId`, generates a PDF client-side, and downloads `receipt-<booking_id>.pdf`. |
| Email/notification assumptions | `components/booking/booking-checkout-page.tsx` | The review form helper text says `Confirmation email will be sent here`, but no dedicated email/notification API or worker exists in this repo. |
| Post-confirmation guest access | `components/booking/booking-confirmed-page.tsx`, `app/bookings/page.tsx`, `app/guest/page.tsx`, `lib/guest-hub.ts` | Confirmed bookings route back to `/bookings`, into pre-arrival, or into the booking-scoped guest hub if the stay is currently guest-hub eligible. |
| Pre-arrival linkage | `components/booking/booking-confirmed-page.tsx`, `app/bookings/[eri]/web-check-in/page.tsx` | Confirmation exposes `toBrandCheckinLink(ezeeReservationId)` and pre-arrival completion routes back to `/bookings/[eri]/confirmed`. |
| View booking / my bookings behavior | `components/booking/booking-confirmed-page.tsx`, `app/bookings/page.tsx` | Missing confirmation data falls back to `/bookings`, and successful payment adds a `fresh` query param so `/bookings` can announce the new reservation. |

## Booking Recovery / Resume Behavior

| Scenario | Evidence | Verified behavior |
| --- | --- | --- |
| Reload during property selection | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | Restores `selectedCounts` and `isAgeConfirmed` for the same property from `vh_property_selection_v1`, then re-clamps selection to current inventory. |
| Navigation away before review | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | `vh_review_resume_v1` stores the nightly selection signature, property, and dates so post-auth review can resume safely. |
| Reload during review/checkout | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Rehydrates the draft, saved guest form, and any pending order from `vh_booking_draft`. |
| Navigation away after order creation | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | A matching `pendingOrder.signature` lets the nightly flow skip a second `/guest/booking/create-order` call on retry. |
| Missing draft | `components/booking/booking-checkout-page.tsx` | The page renders `No active booking draft` and links back to the property page via `getDefaultPropertyDestinationHref(draft?.propertyId)`. |
| Stale selection intent | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | Resume intent fails closed if property/date/signature no longer match the live context. |
| Client booking cache | `app/bookings/page.tsx`, `lib/client-cache.ts` | `/bookings` caches `/guest/booking/mine` in `sessionStorage` for 3 minutes under `vh:guest-bookings:<guestId>` and falls back to `guest.bookings` if sync fails. |
| Web check-in cache | `components/booking/pre-arrival-page.tsx`, `lib/client-cache.ts` | Slot lists and slot detail use 3-minute `sessionStorage` caches keyed by `vh:web-checkin:slots:<eri>` and `vh:web-checkin:slot:<eri>:<slotId>`. |
| Duplicate submission protection | `components/booking/booking-checkout-page.tsx` | `pendingOrder.signature` reuse prevents duplicate booking-order creation, and `paymentHandledRef` prevents duplicate Razorpay success/fail handling inside one modal session. |
| Expired/inactive booking handling | `components/booking/pre-arrival-page.tsx`, `components/guest/guest-route-gate.tsx`, `lib/guest-hub.ts` | Payment-pending bookings are gated out of web check-in, and guest-hub access is denied for upcoming/past stays. A separate expired-order API was not found. |

## Coupling And Dependency Analysis

| Dependency | Evidence | Verified coupling | Migration note |
| --- | --- | --- | --- |
| Auth dependency | `app/layout.tsx`, `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `app/bookings/page.tsx`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx` | Booking review, payment, bookings list, confirmation refresh, web check-in, and guest hub all depend on `GuestAuthProvider` and `useGuestAuth()`. | directly reusable |
| Guest access dependency | `app/bookings/page.tsx`, `components/guest/guest-route-gate.tsx`, `app/[bookingId]/guest/layout.tsx`, `lib/guest-hub.ts` | Booking visibility and guest-hub access depend on `guest.bookings`, `/guest/booking/mine`, `/guest/booking/link`, and a temporary guest-hub status override. | conceptually reusable |
| `property_id` dependency | `lib/property-resolver.ts`, `app/page.tsx`, `app/rooms/page.tsx`, `app/property/page.tsx`, `components/marketing/property.tsx`, `lib/booking-api.ts` | `property_id` is required at route entry, room/availability fetch time, booking-order creation time, and for later booking-display branding. | directly reusable |
| Booking/session dependency | `lib/booking-session.ts`, `lib/property-selection-session.ts`, `lib/client-cache.ts` | The booking flow relies on browser storage instead of a centralized store or server-side session record. | directly reusable |
| UI-to-state coupling | `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `components/booking/pre-arrival-page.tsx` | The core booking state is local component state plus browser storage; there is no Redux/Zustand/React Query abstraction for booking state. | conceptually reusable |
| API-to-state coupling | `components/marketing/property.tsx`, `components/booking/booking-checkout-page.tsx`, `app/bookings/page.tsx`, `components/booking/pre-arrival-page.tsx` | Route transitions depend directly on API payload fields such as `property_id`, `ezee_reservation_id`, `status`, `total_slots`, and `kyc_completed_slots`. | directly reusable |
| Source-specific assumptions not to copy blindly | `content/nav-menu.ts`, `components/standalone/partner-upcoming-pages.tsx`, `lib/guest-hub.ts`, `components/booking/booking-checkout-page.tsx` | Hardcoded `property_id=60765`, `/upcoming` placeholders, the temporary guest-hub status override, and the Colive payment branch are source-specific. | source-specific |

## Risk Analysis

- `lib/booking-session.ts`: `vh_booking_draft` has no TTL, so stale drafts can survive long enough to mislead review/checkout unless the target adds explicit expiry rules.
- `components/marketing/property.tsx`: restored room counts are property-scoped, not exact-date-scoped, so date changes can preserve an old quantity mix until live availability re-clamps it.
- `components/booking/booking-checkout-page.tsx`: coupon validation is client-local and not backed by a real booking API contract yet; copying it as-is would create divergent pricing rules.
- `components/booking/booking-checkout-page.tsx`: payment verification is frontend-initiated only; no in-repo webhook consumer or background reconciliation worker was found.
- `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts`: pending-order reuse prevents duplicate order creation, but only while the draft signature and browser session remain intact.
- `app/bookings/page.tsx`: fallback rendering depends on `guest.bookings` being present in auth state; if the target auth payload omits bookings, `/bookings` behavior changes.
- `components/booking/pre-arrival-page.tsx`: web check-in opens only after `linkGuestBooking()` confirms the booking is not payment-pending and the slot list exists; missing or delayed backend KYC data hard-blocks the route.
- `lib/guest-hub.ts`: guest-hub eligibility is currently widened by `TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS = true`; copying that behavior blindly would preserve a known temporary workaround.
- `content/nav-menu.ts`, `components/standalone/partner-upcoming-pages.tsx`: hardcoded `60765` and `/upcoming` placeholders are source-product assumptions, not migration-safe defaults.

## Not Found During This Pass

- A global booking state store such as Redux, Zustand, or React Query for the nightly checkout flow.
- A formal server-side booking draft record or abandoned-draft cleanup job.
- Automatic payment verification retry, polling, or webhook reconciliation in this repo.
- A dedicated email/notification API proving confirmation delivery behavior.
