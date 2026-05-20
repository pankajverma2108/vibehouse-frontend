# Frontend Note: Guest Dashboard Access Gating + Store API 403

Date: 2026-05-04
Owner: Frontend

## Purpose

Track what frontend can do now, what is blocked on backend, and how to safely gate guest dashboard features for multi-booking users.

## Current Frontend Assumptions

1. Guest dashboard access should be tied to an active booking context.
2. In future, backend will decide checked-in vs checked-out eligibility.
3. Guests may have multiple bookings; selected booking ID must drive dashboard actions.
4. Reservation IDs are unique and used as route context for store APIs.

## What Frontend Already Sends

For store/cart/borrow reads, FE sends:

- Bearer token (`Authorization` header)
- Reservation ID in URL path (`:eri`)

No additional booking ID in body/query for these GET routes.

## What Frontend Can Do Immediately (No Backend Change)

1. Stronger FE gating before store calls:
   - skip store reads when `selectedBookingId` is missing
   - skip store reads when user is unauthenticated
2. Better user-facing fallback for 403:
   - show clear banner that store actions are unavailable for current booking state
   - avoid repeated noisy toasts on repeated 403
3. Add local diagnostics in UI state (non-production verbose logs optional)

## What Frontend Cannot Reliably Solve Alone

1. Whether selected booking is eligible by backend rule (checked-in/in-house)
2. Whether provided reservation ID format matches backend expected key
3. Whether token requires extra scope/claim for store APIs
4. Why 403 occurred (without backend error code taxonomy)

## Required Backend Inputs For Final FE Behavior

1. Canonical eligibility rule for store APIs (checked-in only vs broader)
2. Confirmed reservation ID contract for `:eri`
3. Structured 403 error code payload
4. If required, any additional context fields beyond bearer token + `:eri`

## Proposed FE Behavior After Backend Contract Is Finalized

1. Resolve selected booking from `/guest/booking/mine`
2. Check eligibility state (direct or inferred from backend response code)
3. Call store endpoints only when eligible
4. Map backend codes to deterministic UI states:
   - `BOOKING_NOT_CHECKED_IN` -> show gated state
   - `BOOKING_CONTEXT_MISMATCH` -> prompt booking reselection
   - `TOKEN_SCOPE_INSUFFICIENT` -> force re-auth

## Action Items (Frontend)

- [ ] Add explicit UI state for "store unavailable for current booking"
- [ ] Debounce duplicate 403 toasts
- [ ] Keep selected booking as required precondition for store modules
- [ ] Implement backend error-code mapping once BE contract arrives

## References

- `lib/guest-experience-api.ts`
- `state/guest-experience-provider.tsx`
- `modules/guest/addons.tsx`
- `modules/guest/borrow.tsx`
- `modules/guest/checkout.tsx`
- `modules/guest/extend.tsx`
