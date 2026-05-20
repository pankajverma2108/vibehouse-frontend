# eZee PMS API: Multi-Night Booking Resolution

**Date**: 2026-04-02
**Status**: ✅ RESOLVED

## The Problem
Single-night bookings via `InsertBooking` worked perfectly, but any booking for >1 night failed consistently with:
```json
{"Error Details":{"Error_Code":"InvalidData","Error_Message":"Please check data passed."}}
```
Various attempts to format the `baserate` (sending total float, per-night float, JS arrays, JSON objects keyed by date) all failed.

## The Root Cause
Through documentation research and reverse engineering the eZee payload structure, the exact requirement was discovered:

For multi-night bookings, **all rate-related fields must be comma-separated strings** containing exactly one value for each night of the stay.

Furthermore, **this rule applies not just to `baserate`, but also to `extradultrate` and `extrachildrate`**. If you send `"500,500"` for a 2-night `baserate` but leave `extradultrate` as `"0"`, the API will crash with `InvalidData` because the comma-separated arrays are of disproportionate lengths.

## The Solution

To book a 2-night stay (e.g., April 7 to April 9), the `Room_Details` payload must look like this:

```json
"Room_1": {
  "Rateplan_Id": "6076500000000000001",
  "Ratetype_Id": "6076500000000000001",
  "Roomtype_Id": "6076500000000000001",
  "baserate": "500,500",           // 2 values for 2 nights
  "extradultrate": "0,0",          // MUST also be 2 values
  "extrachildrate": "0,0",         // MUST also be 2 values
  "number_adults": "1",
  "number_children": "0",
  ...
}
```

### Required Code Changes (For the SQS Worker)
In `backend/src/ezee/ezee.service.ts` or `ezee-sync.worker.ts`, we need to change how `baserate` and extra rates are constructed.

Instead of this (which breaks multi-night):
```typescript
const totalRate = room.ratePerNight * room.numberOfNights;
baserate: String(totalRate),
extradultrate: "0",
extrachildrate: "0"
```

We must do this:
```typescript
const perNightRates = Array(room.numberOfNights).fill(room.ratePerNight).join(',');
const perNightZeros = Array(room.numberOfNights).fill("0").join(',');

// Result for 2 nights:
// perNightRates variable becomes "500,500"
// perNightZeros variable becomes "0,0"

baserate: perNightRates,
extradultrate: perNightZeros,
extrachildrate: perNightZeros
```

## Verification
A 2-night test booking (Apr 7 to Apr 9) was sent to `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking` using the correct comma-separated format.
**Result:** 
```json
{"ReservationNo": "42", "SubReservationNo": ["42"], "Inventory_Mode": "REGULAR", "lang_key": "en", "contactunkid": "6076500000000000046"}
```
Booking #42 was successfully created. The issue is officially closed.
