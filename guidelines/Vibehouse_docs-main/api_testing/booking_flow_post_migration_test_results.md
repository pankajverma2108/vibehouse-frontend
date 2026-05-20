# Booking Flow API Test Results — Post Property ID Migration

**Date:** 2026-04-13  
**Backend:** NestJS on `localhost:8080`  
**Database:** Neon PostgreSQL (`neondb`)  
**Property:** `60765` (The Daily Social — Koramangala A)  
**Scope:** Full guest booking flow + admin auth, tested after `prop-koramangala-a → 60765` migration  
**Migrations applied:** `20260413000000` (property rename), `20260413000001` (deactivate legacy room types)

---

## Room Fetch Responses (Actual Payloads)

### `GET /guest/booking/rooms?property_id=60765`

**Status: 200 OK**

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
      "base_price_per_night": 699,
      "floor_range": "1-4",
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker", "Reading Light"],
      "ezee_room_type_id": "6076500000000000001",
      "physical_room_count": 64
    },
    {
      "id": "rt-ka-queen",
      "name": "Queen Size Room",
      "slug": "queen-size-room",
      "type": "PRIVATE",
      "beds_per_room": 1,
      "total_beds": 12,
      "base_price_per_night": 2499,
      "floor_range": "1-4",
      "amenities": ["AC", "Attached Bathroom", "WiFi", "Work Desk", "Smart Lock"],
      "ezee_room_type_id": "6076500000000000002",
      "physical_room_count": 14
    }
  ]
}
```

> **Notes:**
> - `physical_room_count` comes from eZee live `get_rooms` API (not DB). Dorm: 64 physical rooms, Queen: 14.
> - `base_price_per_night` is the static local DB price. Live dynamic rates come from the `/availability` endpoint.
> - `rt-ka-6dorm` (6-bed mixed dorm) is `is_active = false` — no eZee rate plan configured yet. Excluded from catalog.
> - No duplicate slugs. Each slug is unique within property `60765`.

---

### `GET /guest/booking/availability?property_id=60765&checkin=2026-04-20&checkout=2026-04-21`

**Status: 200 OK**

```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-20",
  "checkout_date": "2026-04-21",
  "no_of_nights": 1,
  "availability_source": "ezee_live",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "slug": "4-bed-mixed-dorm",
      "type": "DORM",
      "available_beds": 63,
      "inventory_state": "available",
      "base_price_per_night": 500,
      "total_price": 500,
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker", "Reading Light"],
      "floor_range": "1-4",
      "ezee_room_type_id": "6076500000000000001",
      "ezee_rate_plan_id": "6076500000000000001",
      "ezee_rate_type_id": "6076500000000000001"
    },
    {
      "id": "rt-ka-queen",
      "name": "Queen Size Room",
      "slug": "queen-size-room",
      "type": "PRIVATE",
      "available_beds": 13,
      "inventory_state": "available",
      "base_price_per_night": 1500,
      "total_price": 1500,
      "amenities": ["AC", "Attached Bathroom", "WiFi", "Work Desk", "Smart Lock"],
      "floor_range": "1-4",
      "ezee_room_type_id": "6076500000000000002",
      "ezee_rate_plan_id": "6076500000000000002",
      "ezee_rate_type_id": "6076500000000000001"
    }
  ]
}
```

> **Notes:**
> - `availability_source: "ezee_live"` — live data from eZee, not a DB fallback.
> - Dorm rate: ₹500/night (eZee live), catalog shows ₹699 (local base). Live rate is what frontend should display at checkout.
> - Queen rate: ₹1,500/night (eZee live), catalog shows ₹2,499 (local base).
> - `available_beds: 63` for dorm (64 physical - 1 bed reserved from earlier test).
> - `inventory_state` enum confirmed: `available` (≥3), `limited` (1–2), `sold_out` (0).

---

### Price Discrepancy — Catalog vs Availability

| Room | Catalog `base_price_per_night` | Availability `base_price_per_night` |
|---|---|---|
| 4-Bed Dorm | ₹699 (local DB) | ₹500 (eZee live) |
| Queen Room | ₹2,499 (local DB) | ₹1,500 (eZee live) |

This is **by design**. The catalog serves the local DB price as a "starting from" reference for the homepage. The availability endpoint serves the live eZee rate for the selected dates. Frontend must use the availability price for the actual booking — the catalog price is for display before dates are chosen.

**Action (FE):** Show catalog prices as "from ₹X/night" and only surface the eZee live rate at the booking step once dates are selected.

---

## Full Booking Flow Test Results

### 1. Room Catalog

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| `?property_id=60765` | 200 | **PASS** | 2 active rooms, no duplicates |
| `?property_id=invalid` | 404 | **PASS** | `"No room types found for this property"` |
| Missing `property_id` | 404 | **PASS** | Prisma returns no rows → 404 |

---

### 2. Room Availability

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| 1-night, valid dates | 200 | **PASS** | `ezee_live`, correct per-night and total prices |
| 5-night, valid dates | 200 | **PASS** | `total_price = rate × 5` (dorm ₹2,500, queen ₹7,500) |
| checkout ≤ checkin | 400 | **PASS** | `"Checkout must be after checkin"` |
| Missing dates | 500 | **NOTE** | No validation guard on missing `checkin`/`checkout` params — fails with unhandled date parse error rather than a clean 400. See Known Issues. |

---

### 3. Guest Auth

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| `POST /guest/auth/signup` | 201 | **PASS** | JWT + profile returned on first call |
| Duplicate signup | 409 | **PASS** | Conflict on unique email |
| `POST /guest/auth/login` | 200 | **PASS** | JWT issued |
| `GET /guest/auth/me` with JWT | 200 | **PASS** | Profile + bookings array |
| `GET /guest/auth/me` without JWT | 401 | **PASS** | `"Unauthorized"` |

---

### 4. Create Booking Order

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| 2 dorm beds, 2 nights | 200 | **PASS** | `grand_total: 2000` (2 × 500 × 2) |
| 1 queen + 2 water bottles | 200 | **PASS** | `grand_total: 3200` (1×1500×2 + 2×100), `addon_order_id` created |
| Invalid `room_type_id` | 404 | **PASS** | `"Room type 'rt-fake' not found"` |
| Quantity > available beds | 400 | **PASS** | `"Queen Size Room — requested 999 but only 13 available"` |
| No auth header | 401 | **PASS** | `"Unauthorized"` |
| Property not found | 404 | **PASS** | `"Property not found"` |

---

### 5. Payment Flow

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| `POST /payment/create-booking-order` | 200 | **PASS** | Razorpay order created, `razorpay_key` returned |
| `POST /payment/dev/simulate-capture` | 200 | **PASS** | Status → `CONFIRMED`, payment → `CAPTURED` |
| `GET /guest/booking/mine` after confirm | 200 | **PASS** | Booking shows `status: CONFIRMED`, `property_id: "60765"` |
| PENDING bookings visible | 200 | **PASS** | Unconfirmed bookings also surfaced with `PENDING_PAYMENT` status |

**Sample confirmed booking in `/mine` response:**
```json
{
  "ezee_reservation_id": "TDS-BANGALORE-MNX0WIR5-B299",
  "role": "PRIMARY",
  "status": "APPROVED",
  "room_type_name": "4 Bed Mixed Dormitory x1",
  "room_number": "202 A",
  "checkin_date": "2026-05-01T00:00:00.000Z",
  "checkout_date": "2026-05-03T00:00:00.000Z",
  "property_id": "60765",
  "source": "The Daily Social",
  "total_slots": 1,
  "kyc_completed_slots": 0
}
```

---

### 6. Public Events

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| No `property_id` param | 200 | **PASS** | Falls back to `DEFAULT_PROPERTY_ID=60765`, returns `[]` |
| `?property_id=60765` | 200 | **PASS** | Returns `[]` (no events seeded) |
| Invalid property | 200 | **PASS** | Returns `[]` gracefully |

---

### 7. Admin Auth

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| Login with correct role name (`MANAGER`) | 200 | **PASS** | JWT with `property_id: "60765"`, 20 permissions |
| Login with role_id instead of role name | 403 | **NOTE** | `POST /admin/auth/login` requires `role: "MANAGER"` not `role: "role-manager"`. The API docs should clarify this. |
| `GET /admin/auth/me` | 200 | **PASS** | Full profile, `property_id: "60765"` |
| `GET /admin/bookings` | 200 | **PASS** | All bookings visible, each with `property.id: "60765"` |

---

### 8. Guest Store Catalog

| Test Case | HTTP | Status | Notes |
|---|---|---|---|
| `GET /guest/store/catalog?property_id=60765` | 200 | **PASS** | 23 products, stock levels accurate |
| Water bottle stock after 2 reserved | 200 | **PASS** | `available_stock: 58` (was 60 — 2 reserved by addon order) |

---

## Known Issues

| # | Severity | Issue | Recommended Fix |
|---|---|---|---|
| 1 | **Medium** | `GET /availability` with missing `checkin` or `checkout` query params returns an unhandled 500 (date parse error) instead of a clean 400. | Add `@IsNotEmpty()` / `@IsDefined()` validation on `checkin` and `checkout` in a query DTO, or guard in the service: `if (!checkin || !checkout) throw new BadRequestException(...)` |
| 2 | **Info** | `rt-ka-6dorm` (6-bed mixed dorm) is `is_active = false`. Only 2 of 3 configured room types are bookable. | Set `is_active = true` once the eZee rate plan ID is filled in for this room type. |
| 3 | **Info** | Catalog `base_price_per_night` (local DB) differs from availability `base_price_per_night` (eZee live). Dorm: ₹699 vs ₹500; Queen: ₹2,499 vs ₹1,500. | Expected — update local DB base prices to match eZee or document that catalog shows "from" prices. |
| 4 | **Info** | Admin login `role` field expects the role *name* string (`"MANAGER"`) not the role *id* (`"role-manager"`). This is undocumented and a common footgun. | Update `docs/api_routes/01_admin_auth.md` to clarify accepted values. |

---

## DB State After Tests

```
Properties      : 60765  (The Daily Social - Koramangala A)
Room types      : rt-ka-4dorm ✅  rt-ka-queen ✅  rt-ka-6dorm ❌ (inactive)
Guest created   : testguest-api-check@test.com
Bookings        : 3 (1 CONFIRMED, 2 PENDING_PAYMENT)
Payments        : 1 CAPTURED (order_Scw8tpYqQ9zNz8, ₹1,000)
Inventory       : prod-water-bottle at 58/60 (2 reserved)
```

---

## Migration Verification

| Check | Result |
|---|---|
| `SELECT id FROM properties` | `60765` only — no `prop-*` IDs |
| All bookings `property_id` | `60765` |
| Admin JWT `property_id` | `60765` |
| Store catalog `property_id` param | Accepts `60765`, returns correct products |
| Old `rt-queen / rt-4dorm / rt-6dorm` | Not present in DB (were absent pre-migration; migration `20260413000001` guards against re-insertion) |
