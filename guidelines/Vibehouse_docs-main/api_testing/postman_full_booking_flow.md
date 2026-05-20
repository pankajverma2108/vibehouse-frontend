# The Daily Social — Postman API Testing Guide

> **Base URL:** `http://localhost:8080`  
> **Date Tested:** 2026-04-13  
> **Property:** `60765` (The Daily Social — Koramangala A)  
> **Status:** All endpoints verified live ✅

---

## Postman Environment Setup

Create a new Environment in Postman called **"TDS Local"** with these variables:

| Variable | Initial Value | Notes |
|---|---|---|
| `base_url` | `http://localhost:8080` | Change to prod URL when deploying |
| `guest_token` | _(empty)_ | Auto-filled by login script |
| `admin_token` | _(empty)_ | Auto-filled by login script |
| `eri` | _(empty)_ | Auto-filled after create-order |
| `rzp_order_id` | _(empty)_ | Auto-filled after create-booking-order |

Add this **Tests** script to both login requests to auto-set tokens:

**Guest login → Tests tab:**
```javascript
const res = pm.response.json();
pm.environment.set("guest_token", res.access_token);
console.log("Guest token saved.");
```

**Admin login → Tests tab:**
```javascript
const res = pm.response.json();
pm.environment.set("admin_token", res.access_token);
console.log("Admin token saved.");
```

**Create booking order → Tests tab:**
```javascript
const res = pm.response.json();
pm.environment.set("eri", res.ezee_reservation_id);
pm.environment.set("grand_total", res.grand_total);
console.log("ERI saved:", res.ezee_reservation_id);
```

**Create payment order → Tests tab:**
```javascript
const res = pm.response.json();
pm.environment.set("rzp_order_id", res.razorpay_order_id);
console.log("Razorpay order saved:", res.razorpay_order_id);
```

---

## Collections Structure (recommended folder order)

```
TDS API
├── 1. Guest Auth
│   ├── Signup
│   ├── Login  ← save token here
│   └── Get My Profile
├── 2. Room Browsing (no auth)
│   ├── Room Catalog
│   └── Room Availability
├── 3. Booking Flow
│   ├── Create Booking Order  ← save ERI here
│   ├── Create Payment Order  ← save rzp_order_id here
│   ├── Simulate Payment Capture (dev)
│   └── My Bookings
├── 4. Guest Store
│   ├── Browse Catalog
│   ├── Add to Cart
│   └── View Cart
├── 5. Admin
│   ├── Admin Login  ← save admin_token here
│   ├── Admin Profile
│   ├── List Bookings
│   └── List Inventory
└── 6. Public
    └── List Events
```

---

## 1. Guest Auth

---

### 1.1 Sign Up

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/guest/auth/signup` |
| Auth | None |
| Body type | raw / JSON |

**Request Body:**
```json
{
  "name": "Riya Kapoor",
  "email": "riya@example.com",
  "password": "Test@12345",
  "phone": "+919876543210"
}
```

**Success Response — 201:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "guest": {
    "id": "bc7195c4-04bc-4b49-bdb1-660fc8eb384e",
    "name": "Riya Kapoor",
    "email": "riya@example.com",
    "phone": "+919876543210",
    "email_verified": false,
    "phone_verified": false,
    "profile_photo_url": null,
    "created_at": "2026-04-13T10:00:13.339Z"
  }
}
```

**Error cases:**

| Status | When | Example |
|---|---|---|
| 400 | Missing/invalid fields | `{"message": ["email must be an email"], "statusCode": 400}` |
| 409 | Email already registered | `{"message": "Email already in use", "statusCode": 409}` |

---

### 1.2 Login

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/guest/auth/login` |
| Auth | None |
| Body type | raw / JSON |

**Request Body:**
```json
{
  "email": "riya@example.com",
  "password": "Test@12345"
}
```

**Success Response — 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "guest": {
    "id": "bc7195c4-04bc-4b49-bdb1-660fc8eb384e",
    "name": "Riya Kapoor",
    "email": "riya@example.com",
    "phone": "+919876543210",
    "email_verified": false,
    "phone_verified": false
  }
}
```

