# Guest Booking API Routes

> **Base URL (prod)**: `https://api.thedailysocial.co.in`  
> **Base URL (dev)**: `http://localhost:8080`

> [!IMPORTANT]
> **Breaking change (2026-04-13):** The single `GET /guest/booking/rooms` endpoint has been split into two endpoints with distinct purposes. Update all frontend calls accordingly — see the frontend migration guide at `docs/user_frontend_guide/room_availability_update.md`.

> [!IMPORTANT]
> **Multi-property change (2026-05-19):** Two properties are now live — `60765` (TDS Koramangala) and `55402` (Buteak Suites). Always pass `property_id` explicitly. New bookings are issued an ERI with the new format `{HOTEL_CODE}-LCL-{ts}-{rand}` (e.g. `60765-LCL-LZ4F1R-A8B2`); externally ingested bookings use `{HOTEL_CODE}-EZEE-{reservationNo}`. Existing bookings retain their old ERIs (`TDS-{CITY}-...`, `EZEE-{CITY}-...`) — backend handles both. Treat ERIs as opaque strings; if you must parse, check `.includes('-EZEE-')` vs `.includes('-LCL-')` for source detection. For Buteak, `room_types` is not seeded yet — the endpoint falls through to live eZee data and returns `source: "ezee_only"`.

---

## 1. GET `/guest/booking/rooms` — Room Catalog

Returns **all active room types** for a property. No dates required. This is the catalog — it always returns every room regardless of occupancy or availability on any given date.

**Auth**: None required

**Query Params**:

| Param | Type | Required | Example |
|---|---|---|---|
| `property_id` | string | ✅ Yes | `60765` |

**Data source**: eZee Vacation Rental `get_rooms` API → enriched with base prices, amenities, floor range from local `room_types` table.

