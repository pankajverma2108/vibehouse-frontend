# Booking State Machine

## Purpose

Document the audited booking state transitions used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-20 from live source files only.

## Important Scope Note

- `components/booking/booking-checkout-page.tsx` contains the only explicit booking flow stage union found during this pass:
  - `idle`
  - `creating-order`
  - `creating-payment-order`
  - `opening-razorpay`
  - `verifying-payment`
  - `confirmed`
  - `failed`
- The wider state machine below is derived from route guards, storage helpers, and page effects. It is a documented behavioral model, not a dedicated source enum.

## Audited Behavioral States

| State | Evidence | Entry condition | Exit transitions | Persistence | Reuse | Uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| `property_ready` | `app/property/page.tsx`, `components/marketing/property.tsx` | `/property` loads with a resolved `property_id` and either catalog or availability data. | `selection_restored`, `selection_updated`, `review_blocked`, `draft_saved` | None by itself | Directly reusable | None in the audited route. |
| `selection_restored` | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | A saved nightly selection exists for the same property and is restored into UI state. | `selection_updated`, `review_resume_consumed`, `draft_saved` | `vh_property_selection_v1` | Directly reusable | Restore is property-scoped rather than exact-date-scoped. |
| `selection_updated` | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | Room counts or age confirmation change on the property page. | `draft_saved` or more `selection_updated` | `vh_property_selection_v1` | Directly reusable | Save is debounced by 150 ms. |
| `review_blocked` | `components/marketing/property.tsx` | Guest tries to continue without property context, date range, room selection, valid inventory, or age confirmation. | Returns to `property_ready` after correction | None | Directly reusable | Error UX is toast-based and source-specific. |
| `draft_saved` | `components/marketing/property.tsx`, `lib/booking-session.ts` | Valid selection is normalized into `BookingDraft` and stored. | `awaiting_auth_for_review` or `review_ready` | `vh_booking_draft` | Directly reusable | None in the audited save path. |
| `awaiting_auth_for_review` | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | Draft is saved but guest is signed out when continuing to review. | `review_ready` if the saved resume intent signature still matches; otherwise back to `property_ready` | `vh_review_resume_v1` plus auth redirect keys | Directly reusable | Resume fails closed when the selection signature no longer matches. |
| `review_ready` | `components/booking/booking-checkout-page.tsx` | `/bookingreview` or `/booking` rehydrates a valid draft and guest form. | `addons_review`, `awaiting_auth_for_payment`, `creating_order`, `no_active_draft` | `vh_booking_draft` | Directly reusable | None in the audited page mount. |
| `addons_review` | `components/booking/booking-checkout-page.tsx` | Guest detail validation passes and the review UI switches to the add-ons tab. | `creating_order`, more add-on edits, or back to `review_ready` | `vh_booking_draft` plus saved review guest form | Directly reusable | Catalog fetch failure silently empties add-ons and keeps checkout alive. |
| `awaiting_auth_for_payment` | `components/booking/booking-checkout-page.tsx` | Guest clicks payment while signed out; `resumePaymentAfterAuthRef` is set and auth modal opens. | `creating_order` once `isAuthenticated` flips true | In-memory ref only | Directly reusable | This resume flag is not durable across a full reload. |
| `creating_order` | `components/booking/booking-checkout-page.tsx` -> `flowStage` | Nightly checkout starts and either reuses a matching pending order or calls `createGuestBookingOrder(...)`. | `pending_order_saved`, `failed` | Pending order may already exist in session storage | Directly reusable | Explicit `flowStage` state. |
| `pending_order_saved` | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Booking order summary is saved by draft signature before payment order creation. | `creating_payment_order`, `failed` | `vh_booking_draft.pendingOrder` | Directly reusable | Confirmed for nightly flow only. |
| `creating_payment_order` | `components/booking/booking-checkout-page.tsx` -> `flowStage` | Checkout calls `createBookingPaymentOrder(...)`. | `opening_razorpay`, `failed` | Pending order remains stored | Directly reusable | Explicit `flowStage` state. |
| `opening_razorpay` | `components/booking/booking-checkout-page.tsx` -> `flowStage` | Razorpay script loads and the modal is opened. | `verifying_payment`, `failed` | Pending order remains stored until verify success or fail clear | Directly reusable | Explicit `flowStage` state. |
| `verifying_payment` | `components/booking/booking-checkout-page.tsx` -> `flowStage` | Razorpay success handler calls `/payment/verify`. | `confirmed_snapshot_saved` or `failed` | Pending order still present until verify success | Directly reusable | Explicit `flowStage` state. |
| `confirmed_snapshot_saved` | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Payment verification succeeded; pending order and draft are cleared and a local confirmation snapshot is written. | `bookings_indexed` | `vh_confirmed_booking:<eri>` | Directly reusable | Confirmation detail richness depends on the checkout-time snapshot shape. |
| `failed` | `components/booking/booking-checkout-page.tsx` -> `flowStage` | Order, payment-order, Razorpay, or verification failure occurs. | Retry from `review_ready` or `addons_review` | Draft may remain; pending order is cleared on nightly fail/cancel paths | Directly reusable | Explicit `flowStage` state, but error copy is source-specific. |
| `bookings_indexed` | `app/bookings/page.tsx` | `/bookings` loads fallback bookings, session cache, or fresh `/guest/booking/mine` data. | `booking_confirmed_view`, `web_checkin_open`, `bookings_empty` | `vh:guest-bookings:<guestId>` session TTL cache | Directly reusable | Live sync can fail while fallback bookings still render. |
| `booking_confirmed_view` | `components/booking/booking-confirmed-page.tsx` | Booking card routes to confirmed view because all KYC slots are complete, or the guest opens confirmation directly. | `receipt_download_requested`, `web_checkin_open`, or sign-in gating | Local confirmation snapshot fallback | Directly reusable | Live detail refresh may fail and fall back to local snapshot. |
| `web_checkin_open` | `components/booking/pre-arrival-page.tsx` | Booking card routes to web check-in because KYC is incomplete. | `payment_pending_gate`, `kyc_slots_loading`, `booking_confirmed_view`, or sign-in gating | sessionStorage TTL caches for slots/detail | Conceptually reusable | KYC editor details are source-specific. |
| `payment_pending_gate` | `components/booking/pre-arrival-page.tsx` | Pre-arrival discovers payment-pending booking status. | `booking_confirmed_view` after payment completes and route is reopened | sessionStorage slot cache may store empty slots plus booking status | Conceptually reusable | Exact pending-status helpers are internal to this file. |
| `kyc_slots_loading` | `components/booking/pre-arrival-page.tsx` | Slot list/detail are loading from cache and live APIs. | `kyc_editing`, `booking_confirmed_view`, `no_slots_available`, `no_editable_slot` | sessionStorage TTL caches | Conceptually reusable | Exact TTL constants were not separately extracted. |
| `kyc_editing` | `components/booking/pre-arrival-page.tsx` | An editable slot is active and the guest is in step 1/2/3 of the KYC editor. | `kyc_submitting`, `booking_confirmed_view`, or back to `bookings_indexed` | In-memory editor state plus cached slot detail | Conceptually reusable | Step labels and field rules are source-specific. |
| `kyc_submitting` | `components/booking/pre-arrival-page.tsx` | Validated KYC payload is being submitted. | `booking_confirmed_view` on completion modal path or back to `kyc_editing` on validation failure | Cached slot detail is refreshed after success | Conceptually reusable | Final backend approval timing beyond submission was not audited here. |

## Source-Specific Branches

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/booking/booking-checkout-page.tsx` | `isColiveDraft(draft)` branch | Runs a separate quote/draft/payment/verify state path for `source === "colive"`. | Source-specific | Not the primary nightly migration target. |
| `lib/guest-hub.ts` | `TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS` | Temporarily treats date-window-active bookings as guest-hub eligible even if backend in-house statuses are not yet reliable. | Source-specific | Explicitly marked temporary in source comments. |

## Not Found During This Pass

- No standalone reducer, XState machine, or centralized booking statechart file was found.
- No server-driven order-status polling loop was found in the nightly booking checkout path.