> ⚡ **Paste the `access_token` value into your `guest_token` environment variable**, or use the Tests script above to do it automatically.

---

### 1.3 Get My Profile

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/guest/auth/me` |
| Auth | Bearer `{{guest_token}}` |

**No request body.**

**Success Response — 200:**
```json
{
  "id": "bc7195c4-04bc-4b49-bdb1-660fc8eb384e",
  "name": "Riya Kapoor",
  "email": "riya@example.com",
  "phone": "+919876543210",
  "email_verified": false,
  "phone_verified": false,
  "profile_photo_url": null,
  "created_at": "2026-04-13T10:00:13.339Z",
  "bookings": []
}
```

---

## 2. Room Browsing (no auth needed)

---

### 2.1 Room Catalog

Returns all active room types. **No dates, no auth.** Use this for the homepage/listing page.

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/guest/booking/rooms?property_id=60765` |
| Auth | None |

**No request body.**

**Actual Live Response — 200:**
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
      "amenities": [
        "AC",
        "Shared Bathroom",
        "WiFi",
        "Personal Locker",
        "Reading Light"
      ],
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
      "amenities": [
        "AC",
        "Attached Bathroom",
        "WiFi",
        "Work Desk",
        "Smart Lock"
      ],
      "ezee_room_type_id": "6076500000000000002",
      "physical_room_count": 14
    }
  ]
}
```

> **Note:** `base_price_per_night` here is the local DB "from" price. The live eZee rate (used for actual payment) comes from `/availability` below.

**Error cases:**

| Status | When |
|---|---|
| 404 | `property_id` doesn't exist |

---

### 2.2 Room Availability (Live)

Returns live bed counts and actual rates for specific dates. **Call this after the guest picks dates.**

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/guest/booking/availability?property_id=60765&checkin=2026-04-20&checkout=2026-04-21` |
| Auth | None |

**No request body.**

Change the `checkin` and `checkout` query params to whatever dates you want to test.

**Actual Live Response — 200:**
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
      "amenities": [
        "AC",
        "Shared Bathroom",
        "WiFi",
        "Personal Locker",
        "Reading Light"
      ],
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
      "amenities": [
        "AC",
        "Attached Bathroom",
        "WiFi",
        "Work Desk",
        "Smart Lock"
      ],
      "floor_range": "1-4",
      "ezee_room_type_id": "6076500000000000002",
      "ezee_rate_plan_id": "6076500000000000002",
      "ezee_rate_type_id": "6076500000000000001"
    }
  ]
}
```

**Key fields:**

| Field | Meaning |
|---|---|
| `availability_source` | `"ezee_live"` = real data. `"local_db_estimate"` = eZee is down, block checkout |
| `available_beds` | How many beds available for the requested dates |
| `inventory_state` | `"available"` (≥3) / `"limited"` (1–2) / `"sold_out"` (0) |
| `base_price_per_night` | **Live rate from eZee** — this is what to show and charge |
| `total_price` | `base_price_per_night × no_of_nights` |

**Error cases:**

| Status | When |
|---|---|
| 400 | checkout ≤ checkin |
| 404 | property_id not found |

---

## 3. Booking Flow

> **This entire section requires the guest JWT. Set `guest_token` first via Login (1.2).**

---

### 3.1 Create Booking Order

Validates rooms + addons, reserves inventory, creates a pending booking. Call this after the guest confirms their cart.

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/guest/booking/create-order` |
| Auth | Bearer `{{guest_token}}` |
| Body type | raw / JSON |

**Request Body — dorm beds only:**
```json
{
  "property_id": "60765",
  "checkin_date": "2026-05-01",
  "checkout_date": "2026-05-03",
  "rooms": [
    { "room_type_id": "rt-ka-4dorm", "quantity": 2 }
  ],
  "addons": []
}
```

