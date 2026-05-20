# Guest Store API

Base URL: `/guest/store`

All cart/order/borrowable/service endpoints require **Guest JWT** (`Authorization: Bearer <token>`).
Catalog listing endpoints are public (only need `property_id` query param).

---

## 1. Browse Catalog

```
GET /guest/store/catalog?property_id=prop-bandra-001
```

Returns purchasable items: **COMMODITY** (physical goods) + **paid SERVICE** (Early Check-in, Late Checkout, Laundry).

**Response:**
```json
[
  {
    "id": "prod-water-bottle",
    "name": "Water Bottle",
    "category": "COMMODITY",
    "base_price": 100,
    "in_stock": true,
    "available_stock": 50
  },
  {
    "id": "prod-early-checkin",
    "name": "Early Check-in",
    "category": "SERVICE",
    "base_price": 250,
    "in_stock": true,
    "available_stock": null
  }
]
```

---

## 2. Browse Free Services

```
GET /guest/store/services?property_id=prop-bandra-001
```

Returns free in-house services (Room Cleaning, Linen Change, WiFi Support, etc.).
These can only be **requested** post-check-in — they are NOT added to cart.

---

## 3. Browse Borrowables

```
GET /guest/store/borrowables?property_id=prop-bandra-001
```

Returns borrowable items with live availability.

**Response:**
```json
[
  { "id": "prod-iron", "name": "Iron", "available": 1, "total": 3 },
  { "id": "prod-umbrella", "name": "Umbrella", "available": 3, "total": 5 }
]
```

---

## 4. Get Cart

```
GET /guest/store/cart/:eri
```

**Auth:** Guest JWT required. Guest must have APPROVED access to the booking.

**Response:**
```json
{
  "order_id": "uuid",
  "phase": "PRE_ARRIVAL",
  "items": [
    {
      "id": "item-uuid",
      "product_id": "prod-water-bottle",
      "name": "Water Bottle",
      "category": "COMMODITY",
      "unit_code": "BED-D101-A",
      "quantity": 2,
      "unit_price": 100,
      "total_price": 200
    }
  ],
  "total": 200
}
```

Returns `{ items: [], total: 0, order_id: null }` if no cart exists.

---

## 5. Add to Cart

```
POST /guest/store/cart/:eri/add
```

**Auth:** Guest JWT required.

**Body:**
```json
{
  "product_id": "prod-water-bottle",
  "quantity": 2,
  "unit_code": "BED-D101-A"
}
```

`unit_code` identifies which bed/unit the item is for (from `ezee_booking_cache.unit_code`).
When one ERI covers multiple beds, this ensures each bed's items are tracked separately.

**Rules:**
- Only COMMODITY and paid SERVICE items can be added to cart
- BORROWABLE items → use `/borrowable/request` endpoint instead
- Free services → use `/service/request` endpoint instead
- Stock is validated for COMMODITY items
- Same product + same unit_code = quantity incremented; different unit_code = separate line item

**Response:** Full cart (same format as GET cart)

---

## 6. Update Cart Item Quantity

```
PATCH /guest/store/cart/:eri/item/:itemId
```

**Auth:** Guest JWT required.

**Body:**
```json
{ "quantity": 3 }
```

**Response:** Full cart

---

## 7. Remove Cart Item

```
DELETE /guest/store/cart/:eri/item/:itemId
```

**Auth:** Guest JWT required.

**Response:** Full cart (remaining items)

---

## 8. Checkout (Simulated Payment)

```
POST /guest/store/cart/:eri/checkout
```

**Auth:** Guest JWT required.

**What happens:**
1. Validates stock for all COMMODITY items
2. Creates a `payments` record with status `CAPTURED` (simulated Razorpay)
3. Updates `addon_orders` status from `PENDING` → `PAID`
4. Decrements `available_stock` and increments `sold_count` for COMMODITY items

**Response:**
```json
{
  "message": "Payment successful",
  "order_id": "uuid",
  "payment_id": "uuid",
  "total": 450,
  "items_count": 2
}
```

**Errors:**
- `400` if cart is empty
- `400` if any COMMODITY is out of stock

---

## 9. Request Borrowable Item

```
POST /guest/store/:eri/borrowable/request
```

**Auth:** Guest JWT required. Guest must have booking access.

**Body:**
```json
{
  "product_id": "prod-umbrella",
  "expected_duration_hours": 3
}
```

`expected_duration_hours` is optional — just informational.

**What happens:**
1. Validates item exists and is BORROWABLE
2. Checks available stock > 0
3. Checks guest doesn't already have this item checked out
4. Creates `borrowable_checkouts` row with status `CHECKED_OUT`
5. Decrements `available_stock`, increments `borrowed_out_count`

**Response:**
```json
{
  "message": "\"Umbrella\" has been checked out to you",
  "checkout_id": "uuid",
  "product_name": "Umbrella",
  "expected_duration_hours": 3
}
```

---

## 10. My Borrowables

```
GET /guest/store/:eri/borrowable/mine
```

**Auth:** Guest JWT required.

Returns all borrowable checkouts for this guest + booking (both active and returned).

**Response:**
```json
[
  {
    "id": "uuid",
    "product_name": "Umbrella",
    "status": "CHECKED_OUT",
    "checked_out_at": "2026-03-14T10:00:00.000Z",
    "returned_at": null
  }
]
```

---

## 11. Request Free Service (Post-Check-in Only)

```
POST /guest/store/:eri/service/request
```

**Auth:** Guest JWT required. Guest must have **checked in** (COMPLETED checkin_record).

**Body:**
```json
{
  "product_id": "prod-room-cleaning",
  "notes": "Please clean before 3 PM"
}
```

`notes` is optional.

**What happens:**
1. Validates guest has checked in for this booking
2. Validates product is a free SERVICE
3. Creates a `zoho_ticket_ref` as a service request record

**Response:**
```json
{
  "message": "\"Room Cleaning\" request submitted",
  "ticket_id": "uuid",
  "service_name": "Room Cleaning",
  "notes": "Please clean before 3 PM"
}
```

**Errors:**
- `400` if guest hasn't checked in yet

---

## 12. Order History

```
GET /guest/store/:eri/orders
```

**Auth:** Guest JWT required.

Returns all orders for this booking (PENDING carts + PAID orders).

**Response:**
```json
[
  {
    "id": "uuid",
    "status": "PAID",
    "phase": "PRE_ARRIVAL",
    "created_at": "2026-03-14T10:00:00.000Z",
    "payment": { "status": "CAPTURED", "amount": 450 },
    "items": [
      { "name": "Water Bottle", "category": "COMMODITY", "quantity": 2, "unit_price": 100, "total_price": 200 }
    ],
    "total": 450
  }
]
```

---

## Permission Matrix

| Endpoint | Auth Required | Booking Access | Check-in Required |
|---|---|---|---|
| GET catalog | No | No | No |
| GET services | No | No | No |
| GET borrowables | No | No | No |
| Cart (all ops) | Yes | Yes (APPROVED) | No |
| Checkout | Yes | Yes | No |
| Borrowable request | Yes | Yes | No |
| My borrowables | Yes | Yes | No |
| Service request | Yes | Yes | **Yes** |
| Order history | Yes | Yes | No |

---

## Testing with Postman

1. **Login:** `POST /guest/auth/login` → `{"email":"arjun@thedailysocial.in","password":"Vibe@2026!"}`
2. Copy `access_token` → set as Bearer token
3. Use ERI `EZEE-BND-2026-001` (Arjun's active booking at D-101)
4. Property ID: `prop-bandra-001`