**Response** (200):
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
      "total_beds": 64,
      "base_price_per_night": 500,
      "floor_range": "2-5",
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker"],
      "ezee_room_type_id": "6076500000000000001",
      "physical_room_count": 16
    },
    {
      "id": "rt-ka-queen",
      "name": "Queen Size Room",
      "slug": "queen-room",
      "type": "PRIVATE",
      "beds_per_room": 1,
      "total_beds": 14,
      "base_price_per_night": 1500,
      "floor_range": "1-5",
      "amenities": ["AC", "Attached Bathroom", "WiFi", "TV"],
      "ezee_room_type_id": "6076500000000000002",
      "physical_room_count": 14
    }
  ]
}
```

**Notes**:
- `physical_room_count` — number of physical rooms/beds configured in eZee (not the same as availability)
- `base_price_per_night` — indicative price from local DB; **live rate will differ** — always call `/availability` before checkout to get the definitive price
- Response does **not** include `available_beds` or `inventory_state` — those only come from `/availability`
- Room types with `is_active=false` are excluded (e.g. rooms whose eZee rate plan is not yet configured)

**Caching**: 60 minutes (`catalog:{property_id}`). Invalidated when room type config changes.

---

## 2. GET `/guest/booking/availability` — Live Availability

Returns the **same room types** as `/rooms` but enriched with live eZee availability counts and current rates for the requested date window. **Dates are required.**

Rooms that are fully booked for the requested dates appear with `available_beds: 0` and `inventory_state: "sold_out"` — they are **not removed** from the response. The frontend should render them as greyed-out/disabled cards.

**Auth**: None required

**Query Params**:

| Param | Type | Required | Example |
|---|---|---|---|
| `property_id` | string | ✅ Yes | `60765` |
| `checkin` | `YYYY-MM-DD` | ✅ Yes | `2026-04-20` |
| `checkout` | `YYYY-MM-DD` | ✅ Yes | `2026-04-21` |

**Data source**: eZee `RoomList` reservation API (availability + live rates for the date range), merged over the DB catalog.

**Response** (200):
```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-20",
  "checkout_date": "2026-04-21",
  "no_of_nights": 1,
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "slug": "4-bed-mixed-dorm",
      "type": "DORM",
      "available_beds": 61,
      "inventory_state": "available",
      "base_price_per_night": 500,
      "total_price": 500,
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker"],
      "floor_range": "2-5",
      "ezee_room_type_id": "6076500000000000001",
      "ezee_rate_plan_id": "6076500000000000001",
      "ezee_rate_type_id": "6076500000000000001"
    },
    {
      "id": "rt-ka-queen",
      "name": "Queen Size Room",
      "slug": "queen-room",
      "type": "PRIVATE",
      "available_beds": 0,
      "inventory_state": "sold_out",
      "base_price_per_night": 1500,
      "total_price": 1500,
      "amenities": ["AC", "Attached Bathroom", "WiFi", "TV"],
      "floor_range": "1-5",
      "ezee_room_type_id": "6076500000000000002",
      "ezee_rate_plan_id": "6076500000000000002",
      "ezee_rate_type_id": "6076500000000000001"
    }
  ]
}
```

**`inventory_state` values**:

| Value | `available_beds` | Frontend behaviour |
|---|---|---|
| `"available"` | ≥ 3 | Normal, bookable |
| `"limited"` | 1–2 | Show urgency badge ("Only 2 left") |
| `"sold_out"` | 0 | Grey out card, disable "Book" button |

**Notes**:
- `base_price_per_night` is the **live rate from eZee** for those dates (not the DB base price). This is always accurate for pricing.
- `total_price` = `base_price_per_night × no_of_nights`
- eZee `ezee_*` IDs are returned here for use by `create-order`; the frontend should pass them through as-is
- If eZee is unreachable, falls back to local DB estimated availability and base prices

**Caching**: 30 minutes (`rooms:{property_id}:{checkin}:{checkout}`). Invalidated before and after `create-order`.

---

## 3. GET `/guest/booking/lookup` — Public Booking Preview

Returns a non-sensitive preview of any booking (OTA or TDS) by ERI. **No auth required.**

Used by the frontend "Find my booking" flow — a guest who booked via an OTA can enter their booking ID before they have a TDS account. The response intentionally omits `booker_email` and `booker_phone`.

**Auth**: None required

**Query Params**:

| Param | Type | Required | Example |
|---|---|---|---|
| `booking_id` | string | ✅ Yes | `EZEE-KA-123456` |

**Response** (200):
```json
{
  "found": true,
  "booking_id": "EZEE-KA-123456",
  "property_name": "The Daily Social — Koramangala A",
  "checkin_date": "2026-04-20T00:00:00.000Z",
  "checkout_date": "2026-04-21T00:00:00.000Z",
  "room_type_name": "4 Bed Mixed Dormitory",
  "status": "CONFIRMED",
  "source": "GoIbibo"
}
```

**Errors**:
- `404` — Booking not found (ERI doesn't exist or `is_active = false`)

**Frontend flow**:
1. Guest enters ERI from their OTA confirmation → `GET /guest/booking/lookup?booking_id=EZEE-KA-123456`
2. Show preview card: "Found: 4 Bed Mixed Dormitory at The Daily Social, Apr 20–21"
3. Prompt guest to sign up / log in
4. After auth, `autoLinkBookings()` fires automatically — the booking appears in their "My Bookings"
5. If auto-link doesn't fire (e.g. different email), use `POST /guest/booking/link` with the same ERI

**Secondary guest flow**:
- Primary guest shares their ERI with co-guests
- Each co-guest follows steps 1–5 above
- `POST /guest/booking/link` creates a `SECONDARY` role for guests whose email/phone doesn't match the booker

---

## 4. POST `/guest/booking/create-order`

Validates the full booking cart (rooms + optional addons), reserves inventory, creates pending booking records. Returns summary for payment.

**Auth**: Guest JWT required

**Request**:
```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-20",
  "checkout_date": "2026-04-21",
  "rooms": [
    { "room_type_id": "rt-ka-4dorm", "quantity": 2 }
  ],
  "addons": [
    { "product_id": "prod-toilet-kit", "quantity": 2 }
  ],
  "coupon_code": "DIWALI500"
}
```

`coupon_code` is **optional**. Auto-applied coupons (STAY_LENGTH, NEW_GUEST) still fire without one. See [`16_guest_coupons.md`](16_guest_coupons.md) for the full coupon model, and use `POST /guest/booking/coupons/preview` to validate a code (and compute live savings) before submitting create-order.

**Response** (201):
```json
{
  "ezee_reservation_id": "TDS-KA-MN021NE0-35A1",
  "property_id": "60765",
  "property_name": "The Daily Social - Koramangala A",
  "checkin_date": "2026-04-20",
  "checkout_date": "2026-04-21",
  "no_of_nights": 1,
  "total_guests": 2,
  "rooms": [
    {
      "room_type_id": "rt-ka-4dorm",
      "room_type_name": "4 Bed Mixed Dormitory",
      "type": "DORM",
      "quantity": 2,
      "price_per_night": 500,
      "line_total": 1000
    }
  ],
  "addons": [],
  "subtotal_rooms": 1000,
  "subtotal_addons": 0,
  "discount_total": 200,
  "coupons_applied": [
    { "kind": "AUTO", "coupon_id": "cp-xxx", "code": null, "type": "NEW_GUEST",
      "label": "20% off on your first booking", "discount_amount": 200 }
  ],
  "coupon_errors": [],
  "grand_total": 800,
  "addon_order_id": null,
  "status": "PENDING_PAYMENT"
}
```

`coupon_errors` lists soft errors when a typed `coupon_code` is invalid (expired, wrong property, etc.) — create-order still succeeds without it. `discount_total` and `grand_total` are the server-authoritative values; the FE must use `grand_total` when calling `POST /payment/create-booking-order` (the payment endpoint re-derives this and rejects mismatches).

**What happens**:
1. Invalidates room availability cache for these dates (ensures fresh eZee data)
2. Validates room availability against eZee + local DB
3. Validates addon stock for COMMODITY items
4. Reserves addon inventory (`available_stock--`, `reserved_stock++`)
5. Resolves applicable coupons (one auto + optional code) and computes `discount_total`
6. Creates `ezee_booking_cache` (status: PENDING_PAYMENT) with `booking_rooms_json`, `coupon_id_auto`, `coupon_id_code`, `discount_total`
7. Creates `booking_guest_access` (role: PRIMARY)
8. Creates `addon_orders` + `addon_order_items` (if addons)
9. Creates `booking_slots` for each guest
10. Invalidates room availability cache again

**Errors**:
- `400` — No rooms selected, insufficient availability, sold_out room in cart
- `404` — Property or room type not found

---

## 5. POST `/payment/create-booking-order`

Creates a Razorpay order for the pending booking. Called after `create-order`.

**Auth**: Guest JWT required

**Request**:
```json
{
  "ezee_reservation_id": "TDS-KA-MN021NE0-35A1",
  "grand_total": 1000,
  "addon_order_id": null
}
```

**Response** (201):
```json
{
  "razorpay_order_id": "order_STo4oZS8o4gD9C",
  "razorpay_key": "rzp_test_...",
  "amount": 1000,
  "amount_paise": 100000,
  "currency": "INR",
  "payment_id": "82700941-...",
  "ezee_reservation_id": "TDS-KA-MN021NE0-35A1",
  "guest": { "email": "guest@example.com" }
}
```

---

## Payment After Booking

### On Success (verify or webhook)
- Booking status: `PENDING_PAYMENT` → `CONFIRMED`
- Addon inventory: `reserved_stock--`, `sold_count++`
- Addon order: `PENDING` → `PAID`
- Payment: `CREATED` → `CAPTURED`
- **SQS: `sendEzeeInsertBooking`** queued → eZee sync worker creates booking in eZee PMS
- **SQS: `sendEzeeAddExtraCharge`** queued (if addons)

### On Failure
- Booking status: `PENDING_PAYMENT` → `CANCELLED`
- Addon inventory restored
- Addon order + items deleted
- Booking slots + guest access deleted
- Payment: `CREATED` → `FAILED`

---

## Booking Reference (ERI) Format

```
TDS-{CITY}-{TIMESTAMP_BASE36}-{RANDOM_4}
Example: TDS-KA-MN021NE0-35A1
```

---

## eZee PMS Sync (post-payment, async via SQS)

```
1. InsertBooking      → creates booking in eZee PMS
   ↓ 2.5s delay
