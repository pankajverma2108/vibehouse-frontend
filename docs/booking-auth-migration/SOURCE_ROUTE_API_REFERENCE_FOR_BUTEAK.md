# Source Route/API Reference For Buteak

## Purpose

Document how `Vibehouse_frontend` currently handles booking, auth, payment, property, room, confirmation, and guest flows so `buteak_website` can reuse the backend-facing behavior conceptually while keeping its own canonical route set.

This document is source-reference only.

- It does not change Vibehouse runtime behavior.
- It does not authorize Vibehouse route migration.
- It does not authorize Buteak implementation from this repo.
- It does not recommend copying Vibehouse route names directly.

## Status

Audited on 2026-05-26 from inspected source files and the existing source migration docs only.

## Source Role Versus Target Role

- `Vibehouse_frontend` is the source/reference frontend for shared backend and database-facing behavior.
- `buteak_website` is the target repo that will keep its own canonical route direction from `C:\Space\buteak_website\docs\booking-auth-migration\CANONICAL_ROUTE_DIRECTION_PLAN.md`.
- Buteak should adapt flow behavior, API sequencing, identity rules, and persistence boundaries from this source repo without inheriting Vibehouse route naming or source-brand assumptions.

## Current Vibehouse Route Inventory

### Booking discovery and booking-start routes

| Vibehouse route | Current role | Source behavior that matters to Buteak |
| --- | --- | --- |
| `/` | home entry | Requires `checkin`, `checkout`, and `property_id` for live room rendering; otherwise redirects to `/property?...` using resolved property context. |
| `/rooms` | legacy normalization route | Preserves incoming booking params and redirects to `/property?...`. |
| `/property` | main nightly booking surface | Resolves `property_id`, loads catalog or dated availability, owns room selection, persists selection state, and hands off to draft creation. |
| `/booking` | legacy/direct review route | Mounts the shared checkout/review page without rebuilding state from URL params. |
| `/bookingreview` | primary nightly review and payment route | Hydrates the stored booking draft, guest details, add-ons, order creation, payment creation, Razorpay, and verification flow. |
| `/reviewnew` | compatibility alias | Redirects to `/bookingreview`. |

### Booking history, confirmation, and pre-arrival routes

| Vibehouse route | Current role | Source behavior that matters to Buteak |
| --- | --- | --- |
| `/bookings` | bookings index | Lists guest bookings from auth state plus `/guest/booking/mine`, groups them by stay state, and routes cards to confirmation or pre-arrival. |
| `/bookings/[eri]/confirmed` | confirmation page | Uses `ezee_reservation_id` route identity, live `linkGuestBooking()` fetch, and confirmed-snapshot fallback. |
| `/bookings/[eri]/web-check-in` | pre-arrival/KYC page | Uses `ezee_reservation_id`, auth token, booking link validation, KYC slot APIs, and payment-pending gating. |

### Guest and account routes

| Vibehouse route | Current role | Source behavior that matters to Buteak |
| --- | --- | --- |
| `/guest` | guest-hub entry | Resolves the active booking-scoped guest route and redirects into `/:bookingId/guest/*` when eligible. |
| `/:bookingId/guest/*` | booking-scoped guest surfaces | Uses `bookingId === ezee_reservation_id`, `GuestExperienceProvider`, and `GuestBookingGate` to gate stay-linked guest pages. |
| `/profile` | guest profile | Client-protected account page that depends on global guest auth context and opens sign-in when unauthenticated. |
| `/auth/google/success` | Google callback finalizer | Stores the returned access token, validates it with `/guest/auth/me`, and resumes the remembered post-auth route. |

## Current API Wrapper Ownership

### Base transport and shared error behavior

| File | Ownership |
| --- | --- |
| `lib/vibehouse-api.ts` | Base JSON wrapper for authenticated and unauthenticated backend requests. Owns API base URL resolution, bearer token header injection, forwarded host/proto headers, `no-store` fetch policy, and `ApiRequestError`. |

### Property and room discovery

| File | Ownership |
| --- | --- |
| `lib/property-resolver.ts` | Resolves numeric `property_id` and brand from explicit params, host mapping, or env fallback. |
| `lib/cx-api.ts` | Owns source-side property discovery helpers, room catalog fetches, live availability fetches, room normalization, default property href creation, and adjacent public events fetches. |
| `app/api/cx/rooms/route.ts` | Internal Next.js route that validates query params and exposes normalized room payloads to the client property page. |

### Auth and session

| File | Ownership |
| --- | --- |
| `lib/guest-auth-api.ts` | Owns guest auth endpoints, token storage helpers, Google auth URL construction, and post-auth redirect persistence. |
| `components/auth/guest-auth-provider.tsx` | Owns runtime auth restore, cached profile behavior, modal entrypoints, and authenticated guest state shared by booking, profile, bookings, and guest routes. |

