# Room Pricing and Availability Backend Handoff (2026-04-20)

## Scope
Investigation for property room cards showing `Rs. 0` and warning:

- `Live availability could not be refreshed. Showing latest cached rooms.`

Frontend and live API were inspected for property `60765`.

## Executive Summary
This is primarily a backend data/contract issue (not only frontend):

1. `GET /guest/booking/rooms?property_id=60765` returns room types, but pricing fields are null for all room types.
2. `GET /guest/booking/availability?property_id=60765&checkin=...&checkout=...` returns only a subset of room types (available ones), not the full room catalog with sold-out entries.
3. Frontend merge logic falls back to catalog prices for room types missing from availability response. Since catalog prices are null, frontend normalization can produce `0` internally.
4. Temporary frontend mitigation is now applied: room cards render `Price unavailable` (not `Rs. 0`) when pricing is missing, and those rooms are blocked from selection.

## Reproduction (Live API)
Base URL: `https://api.thedailysocial.co.in`

### 1) Catalog endpoint
Request:

```http
GET /guest/booking/rooms?property_id=60765
```

Observed:

- HTTP 200
- 5 room types returned
- `base_price_per_night` is null/empty for all returned room types

### 2) Availability endpoint (correct query contract)
Request:

```http
GET /guest/booking/availability?property_id=60765&checkin=2026-04-20&checkout=2026-04-21
```

Observed:

- HTTP 200
- Non-zero prices returned for available room types (example seen: 500, 1500)
- Response did not include all 5 room types; only currently available room types were present

### 3) Alternate date query key variants
Requests with `check_in/check_out`, `check_in_date/check_out_date`, `checkin_date/checkout_date` returned 404 in this environment.

Only `checkin` + `checkout` worked.

## Historical Root Cause Of `Rs. 0` (Now Mitigated In UI)
Frontend pipeline behavior before mitigation:

1. Catalog (`/rooms`) is parsed first.
2. Null `base_price_per_night` is normalized to number with fallback `0`.
3. Availability (`/availability`) is merged over catalog by room ID/slug.
4. If a catalog room is missing from availability payload, frontend marks it sold out and keeps catalog price.
5. Because catalog price is null -> normalized `0`, card renders `Rs. 0`.

Result: Any room not present in availability can show `Rs. 0` unless catalog has valid fallback pricing.

## Temporary Frontend Mitigation (Applied 2026-04-20)

The frontend now includes a guard for missing room prices while backend fixes are in progress:

1. Home room cards now render `Price unavailable` when `base_price_per_night` is missing.
2. Property room cards and room-details popup now render `Price unavailable` when pricing is missing.
3. Rooms with unavailable price are treated as non-bookable in the property page (Add/quantity controls disabled).
4. Mobile sticky summary no longer defaults to a `0` price preview when all visible room prices are unavailable.

This prevents misleading `Rs. 0` display, but backend fixes are still required for correct live pricing.

## Backend Contract Drift vs API doc
From the internal route doc (`guidelines/Vibehouse_docs/api_routes/07_guest_booking.md`):

- `/guest/booking/rooms` should return catalog prices (`base_price_per_night`) for active room types.
- `/guest/booking/availability` should return same room types enriched with availability state, with sold-out room types represented as `available_beds: 0` and `inventory_state: "sold_out"`.

Observed live behavior does not fully match this:

- Catalog prices are null.
- Availability response is subset-only.

## Impact
- Price rendering is unreliable for sold-out/missing room types.
- Users can see `Rs. 0` despite configured rates in eZee.
- Booking confidence drops because UI appears stale or broken.

## Required Backend Fixes
1. Ensure `/guest/booking/rooms` always returns non-null `base_price_per_night` for active room types.
2. Ensure `/guest/booking/availability` returns full room catalog for the requested date range, including sold-out entries.
3. For sold-out entries, include:
   - `available_beds: 0`
   - `inventory_state: "sold_out"`
   - non-null `base_price_per_night` and `total_price`
4. Confirm contract stability for date params:
   - accepted keys should remain `checkin` and `checkout`
   - reject/alias legacy variants consistently with clear error body
5. Add integration tests for property `60765` covering:
   - all room types returned in availability
   - non-null pricing fields
   - sold-out room behavior

## Optional Backend Improvement
Include explicit metadata in `/availability` response:

- `availability_source`
- `has_live_availability`
- `availability_error` (nullable)

This will make downstream debugging simpler and reduce ambiguous frontend fallbacks.


