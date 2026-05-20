# BE Response — Room Pricing & Availability Fix (2026-04-21)

Responding to: `docs/FEtoBEHandoff/room-pricing-backend-handoff-2026-04-20.md`
Owner: Backend

---

## TL;DR

Two backend issues were addressed in code/data, and the FE blocker guard has now been implemented. A new admin cache-flush endpoint is available so stale catalog data can be refreshed without redeploy.

**Current cross-team status**:

- FE date guard for `/availability` is complete.
- FE `Price unavailable` mitigation is active.
- Live API verification still shows `source: "ezee_only"` at time of FE check, so FE mitigation remains in place until BE deploy/cache state is observable as `source: "db"`.

---

## FE Implementation Update (2026-04-21)

The FE blocker item has been implemented.

1. `/availability` is now called only when `checkout > checkin`.
2. Default property page state is catalog-first (`/rooms`), with no availability call on initial load unless valid date params are explicitly present.
3. Unavailable pricing guard is active: rooms with missing/non-positive `base_price_per_night` render as `Price unavailable` and are not selectable.

Implemented in:

- `app/property/page.tsx`
- `components/marketing/property.tsx`
- `lib/cx-api.ts`

Validation:

- ESLint clean on touched FE files.

---

## Root Causes & Fixes

### Issue 1 — Catalog prices null (`base_price_per_night: null`) ✅ Fixed

**Root cause**: The `room_types` DB table had zero active records for property `60765`. The backend's fallback path serves eZee's raw `get_rooms` response directly, which does not carry pricing (it is a physical room catalog, not a rate API). This is by design — eZee's `get_rooms` is date-independent, so no rates are available.

**Fix**: Created all 5 room type records in the DB with correct eZee IDs and base prices. The backend now uses the DB-merge path, which includes real prices in the catalog response.

Active room types after fix:

| DB ID | Name | eZee Room Type ID | Base Price | Bookable Online |
|---|---|---|---|---|
| `rt-ka-4dorm` | 4 Bed Mixed Dormitory | `6076500000000000001` | ₹500/night | ✅ |
| `rt-ka-deluxe` | Deluxe | `6076500000000000002` | ₹1,500/night | ✅ |
| `rt-ka-6dorm` | 6 Bed Mixed Dormitory | `6076500000000000004` | — | ❌ (no rate plan in eZee) |
| `rt-ka-4dorm-female` | 4 Bed Dormitory Female | `6076500000000000005` | — | ❌ (no rate plan in eZee) |
| `rt-ka-6dorm-female` | 6 Bed Dormitory Female | `6076500000000000006` | — | ❌ (no rate plan in eZee) |

Non-bookable rooms have `base_price_per_night: 0` and `ezee_rate_plan_id: null`. Treat these the same as the `Price unavailable` mitigation you already applied.

---

### Issue 2 — Availability returning subset only ✅ Fixed (same fix as Issue 1)

**Root cause**: When the DB had no active room types, the availability endpoint also fell back to eZee-only mode. eZee's `RoomList` API only returns rooms that have a configured rate plan — rooms without one are silently omitted. This meant only 2 of 5 room types appeared in availability responses.

**Fix**: With DB records now in place, the availability endpoint uses the DB-merge path, which maps **all active DB room types** against the eZee response. Rooms not returned by eZee (no rate plan, or genuinely sold out on the requested dates) appear with:

```json
{
  "available_beds": 0,
  "inventory_state": "sold_out",
  "base_price_per_night": 0
}
```

The response now always contains all 5 active room types regardless of eZee's subset.

---

### Issue 3 — "Live availability could not be refreshed" banner ⚠️ FE action required

