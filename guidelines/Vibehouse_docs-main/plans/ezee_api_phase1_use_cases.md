# eZee PMS API — Phase 1: Use Cases, Endpoint Mapping & Approach

> **Date**: 2026-03-26
> **Status**: Phase 1 complete — use cases mapped, gaps flagged, testing order defined
> **Next**: Phase 2 — API routes doc (`docs/api_routes/11_ezee_pms.md`) + test scripts
>           Phase 3 — Live test results (`docs/api_testing/ezee_test_results.md`)

---

## Key Architecture Decisions (Corrections from Previous Draft)

| Topic | What We're Doing |
|-------|-----------------|
| **Check-in / Check-out** | Done manually by ops staff directly in the eZee dashboard. Our system does NOT call eZee to mark CHECKED_IN or CHECKED_OUT. |
| **Room assignment** | Handled by eZee (auto or ops-driven). Our system does not call `AssignRoom`. |
| **Status detection** | The eZee Sync Worker polls eZee, detects status changes (e.g., `CONFIRMED → CHECKED_IN`, `CHECKED_IN → CHECKED_OUT`), and fires SQS events to trigger downstream actions (MyGate PIN gen/revoke, WhatsApp notifications). |
| **Queue** | AWS SQS — not Kafka. FIFO queue for ops tasks (`vibehouse-ops-tasks.fifo`), Standard queue for notifications (`vibehouse-notify`). |
| **HK status update** | Not in scope. |

---

## 1. Credentials & Auth Patterns

### Env Variables

| Variable | Purpose |
|----------|---------|
| `EZEE_API_URL` | Base URL (`https://live.ipms247.com`) |
| `EZEE_HOTEL_CODE` | Property identifier (integer) |
| `EZEE_AUTH_CODE` | Auth token |

### Three Auth Patterns

eZee uses three different auth mechanisms across its surfaces. All use the same `AUTH_CODE` value — just placed differently.

| Pattern | Used By | How |
|---------|---------|-----|
| **JSON body** | PMS Connectivity, Kiosk Connectivity | `HotelCode` + `AuthCode` fields inside POST JSON body |
| **HTTP header** | Channel Bookings (Vacation Rental) | `AUTH_CODE` request header |
| **Query string** | Reservation API Listing | `APIKey` query param in GET URL |

---

## 2. Base URLs

| Surface | URL | Auth |
|---------|-----|------|
| PMS Connectivity | `https://live.ipms247.com/pmsinterface/pms_connectivity.php` | Body |
| Kiosk Connectivity | `https://live.ipms247.com/index.php/page/service.kioskconnectivity` | Body |
| Channel Bookings | `https://live.ipms247.com/channelbookings/vacation_rental.php` | Header |
| Reservation API | `https://live.ipms247.com/booking/reservation_api/listing.php` | Query string |

---

## 3. Use Cases → API Mapping

### UC-01 — Get Reservation Details
**Workflows**: 02 (Booking Linking), 12 (eZee Sync Worker)
**Risk**: LOW — read-only

```
POST https://live.ipms247.com/channelbookings/vacation_rental.php
Header: AUTH_CODE: <auth_code>
Body:
{
  "request_type": "get_reservation",
  "hotel_id": "<HOTEL_CODE>",
  "reservation_id": "<RESERVATION_ID>"
}
```

**Returns**: booker email, booker phone, guest name, room number, room type, unit code, check-in/out timestamps, booking status, guest count, total amount, payment arrangement, distribution channel

**Two callers:**

**a) Booking Linking (on-demand)**
1. Guest enters reservation ID on PWA
2. Backend checks Redis cache first; on miss → calls eZee
3. Inserts/updates `ezee_booking_cache`
4. Matches guest email/phone vs `booker_email`/`booker_phone` → assigns PRIMARY or SECONDARY role in `booking_guest_access`

**b) Sync Worker (scheduled, every 30 min)**
- Loops over all active rows in `ezee_booking_cache`
- Re-fetches each reservation from eZee
- Detects status changes:
  - `CONFIRMED → CHECKED_IN`: sends SQS message → Ops Task Worker generates MyGate PIN + sends WhatsApp to guest
  - `CHECKED_IN → CHECKED_OUT`: sends SQS message → Ops Task Worker revokes MyGate PIN + sends farewell WhatsApp
- Updates `ezee_booking_cache` (status, room_number, unit_code, checkout_date, fetched_at)

**Rate concern**: 20+ active bookings → space calls 300ms apart → 6-10 sec total. Fine.

---

### UC-02 — Room Info (Master Data)
**Workflow**: Setup / one-time config
**Risk**: LOW — read-only

```
POST https://live.ipms247.com/pmsinterface/pms_connectivity.php
Body:
{
  "Request_Type": "RoomInfo",
  "HotelCode": "<HOTEL_CODE>",
  "AuthCode": "<AUTH_CODE>",
  "NeedPhysicalRooms": "1"
}
```

