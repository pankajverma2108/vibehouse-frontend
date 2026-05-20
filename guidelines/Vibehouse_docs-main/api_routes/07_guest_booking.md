# Guest Booking API Routes

> Base URL: `http://localhost:8080` (dev) or Railway URL (prod)

> [!IMPORTANT]
> **Breaking change (2026-04-13):** The single `GET /guest/booking/rooms` endpoint has been split into two endpoints with distinct purposes. Update all frontend calls accordingly — see the frontend migration guide at `docs/user_frontend_guide/room_availability_update.md`.

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
  ]
}
```

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
  "grand_total": 1000,
  "addon_order_id": null,
  "status": "PENDING_PAYMENT"
}
```

**What happens**:
1. Invalidates room availability cache for these dates (ensures fresh eZee data)
2. Validates room availability against eZee + local DB
3. Validates addon stock for COMMODITY items
4. Reserves addon inventory (`available_stock--`, `reserved_stock++`)
5. Creates `ezee_booking_cache` (status: PENDING_PAYMENT) with `booking_rooms_json`
6. Creates `booking_guest_access` (role: PRIMARY)
7. Creates `addon_orders` + `addon_order_items` (if addons)
8. Creates `booking_slots` for each guest
9. Invalidates room availability cache again

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
