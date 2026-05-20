# Booking ID Flow — How Guests Get & Use Their Reservation ID

> Status: Design Reference | Date: 2026-04-03

---

## The Two ID Formats

Every booking in our system has one canonical identifier — the **ERI (eZee Reservation ID)**. There are exactly two formats:

| Format | Example | Who creates it | When |
|--------|---------|----------------|------|
| `VH-{CITY}-{timestamp}` | `VH-BND-1743600000000` | **We create it** | At payment confirmation |
| `EZEE-{CITY}-{resNo}` | `EZEE-MUM-56` | **We create it** from eZee's number | Within 15 min of eZee booking |

The raw eZee reservation number (e.g. `56`) is stored internally but **never exposed to guests**. The ERI is the only ID a guest ever needs.

---

## What IDs Are Accepted to Link a Booking

**Endpoint:** `POST /guest/booking/link`

**Accepted:** `ezee_reservation_id` (ERI only)

```json
{ "ezee_reservation_id": "VH-BND-1743600000000" }
{ "ezee_reservation_id": "EZEE-MUM-56" }
```

Both formats work identically — the system makes no functional distinction after creation.

**Not accepted:** Raw eZee reservation number (`56`), room number, phone number, or any other field.

---

## Scenario 1: Guest Books via OTA (MakeMyTrip, Booking.com, Agoda)

```
OTA Website
    │
    │  Guest pays on OTA
    ▼
eZee PMS  ←── OTA channel manager pushes reservation
    │
    │  Reservation #56 created in eZee
    │  Booker email/phone stored by eZee
    │
    ▼
EzeeReconciliationService (runs every 15 min)
    │
    │  fetchReservationsByDateRange() → finds res #56
    │  Checks: not in our DB yet
    │  Creates ezee_booking_cache row:
    │    ezee_reservation_id = "EZEE-MUM-56"
    │    ezee_reservation_no  = "56"
    │    booker_email         = "guest@gmail.com"
    │    booker_phone         = "9876543210"
    │    status               = "CONFIRMED"
    │
    ▼
  ERI "EZEE-MUM-56" exists in our system
    │
    │  ⚠️  GAP: Guest does NOT know this ERI exists
    │
    ▼
How does the guest get their ERI? (Current state → Planned)

  OPTION A — Auto-link on auth (BUILT ✅)
    Guest signs up / logs in to VibeHouse app
    → autoLinkBookings() fires immediately
    → Matches guest's email/phone against booker_email/booker_phone
    → Creates booking_guest_access (role: PRIMARY)
    → Guest sees booking under "My Bookings" automatically
    → No ERI needed to be shared at all

  OPTION B — Reconciliation notification (NOT BUILT ❌)
    When ingestExternalBookings() creates "EZEE-MUM-56":
    → Send WhatsApp/email to booker_email/booker_phone:
      "Your booking at Vibe House Bandra is confirmed.
       Your booking ID: EZEE-MUM-56. Download our app to
       complete pre-check-in."
    → This requires: Wati WhatsApp + booking notification template

  OPTION C — eZee Autosync webhook (UNDER INVESTIGATION ⏳)
    eZee pushes XML to our endpoint within ~5 min of booking
    → We parse it, create ERI, send notification immediately
    → Requires eZee support to activate for HotelCode 60765
```

**Role on link:** PRIMARY (email/phone matched) or SECONDARY (group member who books through the same link)

**Lag:** Up to 15 minutes from OTA booking to ERI existing in our system. Auto-link fires only when guest opens the app.

---

## Scenario 2: Guest Books via eZee Walk-in (Front Desk / Staff)

```
Reception Staff
    │
    │  Creates booking in eZee PMS dashboard manually
    │  Enters guest name, email, phone, dates, room type
    │  eZee assigns Reservation #57
    │
    ▼
eZee PMS
    │
    ▼
EzeeReconciliationService (runs every 15 min)
    │
    │  Finds res #57 in ArrivalList
    │  Creates ezee_booking_cache row:
    │    ezee_reservation_id = "EZEE-MUM-57"
    │    booker_email         = "walkin@gmail.com"
    │    booker_phone         = "7477036148"
    │    source               = "Walk-in" (or "Direct", "OYO", etc.)
    │    status               = "CONFIRMED"
    │
    ▼
  ERI "EZEE-MUM-57" exists in our system
    │
    ▼
How does the guest get their ERI?

  OPTION A — Auto-link on auth (BUILT ✅)
    Staff asks guest to download the app and sign up
    → Guest signs up with same email/phone used at desk
    → autoLinkBookings() fires → matches → guest sees booking

  OPTION B — Staff tells / prints (Workaround, no build needed)
    After reconciliation runs, admin can look up:
      GET /admin/bookings?source=Walk-in
    → Staff verbally tells guest: "Your booking ID is EZEE-MUM-57"
    → Guest enters it manually in the app
    ⚠️ Clunky — not scalable

  OPTION C — Reconciliation notification (NOT BUILT ❌)
    Same as Scenario 1, Option B
    → WhatsApp to booker_phone: "Your booking ID is EZEE-MUM-57"
    → Requires Wati integration at reconciliation time
```

