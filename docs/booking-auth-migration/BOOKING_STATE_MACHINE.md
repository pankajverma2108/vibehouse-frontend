# Booking State Machine

## Purpose

Document the audited booking state transitions used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-21 from inspected source files only.

## Important Scope Note

- The only explicit booking flow-state union found in source is in `components/booking/booking-checkout-page.tsx`:
  - `idle`
  - `creating-order`
  - `creating-payment-order`
  - `opening-razorpay`
  - `verifying-payment`
  - `confirmed`
  - `failed`
- The wider state machine below is derived from route wrappers, storage helpers, and page effects. It is a behavior map, not a dedicated central statechart file.

## Current Confirmed Nightly Booking State Machine

```text
route_normalized
  entry: `/` or `/rooms` normalize into `/property?...`
  exit: property_ready

property_ready
  entry: `PropertyPage` resolves `property_id` and preloads catalog or live availability
  exit:
    -> selection_restored
    -> selection_updated
    -> review_blocked
    -> draft_saved

selection_restored
  entry: `vh_property_selection_v1` matches the current property
  exit:
    -> selection_updated
    -> draft_saved
    -> review_resume_ready

selection_updated
  entry: room counts or age confirmation changed
  exit:
    -> selection_updated
    -> draft_saved

review_blocked
  entry: missing property, invalid dates, zero rooms, sold-out room, price unavailable, or age unchecked
  exit:
    -> property_ready

draft_saved
  entry: `saveBookingDraft()` writes `vh_booking_draft`
  exit:
    -> awaiting_auth_for_review
    -> review_ready

awaiting_auth_for_review
  entry: signed-out user clicked continue on `/property`
  exit:
    -> review_resume_ready
    -> property_ready

review_resume_ready
  entry: post-auth `vh_review_resume_v1` matches the current selection signature
  exit:
    -> review_ready

review_ready
  entry: `/booking` or `/bookingreview` rehydrates a valid draft
  exit:
    -> guest_details_invalid
    -> addons_review
    -> awaiting_auth_for_payment
    -> no_active_draft

guest_details_invalid
  entry: guest-form validation fails
  exit:
    -> review_ready

addons_review
  entry: guest details validated and the checkout UI opened the add-ons tab
  exit:
    -> addons_review
    -> awaiting_auth_for_payment
    -> creating_order

awaiting_auth_for_payment
  entry: signed-out user clicked payment; `resumePaymentAfterAuthRef = true`
  exit:
    -> creating_order
    -> no_active_draft

creating_order
  entry: nightly checkout started and creates or reuses `/guest/booking/create-order`
  exit:
    -> pending_order_saved
    -> failed

pending_order_saved
  entry: matching `pendingOrder.signature` stored inside `vh_booking_draft`
  exit:
    -> creating_payment_order
    -> failed

creating_payment_order
  entry: `/payment/create-booking-order` in progress
  exit:
    -> opening_razorpay
    -> failed

opening_razorpay
  entry: Razorpay script loaded and modal opened
  exit:
    -> verifying_payment
    -> payment_cancelled
    -> payment_failed

verifying_payment
  entry: Razorpay success handler calls `/payment/verify`
  exit:
    -> confirmed_snapshot_saved
    -> verification_pending
    -> failed

payment_cancelled
  entry: modal `ondismiss`
  exit:
    -> addons_review

payment_failed
  entry: Razorpay `payment.failed`
  exit:
    -> addons_review

verification_pending
  entry: `/payment/verify` rejects after a successful Razorpay callback
  exit:
    -> addons_review

confirmed_snapshot_saved
  entry: `saveConfirmedBookingSnapshot()` writes `vh_confirmed_booking:<eri>`
  exit:
    -> bookings_indexed

bookings_indexed
  entry: router pushes `/bookings?fresh=<eri>`
  exit:
    -> booking_confirmed_view
    -> web_checkin_gate
```

## Confirmation / Pre-Arrival / Guest-Hub State Machine

