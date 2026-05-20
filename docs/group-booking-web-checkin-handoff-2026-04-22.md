# Group Booking Web Check-In Handoff

Date: 2026-04-22
Owner: Booking / Web Check-In
Status: Implemented and validated

## Purpose

This handoff documents the current implementation of dynamic guest-slot handling for reservation-level web check-in. It is written so another agent can continue, review, or extend the work without needing tribal knowledge.

The goal is to support every reservation shape safely, including multi-guest and group-booking flows, without hardcoding reservation suffixes, room-type-specific assumptions, or a fixed guest ordering.

## What Was Solved

The implementation now does all of the following:

1. Keeps the shared check-in URL reservation-level: /bookings/{eri}/web-check-in.
2. Resolves editable guest slots dynamically from API responses.
3. Avoids hardcoded logic around patterns such as 65-1, 65-2, 65-3.
4. Prompts the user to explicitly choose a guest slot when more than one editable slot exists.
5. Auto-opens the only editable slot when there is exactly one.
6. Blocks KYC when the booking is pending payment.
7. Blocks the flow when no editable slots exist and shows a clear message.
8. Redirects to the confirmed page when all slots are already completed.
9. Fixes absolute share-link generation so the live browser origin is preferred over preview/default origins.

## Scope

This work is frontend-driven and centered on the web check-in experience. It does not add a new backend endpoint. It uses existing booking and KYC APIs more safely.

The primary user journeys covered are:

1. Primary guest opens My Bookings and clicks a receipt card.
2. User lands on web check-in.
3. App loads reservation status and slot summaries.
4. App decides whether to block, auto-open, or prompt for slot selection.
5. User completes KYC for the selected guest slot.
6. App refreshes and routes to confirmed when all slots are done.

## Important Design Decision

The shared URL stays reservation-scoped on purpose.

The frontend must not guess which guest the link belongs to when multiple editable slots exist. That ambiguity is the core risk in group bookings. The new slot-picker gate removes that ambiguity by forcing the user to choose the target slot explicitly.

## Behavior Summary

### 1. Payment pending gate

If the booking status returned by the booking-link API is one of the pending-payment variants, web check-in is blocked before any KYC form interaction.

The UI shows a payment-pending state and does not allow slot editing.

### 2. Slot discovery

Slot summaries come from the slot list API. The page treats the API as the source of truth for what is editable.

A slot is considered editable when either of these is true:

- The backend explicitly marks it editable with can_edit = true.
- can_edit is missing or undefined and the slot is not already completed.

Completed status is determined from the KYC status values PRE_VERIFIED and VERIFIED.

### 3. Slot selection rules

The page resolves the active slot in this order:

- Use a preferred slot if one was passed in and is still editable.
- Otherwise keep the current active slot if it is still editable.
- Otherwise, if there is exactly one editable slot, select it automatically.
- Otherwise leave no active slot and require an explicit user choice.

### 4. Multi-slot safety gate

If there are two or more editable slots and no active slot has been resolved, the UI renders a guest-slot selection section before the KYC form.

This gate exists to prevent the app from auto-opening the wrong co-guest context.

### 5. No editable slot state

If there are zero editable slots, the page shows a blocked state instead of a broken or misleading form.

This covers cases where:

- all visible slots are already completed,
- the backend denies edit permissions,
- or the slot list exists but none are eligible for editing.

### 6. Completion redirect

If all slots are already completed at load time, or become completed after submission, the page redirects to /bookings/{eri}/confirmed.

## Implementation Details

### Main file

The core logic lives in [components/booking/pre-arrival-page.tsx](components/booking/pre-arrival-page.tsx).

That file now contains:

- Slot editability helpers.
- Slot display naming fallback logic.
- Active-slot resolution logic.
- Slot-selection loading and error handling.
- Conditional rendering for payment pending, no-slot, no-editable-slot, and selection-gate states.
- Submission reload behavior after successful KYC submit.

### Branding and absolute links

The share-link origin fix lives in [lib/branding.ts](lib/branding.ts).

The browser origin is now preferred when constructing absolute check-in links, and localhost-like origins are excluded from production share-link output.

This matters because the share link must resolve to the real live site when a guest receives a booking URL from the browser in production.

### Flow map documentation

The canonical route map is captured in [docs/booking-flow-map-2026-04-18.md](docs/booking-flow-map-2026-04-18.md).

That document explains the top-level booking journey and should remain aligned with the implementation.

### Operational walkthrough

A more operational co-guest guide is captured in [docs/group-booking-co-guest-walkthrough.md](docs/group-booking-co-guest-walkthrough.md).

Use that file for QA and behavior confirmation; use this handoff for implementation context and architecture.

## Exact Runtime Flow

### Loading web check-in

