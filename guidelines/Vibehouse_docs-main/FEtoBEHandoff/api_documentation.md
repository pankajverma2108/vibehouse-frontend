# Vibehouse Frontend to Backend API Documentation

This document lists all the APIs currently called by the frontend codebase to the backend. API endpoints related to **events** (`/public/events`) have been explicitly excluded. 

Special emphasis is placed on **Room Catalog**, **Live Availability**, and **Pricing**, as these endpoints power the core booking experience.

---

## 1. Core Booking: Room Catalog & Availability

These endpoints drive the main booking flow, presenting properties, rooms, pricing, and availability.

### 1.1 Room Catalog (Base Availability)
Used to fetch the static or base catalog of rooms for a property, before a user selects dates.

* **Endpoint:** `GET /guest/booking/rooms`
* **Query Parameters:** 
  * `property_id` (optional): Filter rooms by a specific property ID.
* **Method:** `GET`
* **Response Details:** Returns the raw catalog. The frontend normalizes this into `NormalizedRoomType` objects.
```json
// Example Raw Response
{
  "property_id": "60765",
  "availability_source": "catalog",
  "room_types": [
    {
      "id": "room-123",
      "name": "4-Bed Mixed Dorm",
      "slug": "4-bed-mixed-dorm",
      "type": "DORM",
      "beds_per_room": 4,
      "total_beds": 12,
      "inventory_state": "available",
      "base_price_per_night": 599,
      "total_price": 599,
      "amenities": ["AC", "WiFi", "Locker"]
    }
  ]
}
```

### 1.2 Live Room Availability & Pricing
Fetched when the user provides explicit check-in and check-out dates. It provides **live availability status** and dynamic pricing for the dates selected.

* **Endpoint:** `GET /guest/booking/availability`
* **Query Parameters:** 
  * `checkin` (required): Check-in date (YYYY-MM-DD).
  * `checkout` (required): Check-out date (YYYY-MM-DD).
  * `property_id` (optional): Filter by a specific property ID.
* **Method:** `GET`
* **Response Details:** Similar to the catalog, but includes live computations.
```json
// Example Raw Response
{
  "property_id": "60765",
  "availability_source": "ezee_live",
  "checkin_date": "2026-05-01",
  "checkout_date": "2026-05-03",
  "no_of_nights": 2,
  "room_types": [
    {
      "id": "room-123",
      "name": "4-Bed Mixed Dorm",
      "available_beds": 2,
      "inventory_state": "limited", // can be "available", "limited", "sold_out"
      "base_price_per_night": 799,  // Live pricing might differ from base catalog pricing
      "total_price": 1598,          // Total for 2 nights
      "amenities": ["AC", "WiFi", "Locker"]
    }
  ]
}
```

### 1.3 Store Catalog (Add-ons / Commodities)
Fetches available commodities, services, or items a guest can add to their booking or order.

* **Endpoint:** `GET /guest/store/catalog`
* **Query Parameters:** 
  * `property_id` (optional)
* **Method:** `GET`
* **Response Details:** Array of `StoreCatalogItem`
```typescript
// Response Array Items
{
  "id": "item-1",
  "name": "Breakfast Buffet",
  "category": "SERVICE", // "COMMODITY" | "SERVICE" | "BORROWABLE" | "RETURNABLE"
  "base_price": 250,
  "in_stock": true,
  "available_stock": null 
}
```

---

## 2. Booking Orders & Payments

### 2.1 Create Booking Order
Creates the main reservation in the system.

* **Endpoint:** `POST /guest/booking/create-order`
* **Headers:** `Authorization: Bearer <token>`
* **Payload:**
```json
{
  "property_id": "string",
  "checkin_date": "YYYY-MM-DD",
  "checkout_date": "YYYY-MM-DD",
  "rooms": [{ "room_type_id": "string", "quantity": 1 }],
  "addons": [{ "product_id": "string", "quantity": 1 }] // Optional
}
```
* **Response:** Detailed order confirmation including `ezee_reservation_id`, itemized `subtotal_rooms`, `subtotal_addons`, and `grand_total`.

