# Backend API Handoff — Booking Receipt Endpoint

**Requested by:** Frontend team  
**Feature:** Download Receipt button on `booking-confirmed-page.tsx`  
**Date:** May 2026  
**Status:** 🟡 API stub designed — awaiting backend implementation

---

## Overview

The frontend has a **"Download Receipt"** button on the Room Info card of the booking confirmation page. When clicked, it:

1. Calls `GET /guest/booking/receipt/:ezeeReservationId`
2. Receives a JSON payload (`BookingReceiptData`)
3. Generates a styled A4 PDF in-browser using `@react-pdf/renderer`
4. Auto-downloads the file as `receipt-<booking_id>.pdf`

The frontend is fully wired and API-ready. This document describes the contract the backend team must satisfy.

---

## Endpoint Specification

### `GET /guest/booking/receipt/:ezeeReservationId`

| Field | Value |
|-------|-------|
| Method | `GET` |
| Auth | Bearer token (guest JWT — same as all other `/guest/*` endpoints) |
| Path param | `ezeeReservationId` — the eZee reservation ID from the booking |
| Content-Type | `application/json` |
| Base URL | `https://api.thedailysocial.co.in` (from `NEXT_PUBLIC_API_BASE_URL`) |

**Full request example:**
```
GET /guest/booking/receipt/RES-8XJ23K
Authorization: Bearer <guest_jwt>
Accept: application/json
```

---

## Expected Response

### `200 OK`

```json
{
  "booking_id": "8XJ23K",
  "confirmation_code": "Z9L2P",
  "ezee_reservation_id": "RES-8XJ23K",
  "booking_date": "2026-09-14T10:30:00Z",

  "property_name": "The Daily Social",
  "property_address": "13/14, Bank Officer Housing Co-operative Society, Bengaluru Urban, Karnataka, India",
  "property_email": "thedailysocial01@gmail.com",
  "property_phone": "+91 88849 73328",

  "guest_name": "Adam Smith",
  "guest_email": "adam.smith@example.com",
  "guest_phone": "+91 98765 43210",

  "checkin_date": "2026-10-12",
  "checkout_date": "2026-11-12",
  "checkin_time": "14:00",
  "checkout_time": "11:00",
  "no_of_nights": 30,
  "no_of_guests": 1,
  "room_type_name": "4-Bed Mixed Dorm",
  "room_number": "101",

  "line_items": [
    {
      "description": "4-Bed Mixed Dorm x 30 nights",
      "quantity": 30,
      "unit_price": 599.00,
      "line_total": 17970.00
    },
    {
      "description": "Breakfast Add-on",
      "quantity": 5,
      "unit_price": 200.00,
      "line_total": 1000.00
    }
  ],

  "subtotal_rooms": 17970.00,
  "subtotal_addons": 1000.00,
  "taxes": 3395.40,
  "grand_total": 22365.40,
  "amount_paid": 22365.40,
  "amount_due": 0.00,
  "currency": "INR",

  "payment_id": "pay_Qxyz1234567",
  "payment_method": "Razorpay",

  "terms": [
    "All guests must carry a valid government-issued photo ID at check-in.",
    "Check-in: 1:00 PM | Check-out: 10:00 AM. Late check-out subject to availability.",
    "No-shows and early departures may be treated as fully chargeable stays.",
    "Outside visitors are not permitted beyond designated guest areas without prior approval.",
    "The property reserves the right to update operational guidelines for guest safety and comfort.",
    "Cancellations within 48 hours of check-in are non-refundable unless otherwise stated in the booking.",
    "Disputes are subject to the jurisdiction of Bengaluru, Karnataka, India."
  ]
}
```

---

## Field Reference

### Booking Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `booking_id` | `string` | YES | Short human-readable booking ID (e.g. `8XJ23K`) |
| `confirmation_code` | `string` | YES | Secondary confirmation code (e.g. `Z9L2P`) |
| `ezee_reservation_id` | `string` | YES | Full eZee reservation ID used as path param |
| `booking_date` | `string` | YES | ISO 8601 UTC timestamp when the booking was created |

### Property

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `property_name` | `string` | YES | Full property name |
| `property_address` | `string` | YES | Full postal address |
| `property_email` | `string` | YES | Support email shown on the receipt |
| `property_phone` | `string` | YES | Support phone shown on the receipt |

