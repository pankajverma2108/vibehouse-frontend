# eZee API — Blockers & Findings

> **Date**: 2026-03-26
> **Property**: Vibe House Kormangala
> **Hotel Code**: 60765

---

## Update — Previous "Blockers" Were a Format Issue (Now Resolved)

Earlier tests on PMS Connectivity and Kiosk Connectivity returned 500 errors on every call. This was **not a module activation issue** — the request body format was wrong. The official docs at `https://api.ezeetechnosys.com/` specify that these endpoints require a `RES_Request` wrapper:

```json
// Wrong format (caused all 500 errors):
{ "HotelCode": "60765", "AuthCode": "...", "Request_Type": "RoomAvailability" }

// Correct format (from official docs):
{
  "RES_Request": {
    "Request_Type": "RoomAvailability",
    "Authentication": { "HotelCode": "60765", "AuthCode": "..." },
    "RoomData": { ... }
  }
}
```

After fixing the format, both surfaces work. No eZee support needed for these.

---

## What Is Working

| Feature | Endpoint | Status |
|---------|----------|--------|
| Auth check | POS2PMS `gethotelinfo` | ✅ Working |
| Hotel metadata | Reservation API `HotelList` | ✅ Working |
| Room types | Reservation API `RoomTypeList` | ✅ Working |
| Room availability | Kiosk `RoomAvailability` (RES_Request format) | ✅ Working — 39 rooms returned |
| Room + rate plan info | PMS Connectivity `RoomInfo` (RES_Request format) | ✅ Working — all IDs retrieved |
| All reservations fetch | PMS Connectivity `Bookings` (RES_Request format) | ✅ Working |
| Folio charge (AddExtraCharge) | Kiosk `AddExtraCharge` (RES_Request format) | ✅ Format confirmed — needs real BookingId |
| Fetch reservation by ID | Channel Bookings `get_reservation` | ✅ Auth + format confirmed — needs real reservation ID |

---

## Remaining Blocker 1 — No Real Reservation ID to Test

**Severity**: High — **Resolvable internally, no eZee support needed**

**What**: `get_reservation` and `AddExtraCharge` both need a real eZee BookingId to complete testing.

**Fix**: Ops staff creates a dummy reservation in the eZee dashboard (1 night, any date before April 14, 2026) and shares the reservation ID with the tech team.

**Correct `get_reservation` format** (confirmed through testing):
```
POST https://live.ipms247.com/channelbookings/vacation_rental.php
Header: AUTH_CODE: ****

Body: { "body": { "request_type": "get_reservation", "hotel_id": "60765", "reservation_id": "<REAL_ID>" } }
```

---

## Remaining Blocker 2 — InsertBooking Needs Payment Gateway Configured

**Severity**: Critical for in-app booking feature — see `ezee_booking_creation_blocker.md` for full details.

**What**: `InsertBooking` (the only documented booking creation endpoint in eZee) requires a `paymenttypeunkid`. No payment gateways are configured in the hotel's eZee account — `ConfiguredPGList` returns "No Data found."

**Fix**: Configure a payment gateway in the eZee hotel admin panel (Razorpay, PayU, or "Pay at Hotel"). Then re-fetch `ConfiguredPGList` to get the ID and pass it in `InsertBooking`.

---

## Master ID Reference

| Entity | Name | ID |
|--------|------|----|
| Hotel Code | — | `60765` |
| Hotel UID | Internal eZee | `69227` |
| Room Type | Bed in Dormitory | `6076500000000000001` |
| Room Type | Deluxe | `6076500000000000002` |
| Rate Type | Room Only | `6076500000000000001` |
| Rate Plan | Bed in Dormitory - Room Only (EP) | `6076500000000000001` |
| Rate Plan | Deluxe - Room Only (EP) | `6076500000000000002` |
| Rooms (Dormitory) | 101 – 124 | `6076500000000000001` – `6076500000000000024` |
| Rooms (Deluxe) | 201 – 215 | `6076500000000000025` – `6076500000000000039` |
