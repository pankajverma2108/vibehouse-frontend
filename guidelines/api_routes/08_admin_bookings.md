# 08 — Admin Bookings API

**Base URL**: `http://localhost:8080`
**Auth**: Admin JWT (`Authorization: Bearer <token>`)
**Permissions**: `bookings.view`, `bookings.create`
**Allowed Roles**: Owner, Manager, Reception (NOT Housekeeping, NOT Maintenance)

---

## 1. Create Manual Booking (Walk-in)

**POST** `/admin/bookings/create-order`

Creates a pending booking on behalf of a walk-in guest. If the guest doesn't exist in the system, a new guest record is auto-created using the provided name + email/phone.

**Permission**: `bookings.create`

### Request

```json
{
  "property_id": "prop-bandra-001",
  "guest_name": "Rahul Sharma",
  "guest_email": "rahul@example.com",
  "guest_phone": "+919876543210",
  "checkin_date": "2026-03-25",
  "checkout_date": "2026-03-28",
  "rooms": [
    { "room_type_id": "rt-queen-001", "quantity": 1 }
  ],
  "addons": [
    { "product_id": "prod-towel-001", "quantity": 2 }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| property_id | string | Yes | Must match admin's assigned property (owners exempt) |
| guest_name | string | Yes | Walk-in guest's name |
| guest_email | string | No | At least one of email/phone required |
| guest_phone | string | No | At least one of email/phone required |
| checkin_date | ISO date | Yes | |
| checkout_date | ISO date | Yes | Must be after checkin |
| rooms | array | Yes | At least one room selection |
| rooms[].room_type_id | string | Yes | |
| rooms[].quantity | int | Yes | Number of beds |
| addons | array | No | Optional add-ons (COMMODITY or SERVICE only) |

### Response (201)

```json
{
  "ezee_reservation_id": "VH-BANDRA-M1ABC-XY12",
  "guest_id": "uuid",
  "guest_name": "Rahul Sharma",
  "property_id": "prop-bandra-001",
  "property_name": "The Daily Social Bandra",
  "checkin_date": "2026-03-25",
  "checkout_date": "2026-03-28",
  "no_of_nights": 3,
  "total_guests": 1,
  "rooms": [...],
  "addons": [...],
  "subtotal_rooms": 5997,
  "subtotal_addons": 200,
  "grand_total": 6197,
  "addon_order_id": "uuid or null",
  "status": "PENDING_PAYMENT",
  "source": "WALK_IN"
}
```

### Errors

| Status | Scenario |
|--------|----------|
| 400 | Missing email AND phone |
| 400 | Checkout before checkin |
| 400 | Insufficient stock for addon |
| 400 | Borrowable item in addons |
| 403 | Housekeeping / maintenance role |
| 403 | Non-owner trying to book for another property |
| 404 | Property / room type / product not found |

---

## 2. Create Payment for Manual Booking

**POST** `/admin/bookings/:eri/pay`

Creates a Razorpay order for a pending manual booking. The admin opens the Razorpay checkout on the dashboard and the customer pays on-site.

**Permission**: `bookings.create`

### Request

No body — the ERI is in the URL path.

### Response (200)

```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_key": "rzp_test_...",
  "amount": 6197,
  "amount_paise": 619700,
  "currency": "INR",
  "payment_id": "uuid",
  "ezee_reservation_id": "VH-BANDRA-M1ABC-XY12",
  "guest": { "email": "rahul@example.com" }
}
```

**After this**, the admin opens the Razorpay checkout modal on the dashboard. On successful payment:
- Razorpay webhook (`POST /webhook/razorpay`) confirms the payment
- Booking status changes: `PENDING_PAYMENT → CONFIRMED`
- ERI is returned to give to the guest

### Errors

| Status | Scenario |
|--------|----------|
| 404 | Booking not found |
| 403 | Property mismatch |
| 200 | Returns message if booking is already CONFIRMED or a Razorpay order already exists |

---

## 3. List All Bookings (Dashboard)

**GET** `/admin/bookings`

Lists all bookings with pagination. Scoped to admin's property (owners see all properties).

**Permission**: `bookings.view`

### Query Parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| status | string | — | Filter: `CONFIRMED`, `PENDING_PAYMENT`, `CANCELLED` |
| property_id | string | — | Only for owners (non-owners auto-scoped) |
| page | int | 1 | |
| limit | int | 20 | Max items per page |

### Response (200)

```json
{
  "bookings": [
    {
      "ezee_reservation_id": "VH-BANDRA-M1ABC-XY12",
      "property": { "id": "prop-bandra-001", "name": "The Daily Social Bandra" },
      "guest": { "id": "uuid", "name": "Rahul Sharma", "email": "rahul@example.com", "phone": "+919876543210" },
      "room_type_name": "Queen Size Room x1",
      "room_number": null,
      "checkin_date": "2026-03-25",
      "checkout_date": "2026-03-28",
      "no_of_guests": 1,
      "source": "WALK_IN",
      "status": "CONFIRMED",
      "is_active": true,
      "created_at": "2026-03-21T10:00:00.000Z",
      "latest_payment": {
        "id": "uuid",
        "amount": 6197,
        "status": "CAPTURED",
        "purpose": "booking",
        "razorpay_order_id": "order_xyz123",
        "created_at": "2026-03-21T10:05:00.000Z"
      },
      "guest_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "total_pages": 1
  }
}
```

---

## 4. Get Booking Detail

**GET** `/admin/bookings/:eri`

Returns full booking detail including guests, KYC slots, all payments, and addon orders with items.

**Permission**: `bookings.view`

### Response (200)

```json
{
  "ezee_reservation_id": "VH-BANDRA-M1ABC-XY12",
  "property": { "id": "prop-bandra-001", "name": "The Daily Social Bandra", "city": "Mumbai" },
  "booker": { "id": "uuid", "name": "Rahul Sharma", "email": "rahul@example.com", "phone": "+919876543210" },
  "booker_email": "rahul@example.com",
  "booker_phone": "+919876543210",
  "room_type_name": "Queen Size Room x1",
  "room_number": null,
  "checkin_date": "2026-03-25",
  "checkout_date": "2026-03-28",
  "no_of_guests": 1,
  "source": "WALK_IN",
  "status": "CONFIRMED",
  "is_active": true,
  "created_at": "2026-03-21T10:00:00.000Z",
  "guests": [
    {
      "guest": { "id": "uuid", "name": "Rahul Sharma", "email": "rahul@example.com", "phone": "+919876543210" },
      "role": "PRIMARY",
      "status": "APPROVED"
    }
  ],
  "slots": [
    {
      "slot_number": 1,
      "label": "Guest 1",
      "guest": { "id": "uuid", "name": "Rahul Sharma" },
      "kyc_status": "NOT_STARTED"
    }
  ],
  "payments": [
    {
      "id": "uuid",
      "amount": 6197,
      "currency": "INR",
      "purpose": "booking",
      "status": "CAPTURED",
      "razorpay_order_id": "order_xyz123",
      "razorpay_payment_id": "pay_abc456",
      "created_at": "2026-03-21T10:05:00.000Z",
      "updated_at": "2026-03-21T10:06:00.000Z"
    }
  ],
  "addon_orders": [
    {
      "id": "uuid",
      "phase": "BOOKING",
      "status": "PAID",
      "created_at": "2026-03-21T10:00:00.000Z",
      "items": [
        {
          "product": { "id": "prod-towel-001", "name": "Bath Towel", "category": "COMMODITY" },
          "quantity": 2,
          "unit_price": 100,
          "total_price": 200,
          "unit_code": null
        }
      ]
    }
  ]
}
```

### Errors

| Status | Scenario |
|--------|----------|
| 404 | Booking not found |
| 403 | Non-owner trying to view another property's booking |

---

## 5. Search Guests (for manual booking form)

**GET** `/admin/bookings/search-guests?q=...`

Searches existing guests by name, email, or phone. Used in the admin dashboard when creating a manual booking for a returning guest.

**Permission**: `bookings.create`

### Query Parameters

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| q | string | Yes | Min 2 characters |

### Response (200)

```json
[
  {
    "id": "uuid",
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "phone": "+919876543210"
  }
]
```

---

## Full Walk-in Booking Flow

```
1. Admin searches guest → GET /admin/bookings/search-guests?q=rahul
2. Admin creates booking → POST /admin/bookings/create-order
   → Returns { eri, grand_total, status: PENDING_PAYMENT }
3. Admin initiates payment → POST /admin/bookings/:eri/pay
   → Returns { razorpay_order_id, razorpay_key }
4. Admin opens Razorpay modal on dashboard → Customer pays on-site
5. Razorpay webhook → POST /webhook/razorpay (payment.captured)
   → Booking CONFIRMED, addon inventory finalized
6. Admin gives ERI to guest for check-in / KYC
```

---

## Postman Setup

1. **Login**: `POST /admin/auth/login` with owner/manager/reception credentials
2. Copy `access_token` from response
3. Set `Authorization: Bearer <token>` header on all requests
4. For payment testing: use `POST /payment/dev/simulate-capture` with the `razorpay_order_id` from step 3
