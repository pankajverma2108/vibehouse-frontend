# Booking Architecture

## Purpose

Document the audited booking architecture used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-20 from live source files only.

## Booking Entry Surfaces

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `app/page.tsx` | `HomePage` | Redirects to `/property` with a default `property_id` and today/tomorrow date window when the required query params are missing. When params are present it renders the home page with a `BookingWidget` and room/event snapshots. | Conceptually reusable | Home page presentation is source-specific; the route-normalization behavior is reusable. |
| `app/rooms/page.tsx` | `RoomsPage` | Redirect-only wrapper that normalizes incoming params and forwards to `/property?...`. | Directly reusable | Confirmed as a compatibility route only. |
| `app/property/page.tsx` | `PropertyPage` | Chooses the nightly `Property` flow or the source-specific `ColiveFlow` branch, validates query dates, resolves `property_id`, and preloads room catalog or live availability snapshots. | Directly reusable | The `type=colive` branch is source-specific and not the primary nightly path. |
| `components/marketing/property.tsx` | `Property` | Owns nightly room selection, room catalog/live availability fetches, selection persistence, auth interruption handling, booking draft creation, and the final handoff to `/bookingreview`. | Directly reusable | Presentation-layer details are intentionally out of scope. |
| `app/booking/page.tsx` and `app/bookingreview/page.tsx` | `BookingPage`, `BookingReviewPage` | Both routes mount the same `BookingCheckoutPage` review/checkout/payment surface. | Conceptually reusable | `app/reviewnew/page.tsx` also redirects to `/bookingreview`. |

## Core Booking Ownership

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `lib/booking-session.ts` | `BookingDraft`, `PendingBookingSnapshot`, `ConfirmedBookingSnapshot`, helper functions | Owns the browser-persisted review draft, pending booking order, review guest form snapshot, and local confirmation fallback snapshot. | Directly reusable | Confirmed for browser persistence only. |
| `lib/property-selection-session.ts` | selection and resume helpers | Persists property-page room counts and a post-auth "resume review" intent in both sessionStorage and localStorage with a 24-hour TTL. | Directly reusable | Confirmed for nightly and colive selection resume patterns. |
| `lib/booking-api.ts` | booking/payment/KYC wrappers | Encapsulates booking order creation, payment order creation, verification/failure, booking list/link, KYC endpoints, and receipt-related booking read APIs. | Directly reusable | Exact endpoint names are source/backend-specific. |
| `components/booking/booking-checkout-page.tsx` | `BookingCheckoutPage` | Rehydrates the booking draft, merges guest identity, loads add-ons, validates guest details, creates the booking order, opens Razorpay, verifies payment, stores confirmation fallback data, and routes to `/bookings?fresh=...`. | Directly reusable | Contains both nightly and colive branches; only the nightly branch is the primary migration surface. |
| `app/bookings/page.tsx` | `BookingsPage` | Reads booking summaries from `guest?.bookings`, syncs live bookings from `/guest/booking/mine`, caches them in sessionStorage, and routes each booking toward confirmation or pre-arrival. | Directly reusable | Uses a 3-minute client cache; no React Query/SWR layer was found. |
| `components/booking/booking-confirmed-page.tsx` | `BookingConfirmedPage` | Uses live `linkGuestBooking` data when available and falls back to a stored confirmation snapshot after payment verification. | Directly reusable | Exact detail richness depends on what `/guest/booking/link` returns. |
| `components/booking/pre-arrival-page.tsx` | `PreArrivalPage` | Loads and caches KYC slots/detail, links the booking for status, handles document upload/OCR/submission, and redirects to confirmation when all slots are complete. | Conceptually reusable | The detailed KYC editor is source-specific, but the route/state contract is reusable. |

## Route Map In Scope