**Request Body — queen room + addons:**
```json
{
  "property_id": "60765",
  "checkin_date": "2026-05-01",
  "checkout_date": "2026-05-03",
  "rooms": [
    { "room_type_id": "rt-ka-queen", "quantity": 1 }
  ],
  "addons": [
    { "product_id": "prod-water-bottle", "quantity": 2 },
    { "product_id": "prod-toilet-kit", "quantity": 1 }
  ]
}
```

**Available `room_type_id` values:**

| ID | Name | Rate |
|---|---|---|
| `rt-ka-4dorm` | 4 Bed Mixed Dormitory | ₹500/night (eZee live) |
| `rt-ka-queen` | Queen Size Room | ₹1,500/night (eZee live) |

**Available `product_id` values (addons):**

| ID | Name | Price | Category |
|---|---|---|---|
| `prod-water-bottle` | Water Bottle | ₹100 | COMMODITY |
| `prod-bath-towel` | Bath Towel | ₹200 | RETURNABLE |
| `prod-safe-lock` | Safe Lock | ₹150 | COMMODITY |
| `prod-toilet-kit` | Toilet Kit | ₹150 | COMMODITY |
| `prod-blanket` | Blanket | ₹300 | RETURNABLE |
| `prod-locker` | Locker | ₹150 | COMMODITY |
| `prod-laundry` | Laundry | ₹150 | SERVICE |
| `prod-early-checkin` | Early Check-in | ₹250 | SERVICE |
| `prod-late-checkout` | Late Checkout | ₹250 | SERVICE |

> **Note:** `BORROWABLE` items (iron, hair dryer, umbrella) and free services (room cleaning, WiFi support, etc.) cannot be added to the booking cart.

**Actual Live Response — 200:**
```json
{
  "ezee_reservation_id": "TDS-BANGALORE-MNX0WIR5-B299",
  "property_id": "60765",
  "property_name": "The Daily Social - Koramangala A",
  "checkin_date": "2026-05-01",
  "checkout_date": "2026-05-03",
  "no_of_nights": 2,
  "total_guests": 2,
  "rooms": [
    {
      "room_type_id": "rt-ka-4dorm",
      "room_type_name": "4 Bed Mixed Dormitory",
      "quantity": 2,
      "price_per_night": 500,
      "line_total": 2000
    }
  ],
  "addons": [],
  "subtotal_rooms": 2000,
  "subtotal_addons": 0,
  "grand_total": 2000,
  "addon_order_id": null,
  "status": "PENDING_PAYMENT"
}
```

> **Save `ezee_reservation_id` and `grand_total`** — you need both for the next step.

**Error cases:**

| Status | When | Example message |
|---|---|---|
| 400 | Room sold out | `"4 Bed Mixed Dormitory — requested 5 but only 3 available"` |
| 400 | No rooms selected | `"At least one room selection is required"` |
| 401 | No/expired token | `"Unauthorized"` |
| 404 | Invalid room_type_id | `"Room type 'rt-fake' not found"` |
| 404 | Invalid property_id | `"Property not found"` |

---

### 3.2 Create Payment Order (Razorpay)

Creates a Razorpay order for the pending booking. Returns the order details needed to open the Razorpay checkout modal.

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/payment/create-booking-order` |
| Auth | Bearer `{{guest_token}}` |
| Body type | raw / JSON |

**Request Body:**
```json
{
  "ezee_reservation_id": "{{eri}}",
  "grand_total": 2000,
  "addon_order_id": null
}
```

> Replace `{{eri}}` with the `ezee_reservation_id` from step 3.1, or use the env variable if you set it via the Tests script.

**Actual Live Response — 200:**
```json
{
  "razorpay_order_id": "order_Scw8tpYqQ9zNz8",
  "razorpay_key": "rzp_test_STOjwD1NfPXHSa",
  "amount": 2000,
  "amount_paise": 200000,
  "currency": "INR",
  "payment_id": "319ba621-3578-4973-ba2a-9c2d0ccbe8c8",
  "ezee_reservation_id": "TDS-BANGALORE-MNX0WIR5-B299",
  "guest": {
    "email": "riya@example.com"
  }
}
```

> **Save `razorpay_order_id`** — needed for the simulate step.

---

### 3.3 Simulate Payment Capture (Dev Only)

Simulates a Razorpay webhook capture without a real payment. **Only works in development.**

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/payment/dev/simulate-capture` |
| Auth | None |
| Body type | raw / JSON |

