# 08 — Admin Bookings API

**Base URL (prod)**: `https://api.thedailysocial.co.in`  
**Base URL (dev)**: `http://localhost:8080`  
**Auth**: Admin JWT (`Authorization: Bearer <token>`)  
**Permission**: `bookings.view`

> **Design note**: eZee is the single source of truth for all bookings.
> Our `ezee_booking_cache` is read-only from the admin side — state changes
> (cancellations, check-ins, check-outs, room assignments) happen in eZee
> and are reconciled back to our DB every 15 minutes via `EzeeReconciliationService`.
> There is no create/cancel endpoint here.
> Use `POST /admin/bookings/trigger-reconcile` to force an immediate sync instead of waiting.

---

## 1. List Bookings

**GET** `/admin/bookings`

Lists all bookings with pagination. Non-owner admins are automatically scoped to their assigned property. Owners see all properties.

### Query Parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| status | string | — | `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `PENDING_PAYMENT`, `NO_SHOW` |
| property_id | string | — | Owners only — non-owners are auto-scoped |
| page | int | 1 | |
| limit | int | 20 | |

### Response (200)

```json
{
  "bookings": [
    {
      "ezee_reservation_id": "VH-MUMBAI-M1ABC-XY12",
      "property": { "id": "60765", "name": "Vibe House Bandra" },
      "guest": { "id": "uuid", "name": "Arjun Mehta", "email": "arjun@example.com", "phone": "+919876543210" },
      "room_type_name": "4 Bed Mixed Dormitory x2",
      "room_number": "101",
      "checkin_date": "2026-04-05T00:00:00.000Z",
      "checkout_date": "2026-04-08T00:00:00.000Z",
      "no_of_guests": 2,
      "source": "APP",
      "status": "CONFIRMED",
      "is_active": true,
      "created_at": "2026-04-01T10:00:00.000Z",
      "latest_payment": {
        "id": "uuid",
        "amount": 3000,
        "status": "CAPTURED",
        "purpose": "booking",
        "razorpay_order_id": "order_xyz123",
        "created_at": "2026-04-01T10:05:00.000Z"
      },
      "guest_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

### Errors

| Status | Scenario |
|--------|----------|
| 401 | Missing or invalid JWT |
| 403 | Insufficient permissions |

---

## 2. Get Booking Detail

**GET** `/admin/bookings/:eri`

Full booking detail including all guests (PRIMARY + SECONDARY), KYC slot status per bed, all payments, and add-on orders with line items.

### Path Parameters

| Param | Notes |
|-------|-------|
| eri | eZee Reservation ID, e.g. `VH-MUMBAI-M1ABC-XY12` |

### Response (200)

```json
{
  "ezee_reservation_id": "VH-MUMBAI-M1ABC-XY12",
  "property": { "id": "60765", "name": "Vibe House Bandra", "city": "Mumbai" },
  "booker": { "id": "uuid", "name": "Arjun Mehta", "email": "arjun@example.com", "phone": "+919876543210" },
  "booker_email": "arjun@example.com",
  "booker_phone": "+919876543210",
  "room_type_name": "4 Bed Mixed Dormitory x2",
  "room_number": "101",
  "checkin_date": "2026-04-05T00:00:00.000Z",
  "checkout_date": "2026-04-08T00:00:00.000Z",
  "no_of_guests": 2,
  "source": "APP",
  "status": "CONFIRMED",
  "is_active": true,
  "created_at": "2026-04-01T10:00:00.000Z",
  "guests": [
    {
      "guest": { "id": "uuid", "name": "Arjun Mehta", "email": "arjun@example.com", "phone": null },
      "role": "PRIMARY",
      "status": "APPROVED"
    }
  ],
  "slots": [
    {
      "slot_number": 1,
      "label": "Guest 1",
      "guest": { "id": "uuid", "name": "Arjun Mehta" },
      "kyc_status": "VERIFIED"
    },
    {
      "slot_number": 2,
      "label": "Guest 2",
      "guest": null,
      "kyc_status": "NOT_STARTED"
    }
  ],
  "payments": [
    {
      "id": "uuid",
      "amount": 3000,
      "currency": "INR",
      "purpose": "booking",
      "status": "CAPTURED",
      "razorpay_order_id": "order_xyz123",
      "razorpay_payment_id": "pay_abc456",
      "created_at": "2026-04-01T10:05:00.000Z",
      "updated_at": "2026-04-01T10:06:00.000Z"
    }
  ],
  "addon_orders": [
    {
      "id": "uuid",
      "phase": "BOOKING",
      "status": "PAID",
      "created_at": "2026-04-01T10:00:00.000Z",
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
| 403 | Non-owner viewing another property's booking |

---

## 3. Flush Room Cache

**DELETE** `/admin/bookings/cache/rooms?property_id=<id>`

Invalidates the room catalog Redis cache for a property. Use after adding room types or after eZee room config changes so the next guest catalog request fetches fresh data.

**Permission**: `bookings.view`

**Response (200)**:
```json
{ "cleared": true, "message": "Room cache cleared for property 60765" }
```

---

## 4. Trigger Reconciliation

**POST** `/admin/bookings/trigger-reconcile`

Immediately runs the full eZee reconciliation pass — detects status drift (check-in, check-out, cancellation, room number changes) and provisions MyGate lock PINs for newly checked-in guests.

**Auth**: Admin JWT (`bookings.view`)

**No request body required.**

**Response (200)**:
```json
{ "ok": true, "message": "Reconciliation complete" }
```

**When to use**:
- After marking a booking as "Checked In" in eZee, to immediately provision the room PIN without waiting 15 minutes.
- After bulk-updating bookings in eZee (status changes, room assignments).
- During development / testing.

**What it runs** (in order):
1. Unsynced new bookings → queues `InsertBooking` to eZee
2. State drift (Cancelled / Checked In / Checked Out in eZee) → updates our DB; on check-in, provisions MyGate PIN + sends guest email
3. External bookings (OTA / walk-in) → ingests new eZee reservations into cache, matches existing TDS guests

**Errors**:

| Status | Scenario |
|--------|----------|
| 401 | Missing or invalid JWT |
| 403 | Insufficient permissions |

> This endpoint is synchronous — it awaits the full reconciliation pass before returning. Expect 5–30s response time depending on the number of active bookings.

---

## Booking Lifecycle (read-only from admin side)

All state transitions happen in eZee. The reconciliation service syncs them back:

| eZee Action | Our DB (after reconciliation) | Delay |
|-------------|-------------------------------|-------|
| Guest books via app | `CONFIRMED`, `is_active=true` | Immediate (SQS worker) |
| Staff cancels in eZee | `CANCELLED`, `is_active=false` | ≤ 15 min (or instant via trigger-reconcile) |
| Staff checks in guest | `CHECKED_IN` + MyGate PIN provisioned + email sent | ≤ 15 min (or instant via trigger-reconcile) |
| Staff checks out guest | `CHECKED_OUT`, `is_active=false` | ≤ 15 min (or instant via trigger-reconcile) |
| Staff marks no-show | `NO_SHOW`, `is_active=false` | ≤ 15 min (or instant via trigger-reconcile) |
| Staff assigns/changes room | `room_number` updated | ≤ 15 min (or instant via trigger-reconcile) |

Reconciliation runs on app startup and every 15 minutes. Trigger manually via `POST /admin/bookings/trigger-reconcile`.
