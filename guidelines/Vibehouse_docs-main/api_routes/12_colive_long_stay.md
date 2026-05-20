# Colive (Long-Stay) API Routes

> Base URL: `http://localhost:8080` (dev) | Production TDS API URL
>
> All colive routes are under the `/guest/colive` prefix.
> Payment routes for colive are under the existing `/payment` prefix.

---

## Overview

The **Colive module** handles monthly long-stay bookings — a flow entirely separate from the nightly booking engine. eZee PMS remains the single source of truth; all confirmed bookings are synced via the existing SQS → EzeeSyncWorker pipeline.

### Booking Reference Format
`TDS-CL-YYYYMM-XXXX` — e.g. `TDS-CL-202605-A3F7`

### Pricing Logic
- Nightly rate fetched live from **eZee RoomList API**
- `monthly_price = rate_per_night × 30`
- `total = monthly_price × duration_months`
- **GST: 5%** applied on room + addons (SGST 2.5% + CGST 2.5%)
- No security deposit

### Quote TTL
Quotes expire after **30 minutes**. Frontend must create a draft booking before expiry.

### Auth Flow
| Endpoint | Auth Required |
|---|---|
| `POST /guest/colive/search` | ❌ Public |
| `GET /guest/colive/properties/:id` | ❌ Public |
| `GET /guest/colive/properties/:id/addons` | ❌ Public |
| `POST /guest/colive/quote` | ✅ Guest JWT |
| `POST /guest/colive/draft-booking` | ✅ Guest JWT |
| `GET /guest/colive/bookings/:id` | ✅ Guest JWT |
| `POST /payment/create-colive-order` | ✅ Guest JWT |
| `POST /payment/verify-colive` | ✅ Guest JWT |

---

## 1. POST `/guest/colive/search`

Search available co-living properties by city, move-in date, duration, and stay type. Returns property cards with live pricing fetched from eZee.

**Auth**: Not required