**Returns**: Room types (IDs + names), rate types, rate plans, physical room list with IDs

**Use**: One-time setup at property onboarding. Room type IDs and rate plan IDs are needed for the stay extension rate lookup (UC-04). Store in `ezee_connection` or a config table.

---

### UC-03 — Room Availability Check (Stay Extension)
**Workflow**: 09 — Stay Extension, Step 1 & 2
**Risk**: LOW — read-only

```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Body:
{
  "HotelCode": "<HOTEL_CODE>",
  "AuthCode": "<AUTH_CODE>",
  "Request_Type": "RoomAvailability",
  "check_in_date": "YYYY-MM-DD",
  "check_out_date": "YYYY-MM-DD",
  "RoomId": "<CURRENT_ROOM_ID>"    // for same-bed check; omit for room-type check
}
```

**Returns**: Available rooms grouped by room type, each with RoomId and room number

**Two sub-uses:**
- **Same-bed check**: pass current `unit_code`/RoomId → see if it appears as available for the extension dates
- **Any-bed check**: omit RoomId → see if the room type has availability at all (gating condition before showing extension option)

---

### UC-04 — Rate Lookup (Stay Extension Pricing)
**Workflow**: 09 — Stay Extension, Step 3
**Risk**: LOW — read-only | **Uncertainty**: MEDIUM — exact endpoint unconfirmed

eZee is the source of truth for rates (handles surge pricing, weekend premium, high-occupancy). We display what eZee returns; we never set the rate.

**Candidate endpoint:**
```
GET https://live.ipms247.com/booking/reservation_api/listing.php
  ?request_type=CalculateExtraCharge
  &HotelCode=<HOTEL_CODE>
  &APIKey=<AUTH_CODE>
  &check_in_date=YYYY-MM-DD
  &check_out_date=YYYY-MM-DD
  &ExtraChargeId=<EXTRA_CHARGE_ID>
  &Total_ExtraItem=1
```

**Problem**: `CalculateExtraCharge` is for add-on items, not nightly room rates. The `ExtraChargeId` is an eZee-configured extra charge — this may or may not map to nightly rate.

**Discovery plan** (Phase 3, Week 1):
1. Call `RoomInfo` first (UC-02) → inspect rate plans and rate type IDs returned
2. Test if any rate plan ID can be used as `ExtraChargeId` to get a per-night rate
3. If not: raise eZee support ticket asking for "dynamic rate query by room type and dates"

---

### UC-05 — Add Extra Charge to Folio (Payment Sync)
**Workflows**: 06 (Payment), 07 (Pre-arrival Upsell), 08 (During-Stay Services), 09 (Stay Extension)
**Risk**: HIGH — financial write to eZee folio | **Status**: ENDPOINT NOT FOUND IN PUBLIC DOCS

**When**: Triggered by Razorpay `payment.captured` webhook → backend marks payment SUCCESS → publishes to SQS (`vibehouse-ops-tasks.fifo`) → Ops Task Worker calls this.

**Expected call** (to be confirmed):
```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Body:
{
  "HotelCode": "<HOTEL_CODE>",
  "AuthCode": "<AUTH_CODE>",
  "Request_Type": "AddExtraCharge",
  "BookingId": "<BOOKING_ID>",
  "ItemName": "Early Check-in",
  "Amount": 500.00,
  "PaymentStatus": "Paid",
  "PaymentRef": "<RAZORPAY_PAYMENT_ID>"
}
```

**Discovery plan** (Phase 3, Week 2):
1. Test `Request_Type: "AddExtraCharge"` on Kiosk Connectivity with a test booking
2. If that fails, test same on PMS Connectivity
3. Raise eZee support ticket: "Folio write / extra charge API for confirmed reservation"
4. Check eZee Partner Portal for extended docs

**Failure handling** (in production): All attempts logged to `ezee_sync_log`. Retried up to 3× (5 min, 15 min, 30 min). After 3 failures → `FAILED_PERMANENT` → admin dashboard alert for manual resolution.

---

### UC-06 — Update Reservation Checkout Date (Stay Extension)
**Workflow**: 09 — Stay Extension, Step 5
**Risk**: HIGH — modifies booking | **Status**: ENDPOINT NOT FOUND IN PUBLIC DOCS

**When**: Stay extension payment confirmed → SQS message → Ops Task Worker updates eZee checkout date.

**Expected call** (to be confirmed):
```
POST https://live.ipms247.com/pmsinterface/pms_connectivity.php
  OR
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Body:
{
  "HotelCode": "<HOTEL_CODE>",
  "AuthCode": "<AUTH_CODE>",
  "Request_Type": "ModifyReservation",    // or "UpdateReservation" — TBD
  "BookingId": "<BOOKING_ID>",
  "CheckOutDate": "YYYY-MM-DD"
}
```

**Discovery plan**: Same approach as UC-05. After checkout date update succeeds in eZee, also:
- Update `ezee_booking_cache.checkout_date` locally
- Revoke old MyGate PIN → generate new PIN valid until new checkout + 30 min
- Send WhatsApp with new PIN