```text
bookings_indexed
  entry: `/bookings` renders fallback auth bookings, cached live bookings, or fresh `/guest/booking/mine`
  exit:
    -> bookings_empty
    -> booking_confirmed_view
    -> web_checkin_gate

bookings_empty
  entry: no bookings match the active tab/date filters
  exit:
    -> bookings_indexed
    -> property_ready

booking_confirmed_view
  entry: booking card routes to `/bookings/[eri]/confirmed`
  exit:
    -> receipt_download_requested
    -> web_checkin_gate
    -> guest_hub_entry

receipt_download_requested
  entry: confirmation page triggers `useDownloadReceipt()`
  exit:
    -> booking_confirmed_view
    -> receipt_download_failed

receipt_download_failed
  entry: receipt fetch or PDF generation failed
  exit:
    -> booking_confirmed_view

web_checkin_gate
  entry: booking card routes to `/bookings/[eri]/web-check-in`
  exit:
    -> sign_in_required_for_kyc
    -> payment_pending_gate
    -> kyc_slots_loading
    -> booking_confirmed_view

sign_in_required_for_kyc
  entry: guest token missing while opening pre-arrival
  exit:
    -> kyc_slots_loading

payment_pending_gate
  entry: `linkGuestBooking()` reports `PENDING_PAYMENT`, `PAYMENT_PENDING`, or `UNPAID`
  exit:
    -> booking_confirmed_view

kyc_slots_loading
  entry: slots/detail load from sessionStorage cache and live APIs
  exit:
    -> no_slots_available
    -> no_editable_slot
    -> kyc_editing
    -> booking_confirmed_view

no_slots_available
  entry: slot list empty
  exit:
    -> bookings_indexed

no_editable_slot
  entry: all visible slots are locked or already verified
  exit:
    -> booking_confirmed_view

kyc_editing
  entry: editable slot selected
  exit:
    -> kyc_uploading_document
    -> kyc_running_ocr
    -> kyc_submitting
    -> bookings_indexed

kyc_uploading_document
  entry: `getBookingKycUploadUrl()` + presigned upload in progress
  exit:
    -> kyc_editing
    -> failed

kyc_running_ocr
  entry: `runBookingKycOcr()` in progress
  exit:
    -> kyc_editing
    -> failed

kyc_submitting
  entry: `submitBookingKyc()` in progress
  exit:
    -> completion_modal_open
    -> failed

completion_modal_open
  entry: submit succeeded and slots were reloaded
  exit:
    -> booking_confirmed_view

guest_hub_entry
  entry: `/guest` or `/:bookingId/guest/*`
  exit:
    -> guest_hub_active
    -> guest_hub_not_yet_open
    -> guest_hub_denied

guest_hub_active
  entry: booking is guest-hub eligible and linked to the current guest
  exit:
    -> guest_hub_denied

guest_hub_not_yet_open
  entry: booking linked but stay is upcoming
  exit:
    -> guest_hub_active
    -> guest_hub_denied

guest_hub_denied
  entry: unauthenticated, unlinked, or past stay
  exit:
    -> guest_hub_entry
```

## State Notes

| State | Evidence | Entry condition | Exit / recovery behavior | Persistence |
| --- | --- | --- | --- | --- |
| `property_ready` | `app/property/page.tsx`, `components/marketing/property.tsx` | `PropertyPage` resolved a property and rendered the client selection surface. | Can move into restore, selection, or validation-blocked states. | None |
| `selection_restored` | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | `vh_property_selection_v1` matched the same property. | Re-clamped against live room availability. | `vh_property_selection_v1` |
| `draft_saved` | `components/marketing/property.tsx`, `lib/booking-session.ts` | Valid nightly selection saved as `BookingDraft`. | Routes to auth or review. | `vh_booking_draft` |
| `review_ready` | `components/booking/booking-checkout-page.tsx` | Stored draft rehydrated successfully. | Missing draft falls back to `/property`. | `vh_booking_draft` |
| `pending_order_saved` | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Nightly order summary stored by signature. | Cleared on fail/cancel or verify success. | `vh_booking_draft.pendingOrder` |
| `confirmed_snapshot_saved` | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Payment verified successfully. | Used by confirmation fallback later. | `vh_confirmed_booking:<eri>` |
| `bookings_indexed` | `app/bookings/page.tsx`, `lib/client-cache.ts` | `/bookings` rendered fallback, cached, or live booking data. | Can route to confirmation or pre-arrival. | `vh:guest-bookings:<guestId>` |
| `kyc_slots_loading` | `components/booking/pre-arrival-page.tsx`, `lib/client-cache.ts` | Web check-in route opened with a token. | Can redirect to confirmation, empty states, or slot editing. | `vh:web-checkin:slots:<eri>`, `vh:web-checkin:slot:<eri>:<slotId>` |
| `guest_hub_active` | `app/guest/page.tsx`, `components/guest/guest-route-gate.tsx`, `lib/guest-hub.ts` | Active stay matched guest-hub eligibility rules. | Future backend status fixes may narrow this eligibility. | `guest.bookings`, `/guest/booking/mine`, `/guest/booking/link` |

## Failure And Recovery States

| Failure / pending state | Evidence | Verified recovery path |
| --- | --- | --- |
| `review_blocked` | `components/marketing/property.tsx` | User corrects property/date/room/age inputs and clicks continue again. |
| `guest_details_invalid` | `components/booking/booking-checkout-page.tsx` | User fixes guest fields; no route change required. |
| `payment_cancelled` | `components/booking/booking-checkout-page.tsx` | Pending order is cleared and the user stays in checkout for retry. |
| `payment_failed` | `components/booking/booking-checkout-page.tsx` | `/payment/fail` runs, pending order is cleared, and the user retries manually. |
| `verification_pending` | `components/booking/booking-checkout-page.tsx` | User is told to check `My Bookings` later; no automatic retry or polling exists. |
| `no_active_draft` | `components/booking/booking-checkout-page.tsx` | User returns to `/property` and rebuilds the draft. |
| `payment_pending_gate` | `components/booking/pre-arrival-page.tsx` | User goes back to confirmation/status and waits for payment completion. |
| `no_slots_available` | `components/booking/pre-arrival-page.tsx` | User reopens `/bookings` or the booking link later. |
| `no_editable_slot` | `components/booking/pre-arrival-page.tsx` | User returns to confirmation or uses a different linked guest account. |
| `guest_hub_denied` | `components/guest/guest-route-gate.tsx` | User signs in with the linked guest account or waits for the stay to become active. |

## Pending / Unknown States

| Area | Status |
| --- | --- |
| Formal centralized booking reducer or statechart | Not found during this pass. |
| Server-side abandoned-order reconciliation | Not found during this pass. |
| Automatic retry/backoff for `/payment/verify` | Not found during this pass. |
| Dedicated booking-expiry endpoint or explicit order timeout state in frontend | Not found during this pass. |
| Guest-hub final eligibility rules after backend status fixes | Pending deeper audit. The current source still uses `TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS = true`. |
