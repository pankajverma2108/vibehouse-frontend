# Booking Cart & Anonymous Cart — Architecture Plan

> **Created**: March 2026
> **Status**: PLANNED — Not yet implemented

---

## The Problem

A visitor (no account) should be able to:
1. Browse a property's rooms and add-on products
2. Select rooms/beds + add COMMODITY/SERVICE add-ons to a **Booking Cart**
3. See the full total (rooms + add-ons + tax)
4. Click "Book Now" → prompted to **sign up**
5. After signup, **retain the exact same cart** they were looking at
6. Pay and confirm the booking

The complication: our `addon_orders` table has `guest_id` (NOT NULL FK) and `ezee_reservation_id` (NOT NULL FK). A non-guest has **neither**. The booking hasn't been created in eZee yet, so there's no ERI. And the visitor hasn't signed up, so there's no guest_id.

---

## Solution: `anonymous_booking_carts` — A Unified Pre-Auth Cart

One table that holds **both room selections AND product add-ons** for a non-guest visitor, identified by a `session_token`. Nothing touches `addon_orders` or `ezee_booking_cache` until after signup + payment.

### Why not just make guest_id nullable on addon_orders?

- `addon_orders.guest_id` has a FK to `guests` — making it nullable ripples into payments, Zoho tickets, eZee sync, and every query that joins on it
- `addon_orders.ezee_reservation_id` also can't be null — it's the FK to the booking. No booking exists yet for a visitor
- Changing two NOT NULL FKs on a table that drives the entire order lifecycle is high-risk for an MVP
- A dedicated anonymous cart is isolated, disposable, and has zero impact on the existing order pipeline

### Why not store rooms and add-ons in separate tables?

Rooms and add-ons are structurally different (rooms have dates, room_type, price_per_night; add-ons have product_id, quantity). Mixing them in one `items` table with nullable columns is messy.

**Answer: Two item tables under one cart.**

---

## Schema Design

### `anonymous_booking_carts`

The cart header — one per visitor session.

| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| session_token | VARCHAR(36) UNIQUE | UUID issued to client, stored in localStorage |
| property_id | VARCHAR(36) FK → properties | Which property they're booking |
| checkin_date | DATE | Selected check-in date |
| checkout_date | DATE | Selected check-out date |
| no_of_nights | INT | Computed from dates |
| created_at | TIMESTAMP | Default now() |
| expires_at | TIMESTAMP | Default now() + 7 days, for cleanup |

### `anonymous_cart_rooms`

Room/bed selections within the cart.

| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| cart_id | VARCHAR(36) FK → anonymous_booking_carts | CASCADE delete |
| room_type_id | VARCHAR(50) | eZee room type identifier |
| room_type_name | VARCHAR(100) | Display name ("6 Bed Mixed Dorm") |
| quantity | INT | Number of beds/rooms selected |
| price_per_night | DECIMAL(10,2) | Rate from eZee (snapshot) |
| total_price | DECIMAL(10,2) | price_per_night × quantity × no_of_nights |
| no_of_guests | INT DEFAULT 1 | Guests per unit (for dorms, usually 1 per bed) |

### `anonymous_cart_addons`

Product add-ons (COMMODITY / paid SERVICE) within the cart.

| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| cart_id | VARCHAR(36) FK → anonymous_booking_carts | CASCADE delete |
| product_id | VARCHAR(36) FK → product_catalog | Validated server-side |
| quantity | INT | Min 1 |
| unit_price | DECIMAL(10,2) | Price snapshot from product_catalog |
| total_price | DECIMAL(10,2) | unit_price × quantity |

**No `unit_code`** — bed assignment happens after booking is confirmed.
**No `guest_id`** — doesn't exist yet.
**No `ezee_reservation_id`** — booking hasn't been created yet.

All three tables are **ephemeral** — they exist only to hold the cart between page loads until the visitor signs up and pays. After that, the data migrates to real tables and the anonymous cart is deleted.