### Guest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guest_name` | `string` | YES | Primary guest full name |
| `guest_email` | `string` | YES | Guest email |
| `guest_phone` | `string or null` | NO | Optional guest phone number |

### Stay Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `checkin_date` | `string` | YES | ISO 8601 date (YYYY-MM-DD) |
| `checkout_date` | `string` | YES | ISO 8601 date (YYYY-MM-DD) |
| `checkin_time` | `string` | YES | Human-readable time (e.g. `14:00`) |
| `checkout_time` | `string` | YES | Human-readable time (e.g. `11:00`) |
| `no_of_nights` | `number` | YES | Integer |
| `no_of_guests` | `number` | YES | Integer |
| `room_type_name` | `string` | YES | e.g. `4-Bed Mixed Dorm` |
| `room_number` | `string or null` | NO | Physical room number if assigned |

### Pricing

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `line_items` | `array` | YES | Can be empty array if breakdown not available |
| `line_items[].description` | `string` | YES | e.g. `4-Bed Mixed Dorm x 30 nights` |
| `line_items[].quantity` | `number` | YES | |
| `line_items[].unit_price` | `number` | YES | In currency units (not paise) |
| `line_items[].line_total` | `number` | YES | In currency units |
| `subtotal_rooms` | `number` | YES | Sum of room line items |
| `subtotal_addons` | `number` | YES | Sum of add-on line items (0 if none) |
| `taxes` | `number` | YES | Total tax amount |
| `grand_total` | `number` | YES | `subtotal_rooms + subtotal_addons + taxes` |
| `amount_paid` | `number` | YES | Amount actually collected (0 if not yet paid) |
| `amount_due` | `number` | YES | `grand_total - amount_paid` |
| `currency` | `string` | YES | ISO 4217 code — `INR` |

### Payment Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_id` | `string or null` | NO | Razorpay payment ID |
| `payment_method` | `string or null` | NO | e.g. `Razorpay`, `Cash` |

### Terms and Conditions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `terms` | `string[] or null` | NO | Array of T&C lines printed at the bottom of the PDF |

> **Note:** The frontend has a built-in fallback T&C array if `terms` is `null` or empty. Providing property-specific terms from the API will override the frontend defaults.

---

## Error Responses

| HTTP Status | When | Frontend behaviour |
|-------------|------|--------------------|
| `401` | Invalid / expired guest token | Hook surfaces "You must be signed in" |
| `403` | Guest does not own this reservation | Hook surfaces the API `message` field |
| `404` | Reservation not found | Hook surfaces generic error message |
| `500` | Server error | Hook surfaces generic error |

**Error response body (all 4xx/5xx):**
```json
{
  "message": "Human-readable error description."
}
```

> The frontend uses `parseApiError()` from `lib/vibehouse-api.ts` to extract `message` from the response body.

---

## Security Notes

- Endpoint **must** be behind guest JWT authentication (same `Authorization: Bearer <token>` pattern as all `/guest/*` routes).
- Only the **authenticated guest** who owns the reservation (primary or secondary role) should be able to download the receipt.
- The `ezeeReservationId` path parameter must be validated server-side.

---

## Source Files (Frontend)

| File | Purpose |
|------|---------|
| `lib/receipt-api.ts` | `BookingReceiptData` type + `fetchBookingReceipt()` |
| `hooks/use-download-receipt.ts` | PDF generation + download trigger hook |
| `components/booking/booking-receipt-pdf.tsx` | `@react-pdf/renderer` PDF document |
| `components/booking/booking-confirmed-page.tsx` | Button placement in Room Info card |

---

## Checklist for Backend Team

- [ ] Implement `GET /guest/booking/receipt/:ezeeReservationId`
- [ ] Authenticate via existing guest JWT middleware
- [ ] Return all required fields listed above
- [ ] Populate `line_items` from the eZee booking line data
- [ ] Populate `taxes` from the tax configuration
- [ ] Return property-specific `terms` array (optional — frontend has fallback)
- [ ] Return `payment_id` and `payment_method` from the linked payment record
- [ ] Return 404 with `{ "message": "Booking not found." }` for unknown IDs
- [ ] Return 403 with `{ "message": "Access denied." }` for unauthorized access

---

*Questions? Contact the frontend team via the project Slack or GitHub.*