1. The route resolves the reservation ID from the booking link.
2. Guest auth is checked.
3. The page calls the booking-link API to get reservation status and branding context.
4. The page calls the KYC slot list API to get all guest slots.
5. Cached results may be used briefly, but server results still drive the final state.
6. If the booking is pending payment, the page stops there and shows the payment gate.
7. If all slots are complete, the page redirects to confirmed.
8. Otherwise the active slot is resolved dynamically.
9. If no active slot is resolved and multiple editable slots exist, the picker is shown.
10. If exactly one editable slot exists, the page loads that slot detail automatically.

### Selecting a guest slot

When the user clicks a slot card:

1. The app checks that a guest auth token still exists.
2. The app clears any previous slot-selection error.
3. The app loads slot detail for the chosen slot.
4. The app sets the active slot.
5. The app resets the KYC stepper to step 1.
6. The app clears field validation so the chosen slot starts clean.

If loading the slot fails, the page surfaces a user-safe message both inline and through the global error channel.

### Completing KYC

1. The user fills step 1 and step 2.
2. Validation gates prevent advancing when the step data is incomplete or invalid.
3. The submit payload is built from the current slot state.
4. The KYC submit API is called for the active slot.
5. On success, the page re-fetches or resolves slot state.
6. If all slots are completed after submission, the page routes to confirmed.

## Error Handling Model

The implementation intentionally keeps errors user-safe and local to the current flow.

Observed error states include:

- Session missing or expired.
- Booking link or slot API failure.
- Slot detail load failure.
- Slot submit failure.
- Unsupported or incomplete guest-slot state.
- Pending-payment booking state.

The page uses safe message mapping so the user does not see raw technical failures.

Important behavior:

- Slot load errors do not silently switch to another guest.
- Slot selection errors are shown inline and as a toast.
- Payment gating happens before form rendering.
- No-editable-slot state is explicit rather than falling through to a broken page.

## Files Touched or Relied On

Directly changed behavior is concentrated in [components/booking/pre-arrival-page.tsx](components/booking/pre-arrival-page.tsx) and [lib/branding.ts](lib/branding.ts).

Supporting flow and documentation lives in:

- [docs/booking-flow-map-2026-04-18.md](docs/booking-flow-map-2026-04-18.md)
- [docs/group-booking-co-guest-walkthrough.md](docs/group-booking-co-guest-walkthrough.md)
- [app/bookings/page.tsx](app/bookings/page.tsx)
- [components/booking/booking-confirmed-page.tsx](components/booking/booking-confirmed-page.tsx)
- [lib/booking-api.ts](lib/booking-api.ts)

## Why This Was Necessary

The previous approach was too optimistic for group bookings.

The bug was not just a UI issue. It was a data identity issue:

- The booking route knows the reservation, not the guest slot.
- Multiple guests can exist under the same reservation.
- A shared reservation link cannot safely infer which guest should be opened first.
- Hardcoding around child reservation suffixes would make the flow brittle and room-type-specific.

The new design keeps the reservation link stable and moves slot identity resolution to runtime API data.

## Validation Performed

The current implementation has been validated with both lint and build.

Validation completed successfully:

- Scoped ESLint on components/booking/pre-arrival-page.tsx
- Full production build

No compile or lint errors were left in the touched file set.

## QA Checklist For Another Agent

Use these checks if you continue working on the flow:

1. Open a reservation with one editable slot and verify the page opens directly to that slot.
2. Open a reservation with two or more editable slots and verify the slot-picker gate appears.
3. Select each slot and verify the correct slot detail loads.
4. Verify a pending-payment booking is blocked before KYC starts.
5. Verify a fully completed booking redirects to confirmed.
6. Verify a no-editable-slot state shows the blocked message instead of the form.
7. Verify share links resolve against the live browser origin in production.
8. Verify no part of the code assumes reservation suffixes such as 65-1.

## Known Remaining Gap

There is no new backend endpoint that deterministically maps a reservation to a personal slot.

That is acceptable for now because the slot-picker gate keeps the flow safe. If a later product requirement wants a fully automatic personal-slot open for co-guests, the right next step is a backend contract such as a canonical my-slot endpoint rather than frontend inference.

## Suggested Follow-Up If You Continue

If you want to extend this later, the safest next enhancement is:

1. Add a backend-assisted canonical slot lookup.
2. Keep the current picker as fallback when the mapping is ambiguous.
3. Preserve the existing payment gate and completion redirect behavior.

## Source References

- [components/booking/pre-arrival-page.tsx](components/booking/pre-arrival-page.tsx)
- [lib/branding.ts](lib/branding.ts)
- [docs/booking-flow-map-2026-04-18.md](docs/booking-flow-map-2026-04-18.md)
- [docs/group-booking-co-guest-walkthrough.md](docs/group-booking-co-guest-walkthrough.md)