**Request Body:**
```json
{
  "razorpay_order_id": "{{rzp_order_id}}"
}
```

**Actual Live Response — 200:**
```json
{
  "message": "Booking confirmed, payment captured",
  "payment_id": "319ba621-3578-4973-ba2a-9c2d0ccbe8c8",
  "ezee_reservation_id": "TDS-BANGALORE-MNX0WIR5-B299",
  "total": 2000,
  "status": "CONFIRMED"
}
```

---

### 3.4 Simulate Payment Failure (Dev Only)

Cancels the booking and rolls back inventory. Use to test the failure path.

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/payment/dev/simulate-fail` |
| Auth | None |
| Body type | raw / JSON |

**Request Body:**
```json
{
  "razorpay_order_id": "{{rzp_order_id}}"
}
```

---

### 3.5 My Bookings

Returns all bookings linked to the authenticated guest.

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/guest/booking/mine` |
| Auth | Bearer `{{guest_token}}` |

**No request body.**

**Actual Live Response — 200:**
```json
[
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
]
```

---

## 4. Guest Store

---

### 4.1 Browse Product Catalog

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/guest/store/catalog?property_id=60765` |
| Auth | None |

**No request body.**

**Response — 200** (excerpt):
```json
[
  {
    "id": "prod-water-bottle",
    "name": "Water Bottle",
    "description": "Sealed 1L drinking water bottle",
    "category": "COMMODITY",
    "base_price": 100,
    "in_stock": true,
    "available_stock": 58
  },
  {
    "id": "prod-iron",
    "name": "Iron",
    "description": "Clothes iron",
    "category": "BORROWABLE",
    "base_price": 0,
    "in_stock": true,
    "available_stock": 4
  }
]
```

---

## 5. Admin

---

### 5.1 Admin Login

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/admin/auth/login` |
| Auth | None |
| Body type | raw / JSON |

> ⚠️ The `role` field must be the **role name** (e.g. `"MANAGER"`), not the role ID (e.g. `"role-manager"`).

**Request Body:**
```json
{
  "email": "manager.ka@thedailysocial.in",
  "password": "TDS@2026!",
  "role": "MANAGER"
}
```

**Available dev credentials (all password `TDS@2026!`):**

| Email | Role value |
|---|---|
| `manager.ka@thedailysocial.in` | `MANAGER` |
| `reception.ka@thedailysocial.in` | `RECEPTION` |
| `housekeeping.ka@thedailysocial.in` | `HOUSEKEEPING_LEAD` |
| `maintenance.ka@thedailysocial.in` | `MAINTENANCE_LEAD` |

**Actual Live Response — 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "c4341db2-a221-41be-a239-598677697478",
    "name": "Arjun Sharma (KA Manager)",
    "email": "manager.ka@thedailysocial.in",
    "role": "MANAGER",
    "display_name": "Property Manager",
    "property_id": "60765",
    "permissions": [
      "dashboard.view",
      "dashboard.analytics",
      "inventory.view",
      "inventory.edit",
      "sla.config",
      "staff.manage",
      "orders.view",
      "orders.refund",
      "devices.view",
      "devices.manage",
      "admin.manage",
      "admin.create",
      "returnable.manage",
      "returnable.return_verify",
      "bookings.view",
      "bookings.create",
      "events.view",
      "events.edit",
      "kyc.view",
      "kyc.delete"
    ]
  }
}
```

> ⚡ **Save `access_token` to `admin_token`** environment variable.

**Error cases:**

| Status | When |
|---|---|
| 400 | Missing `role` field |
| 401 | Wrong password |
| 403 | `role` value doesn't match this user's assigned role |

---

### 5.2 Admin Profile

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/admin/auth/me` |
| Auth | Bearer `{{admin_token}}` |

