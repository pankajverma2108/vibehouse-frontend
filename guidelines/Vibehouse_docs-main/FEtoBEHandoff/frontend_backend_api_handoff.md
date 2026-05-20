# Frontend to Backend API Handoff — Integration Details

This document provides a detailed breakdown of all API calls made by the frontend to the backend. It includes example **Real-Time Responses** and a specific list of **Fields Used by Frontend** (the data the FE "catches" and processes).

---

## 1. Core Booking Flow (High Detail)

These APIs drive the property page, room selection, and live inventory feedback.

### 1.1 Room Catalog (`/guest/booking/rooms`)
Fetches the static property catalog when no dates are selected.

*   **Call**: `GET /guest/booking/rooms?property_id=60765`
*   **Real-Time Response Example**:
    ```json
    {
      "property_id": "60765",
      "room_types": [
        {
          "id": "rt-ka-4dorm",
          "name": "4 Bed Mixed Dormitory",
          "slug": "4-bed-mixed-dormitory",
          "type": "DORM",
          "beds_per_room": 4,
          "total_beds": 64,
          "base_price_per_night": 500,
          "amenities": ["AC", "WiFi", "Locker"],
          "source": "db"
        }
      ]
    }
    ```
*   **Fields Used by Frontend**:
    | BE Field | FE Usage | Description |
    | :--- | :--- | :--- |
    | `id` | `room.id` | Unique identifier for selection. |
    | `name` | `room.name` | Display title on cards. |
    | `slug` | `room.slug` | URL/Image resolution key. |
    | `type` | `room.type` | Logic for "Bed" vs "Room" labels. |
    | `total_beds` | `room.totalBeds` | Max capacity display. |
    | `base_price_per_night`| `room.basePricePerNight`| The "Starting from" price. |
    | `amenities` | `room.amenities` | Icon/feature list rendering. |

### 1.2 Live Availability (`/guest/booking/availability`)
Fetched when the user selects a date range. This overrides catalog data with live inventory.

*   **Call**: `GET /guest/booking/availability?property_id=60765&checkin=2026-05-01&checkout=2026-05-03`
*   **Real-Time Response Example**:
    ```json
    {
      "property_id": "60765",
      "checkin_date": "2026-05-01",
      "checkout_date": "2026-05-03",
      "no_of_nights": 2,
      "availability_source": "ezee_live",
      "room_types": [
        {
          "id": "rt-ka-4dorm",
          "available_beds": 2,
          "inventory_state": "limited",
          "base_price_per_night": 799,
          "total_price": 1598
        }
      ]
    }
    ```
*   **Fields Used by Frontend**:
    | BE Field | FE Usage | Description |
    | :--- | :--- | :--- |
    | `available_beds` | `room.availableBeds` | Used to show remaining inventory. |
    | `inventory_state` | `room.inventoryState` | Logic for "Sold Out" or "Limited" badges. |
    | `base_price_per_night`| `room.basePricePerNight`| Live nightly rate (may differ from catalog). |
    | `total_price` | `room.totalPrice` | Final price shown for the stay duration. |
    | `availability_source` | `snapshot.source` | If "local_db_estimate", FE shows a warning banner. |

---

## 2. Orders & Payments

### 2.1 Create Booking Order (`/guest/booking/create-order`)
*   **Call**: `POST /guest/booking/create-order`
*   **Fields Used from Response**:
    *   `ezee_reservation_id`: CRITICAL. Used to initiate payment.
    *   `grand_total`: To display final summary before payment.
    *   `rooms[]`: Confirms which rooms were actually reserved.

### 2.2 Payment Verification (`/payment/verify`)
*   **Call**: `POST /payment/verify`
*   **Fields Used from Response**:
    *   `message`: Status message to show the guest.
    *   `payment_id`: Transaction reference for the success screen.
    *   `total`: Confirmation of the amount paid.

---

## 3. KYC (Know Your Customer)

FE uses these heavily to manage the check-in documentation process.

### 3.1 Get KYC Slots (`/guest/kyc/{id}/slots`)
*   **Fields Used**:
    *   `slots[].slot_id`: To target specific guests.
    *   `slots[].kyc_status`: To show progress (Pending/Verified).
    *   `slots[].guest_name`: For personalization.

### 3.2 OCR Results (`/guest/kyc/{id}/slots/{slot_id}/ocr`)
*   **Fields Used**:
    *   `ocr_name`: Auto-fills the name field.
    *   `ocr_dob`: Auto-fills date of birth.
    *   `ocr_id_number`: Auto-fills ID number.
    *   `id_type_detected`: Switches the ID Type dropdown automatically.

---

## 4. Guest Authentication (`/guest/auth/*`)

### 4.1 Login / Signup
*   **Fields Used from `GuestAuthResponse`**:
    *   `access_token`: Stored in LocalStorage/SessionStorage for all subsequent calls.
    *   `otp_sent`: (Boolean) If true, FE transitions to OTP verification screen.
    *   `guest.id`, `guest.name`, `guest.email`: To initialize the user profile.

### 4.2 Current User (`/guest/auth/me`)
*   **Fields Used**:
    *   `email_verified`: To show "Verify Email" prompts.
    *   `phone_verified`: To show "Verify Phone" prompts.
    *   `profile_photo_url`: For the header avatar.

---

## 5. Summary of Frontend "Caught" Fields vs Ignored Fields

| Frontend catches... | Frontend ignores/passes through... |
| :--- | :--- |
| IDs, Names, Slugs | Created/Updated timestamps |
| Pricing & Inventory Counts | Internal DB metadata (unless `source` is relevant) |
| KYC Statuses & OCR fields | Raw eZee XML strings (if present in response) |
| Auth Tokens & Verification flags | Password hashes (obviously) |
| Error Messages (`message` field) | Verbose stack traces (handled by error utility) |

---

**Note to Backend**: Please ensure the `source` field in room responses is correctly set (`db` vs `ezee_only`) as the frontend uses this to determine if the enriched data (amenities, custom names) is reliable.