| Route | File | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | Normalizes missing booking params and feeds the property-booking entry flow. | Conceptually reusable | Home content is source-specific. |
| `/rooms` | `app/rooms/page.tsx` | Redirects to `/property`. | Directly reusable | None in the audited wrapper. |
| `/property` | `app/property/page.tsx` | Primary room-selection route. | Directly reusable | Nightly and colive share this server entrypoint. |
| `/booking` | `app/booking/page.tsx` | Alias route into `BookingCheckoutPage`. | Conceptually reusable | No unique behavior beyond the shared page component. |
| `/bookingreview` | `app/bookingreview/page.tsx` | Primary review/checkout route. | Directly reusable | None in the audited wrapper. |
| `/reviewnew` | `app/reviewnew/page.tsx` | Redirects to `/bookingreview`. | Directly reusable | Compatibility route only. |
| `/bookings` | `app/bookings/page.tsx` | Lists bookings and routes into confirmation or web check-in. | Directly reusable | None in the audited flow. |
| `/bookings/[eri]/confirmed` | `app/bookings/[eri]/confirmed/page.tsx` | Decodes `eri` and renders `BookingConfirmedPage`. | Directly reusable | None in the audited wrapper. |
| `/bookings/[eri]/web-check-in` | `app/bookings/[eri]/web-check-in/page.tsx` | Decodes `eri` and renders `PreArrivalPage`. | Directly reusable | None in the audited wrapper. |
| `/guest` | `app/guest/page.tsx` | Guest-hub entry gate that resolves the active booking-scoped guest route. | Conceptually reusable | Guest hub is adjacent to booking, not the primary booking checkout path. |
| `/:bookingId/guest/*` | `app/[bookingId]/guest/layout.tsx` and child pages | Booking-scoped guest routes gated by authenticated booking ownership. | Conceptually reusable | Route eligibility is affected by a temporary frontend status override. |

## Booking Recovery And Resume Boundaries

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/marketing/property.tsx` | restore/save selection effects | Restores saved room counts for the same property, saves selection after changes, and resumes `/bookingreview` after auth only when the saved signature matches the current context. | Directly reusable | Restores room counts even across date changes for the same property; this is an explicit source behavior. |
| `components/booking/booking-checkout-page.tsx` | mount draft rehydrate | Reads `getStoredBookingState()` on mount, restores the booking draft, and restores guest review data if the saved signature still matches. | Directly reusable | None in the audited restore path. |
| `components/booking/booking-checkout-page.tsx` | pending order reuse | Reuses the saved pending order when the current draft signature matches, instead of re-creating the booking order before payment. | Directly reusable | Confirmed only for the nightly booking branch. |
| `components/booking/booking-confirmed-page.tsx` | `snapshotFallback` | Re-reads the locally stored confirmation snapshot after a live link attempt so confirmation can still render after successful payment even if the booking link call fails. | Directly reusable | Local snapshot freshness depends on the most recent successful checkout. |
| `app/bookings/page.tsx` | fallback bookings plus client cache | Falls back to `guest?.bookings` if the live `/guest/booking/mine` sync is missing or fails, and caches successful live results in sessionStorage for 3 minutes. | Directly reusable | Backend completeness of `guest?.bookings` depends on `/guest/auth/me`. |

## Payment Orchestration Boundaries

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/booking/booking-checkout-page.tsx` | `loadRazorpayCheckout` | Lazily loads `https://checkout.razorpay.com/v1/checkout.js` in the browser. | Conceptually reusable | Vendor-specific. |
| `components/booking/booking-checkout-page.tsx` | nightly `handlePayment` branch | Creates booking order, stores pending order, creates payment order, opens Razorpay, fails/cancels through `/payment/fail`, verifies through `/payment/verify`, stores confirmation fallback, clears transient state, then routes to `/bookings?fresh=...`. | Directly reusable | Confirmed for the nightly branch only. |
| `components/booking/booking-checkout-page.tsx` | colive `handlePayment` branch | Separate quote/draft/payment order/verify flow for `draft.source === "colive"`. | Source-specific | Not the primary migration path for nightly booking behavior. |
| `components/guest/checkout.tsx` | guest-hub checkout payment | Separate post-check-in guest-store checkout flow using `/payment/create-order`, `/payment/verify`, and `/payment/fail`. | Source-specific | Adjacent to booking, but not part of the nightly booking checkout path. |

## State Libraries And Cache Behavior

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | React context + local state | Auth ownership. | Directly reusable | None in the audited path. |
| `state/guest-experience-provider.tsx` | `GuestExperienceProvider` | Booking-scoped guest-hub state: selected booking, cart badge, borrow badge, payment sync tick. | Conceptually reusable | Adjacent to booking-scoped guest pages, not to the core nightly checkout. |
| `lib/client-cache.ts` | `getClientCache`, `setClientCache` | Small sessionStorage TTL cache used by bookings and pre-arrival KYC detail/slot lookups. | Directly reusable | No invalidation beyond TTL or manual overwrite was found. |

## Not Found During This Pass

- No global booking store library such as Redux, Zustand, or React Query was found in the audited booking surfaces.
- No server-side order reconciliation worker or webhook consumer exists in this repo; payment verification is frontend-initiated through the documented API wrappers only.