**Response — 200:** Same shape as login `admin` object, plus `two_fa_enabled`, `last_login_at`.

---

### 5.3 List All Bookings

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/admin/bookings` |
| Auth | Bearer `{{admin_token}}` |

**No request body.**

**Actual Live Response — 200** (excerpt):
```json
{
  "bookings": [
    {
      "ezee_reservation_id": "TDS-BANGALORE-MNX0WIR5-B299",
      "property": {
        "id": "60765",
        "name": "The Daily Social - Koramangala A"
      },
      "guest": {
        "id": "bc7195c4-04bc-4b49-bdb1-660fc8eb384e",
        "name": "Riya Kapoor",
        "email": "riya@example.com",
        "phone": "+919876543210"
      },
      "room_type_name": "4 Bed Mixed Dormitory x1",
      "room_number": "202 A",
      "checkin_date": "2026-05-01T00:00:00.000Z",
      "checkout_date": "2026-05-03T00:00:00.000Z",
      "no_of_guests": 1,
      "source": "The Daily Social",
      "status": "CONFIRMED",
      "is_active": true,
      "created_at": "2026-04-13T10:01:45.037Z",
      "latest_payment": {
        "id": "319ba621-3578-4973-ba2a-9c2d0ccbe8c8",
        "amount": "2000",
        "status": "CAPTURED",
        "purpose": "booking",
        "razorpay_order_id": "order_Scw8tpYqQ9zNz8",
        "created_at": "2026-04-13T10:01:46.734Z"
      },
      "guest_count": 1
    }
  ]
}
```

---

## 6. Public Events

---

### 6.1 List Events

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/public/events?property_id=60765` |
| Auth | None |

> Omitting `property_id` uses the server default (`60765`). Both return `[]` until events are created via admin.

**Response — 200:**
```json
[]
```

---

## Full Booking Flow — Step by Step

Run these in order. Each step depends on the previous.

| Step | Method | URL | Auth | Gets you |
|---|---|---|---|---|
| 1 | `POST` | `/guest/auth/signup` | None | Guest account |
| 2 | `POST` | `/guest/auth/login` | None | `guest_token` |
| 3 | `GET` | `/guest/booking/rooms?property_id=60765` | None | Room IDs + base prices |
| 4 | `GET` | `/guest/booking/availability?property_id=60765&checkin=2026-05-01&checkout=2026-05-03` | None | Live rates + bed counts |
| 5 | `POST` | `/guest/booking/create-order` | `guest_token` | `eri` (reservation ID) |
| 6 | `POST` | `/payment/create-booking-order` | `guest_token` | `razorpay_order_id` |
| 7 | `POST` | `/payment/dev/simulate-capture` | None | Booking confirmed ✅ |
| 8 | `GET` | `/guest/booking/mine` | `guest_token` | Confirmed booking |

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Admin login returns 403 | `role` field must be `"MANAGER"` not `"role-manager"` |
| 401 on any protected endpoint | Token expired (15 min TTL) — re-login to get a fresh one |
| `create-order` returns 404 on room | Use `rt-ka-4dorm` or `rt-ka-queen` — other room type IDs are inactive |
| `create-order` returns 400 on addon | Check the product is COMMODITY/RETURNABLE/SERVICE with `base_price > 0`. BORROWABLE and free service products can't be added to cart. |
| `availability_source: "local_db_estimate"` | eZee is unreachable. Prices are estimated — do not proceed to checkout. |
| `simulate-capture` returns 404 | The `razorpay_order_id` doesn't exist or was already used. Create a fresh booking order. |