**Request**:
```json
{
  "location_id": "cloc-bangalore-001",
  "location_slug": "bangalore",
  "move_in_date": "2026-05-01",
  "duration_months": 3,
  "stay_type": "solo",
  "guest_count": 1,
  "selected_plan_id": "cplan-workation-001",
  "currency": "INR"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `location_slug` | string | Yes | e.g. `bangalore`, `mumbai` |
| `move_in_date` | YYYY-MM-DD | Yes | Desired move-in date |
| `duration_months` | integer | Yes | Min: 1, Max: 12 |
| `stay_type` | enum | No | `solo`, `couple`, `remote` — filters room options |
| `location_id` | string | No | UUID of the location |
| `guest_count` | integer | No | Default: 1 |
| `selected_plan_id` | string | No | Colive plan filter |
| `currency` | string | No | Default: `INR` |

**Response** (200):
```json
{
  "search_id": "f47ac10b-...",
  "location": {
    "id": "cloc-bangalore-001",
    "slug": "bangalore",
    "label": "Bangalore"
  },
  "move_in_date": "2026-05-01",
  "duration_months": 3,
  "stay_type": "solo",
  "properties": [
    {
      "property_id": "60765",
      "slug": "tds-koramangala-a",
      "name": "The Daily Social - Koramangala A",
      "city_label": "Bangalore",
      "microcopy": "Your Bangalore base camp",
      "hero_image_url": "https://assets.thedailysocial.in/colive/ka-hero.jpg",
      "price_from_monthly": 20970,
      "strike_price_from_monthly": 24990,
      "rating": 4.9,
      "rating_label": "Exceptional",
      "primary_tag": "Startup Hub",
      "secondary_tag": "Remote Ready",
      "amenities": ["1Gbps WiFi", "Dedicated Coworking", "AC Rooms"],
      "inventory_state": "available",
      "inventory_message": null,
      "recommended_for": ["remote", "solo", "couple"]
    }
  ]
}
```

**Notes**:
- Search session is **persisted** to `colive_search_sessions` for analytics (fire-and-forget, non-blocking)
- eZee pricing is **cached in Redis for 30 minutes** per `property × checkin × checkout`
- `stay_type: "couple"` filters out rooms where `max_guests < 2`
- `inventory_state`: `available` | `limited` (≤2 units) | `sold_out`

---

## 2. GET `/guest/colive/properties/:property_id`

Full property detail page — room options with live pricing, gallery, benefits, social proof stories, and checkout notes.

**Auth**: Not required

**Query Params**:

| Param | Type | Required | Example |
|---|---|---|---|
| `move_in_date` | YYYY-MM-DD | Yes | `2026-05-01` |
| `duration_months` | integer | No | `3` (default: 1) |
| `stay_type` | string | No | `solo` (default: `solo`) |

**Example**:
```
GET /guest/colive/properties/60765?move_in_date=2026-05-01&duration_months=3&stay_type=solo
```

**Response** (200):
```json
{
  "property_id": "60765",
  "slug": "tds-koramangala-a",
  "name": "The Daily Social - Koramangala A",
  "city_label": "Bangalore",
  "headline": "Live in the heart of Koramangala",
  "subheadline": "Where Bangalore's startup energy meets a home you'll love.",
  "description": "...",
  "hero_gallery": {
    "main_image_url": "https://assets.thedailysocial.in/colive/ka-hero.jpg",
    "supporting_image_urls": ["...", "..."],
    "gallery_count": 18
  },
  "tags": { "primary": "Startup Hub", "secondary": "Remote Ready" },
  "benefits": [
    { "id": "b1", "icon": "wifi", "title": "1Gbps Fibre", "description": "Zero downtime, Zoom-ready" }
  ],
  "room_options": [
    {
      "room_type_id": "rt-ka-queen",
      "slug": "private-room",
      "name": "Private Room",
      "description": "...",
      "monthly_price": 74970,
      "strike_monthly_price": 89970,
      "available_units": 8,
      "inventory_message": null,
      "feature_points": ["Queen-size bed", "En-suite bathroom", "Work desk + chair"],
      "max_guests": 2,
      "recommended_for": ["couple", "remote"],
      "thumbnail_url": "..."
    },
    {
      "room_type_id": "rt-ka-4dorm",
      "slug": "4-bed-dorm",
      "name": "4-Bed Mixed Dorm",
      "monthly_price": 20970,
      "available_units": 24,
      "feature_points": ["Privacy curtain", "Personal locker", "Reading light"]
    }
  ],
  "stories": [
    {
      "id": "s1",
      "name": "Rohan M.",
      "occupation": "SDE-2 @ Swiggy",
      "quote": "Best flat-hunting decision of my life.",
      "duration": "4 months",
      "stay_type": "solo"
    }
  ],
  "pricing_defaults": {
    "move_in_date": "2026-05-01",
    "duration_months": 3,
    "stay_type": "solo"
  },
  "checkout_notes": [
    "Check-out by 11:00 AM on the last day of your stay"
  ]
}
```

**Notes**:
- `monthly_price = eZee_rate_per_night × 30` (live from eZee)
- `strike_monthly_price = db_base_price_per_night × 30` (from room_types table)
- Room options filtered by `stay_type` (couples only see rooms with `max_guests ≥ 2`)

---

## 3. GET `/guest/colive/properties/:property_id/addons`

Fetch the add-on catalog for the checkout step. Includes meals, laundry, coworking desk, airport pickup, etc.

**Auth**: Not required

**Query Params**:

| Param | Type | Required | Notes |
|---|---|---|---|
| `duration_months` | integer | No | Used for frontend price calculation display |

**Response** (200):
```json
{
  "property_id": "60765",
  "addons": [
    {
      "addon_id": "cadd-tds-ka-meals3xday",
      "slug": "meals-3x-day",
      "name": "Meals Plan (3x/day)",
      "description": "Breakfast, lunch, and dinner from our in-house chef.",
      "pricing_model": "per_month",
      "unit_price": 7000,
      "currency": "INR",
      "max_quantity": 1,
      "default_quantity": 0,
      "is_available": true,
      "availability_message": null,
      "category": "meals",
      "icon_hint": "utensils"
    },
    {
      "addon_id": "cadd-tds-ka-bikerental",
      "slug": "bike-rental",
      "name": "Bike Rental (E-Scooter)",
      "pricing_model": "per_month",
      "unit_price": 3500,
      "is_available": false,
      "availability_message": "Coming soon — join the waitlist"
    }
  ]
}
```

**Pricing models**:
- `per_month` — multiply by `duration_months` for the total cost
- `one_time` — flat charge regardless of duration

---

## 4. POST `/guest/colive/quote`

Compute a fully-priced quote from live eZee rates + selected add-ons. Quote is persisted for 30 minutes and referenced at draft-booking creation.

**Auth**: ✅ Guest JWT required

**Request**:
```json
{
  "property_id": "60765",
  "room_type_id": "rt-ka-4dorm",
  "move_in_date": "2026-05-01",
  "duration_months": 3,
  "stay_type": "solo",
  "addons": [
    { "addon_id": "cadd-tds-ka-meals3xday", "quantity": 1 },
    { "addon_id": "cadd-tds-ka-laundryplan", "quantity": 1 }
  ],
  "coupon_code": null
}
```

**Response** (200):
```json
{
  "quote_id": "a3c7f810-...",
  "currency": "INR",
  "room": {
    "room_type_id": "rt-ka-4dorm",
    "name": "4-Bed Mixed Dorm",
    "monthly_price": 20970,
    "strike_monthly_price": 23970,
    "duration_months": 3,
    "line_total": 62910
  },
  "addons": [
    {
      "addon_id": "cadd-tds-ka-meals3xday",
      "name": "Meals Plan (3x/day)",
      "quantity": 1,
      "unit_price": 7000,
      "pricing_model": "per_month",
      "line_total": 21000
    },
    {
      "addon_id": "cadd-tds-ka-laundryplan",
      "name": "Laundry Plan",
      "quantity": 1,
      "unit_price": 1500,
      "pricing_model": "per_month",
      "line_total": 4500
    }
  ],
  "included_items": [
    { "id": "wifi", "label": "High-Speed WiFi", "type": "included", "display_value": "Included" },
    { "id": "housekeeping", "label": "Weekly Housekeeping", "type": "included", "display_value": "Included" },
    { "id": "deposit", "label": "Security Deposit", "type": "included", "display_value": "₹0" }
  ],
  "charges": {
    "room_subtotal": 62910,
    "addon_subtotal": 25500,
    "discount_total": 0,
    "deposit_total": 0,
    "tax_total": 4421,
    "grand_total": 92831
  },
  "savings": {
    "monthly_savings": 3000,
    "total_savings": 9000
  },
  "pricing_notes": [
    "Pricing includes 92 nights (3 months)",
    "GST @ 5% applied on room + addons",
    "No security deposit required"
  ]
}
```

**Error Responses**:
| Code | Reason |
|---|---|
| 404 | Property or room type not found |
| 400 | Pricing unavailable from eZee (falls back to DB base price) |

**Notes**:
- `quote_id` must be passed to `/draft-booking`
- Quote expires in **30 minutes** — if expired, a `410 Gone` is returned at draft-booking
- Rate fetched from eZee; falls back to `room_types.base_price_per_night` if eZee is down

---

## 5. POST `/guest/colive/draft-booking`

Creates a draft booking record before payment. Validates quote freshness, room availability, and all addon availability. Returns a `draft_booking_id` to pass to the payment flow.

**Auth**: ✅ Guest JWT required

**Request**:
```json
{
  "quote_id": "a3c7f810-...",
  "property_id": "60765",
  "room_type_id": "rt-ka-4dorm",
  "move_in_date": "2026-05-01",
  "duration_months": 3,
  "stay_type": "solo",
  "guest_details": {
    "first_name": "Rohan",
    "last_name": "Mehta",
    "email": "rohan@example.com",
    "phone": "+919876543210"
  },
  "addons": [
    { "addon_id": "cadd-tds-ka-meals3xday", "quantity": 1 },
    { "addon_id": "cadd-tds-ka-laundryplan", "quantity": 1 }
  ],
  "source": "web_colive_flow",
  "notes": null
}
```

**Response** (201):
```json
{
  "draft_booking_id": "b91f2c3d-...",
  "property_id": "60765",
  "property_name": "The Daily Social - Koramangala A",
  "room_type_id": "rt-ka-4dorm",
  "room_type_name": "4-Bed Mixed Dorm",
  "move_in_date": "2026-05-01",
  "duration_months": 3,
  "estimated_checkout_date": "2026-08-01",
  "status": "draft",
  "guest_details": {
    "first_name": "Rohan",
    "last_name": "Mehta",
    "email": "rohan@example.com",
    "phone": "+919876543210"
  },
  "addons": [
    { "addon_id": "...", "name": "Meals Plan (3x/day)", "quantity": 1, "line_total": 21000 }
  ],
  "charges": {
    "room_subtotal": 62910,
    "addon_subtotal": 25500,
    "tax_total": 4421,
    "grand_total": 92831
  }
}
```

**Error Responses**:
| Code | Reason |
|---|---|
| 404 | Quote or room option not found |
| 410 | Quote has expired — request a new quote |
| 400 | Addon unavailable or quantity exceeds maximum |

**Draft booking lifecycle**:
```
draft → pending_payment → confirmed
                       ↘ failed (payment failed)