---

## The Full Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: VISITOR (no auth)                                       │
│                                                                  │
│  GET /guest/store/catalog?property_id=...     → browse products  │
│  GET /guest/booking/rooms?property_id=...&    → browse rooms     │
│        checkin=2026-03-19&checkout=2026-03-20    (eZee rates)    │
│                                                                  │
│  POST /guest/booking/anon-cart/init           → { session_token }│
│    body: { property_id, checkin_date, checkout_date }            │
│                                                                  │
│  POST /guest/booking/anon-cart/room/add       → add room to cart │
│    header: x-anon-session: <token>                               │
│    body: { room_type_id, room_type_name, quantity,               │
│            price_per_night, no_of_guests }                       │
│                                                                  │
│  POST /guest/booking/anon-cart/addon/add      → add product      │
│    header: x-anon-session: <token>                               │
│    body: { product_id, quantity }                                │
│                                                                  │
│  GET /guest/booking/anon-cart                 → full cart summary │
│    header: x-anon-session: <token>                               │
│    response: { rooms: [...], addons: [...],                      │
│                subtotal_rooms, subtotal_addons, tax, total }     │
│                                                                  │
│  Visitor sees the Booking Summary page                           │
│  Clicks "Book Now" → SIGNUP PROMPT                               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: SIGNUP                                                  │
│                                                                  │
│  POST /guest/auth/signup                                         │
│    body: { name, email, password, session_token: "<token>" }     │
│    response: { access_token, guest: {...},                       │
│                pending_booking_cart: true }                       │
│                                                                  │
│  The session_token is now associated with the new guest_id       │
│  (we store guest_id on the anonymous_booking_carts row)          │
│  Cart is NOT migrated yet — just linked.                         │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: CONFIRM BOOKING + PAY                                   │
│                                                                  │
│  POST /guest/booking/confirm                                     │
│    header: Authorization: Bearer <jwt>                           │
│    body: { session_token: "<token>" }                            │
│                                                                  │
│  Backend does (in ONE transaction):                              │
│    1. Read anonymous cart (rooms + addons)                        │
│    2. Create booking in eZee → get ezee_reservation_id (ERI)    │
│       (simulated for now — generate a fake ERI)                  │
│    3. Create ezee_booking_cache row with ERI, rooms, dates       │
│    4. Create booking_guest_access (role=PRIMARY)                 │
│    5. If addons exist:                                           │
│       - Create addon_orders (guest_id, ERI, phase=BOOKING)      │
│       - Create addon_order_items for each addon                  │
│    6. Create payment record (simulated — status=CAPTURED)        │
│       - Amount = room total + addon total + tax                  │
│    7. Decrement inventory for COMMODITY addons                   │
│    8. Delete the anonymous_booking_cart (CASCADE deletes items)  │
│                                                                  │
│  Response: { ezee_reservation_id, booking_summary, payment_id }  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: POST-BOOKING (existing flows)                           │
│                                                                  │
│  Guest now has auth + ERI. Existing APIs work:                   │
│  - POST /guest/store/cart/:eri/add        (buy more stuff)       │
│  - POST /guest/store/:eri/borrowable/request                     │
│  - POST /guest/store/:eri/service/request (post-check-in)        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

### Visitor already has an account but isn't logged in
- They build a cart as anonymous → click "Book Now" → see "Already have an account? Log in"
- Login endpoint also accepts `session_token` → links cart to existing guest_id
- Same confirm flow after that

### Visitor changes dates after adding rooms
- `PATCH /guest/booking/anon-cart/dates` → updates checkin/checkout on the cart
- Recalculates `no_of_nights` and `total_price` on all room items
- Rooms may need to be re-validated against eZee availability

### Cart expiry
- `expires_at` is 7 days from creation
- Daily cron job: `DELETE FROM anonymous_booking_carts WHERE expires_at < NOW()`
- CASCADE delete removes room and addon items automatically

