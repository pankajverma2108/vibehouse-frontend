# Backend Handoff - Room Availability Integration Issues

Date: 2026-04-13
Owner: Frontend
Scope: Property page room catalog and live availability integration

## Summary
Frontend integration for the split room endpoints is complete, but we are still seeing backend-related data issues that cause UI instability and booking-flow risk for specific properties.

## Repro Endpoints
1. GET /api/cx/rooms?property_id=tds-koramangala-a
2. GET /api/cx/rooms?property_id=tds-koramangala-a&checkin=2026-04-13&checkout=2026-04-14
3. GET /api/cx/rooms?property_id=60765
4. GET /api/cx/rooms?property_id=60765&checkin=2026-04-13&checkout=2026-04-14

## Backend-Related Errors Observed

### 1) Duplicate logical room entries for tds-koramangala-a
Browser console repeatedly logs duplicate React keys:
- 6-bed-mixed-dorm
- 4-bed-mixed-dorm
- queen-size-room

These come from duplicate slug values in backend-backed room payloads.

Direct payload evidence for property_id=tds-koramangala-a:
- Catalog duplicates by slug:
  - 6-bed-mixed-dorm: 2
  - 4-bed-mixed-dorm: 3
  - queen-size-room: 3
- Availability duplicates by slug:
  - 6-bed-mixed-dorm: 2
  - 4-bed-mixed-dorm: 3
  - queen-size-room: 3

Sample rows returned for a single property request:
- rt-6dorm, slug=6-bed-mixed-dorm, inventory=available
- rt-kb-6dorm, slug=6-bed-mixed-dorm, inventory=sold_out
- rt-4dorm, slug=4-bed-mixed-dorm, inventory=available
- rt-kb-4dorm, slug=4-bed-mixed-dorm, inventory=sold_out
- rt-ka-4dorm, slug=4-bed-mixed-dorm, inventory=available
- rt-queen, slug=queen-size-room, inventory=available
- rt-ka-queen, slug=queen-size-room, inventory=available
- rt-kb-queen, slug=queen-size-room, inventory=sold_out

Impact:
- UI key collisions and unstable list reconciliation.
- Duplicate room cards for what should be one room type in a property view.
- Risk of wrong room selection and confusion in checkout.

### 2) Property scoping appears inconsistent for tds-koramangala-a
For property_id=tds-koramangala-a, response appears to include room variants from multiple namespaces (rt-, rt-ka-, rt-kb-) in one property payload.

Comparison:
- tds-koramangala-a catalog count: 8
- tds-koramangala-a availability count: 8
- 60765 catalog count: 3
- 60765 availability count: 3

Impact:
- Frontend cannot reliably map one card per room type for a property.
- Duplicate sold_out and available states for the same slug in the same property response.

### 3) Latency variance on room endpoints
From observed logs:
- /api/cx/rooms (catalog) ranged from ~109ms to ~3.3s
- /api/cx/rooms (availability) ranged from ~103ms to ~5.6s

Impact:
- Slow availability overlays, inconsistent UX.
- Retry pressure and repeated requests under user interaction.

## Open Backend Questions
1. Uniqueness guarantee: Is slug guaranteed unique per property in both /guest/booking/rooms and /guest/booking/availability?
2. Identity guarantee: Which field is canonical and unique for frontend dedupe and rendering key, id or slug?
3. Property scope: Should tds-koramangala-a return only one room-type namespace, or is mixing rt / rt-ka / rt-kb expected?
4. Enum contract: Final inventory_state enum expected in production is available, limited, sold_out only, or are additional values possible?
5. create-order contract: Should frontend pass only room_type_id, or must ezee_rate_plan_id and ezee_rate_type_id also be sent?
6. Property ID format: What is the canonical external property_id format frontend should use long term, prop-... or tds-...?
7. Fallback behavior: If live availability source is degraded, should backend return an explicit degraded flag so checkout can be safely blocked?

## Request IDs Captured (for backend trace)
- 5423da63-bd19-450b-acba-8ec6813843df (tds catalog)
- 7006fc1b-b9cc-4755-9fa5-ddafdf8eb537 (tds availability)
- 658d33be-f5c7-45e8-90ac-a61ed7495b7a (bandra catalog)
- bb0eaed1-e762-4160-aaca-d5c35a689cf5 (bandra availability)

## Current Frontend Mitigations
1. Sold-out rooms remain visible and disabled.
2. Booking is blocked when live availability is not synced.
3. Availability retry path and state/error messaging are implemented.

Remaining blocker:
- Duplicate slug rows from backend still cause duplicate-key warnings and unstable list identity unless backend enforces uniqueness or provides a canonical unique key strategy per property.
