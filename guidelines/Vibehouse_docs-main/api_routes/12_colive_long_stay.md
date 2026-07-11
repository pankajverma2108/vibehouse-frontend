# Colive (Long-Stay) API Routes

> **Base URL (prod)**: `https://api.thedailysocial.co.in`  
> **Base URL (dev)**: `http://localhost:8080`  
>
> All colive routes are under the `/guest/colive` prefix.  
> Payment routes are under the existing `/payment` prefix.

---

## Overview

The **Colive module** handles monthly long-stay bookings — a flow entirely separate from the nightly booking engine. eZee PMS remains the single source of truth; all confirmed bookings are synced via the existing SQS → EzeeSyncWorker pipeline.

### Booking Reference Format
`TDS-CL-YYYYMM-XXXX` — e.g. `TDS-CL-202605-A3F7`

---

## Pricing Formula

Colive uses a **hybrid monthly + daily** formula, not a simple nightly multiplication.

```
months        = floor(duration_days / 30)
remaining     = duration_days % 30

room_total    = months × colive_price_month
              + remaining × eZee_rate_per_night
```

**Examples** (using 4 Bed Dorm: `colive_price_month = ₹14,999`, eZee `ratePerNight = ₹999`):

| duration_days | Months | Extra Days | Room Total (pre-GST) |
|---|---|---|---|
| 30 | 1 | 0 | 1 × ₹14,999 = **₹14,999** |
| 45 | 1 | 15 | ₹14,999 + 15 × ₹999 = **₹29,984** |
| 60 | 2 | 0 | 2 × ₹14,999 = **₹29,998** |
| 90 | 3 | 0 | 3 × ₹14,999 = **₹44,997** |

**Key rules:**
- `colive_price_month` is set per room type in the `room_types` DB table (managed via admin endpoint)
- If `colive_price_month` is null → `400 Bad Request "Colive pricing not configured for this room type"`
- `eZee_rate_per_night` is fetched live from eZee for the stay window; falls back to `base_price_per_night` from DB
- `per_month` add-ons multiply by `months` (whole months only, not extra days)
- `one_time` add-ons are flat regardless of duration

### Configured Room Prices (Koramangala A)

| Room Type | colive_price_month (pre-GST) | MRP (eZee × 30) | Saving/month |
|---|---|---|---|
| 4 Bed Dormitory | ₹14,999 | ₹29,970 | ₹14,971 |
| 6 Bed Dormitory | ₹12,999 | ₹26,970 | ₹13,971 |
| Deluxe Room | ₹55,999 | ₹80,970 | ₹24,971 |

MRP = eZee nightly rate × 30 (what the guest would pay at short-stay rates).

### GST
- Rate: **5%** (SGST 2.5% + CGST 2.5%) applied on `room_total + addon_subtotal`
- No security deposit

### Quote TTL
Quotes expire after **30 minutes**. Frontend must create a draft booking before expiry.

---

## Auth Flow

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

