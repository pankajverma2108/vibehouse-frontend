# Frontend Booking Flow

> **Last updated**: 2026-04-01
> **Base URL**: `https://vibehousebackend-production.up.railway.app`
> **Auth**: Guest JWT — obtained from login/signup, passed as `Authorization: Bearer <token>`

---

## Overview

```
Step 1  Browse rooms            GET  /guest/booking/rooms          (no auth)
Step 2  Select rooms            (UI only — no API call)
Step 3  Enter guest details     (UI only — collect names per bed)
Step 4  Create booking order    POST /guest/booking/create-order   (auth required)
Step 5  Open Razorpay checkout  POST /payment/create-booking-order (auth required)
Step 6  Payment result          Razorpay SDK callback / webhook
Step 7  Confirmation screen     Show ERI, sync status
```

---

## Step 1 — Browse Rooms

**Endpoint**: `GET /guest/booking/rooms`

**Query params**:
| Param | Type | Example |
|---|---|---|
| `property_id` | string | `60765` |
| `checkin` | YYYY-MM-DD | `2026-04-10` |
| `checkout` | YYYY-MM-DD | `2026-04-11` |

**No auth needed.**

**Response**:
```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-10",
  "checkout_date": "2026-04-11",
  "no_of_nights": 1,
  "room_types": [
    {
      "id": "6076500000000000001",
      "name": "Bed in Dormitory",
      "available_beds": 23,
      "base_price_per_night": 500,
      "total_price": 500,
      "ezee_room_type_id": "6076500000000000001",
      "ezee_rate_plan_id": "6076500000000000001",
      "ezee_rate_type_id": "6076500000000000001"
    },
    {
      "id": "6076500000000000002",
      "name": "Deluxe",
      "available_beds": 15,
      "base_price_per_night": 1500,
      "total_price": 1500,
      "ezee_room_type_id": "6076500000000000002",
      "ezee_rate_plan_id": "6076500000000000002",
      "ezee_rate_type_id": "6076500000000000001"
    }
  ]
}
```

**UI notes**:
- Data comes directly from eZee PMS, cached 30 min in Redis.
- `available_beds = 0` means that date is fully booked — disable that room type.
- Use `id` as the `room_type_id` when creating the order.

---

## Step 2 — Room Selection (UI only)

Allow the guest to pick one or more room types and quantities.

**Validation**:
- Quantity cannot exceed `available_beds`.
- Minimum 1 bed total.
- Total price = sum of `total_price × quantity` for each selection.

**State to build**:
```ts
selectedRooms: [
  { room_type_id: "6076500000000000001", quantity: 2, name: "Bed in Dormitory", price_per_night: 500 }
]
```

---

## Step 3 — Guest Details Collection (UI only)

**Show this screen before payment.** For each bed selected, collect the occupant's name. The first slot is pre-filled from the logged-in guest's account.

### Example: Guest books 2 dormitory beds

Show a form with 2 slots:
```
Bed 1 (You)
  First name: [Arjun]      ← pre-filled from account
  Last name:  [Mehta]      ← pre-filled from account
  Gender:     [Male ▼]

Bed 2 (Guest)
  First name: [_______]    ← required input
  Last name:  [_______]    ← required input
  Gender:     [Male ▼]     ← default Male
```

**Rules**:
- Slot 1 = primary booker (pre-filled, still editable).
- Slots 2..N = companions — all fields required before proceeding.
- For private rooms (Deluxe etc.) — one slot per room.
- Gender options: `Male`, `Female`, `Other`.

**State to build** (map to rooms array):
```ts
selectedRooms: [
  {
    room_type_id: "6076500000000000001",
    quantity: 2,
    guests: [
      { first_name: "Arjun",  last_name: "Mehta",  gender: "Male" },
      { first_name: "Vatsal", last_name: "Shah",   gender: "Male" }
    ]
  }
]
```

---

## Step 4 — Create Booking Order

**Endpoint**: `POST /guest/booking/create-order`
**Auth**: Required (Bearer token)

**Request**:
```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-10",
  "checkout_date": "2026-04-11",
  "rooms": [
    {
      "room_type_id": "6076500000000000001",
      "quantity": 2,
      "guests": [
        { "first_name": "Arjun",  "last_name": "Mehta",  "gender": "Male" },
        { "first_name": "Vatsal", "last_name": "Shah",   "gender": "Male" }
      ]
    }
  ],
  "addons": []
}
```

