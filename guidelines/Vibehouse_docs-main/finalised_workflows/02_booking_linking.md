# Workflow 02 — Booking Linking & PRIMARY/SECONDARY Role Assignment

## Overview
eZee PMS is the **source of truth for all bookings**. Vibe House does not store bookings. When a guest enters their reservation ID, we fetch from eZee, cache it locally (`ezee_booking_cache`), and determine whether the guest is the **PRIMARY** booker or a **SECONDARY** guest using the booker's email/phone from eZee.

---

## 1. The Core Problem This Solves

A booking made on MMT by ABC may have DEF (a friend) register on the PWA first and enter the same booking ID. We cannot blindly make DEF the PRIMARY guest — ABC actually paid and booked. We solve this by **matching eZee's `booker_email` / `booker_phone`** against the logged-in guest's credentials.

---

## 2. Booking Linking Flow

```
Authenticated guest enters eZee reservation ID on PWA
    ↓
Backend: Check Redis cache first
    ├── Cache HIT → Use cached booking data (skip eZee call)
    └── Cache MISS → Call eZee API:
         GET /reservation?reservation_id=RES-12345
         Response: { booker_name, booker_email, booker_phone,
                     room_type, room_number, unit_code,
                     checkin_date, checkout_date, source, status }
    ↓
INSERT INTO ezee_booking_cache (ezee_reservation_id, property_id,
  booker_email, booker_phone, room_type_name, room_number, 
  unit_code, checkin_date, checkout_date, source, status, fetched_at)
    ↓
Role matching logic:
  guest.email == booker_email?  OR  guest.phone == booker_phone?
    ├── YES → role = 'PRIMARY', status = 'APPROVED'
    │         INSERT INTO booking_guest_access (role='PRIMARY', status='APPROVED', approved_at=NOW())
    │         Update ezee_booking_cache SET guest_id = current_guest.id
    │         → Guest immediately has full access
    │
    └── NO  → role = 'SECONDARY', status = 'PENDING_APPROVAL'
              INSERT INTO booking_guest_access (role='SECONDARY', status='PENDING_APPROVAL')
              → Send WhatsApp OTP to booker_phone/booker_email:
                "Someone is trying to join your booking RES-12345. Approve?"
              → Guest sees "Waiting for approval" screen
```

---

## 3. PRIMARY Approval of SECONDARY Guest

```
PRIMARY guest receives WhatsApp message with approval link/OTP
    ↓
PRIMARY approves (submits OTP or clicks approve button)
    ↓
UPDATE booking_guest_access
  SET status = 'APPROVED',
      approved_by_guest_id = primary_guest.id,
      approved_at = NOW()
WHERE ezee_reservation_id = 'RES-12345'
  AND guest_id = secondary_guest.id
    ↓
SECONDARY guest now has full access to the booking
```

---

## 4. Edge Cases

| Scenario | Handling |
|---|---|
| PRIMARY hasn't registered on PWA yet | SECONDARY stays `PENDING_APPROVAL`. Staff can manually upgrade via Zoho admin |
| Check-in date passes, PRIMARY never registered | Ops/front desk manually approves SECONDARY in Zoho |
| Same eZee reservation ID entered again by same guest | Duplicate detected by `UNIQUE(ezee_reservation_id, guest_id)` on `booking_guest_access` — return existing row |
| Guest's email on MMT differs from PWA email | Falls back to phone match. If both fail → SECONDARY |
| eZee API is down | Return cached data from `ezee_booking_cache.fetched_at`. If not cached, return 503 with friendly error |

---

## 5. Multiple Bookings — Same Guest

A guest can link **multiple booking IDs**. Each creates a separate `ezee_booking_cache` row and `booking_guest_access` row. The PWA shows a booking selector when the guest has multiple active stays.

---

## 6. Auth Middleware Check (Every Protected Route)

```
Request hits API with JWT
    ↓
Middleware extracts guest_id from JWT
    ↓
For routes scoped to a booking (KYC, add-ons, lock PIN):
  SELECT 1 FROM booking_guest_access
  WHERE guest_id = $guest_id
    AND ezee_reservation_id = $reservation_id
    AND status = 'APPROVED'
    ↓
  Found → Proceed
  Not found → 403 Forbidden
```

---

## 7. DB Tables Involved

| Table | Role |
|---|---|
| `ezee_booking_cache` | Cached booking snapshot from eZee |
| `booking_guest_access` | Guest ↔ booking permission registry |
| `guests` | Email/phone used for role matching |