2. ProcessBooking     → confirms reservation
   ↓ 2.5s delay
3. RoomAvailability   → finds free physical room
   ↓ 2.5s delay
4. AssignRoom         → assigns specific bed (non-fatal if fails)
   ↓ 2.5s delay
5. AddPayment         → records payment in eZee folio (non-fatal if fails)
```

- Queue: `vibehouse-ezee-sync.fifo` (maxMessages=1, rate-limit protection)
- Idempotent: checks `ezee_reservation_no` before re-calling InsertBooking on retry
- Partial failures: AssignRoom/AddPayment logged but don't block the flow

---

## Booking Status Lifecycle

```
PENDING_PAYMENT  →  CONFIRMED     (payment captured)
PENDING_PAYMENT  →  CANCELLED     (payment failed / expired)
```

---

## Room Types — Koramangala A (Active)

| ID | Name | Type | eZee Room Type ID | Rate/Night |
|---|---|---|---|---|
| `rt-ka-4dorm` | 4 Bed Mixed Dormitory | DORM | `6076500000000000001` | ₹500 |
| `rt-ka-queen` | Queen Size Room | PRIVATE | `6076500000000000002` (Deluxe in eZee) | ₹1,500 |

**Inactive (awaiting eZee rate plan)**:

| ID | Name | eZee Room Type ID |
|---|---|---|
| `rt-ka-6dorm` | 6 Bed Mixed Dormitory | `6076500000000000004` |
| `rt-ka-4dorm-female` | 4 Bed Dormitory Female | `6076500000000000005` |
| `rt-ka-6dorm-female` | 6 Bed Dormitory Female | `6076500000000000006` |

---

## Testing in Postman

### Step 1: Browse catalog (no auth, no dates)
```
GET /guest/booking/rooms?property_id=60765
→ all room types with base prices
```

### Step 2: Check live availability for selected dates
```
GET /guest/booking/availability?property_id=60765&checkin=2026-04-20&checkout=2026-04-21
→ same rooms with available_beds + inventory_state
```

### Step 2b: Look up an OTA booking by ID (optional, no auth)
```
GET /guest/booking/lookup?booking_id=EZEE-KA-123456
→ property, dates, room type preview (no PII)
```

### Step 3: Login as guest
```
POST /guest/auth/login
{ "email": "guest@thedailysocial.in", "password": "TDS@2026!" }
→ copy access_token
```

### Step 4: Create booking order
```
POST /guest/booking/create-order
Authorization: Bearer <token>
{
  "property_id": "60765",
  "checkin_date": "2026-04-20",
  "checkout_date": "2026-04-21",
  "rooms": [{ "room_type_id": "rt-ka-4dorm", "quantity": 1 }]
}
→ get ezee_reservation_id, grand_total
```

### Step 5: Create Razorpay order
```
POST /payment/create-booking-order
Authorization: Bearer <token>
{ "ezee_reservation_id": "<eri>", "grand_total": <total> }
→ get razorpay_order_id
```

### Step 6: Simulate payment (dev only)
```
POST /payment/dev/simulate-capture
{ "razorpay_order_id": "<rzp_order_id>" }
→ "Booking confirmed, payment captured"
```

---

## Inventory Reservation Flow

```
                     create-order              payment captured
                    ┌────────────┐            ┌────────────────┐