### Booking, payment, receipt, and guest-booking APIs

| File | Ownership |
| --- | --- |
| `lib/booking-api.ts` | Owns booking-order creation, payment-order creation, payment verify/fail, booking retrieval, booking link, guest-store catalog, KYC slot/detail/upload/OCR/submit, and Colive booking branches. |
| `lib/receipt-api.ts` | Owns receipt fetch by `ezee_reservation_id`. |
| `hooks/use-download-receipt.ts` | Owns the client-side receipt download flow after receipt JSON is fetched. |

## Shared Backend Assumptions Visible In Source

- `property_id` is a required backend identity for nightly room discovery and booking-order creation. The route slug is not the backend identity.
- Guest auth is bearer-token based, restored by `GET /guest/auth/me`, not by a cookie session.
- `ezee_reservation_id` is the main booking identifier for confirmation, pre-arrival, receipt download, booking-link calls, and booking-scoped guest routes.
- Nightly payment is a two-step backend flow:
  - create booking order first
  - create payment order second
- Confirmation becomes real only after frontend-initiated `POST /payment/verify` succeeds.
- Guest-booking access depends on both auth state and booking linkage from `/guest/booking/mine` plus `/guest/booking/link`.
- Pre-arrival and guest hub are downstream booking experiences, not separate booking engines.

## Shared Database/API Behavior Relevant To Buteak

### Property resolution

- Source route entry resolves `property_id` in this order:
  - explicit query param
  - host-based mapping
  - env fallback
- Buteak can reuse the concept that canonical routes still need a backend property identity layer behind them.
- Buteak should not reuse Vibehouse host mapping values directly.

### Room discovery and room selection

- The nightly source flow loads either:
  - catalog mode from `/guest/booking/rooms`
  - availability mode from `/guest/booking/availability`
- `lib/cx-api.ts` merges normalized room data and fills sold-out or fallback states when live availability is incomplete.
- `/property` owns room counts, age confirmation, live availability request state, and the final room draft derived from selected counts.
- Buteak can reuse the concept that room cards, room-detail popup content, draft creation, and checkout summary should all derive from one normalized room model.

### Booking draft and review handoff

- The nightly draft is frontend-only in `sessionStorage` via `lib/booking-session.ts`; no server-side draft API was confirmed in source.
- Review resume is guarded by a selection signature persisted in `vh_review_resume_v1`.
- Buteak can reuse the idea that route transitions should not rebuild booking state from route params alone once the user enters review and checkout.

### Create-order and payment sequencing

- Source nightly flow is:
  - build validated draft
  - `POST /guest/booking/create-order`
  - persist pending order keyed by draft signature
  - `POST /payment/create-booking-order`
  - open Razorpay
  - `POST /payment/verify` on success
  - `POST /payment/fail` on dismiss or failure
- Buteak can reuse the idempotency boundary where a matching pending order is reused for the same draft signature.

### Confirmation and bookings retrieval

- `/bookings` depends on `guest.bookings` fallback plus live `/guest/booking/mine`.
- `/bookings/[eri]/confirmed` tries live `linkGuestBooking()` data first and falls back to a browser-stored confirmed snapshot.
- Buteak can reuse the idea that confirmation is linked to booking identity, not to the property page route.

### Guest bookings and post-booking guest access

- Guest hub entry resolves the active eligible booking first, then redirects into a booking-scoped guest route.
- Guest pages are booking-scoped, not property-scoped.
- Pre-arrival and guest hub both depend on booking linkage and booking status rather than discovery-route structure.

### Auth, session, and brand scoping

- Auth restore, post-auth redirect, and Google callback all operate independently from the booking route names.
- The frontend includes source-specific brand resolution from `property_id` and host.
- Buteak can reuse the concept that auth callbacks and redirects should preserve the intended downstream booking or account destination, but Buteak should own its own route targets and brand rules.

## What Buteak Can Reuse Conceptually

- Property resolution must end in a real backend `property_id` before room or booking APIs run.
- One normalized room model should feed property detail, room-detail popup, booking draft, review summary, and confirmation display.
- Booking review and checkout can remain one orchestrated flow even if the target repo splits them into different canonical routes.
- Draft persistence, resume intent, and pending-order reuse are useful source patterns for safe auth interruption and retry behavior.
- Payment should remain downstream of booking-order creation rather than opening Razorpay from raw room selection state.
- Confirmation, pre-arrival, and guest dashboard behavior should stay booking-identity-driven rather than property-route-driven.
- Auth restore and post-auth redirect should preserve booking continuation intent without hard-coding source route names.

## What Buteak Must Not Copy Directly