**Root cause**: The frontend is calling `/availability` with `checkin === checkout` (same-day dates, which is the date picker's default state before the user selects anything). The backend validates that `checkout > checkin` and returns:

```http
HTTP 400 Bad Request
{"message": "Checkout must be after checkin", "error": "Bad Request", "statusCode": 400}
```

This is correct and intentional. eZee itself also rejects same-day queries:
```json
[{"Error Details": {"Error_Code": "CheckDate", "Error_Message": "Check out date should be greater than Check in date"}}]
```

**This is not a backend bug.** The frontend must guard the availability call.

**Required FE fix:**
```js
// Only call /availability when dates are valid
if (checkin && checkout && checkout > checkin) {
  fetchAvailability(checkin, checkout);
}
```

Until dates are confirmed (checkout > checkin), show the catalog from `/rooms` with "From ₹X/night" using `base_price_per_night`. Do not call `/availability` in this state.

---

## Additional Code Fix — Rate fallback bug

A secondary backend bug was also fixed: the `ratePerNight` fallback used `??` (nullish coalescing) which does not catch `0`. If eZee returns `ratePerNight: 0` for an unconfigured rate plan, the DB price would never be used as fallback.

```typescript
// Before (broken — ?? does not catch 0)
const ratePerNight = ezee?.ratePerNight ?? Number(rt.base_price_per_night);

// After (correct — || catches 0 and falls back to DB price)
const ratePerNight = ezee?.ratePerNight || Number(rt.base_price_per_night);
```

---

## Updated API Contracts

### `GET /guest/booking/rooms?property_id=60765`

Returns the full room catalog with non-null pricing. No dates required.

```json
{
  "property_id": "60765",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "slug": "4-bed-mixed-dormitory",
      "type": "DORM",
      "beds_per_room": 4,
      "total_beds": 64,
      "base_price_per_night": 500,
      "floor_range": "1-4",
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker", "Reading Light"],
      "ezee_room_type_id": "6076500000000000001",
      "physical_room_count": 16,
      "source": "db"
    },
    {
      "id": "rt-ka-deluxe",
      "name": "Deluxe",
      "slug": "deluxe",
      "type": "PRIVATE",
      "beds_per_room": 1,
      "total_beds": 14,
      "base_price_per_night": 1500,
      "floor_range": "1-4",
      "amenities": ["AC", "Attached Bathroom", "WiFi", "Work Desk", "Smart Lock"],
      "ezee_room_type_id": "6076500000000000002",
      "physical_room_count": 14,
      "source": "db"
    }
  ]
}
```

`source: "db"` confirms the DB-merge path is active (enriched data). If you ever see `source: "ezee_only"`, the DB records are missing — ping backend.

**Cache TTL**: 10 minutes (reduced from 60 min). After room type changes, use the new cache flush endpoint below.

---

### `GET /guest/booking/availability?property_id=60765&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`

Returns all active room types for the requested dates. Sold-out rooms are included with `inventory_state: "sold_out"`.

**Precondition**: `checkout > checkin` (strictly greater). Same-day returns 400.

```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-21",
  "checkout_date": "2026-04-22",
  "no_of_nights": 1,
  "availability_source": "ezee_live",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "available_beds": 64,
      "inventory_state": "available",
      "base_price_per_night": 500,
      "total_price": 500,
      "ezee_rate_plan_id": "6076500000000000001",
      "ezee_rate_type_id": "6076500000000000001",
      "source": "db"
    },
    {
      "id": "rt-ka-deluxe",
      "name": "Deluxe",
      "available_beds": 14,
      "inventory_state": "available",
      "base_price_per_night": 1500,
      "total_price": 1500,
      "ezee_rate_plan_id": "6076500000000000002",
      "ezee_rate_type_id": "6076500000000000001",
      "source": "db"
    },
    {
      "id": "rt-ka-6dorm",
      "name": "6 Bed Mixed Dormitory",
      "available_beds": 0,
      "inventory_state": "sold_out",
      "base_price_per_night": 0,
      "total_price": 0,
      "ezee_rate_plan_id": null,
      "source": "db"
    }
  ]
}
```

`availability_source` values:

| Value | Meaning | Recommended FE action |
|---|---|---|
| `"ezee_live"` | Live counts + rates from eZee | Normal booking flow |
| `"local_db_estimate"` | eZee unreachable — DB estimate | Show degraded banner, block checkout |

`inventory_state` is a closed enum — exhaustive switch is safe:

| Value | `available_beds` | Meaning |
|---|---|---|
| `"available"` | ≥ 3 | Bookable |
| `"limited"` | 1–2 | Bookable, show urgency badge |
| `"sold_out"` | 0 | Not bookable on these dates |

---

## New Endpoint — Admin Cache Flush

**`DELETE /admin/bookings/cache/rooms?property_id=60765`**

Flushes the room catalog Redis cache for a property. The next `/rooms` request will fetch fresh data from eZee + DB instead of serving cached data.

Auth: Admin JWT required. Permission: `bookings.view`.

```http
DELETE /admin/bookings/cache/rooms?property_id=60765
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "flushed": ["catalog:60765"]
}
```

**When to call this**: after any room type configuration change in eZee or DB, without needing a backend redeploy. The catalog TTL is 10 minutes — this just forces an immediate refresh.

---

## Recommended FE Integration Pattern

```js
// Step 1 — On page mount: load catalog (no dates needed)
useEffect(() => {
  fetch(`/guest/booking/rooms?property_id=${propertyId}`)
    .then(r => r.json())
    .then(data => setRooms(data.room_types));
}, []);

// Step 2 — Only after user selects valid dates: load live availability
useEffect(() => {
  // Guard: both dates set, checkout strictly after checkin
  if (!checkin || !checkout || checkout <= checkin) return;

  setAvailabilityLoading(true);
  fetch(`/guest/booking/availability?property_id=${propertyId}&checkin=${checkin}&checkout=${checkout}`)
    .then(r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    })
    .then(data => {
      if (data.availability_source === 'local_db_estimate') {
        showDegradedBanner();
        blockCheckout();
      }
      mergeAvailabilityIntoRooms(data.room_types); // match by id
    })
    .catch(() => showDegradedBanner())
    .finally(() => setAvailabilityLoading(false));
}, [checkin, checkout]);
```

---

## FE Verification Addendum (2026-04-21)

Live verification against `https://api.thedailysocial.co.in` currently shows:

- `/guest/booking/rooms?property_id=60765` still returning `source: "ezee_only"` with `base_price_per_night: null`
- `/guest/booking/availability?...` returning only 2 room types for valid dates, also with `source: "ezee_only"`
- Same-day availability call correctly returning `400` (`Checkout must be after checkin`)

This indicates the BE response contract is not yet observable on the live environment checked from FE. Frontend guards remain required until BE deploy/cache state reflects `source: "db"` and full 5-room merged availability.

---

## Action Items

| # | Owner | Action | Status |
|---|---|---|---|
| 1 | **BE** | DB room types created with correct eZee IDs | ✅ Done |
| 2 | **BE** | `ratePerNight` fallback fixed (`??` → `\|\|`) | ✅ Done |
| 3 | **BE** | Catalog TTL reduced to 10 min | ✅ Done |
| 4 | **BE** | Cache flush endpoint added | ✅ Done |
| 5 | **FE** | Guard `/availability` call: only fire when `checkout > checkin` | ✅ Done |
| 6 | **FE** | Migrate `BOOKING_DRAFT_KEY` to `sessionStorage` to flush carts on tab close (UX polish) | ✅ Done |
| 7 | **FE** | Keep `Price unavailable` mitigation until live catalog/availability are no longer `ezee_only` | ⏳ In progress |
| 8 | **FE** | Verify `source: "db"` appears in catalog response after BE redeploy/cache flush | ⏳ Pending (live still `ezee_only`) |

---

## Handoff Note

This document is handoff-ready for both FE and BE tracking.

- If BE confirms deploy/cache flush complete, FE should re-run live checks for `/rooms` and `/availability` on `60765`.
- Once `source: "db"` and full room merge are confirmed live, FE can remove temporary mitigation in item 6.