```

---

## 6. POST `/payment/create-colive-order`

Creates a Razorpay payment order for a colive draft booking. Updates draft status to `pending_payment`.

**Auth**: ✅ Guest JWT required

**Request**:
```json
{
  "draft_booking_id": "b91f2c3d-...",
  "grand_total": 92831,
  "currency": "INR"
}
```

**Response** (201):
```json
{
  "payment_order_id": "order_Rz...",
  "razorpay_order_id": "order_Rz...",
  "razorpay_key": "rzp_test_...",
  "amount": 92831,
  "amount_paise": 9283100,
  "currency": "INR",
  "draft_booking_id": "b91f2c3d-...",
  "booking_reference": "TDS-CL-202605-A3F7",
  "guest": {
    "name": "Rohan Mehta",
    "email": "rohan@example.com",
    "phone": "+919876543210"
  }
}
```

**Notes**:
- Pass `razorpay_order_id` + `razorpay_key` directly to the Razorpay checkout JS SDK
- `amount_paise` is the value to pass to Razorpay (in paise)

---

## 7. POST `/payment/verify-colive`

Verifies the Razorpay HMAC signature after payment completes. On success:
1. Marks draft booking as `confirmed`
2. Queues an eZee `InsertBooking` → `ProcessBooking` → `AddPayment` sync via SQS
3. Returns onboarding info for the confirmation screen

**Auth**: ✅ Guest JWT required

**Request**:
```json
{
  "draft_booking_id": "b91f2c3d-...",
  "razorpay_order_id": "order_Rz...",
  "razorpay_payment_id": "pay_Rz...",
  "razorpay_signature": "abc123..."
}
```

**Response** (200):
```json
{
  "message": "Colive booking confirmed",
  "booking_id": "b91f2c3d-...",
  "booking_reference": "TDS-CL-202605-A3F7",
  "status": "confirmed",
  "payment_id": "pay-record-uuid",
  "total_paid": 92831,
  "currency": "INR"
}
```

**Error Responses**:
| Code | Reason |
|---|---|
| 400 | Invalid Razorpay signature |
| 400 | Razorpay order ID mismatch |
| 404 | Draft booking not found |

**What happens after confirmation**:
```
verify-colive (HTTP 200)
    │
    ├─► DB: colive_draft_bookings.status = "confirmed"
    │
    ├─► SQS: INSERT_COLIVE_BOOKING message queued
    │         │
    │         └─► EzeeSyncWorker (async):
    │               InsertBooking → ProcessBooking → AddPayment
    │               Updates: ezee_reservation_no, ezee_sync_status = SYNCED
    │
    └─► SQS: COLIVE_BOOKING_CONFIRMED audit log