**Notes**:
- `guests` array length must match `quantity` — validation enforced on backend.
- `guests` is optional — if omitted, booker's name is used for all beds (same as before).
- `addons` is optional.

**Response** (201 Created):
```json
{
  "ezee_reservation_id": "VH-BANDRA-XXXXXXXX-XXXX",
  "property_name": "Vibe House Bandra",
  "checkin_date": "2026-04-10",
  "checkout_date": "2026-04-11",
  "no_of_nights": 1,
  "total_guests": 2,
  "rooms": [
    {
      "room_type_id": "6076500000000000001",
      "room_type_name": "Bed in Dormitory",
      "quantity": 2,
      "price_per_night": 500,
      "line_total": 1000
    }
  ],
  "grand_total": 1000,
  "status": "PENDING_PAYMENT"
}
```

**Save**: `ezee_reservation_id` and `grand_total` for the next step.

---

## Step 5 — Create Payment Order (Razorpay)

**Endpoint**: `POST /payment/create-booking-order`
**Auth**: Required

> ⚠️ Do NOT use `/payment/create-order` — that endpoint is for in-stay addon orders only.

**Request**:
```json
{
  "ezee_reservation_id": "VH-BANDRA-XXXXXXXX-XXXX",
  "grand_total": 1000
}
```

**Response**:
```json
{
  "razorpay_order_id": "order_XXXXXXXXXX",
  "razorpay_key": "rzp_test_STOjwD1NfPXHSa",
  "amount": 1000,
  "amount_paise": 100000,
  "currency": "INR"
}
```

---

## Step 6 — Razorpay Checkout

Open the Razorpay SDK with the order details. In production, the webhook handles confirmation automatically. For dev testing only, use the simulate endpoint.

### Production (Razorpay SDK)
```js
const options = {
  key: razorpay_key,
  amount: amount_paise,
  currency: "INR",
  order_id: razorpay_order_id,
  handler: function(response) {
    // Payment succeeded — show confirmation screen
    // Webhook has already confirmed the booking server-side
    navigateTo(`/booking/confirmed?eri=${ezee_reservation_id}`);
  },
  prefill: {
    name: guestName,
    email: guestEmail,
    contact: guestPhone,
  }
};
const rzp = new Razorpay(options);
rzp.open();
```

### Dev only — Simulate capture
```
POST /payment/dev/simulate-capture
{ "razorpay_order_id": "order_XXXXXXXXXX" }
```

Expected response: `"message": "Booking confirmed, payment captured"`

---

## Step 7 — Confirmation Screen

After payment, show a confirmation screen. The eZee sync runs in the background (~15–30s).

**Display immediately** (from create-order response):
- Booking reference: `VH-BANDRA-XXXXXXXX-XXXX`
- Property, dates, room type, guest names
- Amount paid

**Poll for room assignment** (optional UX enhancement):
```
GET /admin/bookings/:ezee_reservation_id
```
When `room_number` is populated, show the assigned bed number.

---

## Error Handling

| Error | Message | Action |
|---|---|---|
| `400` `available_beds: 0` | Room fully booked for those dates | Show "Sold out" on that room card |
| `400` guests length mismatch | guests array must match quantity | Frontend validation — should never reach API |
| `401` Unauthorized | Token expired | Re-login and retry |
| `404` Room type not found | Stale eZee room type ID | Refresh room list (cache may be stale) |
| `400` Bad request (create-order) | Validation error | Show field-level error |

---

## Important: Two Different Payment Endpoints

| Endpoint | Use for |
|---|---|
| `POST /payment/create-booking-order` | Initial room booking payment |
| `POST /payment/create-order` | In-stay addon purchases (food, products) |

Mixing these up will result in payment going through but the booking staying `PENDING_PAYMENT`.

---

## eZee Sync (Background — no frontend action needed)

After `simulate-capture` or the Razorpay webhook fires:
1. Booking status → `CONFIRMED`
2. SQS message sent to `vibehouse-ezee-sync.fifo`
3. Worker runs in ~15–30s:
   - InsertBooking → creates reservation in eZee with correct guest names per bed
   - ProcessBooking → confirms it
   - RoomAvailability + AssignRoom → assigns physical bed numbers
   - AddPayment → records payment in eZee folio
4. `ezee_reservation_no` and `room_number` populated in DB

Each guest now gets their own named sub-reservation in eZee (e.g. `30-1 Arjun Mehta`, `30-2 Vatsal Shah`).