available_stock ────┤ decrement  ├────────────┤  (no change)   │
                    └────────────┘            └────────────────┘
                    ┌────────────┐            ┌────────────────┐
reserved_stock  ────┤ increment  ├────────────┤  decrement     │
                    └────────────┘            └────────────────┘
                                              ┌────────────────┐
sold_count      ──────────────────────────────┤  increment     │
                                              └────────────────┘

                     payment failed
                    ┌────────────────┐
available_stock ────┤  increment     │  (restored)
                    └────────────────┘
                    ┌────────────────┐
reserved_stock  ────┤  decrement     │  (released)
                    └────────────────┘
```

---

## 6. POST `/guest/booking/link` — Link Guest to Booking

Links the authenticated guest to a booking by ERI. Used for OTA bookings (guest enters their ERI after creating a TDS account) and for secondary guests joining an existing booking.

**Auth**: Guest JWT required

**Request**:
```json
{ "ezee_reservation_id": "EZEE-KA-123456" }
```

**Response (200 or 201)**:
```json
{
  "message": "Linked successfully",
  "access": { "role": "PRIMARY", "status": "APPROVED" },
  "booking": {
    "ezee_reservation_id": "EZEE-KA-123456",
    "property_id": "60765",
    "room_type_name": "4 Bed Mixed Dormitory",
    "room_number": "101",
    "checkin_date": "2026-04-20T00:00:00.000Z",
    "checkout_date": "2026-04-22T00:00:00.000Z",
    "no_of_guests": 2,
    "status": "CONFIRMED"
  },
  "slots": [
    { "slot_id": "uuid", "slot_number": 1, "label": "Guest 1", "guest_id": "uuid", "kyc_status": "NOT_STARTED" },
    { "slot_id": "uuid", "slot_number": 2, "label": "Guest 2", "guest_id": null, "kyc_status": "NOT_STARTED" }
  ]
}
```

**Role assignment**:
- `PRIMARY` — guest's email or phone matches the booker email/phone in eZee
- `SECONDARY` — no match (co-guest sharing an ERI)

**Errors**:
- `404` — Booking not found
- `200` with `message: "Already linked to this booking"` — idempotent, safe to call again

---

## 7. GET `/guest/booking/mine` — My Bookings

Returns all bookings the authenticated guest is linked to (any role, any status), **scoped to the brand of the calling request**. As of 2026-06-05 the response includes a server-computed `bucket` (UPCOMING/ACTIVE/PAST) and a live `status` sourced from `ezee_booking_cache.status` — kept fresh by the eZee autosync webhook worker so the FE reflects check-in / check-out / cancellation within ~5 min of the event happening in eZee.

**Auth**: Guest JWT required

> [!IMPORTANT]
> **Brand-scoped (2026-05-21):** The response filters bookings by the brand the request came from. A guest with bookings on both `www.thedailysocial.co.in` (TDS) and `www.buteak.in` (Buteak) will only see one set per call. Brand is resolved from:
> 1. The `brand` claim on the JWT (set at login/signup time based on which brand's frontend issued the credentials).
> 2. Falls back to the request `Host` header if the JWT has no `brand` claim (in-flight JWTs from before this rollout).
>
> No new query params required from the FE — same hostname → same brand → only that brand's bookings returned.

**Response (200)** — returns an **array** (not an object envelope):

```json
[
  {
    "ezee_reservation_id": "TDS-KA-MN021NE0-35A1",
    "role": "PRIMARY",
    "status": "CHECKED_IN",
    "is_active": true,
    "bucket": "ACTIVE",
    "access_status": "APPROVED",
    "room_type_name": "4 Bed Mixed Dormitory",
    "room_number": "101",
    "checkin_date": "2026-04-20T00:00:00.000Z",
    "checkout_date": "2026-04-22T00:00:00.000Z",
    "property_id": "60765",
    "source": "APP",
    "last_updated_at": "2026-06-05T07:34:24.552Z",
    "total_slots": 1,
    "kyc_completed_slots": 1
  }
]
```

### Field reference

| Field | Type | Notes |
|---|---|---|
| `ezee_reservation_id` | string | The eZee `UniqueID`, used as the cross-system key. |
| `role` | `"PRIMARY"` \| `"SECONDARY"` | The guest's role on this booking (booker vs invited sharer). |
| `status` | string | Booking state from `ezee_booking_cache.status`. Values: `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `NO_SHOW`. Kept fresh by the autosync webhook. |
| `is_active` | boolean | `false` after CANCEL / NO_SHOW / CHECKED_OUT. Use this to grey out cards instead of hiding them. |
| `bucket` | `"UPCOMING"` \| `"ACTIVE"` \| `"PAST"` | **New (2026-06-05).** Server-computed bucket for the three FE tabs. Rules below. |
| `access_status` | string | The `booking_guest_access` linkage state — always `"APPROVED"` since we only return approved links. Was previously named `status` in the response; renamed to free that name for the booking status above. |
| `room_type_name` | string \| null | E.g. `"4 Bed Mixed Dormitory"`. |
| `room_number` | string \| null | Populated once eZee assigns a physical room. |
| `checkin_date` | ISO date | Per `@db.Date`, midnight UTC of the day. |
| `checkout_date` | ISO date | Same. |
| `property_id` | string | eZee hotel code (`"60765"` TDS, `"55402"` Buteak BTM, `"61766"` Buteak Koramangala). |
| `source` | string \| null | `"APP"`, `"Internet Booking Engine"`, `"Walk-in"`, OTA name, etc. |
| `last_updated_at` | ISO timestamp | `ezee_booking_cache.fetched_at` — when this row was last touched by autosync. Lets the FE show "last synced N minutes ago". |
| `total_slots` | number | Number of `booking_slots` rows (one per guest sharer). |
| `kyc_completed_slots` | number | Slots whose `kyc_status` is `PRE_VERIFIED` or `VERIFIED`. |