```

---

## 8. GET `/guest/colive/bookings/:booking_id`

Confirmation and booking detail screen. Returns onboarding links, next steps, and full stay summary.

**Auth**: ✅ Guest JWT required (must be the booking owner)

**Response** (200):
```json
{
  "booking_id": "b91f2c3d-...",
  "booking_reference": "TDS-CL-202605-A3F7",
  "status": "confirmed",
  "property": {
    "property_id": "60765",
    "name": "The Daily Social - Koramangala A",
    "city_label": "Bangalore"
  },
  "stay": {
    "move_in_date": "2026-05-01",
    "duration_months": 3,
    "checkout_date_estimated": "2026-08-01",
    "stay_type": "solo"
  },
  "room": {
    "room_type_id": "rt-ka-4dorm",
    "name": "4-Bed Mixed Dorm"
  },
  "guest_details": {
    "first_name": "Rohan",
    "last_name": "Mehta",
    "email": "rohan@example.com",
    "phone": "+919876543210"
  },
  "addons": [
    { "addon_id": "...", "name": "Meals Plan (3x/day)", "quantity": 1, "line_total": 21000 }
  ],
  "charges": {
    "room_subtotal": 62910,
    "addon_subtotal": 25500,
    "tax_total": 4421,
    "grand_total": 92831
  },
  "onboarding": {
    "whatsapp_url": "https://wa.me/919999999999",
    "events_url": "https://thedailysocial.in/events",
    "community_name": "The Daily Social Community",
    "next_steps": [
      "Complete your KYC before move-in",
      "Join The Daily Social WhatsApp community",
      "Download The Daily Social app for room access and services"
    ]
  }
}
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `colive_locations` | City lookup (Bangalore, Mumbai) |
| `colive_plans` | Lifestyle plan tags (workation, budget, private) |
| `colive_property_content` | Rich marketing content per property |
| `colive_room_options` | Room option cards shown in search + detail |
| `colive_addons` | Add-on catalog per property |
| `colive_quotes` | Persisted quotes (30-min TTL) |
| `colive_draft_bookings` | Draft → confirmed booking lifecycle |
| `colive_search_sessions` | Analytics: search sessions |

---

## Colive vs Nightly Booking — Key Differences

| | Nightly Booking | Colive (Long-Stay) |
|---|---|---|
| **Duration** | 1–30 nights | 1–12 months |
| **Booking ref** | `TDS-CITY-TIMESTAMP-RAND` | `TDS-CL-YYYYMM-RAND` |
| **Pricing source** | eZee (nightly rate) | eZee (nightly × 30 × months) |
| **Payment flow** | `/booking/create-order` → `/payment/verify` | `/colive/draft-booking` → `/payment/create-colive-order` → `/payment/verify-colive` |
| **Guest storage** | `ezee_booking_cache` | `colive_draft_bookings` |
| **Addons** | `product_catalog` (physical/service) | `colive_addons` (monthly plans) |
| **GST** | 5% | 5% |
| **Security deposit** | Per property config | ₹0 (always) |
| **eZee sync** | `INSERT_BOOKING` SQS message | `INSERT_COLIVE_BOOKING` SQS message |
