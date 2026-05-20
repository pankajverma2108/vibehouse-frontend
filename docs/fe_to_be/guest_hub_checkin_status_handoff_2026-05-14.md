# Guest Hub Status Mapping Handoff (FE -> BE)

Date: May 14, 2026  
Frontend repo: `Vibehouse_frontend`  
Impacted flow: `/guest` and `/{bookingId}/guest` access gating

## Problem Summary

Guest Hub access is intended to open only when a reservation is actually checked in at property (eZee status like `ARRIVED` / `CHECKED_IN` / `IN_HOUSE`).

Current backend responses for the same guest account are not returning any in-house status. They are returning pre-checkin states (`APPROVED` / `CONFIRMED`) even for reservations reported as checked in from eZee PMS UI.

Because of this, frontend cannot reliably enforce status-based gating from available APIs.

## Live Evidence (test@abc.com)

Capture time: `2026-05-14T18:06:47+05:30`

Endpoints checked:

1. `POST /guest/auth/login`
- Response includes guest profile.
- No booking status list in this response.
- Latency observed: `857 ms`.

2. `GET /guest/auth/me`
- Booking list present.
- All bookings show `status: "APPROVED"` (including active-date stays).
- Example booking IDs:
  - `TDS-BANGALORE-MP57PUDG-D1D2` -> `APPROVED`
  - `TDS-BANGALORE-MOCMCIBH-65D3` -> `APPROVED`
- Latency observed: `159 ms`.

3. `GET /guest/booking/mine`
- Same booking IDs also return `status: "APPROVED"`.
- Latency observed: `97 ms`.

4. `POST /guest/booking/link` (for active bookings)
- `response.booking.status` returned `CONFIRMED`.
- `response.access.status` returned `APPROVED`.
- No `ARRIVED` / `CHECKED_IN` / `IN_HOUSE` present.
- Latency observed: `86-92 ms`.

Saved capture files:
- `docs/frontend_note/api_responses_2026-05-14/guest-auth-login.json`
- `docs/frontend_note/api_responses_2026-05-14/guest-auth-me.json`
- `docs/frontend_note/api_responses_2026-05-14/guest-booking-mine.json`
- `docs/status_capture.md`

## Expected Contract (Needed for Guest Hub Gate)

For the same reservation, all guest-facing booking endpoints should expose a status that reflects real stay lifecycle from PMS sync:

- Allow Guest Hub:
  - `ARRIVED`
  - `CHECKED_IN`
  - `IN_HOUSE`
  - `INHOUSE`

- Do not allow Guest Hub:
  - `APPROVED`
  - `CONFIRMED`
  - `CONFIRMED_RESERVATION`
  - `CHECKED_OUT`
  - `COMPLETED`
  - `CANCELLED`
  - `REJECTED`

## Backend Action Required

1. Verify eZee -> internal booking status mapping for guest APIs.
2. Ensure reconciliation/refresh updates checked-in reservations to an in-house status in guest-facing responses.
3. Make status consistent across:
   - `GET /guest/auth/me` -> `bookings[].status`
   - `GET /guest/booking/mine` -> `[].status`
   - `POST /guest/booking/link` -> `booking.status` and/or `access.status`
4. Confirm if there is expected propagation delay and share SLA for status freshness.

## Acceptance Criteria

For a reservation marked Arrived/Checked-in in eZee:

1. `GET /guest/auth/me` returns an in-house status for that reservation.
2. `GET /guest/booking/mine` returns same in-house status.
3. `POST /guest/booking/link` returns same in-house status semantics.
4. Frontend can gate Guest Hub purely on status + date window without endpoint-specific exceptions.

## Temporary Frontend Workaround (Already Applied)

To unblock UI redesign work, frontend currently allows Guest Hub access by active date window even when status is not in-house.

Applied in:
- `lib/guest-hub.ts`

Guard constant:
- `TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS = true`

This is temporary and should be removed once backend status contract is corrected.
