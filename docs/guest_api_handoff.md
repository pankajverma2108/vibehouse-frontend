# Missing APIs for Guest Post-Checkin Module

## Context

This handoff is based on the current route docs, API test reports, and finalised workflows under:

- `guidelines/Vibehouse_docs-main/api_routes/*`
- `guidelines/Vibehouse_docs-main/api_testing/*`
- `guidelines/Vibehouse_docs-main/finalised_workflows/*`
- `guidelines/Vibehouse_docs-main/api_routes_summary.csv`

The `/guest` frontend is already integrated for:

- guest auth + token handling
- booking-linked store cart
- service requests
- borrow request + mine list
- checkout/payment verify/fail

The remaining gaps are not frontend-only; they require backend contract support to complete post-checkin UX safely.

---

## 1) Booking API

### Required

- `GET /guest/bookings` (or equivalent canonical endpoint for authenticated guest stays)

### Why this is needed

Current frontend must render post-checkin dashboard state using booking identity (room, status, stay dates, property context).  
Today, we can partially read booking summaries from:

- `GET /guest/auth/me` (`bookings` summary), and
- `GET /guest/booking/mine` (linked bookings list)

But the post-checkin module needs a stable, guest-facing booking payload specifically for in-stay operations. A dedicated booking endpoint reduces ambiguity between:

- auth profile summary concerns,
- linking concerns, and
- post-checkin operational concerns.

### Needed fields

- `ezee_reservation_id`
- `property_id`
- `property_name`
- `room_type_name`
- `room_number`
- `checkin_date`
- `checkout_date`
- `status` (booking status)
- `booking_access_status` (guest access/approval status)
- `unit_code` (required for unit-scoped cart operations)
- `smart_lock_data` (optional object)

### Why each field matters

- `room_number` / `room_type_name`: required for dashboard clarity and service context.
- `checkin_date` / `checkout_date`: required for extension, borrow overdue messaging, and checkout UX.
- `status` + access status: prevents UI actions on invalid/unapproved bookings.
- `unit_code`: required by `/guest/store/cart/:eri/add` contract for unit-level tracking.
- `property_name`: human-readable context for guest UI and notifications.

---

## 2) Smart Lock API

### Required

- `GET /guest/smart-lock/:eri`

### Response

- `passcode`
- `valid_from`
- `valid_till`
- `lock_status`
- `room_number`

### Why this is needed

Workflow 05 defines PIN lifecycle (create/revoke/rotate) and guest notification behavior.  
MyGate route docs/test reports confirm lock operations are currently lock-dependent and often unavailable until physical lock setup is complete.  
Without a guest-safe read endpoint, frontend can only show placeholders.

This API is needed so dashboard and stay surfaces can:

- show passcode only when valid,
- show validity window,
- hide expired/revoked credentials safely,
- avoid leaking internal MyGate/partner-level objects.

### Important constraints

- Do not expose partner-level MyGate credentials/session details.
- Return guest-scoped, booking-scoped access only.
- If no active PIN exists, return a safe empty shape (`passcode: null`) rather than erroring.

---

## 3) Borrow Return API

### Required

- `POST /guest/store/:eri/borrowable/return`

### Payload

- `borrow_id`
- optional `notes`

### Why this is needed

Current store APIs support:

- borrow request (`POST /guest/store/:eri/borrowable/request`)
- my borrow list (`GET /guest/store/:eri/borrowable/mine`)

Workflow 10 defines full borrow lifecycle including return and overdue handling.  
At present, return is staff-verified/admin-side only from frontend perspective, so guest UI cannot complete the return intent through API.

This endpoint is needed to:

- capture guest return intent in-app,
- reduce manual front-desk dependency,
- support cleaner state transitions before final staff verification.

### Expected state model

- guest request creates/marks return-intent state (e.g. `RETURN_REQUESTED`)
- staff verification finalizes to `RETURNED`
- inventory increment remains authoritative on verified return

---

## 4) Extension Availability API

### Required

- `GET /guest/extension/options?eri=...`

### Response

- `available_slots` (or date windows)
- `same_bed_available` flag
- `pricing` (rate/day, total, taxes if applicable)
- `move_notice` / relocation disclaimer when same bed unavailable

### Why this is needed

Workflow 09 explicitly requires:

- live availability check,
- same-bed check,
- dynamic rate fetch from eZee,
- then payment.

Current guest store/cart/payment APIs can process paid services, but they do not provide extension-specific pre-check logic required by business flow.  
Without this endpoint, frontend cannot safely enforce extension decisions before charging.

### Why cart-only is insufficient

- extension depends on stay-specific occupancy + bed continuity
- price must come from live PMS logic, not static service catalog pricing
- relocation disclaimer logic needs backend truth

---

## 5) MyGate Integration API

### Required

- `POST /guest/mygate/invite`
- `GET /guest/mygate/access`

### Why this is needed

Post-checkin guest UX includes gate/visitor support, but current MyGate docs are partner/admin oriented (`/v1/partners`, `/v1/properties`, `/v1/rooms`, `/v1/accesses`) and not guest-facing.  
Frontend should not call partner-level MyGate APIs directly.

Guest-safe integration endpoints are needed to:

- create visitor invite requests bound to guest booking context,
- fetch guest-readable gate instructions/access artifacts,
- avoid exposing partner credentials, lock topology, or internal IDs.

### Recommended response shape (guest-safe)

- `access_instructions`
- `visitor_invite_status`
- `invite_id`
- `valid_from` / `valid_till`
- optional `support_message`

---

## 6) Notes

### What currently works

- Paid post-checkin commerce via cart + payment:
  - `/guest/store/cart/:eri/*`
  - `/payment/create-order`
  - `/payment/verify`
  - `/payment/fail`
- Free service requests:
  - `/guest/store/:eri/service/request`
- Borrow request and visibility:
  - `/guest/store/:eri/borrowable/request`
  - `/guest/store/:eri/borrowable/mine`

### What is still blocked without new APIs

- Smart lock UX is placeholder-only (no guaranteed guest read contract).
- Borrow return remains UI-only intent with no backend action endpoint.
- Stay extension cannot be validated correctly (availability + same-bed + live rate).
- Gate access/visitor UX cannot be operationalized safely with guest scope.

### Backend implementation priority (suggested)

1. Booking API stabilization for post-checkin dashboard
2. Smart lock guest read endpoint
3. Borrow return endpoint
4. Extension options endpoint
5. Guest-scoped MyGate invite/access endpoints

### Acceptance criteria for backend readiness

- All endpoints are guest-auth protected with booking access checks.
- Error responses are deterministic and frontend-safe (no partner/internal leakage).
- Response fields are stable and documented for versioned frontend consumption.