### Stock validation
- COMMODITY stock is checked when adding to anonymous cart (soft check)
- Stock is re-validated during `POST /confirm` (hard check inside transaction)
- If stock runs out between add and confirm → 409 Conflict with details

### Guest adds addon after signup but before confirm
- After signup, `guest_id` is linked to the anonymous cart
- Guest can still use the anon-cart APIs (add/remove rooms and addons) with session_token
- Everything migrates at confirm time

---

## Cart Summary Response Shape

```json
{
  "session_token": "abc-123",
  "property": { "id": "60765", "name": "Vibe House Bandra" },
  "checkin_date": "2026-03-19",
  "checkout_date": "2026-03-20",
  "no_of_nights": 1,
  "rooms": [
    {
      "id": "item-uuid",
      "room_type_name": "6 Bed Mixed Dorm",
      "quantity": 2,
      "price_per_night": 649,
      "total_price": 1298,
      "no_of_guests": 2
    },
    {
      "id": "item-uuid",
      "room_type_name": "Superior Double Room",
      "quantity": 1,
      "price_per_night": 1949,
      "total_price": 1949,
      "no_of_guests": 2
    }
  ],
  "addons": [
    {
      "id": "item-uuid",
      "product_id": "prod-toilet-kit",
      "product_name": "Toilet Kit",
      "quantity": 1,
      "unit_price": 129,
      "total_price": 129
    }
  ],
  "subtotal_rooms": 3247,
  "subtotal_addons": 129,
  "tax": 188.81,
  "total": 3564.81
}
```

---

## DB Tables — Complete Picture

| Table | Purpose | Status |
|---|---|---|
| `anonymous_booking_carts` | Pre-auth booking cart (session_token, dates, property) | TO BUILD |
| `anonymous_cart_rooms` | Room selections in anonymous cart | TO BUILD |
| `anonymous_cart_addons` | Product add-ons in anonymous cart | TO BUILD |
| `ezee_booking_cache` | Real booking record (created at confirm) | EXISTS |
| `booking_guest_access` | Guest ↔ booking link (created at confirm) | EXISTS |
| `addon_orders` | Real add-on order (created at confirm, requires guest_id + ERI) | EXISTS |
| `addon_order_items` | Items in real order (has unit_code) | EXISTS |
| `payments` | Payment records (created at confirm) | EXISTS |
| `product_catalog` | All products (COMMODITY, SERVICE, BORROWABLE) | EXISTS |
| `inventory` | Stock tracking for COMMODITY + BORROWABLE | EXISTS |

---

## How This Connects to Post-Booking Cart (Already Built)

```
ANONYMOUS BOOKING CART (this plan)          POST-BOOKING CART (existing)
─────────────────────────────────          ──────────────────────────────
No guest_id, no ERI                        Requires guest_id + ERI
Holds rooms + addons                       Holds only addons
Identified by session_token                Identified by JWT + ERI param
Lives in anonymous_booking_carts           Lives in addon_orders
Migrated to real tables at confirm         Already in real tables
One-time use (deleted after confirm)       Reusable (new orders per stay)
```

---

## Implementation Priority

1. **Anonymous Booking Cart** — tables + APIs (this plan)
2. **Room availability API** — `GET /guest/booking/rooms` fetching rates from eZee (simulated for now)
3. **Confirm endpoint** — the transactional migration from anonymous → real tables
4. **Post-booking add-on cart** — already built and working
5. **Real eZee integration** — replace simulated booking creation with actual eZee API calls (future)

---

## Notes
- Tax calculation logic TBD (GST rules for hostels — typically 12% for rooms < ₹7,500/night)
- Discount/coupon system not in scope yet
- "Payable Now" vs "Pay at Property" split — to be decided with real Razorpay integration
- eZee room availability/rates are simulated until eZee sync worker is built