### Bucket rules (server-side, deterministic)

The backend assigns one of `UPCOMING` / `ACTIVE` / `PAST` per booking using this precedence:

1. **Terminal status wins over dates.**
   - `status ∈ {CANCELLED, NO_SHOW, CHECKED_OUT}` → `PAST` (even if check-in date is still in the future).
   - `status === CHECKED_IN` → `ACTIVE` (even if check-in date is technically tomorrow — staff already let them in).
2. **Pre-arrival status (`PENDING_PAYMENT` / `CONFIRMED`) is date-driven:**
   - `checkout_date < today (UTC midnight)` → `PAST` (expired without check-in, eZee NOSHOW push pending).
   - `checkin_date > today` → `UPCOMING`.
   - Otherwise (`checkin_date <= today <= checkout_date`) → `ACTIVE` (in the stay window but not officially checked in).
3. Missing dates default to `UPCOMING`.

The FE should NOT re-derive bucket from dates — use the server value so a CHECKED_IN booking on its check-in day stays in `ACTIVE` even if midnight rollover hasn't happened yet on the client clock.

### Real-time freshness

`status` and `bucket` are refreshed automatically by the eZee autosync webhook worker — typically within 30 seconds of a status change in eZee admin. To indicate freshness to the user:

```ts
// FE pseudocode
const minutesAgo = Math.round((Date.now() - new Date(booking.last_updated_at).getTime()) / 60000);
showHint(`Last synced ${minutesAgo} min ago`);
```