### 2.2 Payment Orders & Verification
- **Create Payment Order:** `POST /payment/create-booking-order`
  * **Payload:** `{ ezee_reservation_id: string, grand_total: number, addon_order_id?: string }`
  * **Response:** `{ razorpay_order_id, razorpay_key, amount, currency, ... }`
- **Verify Payment:** `POST /payment/verify`
  * **Payload:** `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
  * **Response:** `{ message, payment_id, order_id, total }`
- **Fail Payment:** `POST /payment/fail`
  * **Payload:** `{ razorpay_order_id }`
  * **Response:** `{ message, payment_id, razorpay_order_id }`

---

## 3. Co-live Bookings (Long Term Stays)

Specialized API paths for long-term Colive quotes and bookings.

- **Create Quote:** `POST /guest/colive/quote`
  * **Payload:** `{ property_id, room_type_id, move_in_date, duration_months, stay_type, addons, coupon_code }`
  * **Response:** `{ quote_id, currency, charges: { room_subtotal, addon_subtotal, deposit_total, grand_total } }`
- **Create Draft Booking:** `POST /guest/colive/draft-booking`
  * **Payload:** Uses `quote_id` plus guest details, stay type, etc.
  * **Response:** `{ draft_booking_id, status, charges }`
- **Create Colive Payment Order:** `POST /payment/create-colive-order`
- **Verify Colive Payment:** `POST /payment/verify-colive`

---

## 4. Guest Booking Management

Managing existing bookings tied to the authenticated user.

- **Get My Bookings:** `GET /guest/booking/mine`
  * **Response:** Array of `GuestBookingMineItem` (includes status, dates, room info, total KYC slots, etc.)
- **Link Booking:** `POST /guest/booking/link`
  * **Payload:** `{ ezee_reservation_id }`
  * **Response:** Returns booking summary and slots array.

---

## 5. KYC (Know Your Customer) Flow

APIs to handle uploading and submitting guest ID verification documents.

- **Get KYC Slots:** `GET /guest/kyc/{ezee_reservation_id}/slots`
- **Get Specific Slot Detail:** `GET /guest/kyc/{ezee_reservation_id}/slots/{slot_id}`
- **Add KYC Slot:** `POST /guest/kyc/{ezee_reservation_id}/slots/add`
- **Delete KYC Slot:** `DELETE /guest/kyc/{ezee_reservation_id}/slots/{slot_id}`
- **Get S3 Upload URL:** `POST /guest/kyc/{ezee_reservation_id}/upload-url`
  * **Payload:** `{ file_name, content_type }`
  * **Response:** `{ uploadUrl, fileKey, expiresInSeconds }`
- **Run OCR on Documents:** `POST /guest/kyc/{ezee_reservation_id}/slots/{slot_id}/ocr`
  * **Payload:** `{ front_image_key, back_image_key }`
  * **Response:** Extracted data (`ocr_name`, `ocr_dob`, `ocr_id_number`, `id_type_detected`, `confidence` scores)
- **Submit KYC Data:** `POST /guest/kyc/{ezee_reservation_id}/slots/{slot_id}/submit`
  * **Payload:** `KycSubmitPayload` (contains full details: name, dob, id number, images, consent, etc.)

---

## 6. Guest Authentication

All authentication-related operations for guests.

- **Send OTP:** `POST /guest/auth/send-otp` (Payload: `{ email }`)
- **Verify OTP:** `POST /guest/auth/verify-otp` (Payload: `{ email, otp }`)
- **Forgot Password:** `POST /guest/auth/forgot-password` (Payload: `{ email }`)
- **Reset Password:** `POST /guest/auth/reset-password` (Payload: `{ email, otp, newPassword }`)
- **Signup:** `POST /guest/auth/signup` (Payload: `{ name, email, password, phone }`)
- **Login:** `POST /guest/auth/login` (Payload: `{ email, password }`)
- **Get Current User:** `GET /guest/auth/me` (Header: `Authorization: Bearer <token>`)

*(Note: Google OAuth URL generation is done via local URL composition targeting `/guest/auth/google` and does not rely on an asynchronous fetch in the client).*