- Vibehouse route names such as `/property`, `/bookingreview`, `/reviewnew`, `/bookings/[eri]/confirmed`, or `/:bookingId/guest/*` are not the Buteak canonical route direction.
- Vibehouse host-to-property mapping and source brand defaults in `lib/property-resolver.ts` are source-specific.
- Hardcoded property IDs such as `60765` in navigation and standalone source surfaces are not migration-safe defaults.
- The temporary guest-hub eligibility widening in `lib/guest-hub.ts` must not be carried forward blindly.
- Colive branches in `lib/booking-api.ts`, `lib/colive-api.ts`, and `app/property/page.tsx` are separate source-product logic and not part of the nightly Buteak route direction.
- Local promo-code behavior inside `components/booking/booking-checkout-page.tsx` is a source-side stub, not a verified shared backend coupon contract.
- Vibehouse-specific fallback room presentation, hardcoded room galleries, and adjacent event-preview behavior in `lib/cx-api.ts` should not define Buteak architecture.

## Conceptual Mapping To Buteak Canonical Routes

| Buteak canonical route | Conceptual source behavior to adapt | What to preserve from source |
| --- | --- | --- |
| `/` | Vibehouse `/` plus booking widget handoff | Discovery can stay home-first, but booking intent still needs property identity before API calls. |
| `/property/btm` | Vibehouse `/property` nightly property surface | Property page owns property-aware room listing, availability fetches, and booking handoff. |
| `/property/koramangala` | Vibehouse `/property` nightly property surface | Same property-page responsibilities, but target route slug should resolve to Buteak property identity. |
| `/property/hsr` | Vibehouse `/property` nightly property surface | Same property-page responsibilities, with target-controlled upcoming or non-bookable handling if needed. |
| `/room/btm/btm-deluxe` | Vibehouse room-detail concepts currently embedded in `/property` data plus room normalization | Preserve one room model; do not create a second booking engine for the room-detail surface. |
| `/review` | Vibehouse `/bookingreview` draft hydration and pre-payment review behavior | Review should consume a stored draft and guest state, not reconstruct from slug params alone. |
| `/checkout` | Payment-stage behavior currently inside `BookingCheckoutPage` | Preserve create-order -> create-payment-order -> Razorpay -> verify sequencing even if the route name changes. |
| `/confirmation` | Vibehouse `/bookings/[eri]/confirmed` confirmation behavior | Preserve booking-identity-driven confirmation, not property-route-driven confirmation. |
| `/bookings` | Vibehouse `/bookings` | Preserve booking list retrieval and booking-card routing logic conceptually. |
| `/dashboard` | Vibehouse guest-hub entry and booking-scoped guest modules | Preserve the idea that guest services are booking-linked and gated by booking eligibility. |
| `/profile` | Vibehouse `/profile` | Preserve auth-backed account access, but keep Buteak session and redirect behavior target-owned. |

## Feature-Specific Reference Notes

### Property resolution

- Source truth: routes may be pretty, but backend calls still require numeric `property_id`.
- Buteak should keep a route-slug-to-property-identity mapping layer rather than turning the slug itself into API identity.

### Room selection

- Source truth: the room-selection owner is the property page, not the review page.
- Buteak should preserve a single owner for selected counts and derive room draft rows from normalized room data.

### Booking draft

- Source truth: nightly draft is browser-persisted and reused across auth interruptions and reloads.
- Buteak can change storage details later, but should preserve the draft boundary between property selection and payment orchestration.

### Create-order

- Source truth: `/guest/booking/create-order` is the first booking mutation and requires `property_id`, stay dates, rooms, and optional add-ons.
- Buteak should keep this mutation downstream of validated draft state.

### Razorpay payment

- Source truth: Razorpay opens only after the booking order exists and payment order creation succeeds.
- Buteak should preserve this ordering even if `/review` and `/checkout` become separate canonical routes.

### Confirmation

- Source truth: confirmation depends on verified payment and booking identity, with local fallback snapshot support.
- Buteak should treat confirmation as a booking-result surface, not a room or property route continuation.

### Guest bookings

- Source truth: bookings list and guest-hub flows depend on `ezee_reservation_id`, booking link APIs, and stay-state rules.
- Buteak should preserve booking-centric post-booking behavior even with different page names.

### Auth, session, and brand scoping

- Source truth: auth is globally mounted, token-based, and used by booking, profile, bookings, pre-arrival, and guest routes.
- Buteak can reuse the session model conceptually, but must keep its own brand, route, and redirect ownership.

## Not Found During This Pass

- A server-side nightly booking draft API.
- A verified shared backend coupon-validation endpoint for nightly booking.
- Webhook-driven payment reconciliation in this frontend repo.
- Any evidence that route names themselves carry backend booking meaning beyond the frontend flow structure.