If you want to pull the latest without a page reload, just re-hit `GET /guest/booking/mine`.

---

## 8. GET `/guest/booking/checkin-status` — Check-In Status & Room PIN

Returns the current check-in status for a booking and the smart lock PIN once provisioned. The guest must be linked (approved) to the booking.

**Auth**: Guest JWT required

**Query Params**:

| Param | Type | Required | Example |
|---|---|---|---|
| `booking_id` | string | ✅ Yes | `TDS-KA-MN021NE0-35A1` |

**Response (200)**:
```json
{
  "booking_id": "TDS-KA-MN021NE0-35A1",
  "status": "CHECKED_IN",
  "room_number": "101",
  "property_name": "The Daily Social - Koramangala A",
  "checkin_date": "2026-04-25T00:00:00.000Z",
  "checkout_date": "2026-04-27T00:00:00.000Z",
  "lock_access": {
    "pin": "4042783",
    "valid_from": "2026-04-25T00:00:00.000Z",
    "valid_until": "2026-04-27T00:00:00.000Z",
    "pin_status": "ACTIVE"
  }
}
```

**`lock_access` is `null`** when:
- Booking is still `CONFIRMED` (not yet checked in)
- Lock device is not configured for the room (`mygate_devices` row missing)
- PIN provisioning failed (MyGate API error — check server logs)

**When provisioned**: eZee marks the booking as "Checked In" → reconciliation detects the drift (≤ 15 min, or immediately via `POST /admin/bookings/trigger-reconcile`) → `MyGateService.provisionLockAccess()` generates the PIN → stores it in `smart_lock_access` → sends the PIN to the guest's email.

**Errors**:

| Status | Scenario |
|--------|----------|
| 400 | `booking_id` query param missing |
| 401 | Missing or invalid guest JWT |
| 403 | Guest not linked (approved) to this booking |
| 404 | Booking not found |

**Frontend use**: Poll this endpoint every 30s after the expected check-in time until `lock_access` becomes non-null, then display the PIN prominently on the guest's home screen.
