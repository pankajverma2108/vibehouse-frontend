# Guest Store 403 Investigation and Backend Handoff

Date: 2026-05-04
Owner: Frontend team
Audience: Backend API team
Scope: `/guest/store/*` endpoints used by Guest Dashboard modules (`/guest/addons`, `/guest/borrow`, `/guest/checkout`, `/guest/extend`)

## 1) Problem Summary

The Guest Dashboard is repeatedly receiving `403 Forbidden` for cart and borrowable state reads, even when the user is authenticated in frontend.

Observed browser errors:

- `GET https://api.thedailysocial.co.in/guest/store/TDS-BANGALORE-MOCMCIBH-65D3/borrowable/mine` -> `403`
- `GET https://api.thedailysocial.co.in/guest/store/cart/TDS-BANGALORE-MOCMCIBH-65D3` -> `403`

The same calls repeat across guest modules because these reads are needed by multiple screens and refresh flows.

## 2) Current Frontend Call Contract (As Implemented)

Source: `lib/guest-experience-api.ts`

The frontend currently calls:

- `getCart(eri, token)`
- `getBorrowMine(eri, token)`

with:

- Path parameter: `eri` (frontend variable name for reservation ID; examples look like `TDS-BANGALORE-MOCMCIBH-65D3`)
- Header: `Authorization: Bearer <guest_access_token>`
- No extra body/query for these GET routes

### Exact endpoint shapes used

- `GET /guest/store/cart/:eri`
- `GET /guest/store/:eri/borrowable/mine`

## 3) Auth + Booking Context in Frontend

### Auth model

- Token is obtained via guest auth APIs (`/guest/auth/login`, `/guest/auth/verify-otp`, `/guest/auth/verify-2fa`, etc.)
- Token is stored in localStorage/sessionStorage and sent as Bearer token
- Token is validated in FE session restore via `GET /guest/auth/me`

### Booking model

- Booking list comes from `GET /guest/booking/mine`
- Booking fields available to FE include:
  - `ezee_reservation_id`
  - `status` (`APPROVED`, `PENDING_APPROVAL`, `REJECTED`)
  - property/room/checkin/checkout metadata
- FE can have multiple bookings for one guest, and one booking is selected as active context

## 4) Why 403 Is Likely Happening

The error pattern indicates backend authorization is rejecting access to store resources for the reservation ID context.

Likely root causes:

1. Token scope is valid for auth, but not authorized for the provided reservation ID.
2. Endpoint expects a specific booking lifecycle state (for example checked-in), but current booking state is not accepted.
3. Reservation identifier mismatch:
   - frontend passes `ezee_reservation_id`
   - backend may expect a different internal key or transformed reservation ID format.
4. Property/booking binding checks fail (reservation not mapped to this guest in backend auth context).
5. Backend route requires an additional context field (header/query/claim) not currently documented to FE.

## 5) Backend Clarifications Required (Blocking)

Please confirm the authoritative contract for these endpoints:

- `GET /guest/store/cart/:eri`
- `GET /guest/store/:eri/borrowable/mine`

For each route, define:

1. Required auth type (Bearer token only, or extra claim/header needed)
2. Required reservation identifier format (`ezee_reservation_id` vs internal booking ID)
3. Required booking state gates (checked-in only? approved only? in-house only?)
4. Multi-booking behavior (how backend verifies selected booking ownership)
5. Expected 403 error payload schema and machine-readable error codes

## 6) Recommended Backend Response Contract for FE Reliability

When access is denied, please return structured payload like:

```json
{
  "code": "BOOKING_NOT_CHECKED_IN",
  "message": "Guest is not checked in for this reservation",
  "reservation_id": "...",
  "guest_id": "..."
}
```

Suggested error codes:

- `BOOKING_NOT_FOUND_FOR_GUEST`
- `BOOKING_NOT_CHECKED_IN`
- `BOOKING_CONTEXT_MISMATCH`
- `TOKEN_SCOPE_INSUFFICIENT`
- `STORE_FEATURE_NOT_ENABLED`

This allows frontend to show the correct action/state instead of generic failures.

## 7) Frontend Behavior Impact

Currently affected:

- `/guest/addons` (cart read + count)
- `/guest/borrow` (borrowable mine read + count)
- `/guest/checkout` (cart + borrow summary)
- `/guest/extend` (cart-backed extension services)

Repeated 403 causes:

- noisy retries and repeated error surfaces
- unavailable dashboard sections despite valid auth session

## 8) Decision Needed From Backend

Please choose one canonical access rule:

1. `Store APIs allowed only when booking is checked-in`
2. `Store APIs allowed from approved booking state`
3. `Store APIs allowed from any authenticated booking-owner state`

Frontend can gate UI to match the chosen rule, but needs one stable backend rule and error code mapping.

## 9) Frontend Is Ready To Support These Backward-Compatible Additions

If backend adds any of the following, FE can wire quickly:

- explicit booking-state endpoint for store eligibility
- deterministic error codes for 403s
- endpoint to validate selected booking context before store calls

## 10) Suggested Backend Test Cases

Please verify these server-side tests:

1. valid token + booking owner + checked-in -> 200
2. valid token + booking owner + not checked-in -> expected 403 code
3. valid token + different guest booking -> expected 403 code
4. expired/invalid token -> 401
5. malformed reservation id -> 400

## 11) FE/BE Sync Checklist

- [ ] Confirm reservation ID format expected by store APIs
- [ ] Confirm booking-state gating for store APIs
- [ ] Return structured 403 error code + message
- [ ] Share example success + failure payloads for both routes
- [ ] Align FE gating logic with backend contract

## 12) Code References (Frontend)

- `lib/guest-experience-api.ts`
- `modules/guest/addons.tsx`
- `modules/guest/borrow.tsx`
- `modules/guest/checkout.tsx`
- `modules/guest/extend.tsx`
- `components/auth/guest-auth-provider.tsx`