**Fallback** (if API doesn't exist): Update `ezee_booking_cache` locally. Flag in `ezee_sync_log` with `MANUAL_REQUIRED` status. Ops staff updates checkout date in eZee dashboard manually.

---

## 4. SQS Events Fired After eZee Status Changes (Sync Worker)

This replaces the kiosk-driven triggers from the original design. The sync worker now drives downstream actions when it detects status changes from eZee:

| eZee Status Change | SQS Queue | SQS Message | Ops Task Worker Action |
|---|---|---|---|
| `CONFIRMED → CHECKED_IN` | `vibehouse-ops-tasks.fifo` | `checkin_detected` | Generate MyGate PIN → insert `smart_lock_access` → publish to `vibehouse-notify` |
| `CHECKED_IN → CHECKED_OUT` | `vibehouse-ops-tasks.fifo` | `checkout_detected` | Revoke MyGate PIN → update `smart_lock_access` → check overdue borrowables → publish to `vibehouse-notify` |

**Important**: These events fire based on what eZee's reservation status says — not on any action from our system. The ops staff's actions in eZee dashboard become the trigger source.

---

## 5. Rate Limits

Not documented by eZee. Strategy:

| Scenario | Approach |
|----------|---------|
| Sync Worker (20+ bookings) | 300ms delay between calls → ~6-10 sec per cycle |
| On-demand reads (booking linking, availability) | Single calls, no throttle needed |
| Rate limit hit (HTTP 429 or eZee error) | Token bucket: max 1 req / 500ms |

Redis cache TTLs to minimize redundant calls:
- Booking data (`get_reservation`): 30 min
- Room info / master data: 24 hours
- Room availability: 5 min

---

## 6. Undocumented Endpoints — Discovery Plan

| Endpoint | Expected Surface | Discovery Steps |
|----------|-----------------|----------------|
| **AddExtraCharge** (folio write) | Kiosk Connectivity | 1. Test `Request_Type: "AddExtraCharge"` on Kiosk · 2. Try PMS Connectivity · 3. eZee support ticket |
| **ModifyReservation** (update checkout) | PMS or Kiosk Connectivity | 1. Test `"ModifyReservation"` · 2. Test `"UpdateReservation"` · 3. eZee support ticket |

**Pre-requisite for Phase 3**: Get one designated test booking ID from eZee (or create a test reservation). All discovery tests run against that booking only.

---

## 7. Testing Order & Risk

| # | Use Case | Endpoint | Risk | Week |
|---|----------|----------|------|------|
| 1 | Auth / hotel info check | PMS Connectivity | LOW | Week 1 |
| 2 | Get Reservation Details | Channel Bookings `get_reservation` | LOW | Week 1 |
| 3 | Room Info (master data) | PMS Connectivity `RoomInfo` | LOW | Week 1 |
| 4 | Room Availability | Kiosk `RoomAvailability` | LOW | Week 1 |
| 5 | Rate Lookup | Reservation API `CalculateExtraCharge` | LOW | Week 1 |
| 6 | Add Extra Charge (folio) | TBD — discovery | HIGH | Week 2 |
| 7 | Modify Reservation (checkout date) | TBD — discovery | HIGH | Week 2 |

> **Rule**: All HIGH risk calls use the designated test booking only. No write calls against live guest reservations.

---

## 8. NestJS Service Architecture (Preview — Built in Phase 2)

```
backend/src/
  integrations/
    ezee/
      ezee.module.ts          — imports HttpModule, exports EzeeService
      ezee.service.ts         — all eZee HTTP calls (axios)
      ezee.types.ts           — TypeScript interfaces for all req/res shapes
      ezee-sync.service.ts    — scheduled cron; polls reservations; detects status changes; fires SQS
```

### EzeeService Method Map

| Method | Use Case | Risk |
|--------|----------|------|
| `getReservation(reservationId)` | UC-01 | LOW |
| `getRoomInfo()` | UC-02 | LOW |
| `getRoomAvailability(checkIn, checkOut, roomId?)` | UC-03 | LOW |
| `getRateForDates(checkIn, checkOut, ...)` | UC-04 | LOW |
| `addExtraCharge(bookingId, item, amount, paymentRef)` | UC-05 | HIGH |
| `modifyReservationCheckout(reservationId, newCheckoutDate)` | UC-06 | HIGH |

`EzeeSyncService` (scheduled):
- `syncAll()` — runs every 30 min via `@Cron`; calls `getReservation()` for each active booking; diffs status; sends SQS messages on state changes

---

## 9. Phase 2 & 3 Outputs

| Phase | Output | File |
|-------|--------|------|
| **Phase 2** | API routes doc — exact request/response shapes, curl examples, test notes per endpoint | `docs/api_routes/11_ezee_pms.md` |
| **Phase 3** | Live test results — actual eZee responses per endpoint | `docs/api_testing/ezee_test_results.md` |