> **Note**: The search UI uses `duration_months` for the browsing slider (UX stays in months). The quote/draft-booking step uses `duration_days` for exact pricing.

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
| `duration_months` | integer | Yes | Min: 1, Max: 12 — for search/display only |
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
      "price_from_monthly": 14999,
      "strike_price_from_monthly": 29970,
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
- `price_from_monthly` = lowest `colive_price_month` across active room options (or `ratePerNight × 30` if not configured)
- `strike_price_from_monthly` = `ratePerNight × 30` (short-stay MRP) — only present when it's higher than `price_from_monthly`
- Search session persisted to `colive_search_sessions` for analytics (fire-and-forget)
- eZee pricing cached in Redis for 30 minutes per `property × checkin × checkout`
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
      "room_type_id": "rt-ka-4dorm",
      "slug": "4-bed-dorm",
      "name": "4-Bed Mixed Dorm",
      "description": "...",
      "monthly_price": 14999,
      "strike_monthly_price": 29970,
      "available_units": 24,
      "inventory_message": null,
      "feature_points": ["Privacy curtain", "Personal locker", "Reading light"],
      "max_guests": 1,
      "recommended_for": ["solo"],
      "thumbnail_url": "..."
    },
    {
      "room_type_id": "rt-ka-deluxe",
      "slug": "deluxe-room",
      "name": "Deluxe Room",
      "monthly_price": 55999,
      "strike_monthly_price": 80970,
      "available_units": 4
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
- `monthly_price` = `colive_price_month` from DB (or `ratePerNight × 30` as fallback for unconfigured rooms)
- `strike_monthly_price` = `ratePerNight × 30` — shown only when higher than `monthly_price`

---

## 3. GET `/guest/colive/properties/:property_id/addons`

Fetch the add-on catalog for the checkout step.

**Auth**: Not required

**Query Params**:

| Param | Type | Required | Notes |
|---|---|---|---|
| `duration_months` | integer | No | Used for frontend display of monthly totals |

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
    }
  ]
}
```

**Pricing models**:
- `per_month` — `line_total = unit_price × quantity × months` (where `months = floor(duration_days / 30)`)
- `one_time` — `line_total = unit_price × quantity` (flat, regardless of duration)

---

## 4. POST `/guest/colive/quote`

Compute a fully-priced quote from the hybrid pricing formula. Quote is persisted for 30 minutes and referenced at draft-booking creation.

**Auth**: ✅ Guest JWT required

**Request**:
```json
{
  "property_id": "60765",
  "room_type_id": "rt-ka-4dorm",
  "move_in_date": "2026-05-01",
  "duration_days": 90,
  "stay_type": "solo",
  "addons": [
    { "addon_id": "cadd-tds-ka-meals3xday", "quantity": 1 }
  ],
  "coupon_code": null
}
```

| Field | Type | Validation | Notes |
|---|---|---|---|
| `property_id` | string | Required | |
| `room_type_id` | string | Required | |
| `move_in_date` | YYYY-MM-DD | Required | |
| `duration_days` | integer | Min: **30**, Max: 730 | Exact number of days — replaces old `duration_months` |
| `stay_type` | enum | Required | `solo` \| `couple` \| `remote` |
| `addons` | array | Required | Can be empty `[]` |
| `coupon_code` | string | Optional | |

**Response** (200):
```json
{
  "quote_id": "a3c7f810-...",
  "currency": "INR",
  "room": {
    "room_type_id": "rt-ka-4dorm",
    "name": "4-Bed Mixed Dorm",
    "colive_monthly_price": 14999,
    "strike_monthly_price": 29970,
    "duration_days": 90,
    "months": 3,
    "remaining_days": 0,
    "line_total": 44997
  },
  "addons": [
    {
      "addon_id": "cadd-tds-ka-meals3xday",
      "name": "Meals Plan (3x/day)",
      "quantity": 1,
      "unit_price": 7000,
      "pricing_model": "per_month",
      "line_total": 21000
    }
  ],
  "included_items": [
    { "id": "wifi", "label": "High-Speed WiFi", "type": "included", "display_value": "Included" },
    { "id": "housekeeping", "label": "Weekly Housekeeping", "type": "included", "display_value": "Included" },
    { "id": "deposit", "label": "Security Deposit", "type": "included", "display_value": "₹0" }
  ],
  "charges": {
    "room_subtotal": 44997,
    "addon_subtotal": 21000,
    "discount_total": 0,
    "deposit_total": 0,
    "tax_total": 3300,
    "grand_total": 69297
  },
  "savings": {
    "monthly_savings": 14971,
    "total_savings": 44913
  },
  "pricing_notes": [
    "Pricing includes 90 days (3 months)",
    "GST @ 5% applied on room + addons",
    "No security deposit required"
  ]
}
```

**Pricing note with extra days** (e.g. `duration_days: 45`):
```json
{
  "room": {
    "duration_days": 45,
    "months": 1,
    "remaining_days": 15,
    "line_total": 29984
  },
  "pricing_notes": [
    "Pricing includes 45 days (1 month + 15 days at ₹999/night)",
    ...
  ]
}
```

**Errors**:

| Code | Reason |
|---|---|
| 400 | `colive_price_month` not set for this room type |
| 404 | Property or room option not found |

**Notes**:
- `quote_id` must be passed to `/draft-booking`
- Quote expires in **30 minutes** — if expired, a `410 Gone` is returned at draft-booking
- `strike_monthly_price` omitted when not higher than `colive_monthly_price`
- Add-on `line_total` for `per_month` type = `unit_price × quantity × months` (extra days NOT charged for add-ons)

---

## 5. POST `/guest/colive/draft-booking`

Creates a draft booking record before payment. Validates quote freshness and all addon availability.

**Auth**: ✅ Guest JWT required

**Request**:
```json
{
  "quote_id": "a3c7f810-...",
  "property_id": "60765",
  "room_type_id": "rt-ka-4dorm",
  "move_in_date": "2026-05-01",
  "duration_days": 90,
  "stay_type": "solo",
  "guest_details": {
    "first_name": "Rohan",
    "last_name": "Mehta",
    "email": "rohan@example.com",
    "phone": "+919876543210"
  },
  "addons": [
    { "addon_id": "cadd-tds-ka-meals3xday", "quantity": 1 }
  ],
  "source": "web_colive_flow",
  "notes": null
}
```

| Field | Type | Validation | Notes |
|---|---|---|---|
| `duration_days` | integer | Min: **30**, Max: 730 | Must match quote's `duration_days` |

**Response** (201):
```json
{
  "draft_booking_id": "b91f2c3d-...",
  "booking_reference": "TDS-CL-202605-A3F7",
  "property_id": "60765",
  "property_name": "The Daily Social - Koramangala A",
  "room_type_id": "rt-ka-4dorm",
  "room_type_name": "4-Bed Mixed Dorm",
  "move_in_date": "2026-05-01",
  "duration_days": 90,
  "estimated_checkout_date": "2026-07-30",
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
    "room_subtotal": 44997,
    "addon_subtotal": 21000,
    "tax_total": 3300,
    "grand_total": 69297
  }
}
```

**Errors**:

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

Creates a Razorpay payment order for a colive draft booking.

**Auth**: ✅ Guest JWT required

**Request**:
```json
{
  "draft_booking_id": "b91f2c3d-...",
  "grand_total": 69297,
  "currency": "INR"
}
```

**Response** (201):
```json
{
  "payment_order_id": "order_Rz...",
  "razorpay_order_id": "order_Rz...",
  "razorpay_key": "rzp_test_...",
  "amount": 69297,
  "amount_paise": 6929700,
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

---

## 7. POST `/payment/verify-colive`

Verifies the Razorpay HMAC signature after payment completes. On success, confirms the booking and queues eZee sync.

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
  "total_paid": 69297,
  "currency": "INR"
}
```

**Errors**:

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

Booking detail and confirmation screen.

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
    "duration_days": 90,
    "checkout_date_estimated": "2026-07-30",
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
    "room_subtotal": 44997,
    "addon_subtotal": 21000,
    "tax_total": 3300,
    "grand_total": 69297
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

## Admin: Manage Colive Prices

Room monthly prices are set via the admin API. Required permission: `colive.price_manage` (owner and manager roles only).

### GET `/admin/room-types?property_id=60765`

Lists all room types with their current `colive_price_month`.

### PATCH `/admin/room-types/:room_type_id/colive-price`

**Request**:
```json
{ "colive_price_month": 14999 }
```

**Response** (200):
```json
{
  "id": "rt-ka-4dorm",
  "name": "4-Bed Mixed Dorm",
  "slug": "4-bed-mixed-dorm",
  "colive_price_month": 14999
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
| `colive_quotes` | Persisted quotes (30-min TTL) — stores `duration_days` |
| `colive_draft_bookings` | Draft → confirmed booking lifecycle — stores `duration_days` |
| `colive_search_sessions` | Analytics: search sessions — stores `duration_months` (search UI unit) |
| `room_types` | Includes `colive_price_month` (decimal, nullable) |

---

## Colive vs Nightly Booking — Key Differences

| | Nightly Booking | Colive (Long-Stay) |
|---|---|---|
| **Duration field** | `no_of_nights` (integer) | `duration_days` (integer, min 30) |
| **Min stay** | 1 night | 30 days |
| **Booking ref** | `TDS-CITY-TIMESTAMP-RAND` | `TDS-CL-YYYYMM-RAND` |
| **Room pricing** | `rate × nights` (flat nightly) | `months × colive_price_month + extra_days × ratePerNight` |
| **Addon pricing** | Per-unit at checkout | `per_month` × whole months OR `one_time` flat |
| **Payment flow** | `/booking/create-order` → `/payment/verify` | `/colive/draft-booking` → `/payment/create-colive-order` → `/payment/verify-colive` |
| **Guest storage** | `ezee_booking_cache` | `colive_draft_bookings` |
| **Addons** | `product_catalog` (physical/service) | `colive_addons` (monthly plans) |
| **GST** | 5% | 5% |
| **Security deposit** | Per property config | ₹0 (always) |
| **eZee sync** | `INSERT_BOOKING` SQS message | `INSERT_COLIVE_BOOKING` SQS message |