**Key difference from OTA:** Staff controls the email/phone entered. If staff enters correctly, auto-link works perfectly. If email/phone is wrong, auto-link fails silently.

---

## Scenario 3: Guest Books via VibeHouse Web App

```
Guest (VibeHouse PWA)
    │
    │  Browses room types
    │  Selects dates + room + quantity
    │  Hits "Pay Now"
    │
    ▼
Razorpay Payment Gateway
    │
    │  Guest completes payment
    │  Razorpay fires webhook to our backend
    │
    ▼
PaymentService.handleRazorpayWebhook()
    │
    │  Verifies signature
    │  Calls fulfilBookingOrder():
    │    → Creates ezee_booking_cache row:
    │         ezee_reservation_id = "VH-BND-1743600000000"
    │         ezee_reservation_no  = null (not synced to eZee yet)
    │         guest_id             = (the paying guest)
    │         status               = "CONFIRMED"
    │         source               = "Direct"
    │    → Creates booking_guest_access (role: PRIMARY, status: APPROVED)
    │    → Sends booking confirmation WhatsApp/email ✅
    │         Message includes: "Your booking ID: VH-BND-1743600000000"
    │
    ▼
SQS → EzeeSyncWorker.handleInsertBooking()
    │
    │  Calls eZee InsertBooking → gets reservation #58
    │  Calls eZee ProcessBooking (confirms + auto-assigns room)
    │  Calls eZee FetchBooking → gets auto-assigned RoomName
    │  Updates ezee_booking_cache:
    │    ezee_reservation_no = "58"
    │    room_number          = "D-101" (auto-assigned by eZee)
    │
    ▼
  Guest already has their booking visible in the app
  ERI never changes — stays "VH-BND-1743600000000"
```

**Key advantage:** Guest gets their ERI immediately after payment — no polling lag, no manual step, no support needed.

---

## Side-by-Side Comparison

| | OTA | Walk-in | Web App |
|---|---|---|---|
| ERI format | `EZEE-MUM-*` | `EZEE-MUM-*` | `VH-BND-*` |
| ERI created by | Reconciliation service | Reconciliation service | Payment webhook |
| ERI created when | Within 15 min of eZee booking | Within 15 min of eZee booking | Instantly on payment |
| Guest notified via | ❌ Not yet (planned) | ❌ Not yet (workaround) | ✅ WhatsApp + Email |
| Auto-link on auth | ✅ Works if email/phone matches | ✅ Works if staff entered correctly | ✅ Always (guest_id attached at creation) |
| Manual link possible | ✅ If ERI is shared | ✅ If ERI is shared | ✅ But not needed |
| Who is PRIMARY | Booker email/phone match | Booker email/phone match | The paying guest, always |

---

## Auto-Link Logic (Built)

Fires on every auth event: signup, login, Google OAuth.

```
Guest logs in
    │
    ▼
autoLinkBookings(guest)
    │
    ├─ Find all ezee_booking_cache rows where:
    │    booker_email = guest.email  OR
    │    booker_phone = guest.phone
    │    AND no existing booking_guest_access for this guest
    │
    ├─ For each match:
    │    role = PRIMARY (email/phone is the booker)
    │    Create booking_guest_access (APPROVED)
    │
    └─ Fire-and-forget (never throws, never blocks auth response)
```

Secondary guests (travelling companions) are NOT auto-linked — they link manually using the ERI shared by the primary booker.

---

## What Needs to Be Built to Close the Gap

The only broken scenario is OTA/Walk-in guests who:
- Don't sign up for the app before their booking appears in our system, AND
- Haven't been told their ERI

| Priority | Solution | Effort | Notes |
|----------|----------|--------|-------|
| High | Notification on `ingestExternalBookings()` | Medium | Send WhatsApp to `booker_phone` when EZEE-* row is created. Needs Wati template approval. |
| Medium | eZee Autosync webhook | High | Reduces lag from 15 min → ~5 min. Requires eZee support activation + receiver endpoint. Under investigation. |
| Low | Admin UI "Send ERI" button | Low | Manual fallback for walk-ins — staff clicks to send WhatsApp with ERI. |

In the interim: staff should instruct walk-in guests to sign up with the same email/phone — auto-link handles the rest silently.
