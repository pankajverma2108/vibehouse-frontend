# BE → FE Handoff: Booking Engine Fix — 2026-04-23

This document covers three bugs in the booking engine, who owns each fix, and the exact response shapes the FE should expect once the BE deploy lands.

---

## Status Summary

| # | Bug | Owner | Status |
|---|---|---|---|
| 1 | ₹0 / "Price unavailable" on all room cards | **BE** | Fix deployed via SQL migration — awaiting CI rollout |
| 2 | Only 2 of 5 room types appearing | **BE** | Same fix as #1 |
| 3 | Error banner on initial page load (before user picks dates) | **FE** | **FE code change required** |

---

## Bug 1 & 2: Prices and Missing Room Types (BE Fix)

### Root Cause

The Aurora `room_types` table was empty. The backend fell back to serving data directly from eZee with `source: "ezee_only"`, which means:
- `base_price_per_night: null` → FE showed ₹0 / "Price unavailable"
- eZee's `RoomList` API only returns room types that have a configured rate plan, so only 2 of 5 room types appeared

### BE Fix Applied

A SQL data migration (`20260422000000_seed_room_types_tds_koramangala`) upserts the 2 bookable room types into `room_types`. Once deployed:
- Catalog endpoint returns `source: "db"` with real prices and all 5 DB room types
- Availability endpoint merges eZee live rates on top of all DB room types

### What FE Should Do After Deploy

1. Verify `source === "db"` appears in the `/rooms` response
2. Remove any "Price unavailable" fallback UI — `base_price_per_night` will always be a number when `source === "db"`
3. Note: **3 of the 5 room types will show `inventory_state: "sold_out"`** with `available_beds: 0` — this is correct by design. Those room types have no eZee rate plan and are not bookable online. Render them with a "Sold Out" badge and disable their "Book" button. Do not hide them entirely.

---

## Bug 3: Error Banner on Initial Page Load (FE Fix Required)

### Root Cause

The FE calls `/guest/booking/availability` on mount with the default state: `checkin=today&checkout=today`. The backend validates that `checkout > checkin` and returns **HTTP 400** when they are equal. The FE incorrectly treats this 400 as a system error and shows an error banner.

This is not a BE bug. The 400 is intentional — same-day stays are not valid.

### Required FE Fix

Guard the availability call so it only fires when the user has confirmed a valid date range:

```typescript
// BEFORE calling /availability, always check:
if (!checkinDate || !checkoutDate || checkoutDate <= checkinDate) {
  return; // don't fire — user hasn't selected dates yet
}

fetchAvailability(checkinDate, checkoutDate);
```

**On mount:** Call only `/guest/booking/rooms` (the catalog endpoint, no dates needed) to show "Starting from ₹X" prices. Do not call `/availability` until the user confirms a check-in and check-out date where `checkout > checkin`.

---

## Exact Response Shapes

### `GET /guest/booking/rooms?property_id=60765`

No auth required. No dates. Returns all active room types from the DB.

```json
{
  "property_id": "60765",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "slug": "4-bed-mixed-dorm",
      "type": "DORM",
      "beds_per_room": 4,
      "total_beds": 60,
      "base_price_per_night": 500,
      "floor_range": "1-4",
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker", "Reading Light"],
      "ezee_room_type_id": "6076500000000000001",
      "physical_room_count": 15,
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

**Important:** This endpoint does **not** return `inventory_state`, `available_beds`, or `total_price`. Those only exist in the `/availability` response. Do not read them from the catalog.

### `GET /guest/booking/availability?property_id=60765&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`

No auth required. `checkin` and `checkout` are required. **`checkout` must be strictly after `checkin`** — same-day returns 400.

```json
{
  "property_id": "60765",
  "checkin_date": "2026-05-01",
  "checkout_date": "2026-05-03",
  "no_of_nights": 2,
  "availability_source": "ezee_live",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "slug": "4-bed-mixed-dorm",
      "type": "DORM",
      "available_beds": 12,
      "inventory_state": "available",
      "base_price_per_night": 799,
      "total_price": 1598,
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker", "Reading Light"],
      "floor_range": "1-4",
      "ezee_room_type_id": "6076500000000000001",
      "ezee_rate_plan_id": "...",
      "ezee_rate_type_id": "...",
      "source": "db"
    },
    {
      "id": "rt-ka-deluxe",
      "name": "Deluxe",
      "slug": "deluxe",
      "type": "PRIVATE",
      "available_beds": 3,
      "inventory_state": "available",
      "base_price_per_night": 1500,
      "total_price": 3000,
      "amenities": ["AC", "Attached Bathroom", "WiFi", "Work Desk", "Smart Lock"],
      "floor_range": "1-4",
      "ezee_room_type_id": "6076500000000000002",
      "ezee_rate_plan_id": "...",
      "ezee_rate_type_id": "...",
      "source": "db"
    }
  ]
}
```

**`inventory_state` values:**
- `"available"` — more than 2 beds free
- `"limited"` — 1 or 2 beds free
- `"sold_out"` — 0 beds free (room type present in response but not bookable)

**`availability_source` values (top-level field):**
- `"ezee_live"` — accurate live data from eZee; no warning banner needed
- `"local_db_estimate"` — eZee API was unreachable; showing estimated availability from local DB; **show a warning banner** (the FE already has logic for this)

---

## Field Map

| FE field | Catalog (`/rooms`) | Availability (`/availability`) |
|---|---|---|
| `room.id` | `id` | `id` |
| `room.name` | `name` | `name` |
| `room.slug` | `slug` | `slug` |
| `room.type` | `type` | `type` |
| `room.totalBeds` | `total_beds` | — not present |
| `room.basePricePerNight` | `base_price_per_night` | `base_price_per_night` |
| `room.amenities` | `amenities` | `amenities` |
| `room.availableBeds` | — not present | `available_beds` |
| `room.inventoryState` | — not present | `inventory_state` |
| `room.totalPrice` | — not present | `total_price` |
| `snapshot.source` (data provenance) | `source` per room | `source` per room |
| (warning banner trigger) | — | `availability_source` (top-level) |

---

## Verification Steps (run after BE deploy)

```bash
# 1. Catalog — confirm source: "db" and real prices
curl "https://api.thedailysocial.co.in/guest/booking/rooms?property_id=60765" \
  | jq '.room_types[] | {id, name, base_price_per_night, source}'

# Expected: both rooms, source: "db", prices 500 and 1500

# 2. Availability — valid future dates
curl "https://api.thedailysocial.co.in/guest/booking/availability?property_id=60765&checkin=2026-05-01&checkout=2026-05-03" \
  | jq '{availability_source, rooms: [.room_types[] | {id, available_beds, inventory_state, base_price_per_night, total_price}]}'

# Expected: availability_source: "ezee_live", prices present, inventory_state set

# 3. Same-day guard — must return 400 (not a system error)
curl -w "\nHTTP %{http_code}\n" \
  "https://api.thedailysocial.co.in/guest/booking/availability?property_id=60765&checkin=2026-05-01&checkout=2026-05-01"

# Expected: HTTP 400 — confirm FE does NOT show error banner for this case
```

---

## Timeline

- BE SQL migration was committed on 2026-04-22 and will deploy on the next push to `main`
- Once the CI pipeline completes (build → migrate → deploy, ~10–15 min), the catalog and availability APIs will return `source: "db"` with correct prices
- The FE availability guard fix can be deployed independently — it is a safe change and fixes the error banner immediately regardless of BE deploy status
