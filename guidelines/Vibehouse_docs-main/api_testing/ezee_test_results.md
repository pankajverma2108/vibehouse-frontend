# eZee PMS API — Test Results

> **Date**: 2026-03-26 (initial), **2026-03-30** (booking flow E2E)
> **Environment**: Production (`https://live.ipms247.com`)
> **Hotel**: Vibe House Kormangala (Hotel Code: 60765, Hotel UID: 69227)
> **Tester**: Automated (curl via bash)
> **Note**: Production creds — no sandbox. Test dates capped at April 14, 2026 (pre-soft-launch).

---

## Critical Finding — Wrong Body Format Was Causing All 500 Errors

Our initial tests on PMS Connectivity and Kiosk Connectivity all returned 500. This was **not a module activation issue** — it was a wrong request body format. The public docs at `https://api.ezeetechnosys.com/` show that these endpoints require a `RES_Request` wrapper:

```json
// WRONG (what we sent initially):
{ "HotelCode": "60765", "AuthCode": "...", "Request_Type": "RoomAvailability" }

// CORRECT (from official docs):
{
  "RES_Request": {
    "Request_Type": "RoomAvailability",
    "Authentication": { "HotelCode": "60765", "AuthCode": "..." },
    "RoomData": { ... }
  }
}
```

Once corrected, PMS Connectivity and Kiosk Connectivity both work.

---

## Summary

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | POS2PMS `gethotelinfo` | ✅ | Auth confirmed, hotel name returned |
| 2 | Reservation API `HotelList` | ✅ | Full hotel metadata returned |
| 3 | Reservation API `RoomTypeList` | ✅ | 2 room types returned |
| 4 | Kiosk `RoomAvailability` | ✅ | 39 rooms returned across 2 types |
| 5 | PMS Connectivity `RoomInfo` | ✅ | Room types, rate types, rate plans returned |
| 6 | PMS Connectivity `Bookings` | ✅ | Working — "No Reservation Found" (empty hotel) |
| 7 | Kiosk `AddExtraCharge` | ✅ | Format confirmed — error 113 (needs real booking ID) |
| 8 | Reservation API `RoomList` | ✅ | Availability + live rates + tax breakdown returned |
| 9 | PMS Connectivity `FetchSingleBooking` | ✅ | Working — 503 "No Reservation Found" (needs real ID) |
| 10 | Channel Bookings `get_reservation` | ✅ | Fixed format — returns success (no data for test ID) |
| 11 | Channel Bookings `get_calendar` | ✅ | Today's check-ins/check-outs — empty (no bookings) |
| 12 | Kiosk `RetrievePayMethods` | ✅ | Cash, Credit Card, Debit Card — with IDs |
| 13 | Reservation API `CalculateExtraCharge` | ⚠️ | Live endpoint; returns "No Data" — no add-ons configured |
| 14 | Reservation API `InsertBooking` | ✅ | **RESOLVED** — form-data body + query params (not JSON body) |
| 15 | Reservation API `ConfiguredPGList` | ⚠️ | Returns -1 "No Data" — no gateways configured (not needed) |
| 16 | Kiosk `AssignRoom` | ✅ | Room assignment working — room 101 assigned to booking 7 |
| 17 | Reservation API `ProcessBooking` | ✅ | Booking confirmed successfully |
| 18 | Kiosk `AddPayment` | ✅ | Payment ₹525 recorded in folio (Receipt #1) |
| 19 | PMS `FetchSingleBooking` | ✅ | Full booking details verified (room, payment, tax) |
| 20 | Channel `get_reservation` (real ID) | ✅ | Returns full booking data for reservation 7 |
| 21 | Kiosk `RoomAvailability` (post-booking) | ✅ | Room 101 correctly removed from availability |
| 22 | Kiosk `AddExtraCharge` | ⚠️ | Needs valid ChargeId — no extra charges configured in eZee |

### Critical Fixes Discovered
1. `get_reservation` on `vacation_rental.php` was using wrong format all along — `request_type` must be at the **top level**, not inside the `body` key. See Test 10 below.
2. `InsertBooking` must use **form-data body** with query params — NOT JSON body. See Test 17 below.
3. `AddPayment` does NOT accept `PaymentMode` or `PaymentComment` fields (error 116). Only `BookingId`, `PaymentId`, `CurrencyId`, `Payment`. See Test 20 below.

---

## Detailed Results

### Test 1 — POS2PMS: Hotel Auth Check ✅

**Endpoint**: `POST https://live.ipms247.com/index.php/page/service.pos2pms`

**Request**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<root><auth>****</auth><oprn>gethotelinfo</oprn></root>
```

**Response**:
```xml
<response>
  <status>ok</status>
  <msg>success</msg>
  <hotelname>Vibe House Kormangala</hotelname>
  <hotelcode>60765</hotelcode>
</response>
```

---

### Test 2 — Reservation API: HotelList ✅

**Endpoint**: `GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=HotelList&HotelCode=60765&APIKey=****`

**Key values confirmed**:
- `hotelunkid`: `69227`
- `Hotel_Code`: `60765`
- `Hotel_Name`: `Vibe House Kormangala`
- `CurrencyCode`: `INR`
- `BookingEngineURL`: `https://live.ipms247.com/booking/book-rooms-vibehousekormangala`

---

### Test 3 — Reservation API: RoomTypeList ✅

**Endpoint**: `GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=RoomTypeList&HotelCode=60765&APIKey=****`

**Response**:
```json
[
  { "roomtypeunkid": "6076500000000000001", "roomtype": "Bed in Dormitory" },
  { "roomtypeunkid": "6076500000000000002", "roomtype": "Deluxe" }
]
```

---

### Test 4 — Kiosk Connectivity: RoomAvailability ✅

**Endpoint**: `POST https://live.ipms247.com/index.php/page/service.kioskconnectivity`

**Correct request format** (with `RES_Request` wrapper):
```json
{
  "RES_Request": {
    "Request_Type": "RoomAvailability",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" },
    "RoomData": { "from_date": "2026-03-28", "to_date": "2026-04-05" }
  }
}
```

**Response** — all 39 rooms returned:
```json
{
  "Success": {
    "RoomList": [
      {
        "RoomtypeID": "6076500000000000001",
        "RoomtypeName": "Bed in Dormitory",
        "RoomData": [
          { "RoomID": "6076500000000000001", "RoomName": "101" },
          { "RoomID": "6076500000000000002", "RoomName": "102" },
          "... (24 rooms total: 101–124)"
        ]
      },
      {
        "RoomtypeID": "6076500000000000002",
        "RoomtypeName": "Deluxe",
        "RoomData": [
          { "RoomID": "6076500000000000025", "RoomName": "201" },
          "... (15 rooms total: 201–215)"
        ]
      }
    ]
  },
  "Errors": { "ErrorCode": "0", "ErrorMessage": "Success" }
}
```

**Room inventory confirmed**:

| Room Type | Count | Room Numbers | ID Range |
|-----------|-------|-------------|---------|
| Bed in Dormitory | 24 | 101 – 124 | `6076500000000000001` – `6076500000000000024` |
| Deluxe | 15 | 201 – 215 | `6076500000000000025` – `6076500000000000039` |

**Note for same-bed check (stay extension)**: Pass `RoomtypeID` and `RoomID` inside `RoomData` to check specific room availability.

---

### Test 5 — PMS Connectivity: RoomInfo ✅

**Endpoint**: `POST https://live.ipms247.com/pmsinterface/pms_connectivity.php`

**Request**:
```json
{
  "RES_Request": {
    "Request_Type": "RoomInfo",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" }
  }
}
```

**Response**:
```json
{
  "RoomInfo": {
    "RoomTypes": {
      "RoomType": [
        { "ID": "6076500000000000001", "Name": "Bed in Dormitory" },
        { "ID": "6076500000000000002", "Name": "Deluxe" }
      ]
    },
    "RateTypes": {
      "RateType": [{ "ID": "6076500000000000001", "Name": "Room Only" }]
    },
    "RatePlans": {
      "RatePlan": [
        {
          "RatePlanID": "6076500000000000001",
          "Name": "Bed in Dormitory - Room Only (EP)",
          "RoomTypeID": "6076500000000000001",
          "RoomType": "Bed in Dormitory",
          "RateTypeID": "6076500000000000001",
          "RateType": "Room Only"
        },
        {
          "RatePlanID": "6076500000000000002",
          "Name": "Deluxe - Room Only (EP)",
          "RoomTypeID": "6076500000000000002",
          "RoomType": "Deluxe",
          "RateTypeID": "6076500000000000001",
          "RateType": "Room Only"
        }
      ]
    }
  }
}
```

**Key IDs for use in other API calls**:

| Entity | Name | ID |
|--------|------|----|
| Room Type | Bed in Dormitory | `6076500000000000001` |
| Room Type | Deluxe | `6076500000000000002` |
| Rate Type | Room Only | `6076500000000000001` |
| Rate Plan | Bed in Dormitory - Room Only (EP) | `6076500000000000001` |
| Rate Plan | Deluxe - Room Only (EP) | `6076500000000000002` |

---

### Test 6 — PMS Connectivity: Bookings ✅

**Endpoint**: `POST https://live.ipms247.com/pmsinterface/pms_connectivity.php`

**Request**:
```json
{
  "RES_Request": {
    "Request_Type": "Bookings",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" }
  }
}
```

**Response**: `{"Reservations": "No Reservation Found"}`

Endpoint is working. No reservations exist yet in the system.

---

### Test 7 — Kiosk: AddExtraCharge ✅ (format confirmed, needs real BookingId)

**Endpoint**: `POST https://live.ipms247.com/index.php/page/service.kioskconnectivity`

**Correct request format**:
```json
{
  "RES_Request": {
    "Request_Type": "AddExtraCharge",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" },
    "Reservation": [
      {
        "BookingId": "<REAL_BOOKING_ID>",
        "ChargeId": "<CHARGE_ID>",
        "Amount": "500",
        "Qty": "1",
        "Comment": "Early check-in"
      }
    ]
  }
}
```

**Response with dummy BookingId "TEST-001"**:
```json
{
  "Errors": [{
    "ErrorCode": 113,
    "ErrorMessage": "We don't find this reservation in our system. So extra charge is not processed for booking TEST-001"
  }]
}
```

Endpoint is live and authenticated correctly. Error 113 = booking not found, which is expected. Will work once a real BookingId is provided.

---

### Test 8 — Channel Bookings: get_reservation ⚠️

**Endpoint**: `POST https://live.ipms247.com/channelbookings/vacation_rental.php`

**Correct format** (confirmed through testing — body must be wrapped in `body` key):
```json
// Header: AUTH_CODE: ****
{
  "body": {
    "request_type": "get_reservation",
    "hotel_id": "60765",
    "reservation_id": "<REAL_RESERVATION_ID>"
  }
}
```

**Old result** (wrong format with `request_type` inside `body`): Error 105.

**See Test 10 below for corrected format and result.**

---

### Test 9 — Reservation API: CalculateExtraCharge ⚠️

**Endpoint**: `GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=CalculateExtraCharge&...`

Returns `-1 No Data found` because no extra charge items are configured in this hotel's eZee account yet. This endpoint is for pre-configured add-on items (airport transfer, breakfast, etc.) — **not for nightly room rate lookup**.

---

### Test 10 — Channel Bookings: `get_reservation` ✅ (format corrected)

**The format we were using was wrong.** The official Postman collection shows `request_type` at the top level, not inside `body`.

**Correct format**:
```json
{
  "request_type": "get_reservation",
  "body": {
    "hotel_id": "60765",
    "reservation_id": "<REAL_ID>"
  }
}
```

**Wrong format (what we had before)**:
```json
{
  "body": {
    "request_type": "get_reservation",
    "hotel_id": "60765",
    "reservation_id": "<REAL_ID>"
  }
}
```

**Response with corrected format + dummy ID**:
```json
{"status": "success", "data": "No Reservation Data Available"}
```

Auth works, format is correct. Needs a real reservation ID to return actual data.

---

### Test 11 — Channel Bookings: `get_calendar` ✅

**Endpoint**: `POST https://live.ipms247.com/channelbookings/vacation_rental.php`

```json
{
  "request_type": "get_calendar",
  "body": {
    "hotel_id": "60765",
    "report_type": "both"
  }
}
```

**Response**: `{"status": "success", "data": []}` — Working. Empty because no bookings exist yet.

Use for: daily ops view of who is checking in/out today.

---

### Test 12 — Reservation API: `RoomList` ✅ (availability + live rates)

**Endpoint**: `GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=RoomList&HotelCode=60765&APIKey=****&check_in_date=2026-04-01&check_out_date=2026-04-02`

This is the correct request type for availability + rate lookup (not `RoomAvailability` which is Kiosk-only).

**Confirmed live rates** (as of 2026-03-26):

| Room Type | Base Rate | Tax | Total per Night |
|-----------|-----------|-----|-----------------|
| Bed in Dormitory | ₹500 | ₹25 (SGST+CGST slab) | ₹525 |
| Deluxe | ₹1,500 | ₹75 (SGST+CGST slab) | ₹1,575 |

**Tax slabs** (same for both room types):
- Up to ₹7,500: SGST 2.5% + CGST 2.5% = **5% total**
- Above ₹7,500: SGST 9% + CGST 9% = **18% total**

**Availability** (2026-04-01): Dormitory 24 available, Deluxe 15 available.

Key fields for use in `InsertBooking`:
- `roomrateunkid` (= `Rateplan_Id`) for Dormitory: `6076500000000000001`
- `roomrateunkid` (= `Rateplan_Id`) for Deluxe: `6076500000000000002`
- `ratetypeunkid` (= `Ratetype_Id`) for both: `6076500000000000001`

---

### Test 13 — PMS Connectivity: `FetchSingleBooking` ✅

**Endpoint**: `POST https://live.ipms247.com/pmsinterface/pms_connectivity.php`

```json
{
  "RES_Request": {
    "Request_Type": "FetchSingleBooking",
    "BookingId": "<BOOKING_ID>",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" }
  }
}
```

**Response with dummy ID**: `{"error": {"code": "503", "message": "No Reservation Found."}}` — Working correctly. Will return full booking data when a real `BookingId` is provided.

---

### Test 14 — Kiosk: `RetrievePayMethods` ✅

**Endpoint**: `POST https://live.ipms247.com/index.php/page/service.kioskconnectivity`

**Response**:
```json
{
  "Success": {
    "PayMethods": [
      { "PayMethodID": "6076500000000000002", "PaymentID": "6076500000000000013", "Name": "Cash", "Type": "Cash" },
      { "PayMethodID": "6076500000000000003", "PaymentID": "6076500000000000014", "Name": "Credit Card", "Type": "Bank" },
      { "PayMethodID": "6076500000000000004", "PaymentID": "6076500000000000015", "Name": "Debit Card", "Type": "Bank" }
    ]
  }
}
```

These `PayMethodID` values are used in `AddPayment` (Kiosk) when posting a payment against a booking. These are **internal PMS payment methods** — not online booking engine gateways.

---

### Test 15 — Reservation API: `InsertBooking` ❌ (blocked — no payment gateway)

**Endpoint**: `GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&...`

Tested 3 times with progressively more complete payloads:
1. Missing `extradultrate`, `extrachildrate` → `ParametersMissing`
2. All fields per official Postman spec, `paymenttypeunkid: ""` → `ParametersMissing`
3. Using Kiosk PayMethodID as `paymenttypeunkid` → `ParametersMissing`

Root cause: see `docs/blockers/ezee_booking_creation_blocker.md`. Requires an online payment gateway to be configured in eZee's booking engine first.

---

### Test 16 — Reservation API: `ConfiguredPGList` ❌

**Endpoint**: `GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ConfiguredPGList&HotelCode=60765&APIKey=****`

**Response**: `[{"Error Details": {"Error_Code": -1, "Error_Message": "No Data found."}}]`

No online payment gateways configured in eZee's booking engine. This is the root cause of `InsertBooking` failure.

---

## Master ID Reference (Use in All eZee API Calls)

| Entity | Name | ID |
|--------|------|----|
| Hotel Code | Vibe House Kormangala | `60765` |
| Hotel UID | Internal eZee ID | `69227` |
| Room Type | Bed in Dormitory | `6076500000000000001` |
| Room Type | Deluxe | `6076500000000000002` |
| Rate Type | Room Only | `6076500000000000001` |
| Rate Plan | Bed in Dormitory - Room Only (EP) | `6076500000000000001` |
| Rate Plan | Deluxe - Room Only (EP) | `6076500000000000002` |
| Rooms (Dormitory) | 101 – 124 | `6076500000000000001` – `6076500000000000024` |
| Rooms (Deluxe) | 201 – 215 | `6076500000000000025` – `6076500000000000039` |
| Pay Method | Cash | `6076500000000000002` (PayMethodID) / `6076500000000000013` (PaymentID) |
| Pay Method | Credit Card | `6076500000000000003` (PayMethodID) / `6076500000000000014` (PaymentID) |
| Pay Method | Debit Card | `6076500000000000004` (PayMethodID) / `6076500000000000015` (PaymentID) |

---

---

## 2026-03-30 — Full Booking Flow E2E Tests

### Breakthrough: InsertBooking Format Fix

**Root cause**: eZee's official API docs show InsertBooking with JSON body. This is WRONG. The correct format is:
- `request_type`, `HotelCode`, `APIKey` → **query parameters**
- `BookingData` → **form-data in request body** (URL-encoded JSON string)

This was confirmed by eZee support: *"send the booking data in the request body as form-data, and keep ApiKey, HotelCode, and RequestType in the query parameters."*

---

### Test 17 — InsertBooking ✅ (RESOLVED — format fixed)

**Endpoint**: `POST https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode=60765&APIKey=****`

**Request** (form-data body, NOT JSON):
```bash
BOOKING_DATA='{"Room_Details":{"Room_1":{"Rateplan_Id":"6076500000000000001","Ratetype_Id":"6076500000000000001","Roomtype_Id":"6076500000000000001","baserate":"500","extradultrate":"0","extrachildrate":"0","number_adults":"1","number_children":"0","ExtraChild_Age":"","Title":"Mr","First_Name":"Claude","Last_Name":"TestBot","Gender":"Male","SpecialRequest":""}},"check_in_date":"2026-04-07","check_out_date":"2026-04-08","Booking_Payment_Mode":"","Email_Address":"test@vibehouse.in","Source_Id":"","MobileNo":"9999999999","Address":"Mumbai","State":"Maharashtra","Country":"India","City":"Mumbai","Zipcode":"400001","Fax":"","Device":"","Languagekey":"en","paymenttypeunkid":""}'

curl -s -X POST "https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode=60765&APIKey=****" \
  --data-urlencode "BookingData=$BOOKING_DATA"
```

**Response**:
```json
{
  "ReservationNo": "7",
  "SubReservationNo": ["7"],
  "Inventory_Mode": "REGULAR",
  "lang_key": "en",
  "contactunkid": "6076500000000000011"
}
```

✅ Booking created. `paymenttypeunkid` and `Booking_Payment_Mode` can be empty strings — no payment gateway configuration needed.

**Key learnings**:
- `--data-urlencode "BookingData=<JSON>"` is the correct curl format
- NOT `Content-Type: application/json` — it's form-data
- Booking is created as **UNASSIGNED** (no room assigned yet)

---

### Test 18 — AssignRoom ✅

**Endpoint**: `POST https://live.ipms247.com/index.php/page/service.kioskconnectivity`

**Request**:
```json
{
  "RES_Request": {
    "Request_Type": "AssignRoom",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" },
    "RoomAssign": [
      {
        "BookingId": "7",
        "RoomTypeID": "6076500000000000001",
        "RoomID": "6076500000000000001"
      }
    ]
  }
}
```

**Response**:
```json
{
  "Success": { "SuccessMsg": "Room Assignment is successfully done for Booking 7" },
  "Errors": [{ "ErrorCode": "0", "ErrorMessage": "Success" }]
}
```

✅ Room 101 (Bed in Dormitory) assigned to reservation 7.

---

### Test 19 — ProcessBooking (ConfirmBooking) ✅

**Endpoint**: `GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ProcessBooking&HotelCode=60765&APIKey=****&Process_Data={"Action":"ConfirmBooking","ReservationNo":"7","Inventory_Mode":"REGULAR","Error_Text":""}`

**Response**:
```json
{ "result": "success", "message": "Booking Processed Succesfully" }
```

✅ Booking 7 confirmed.

---

### Test 20 — AddPayment ✅ (after fixing invalid fields)

**Endpoint**: `POST https://live.ipms247.com/index.php/page/service.kioskconnectivity`

**First attempt** (FAILED — invalid fields):
```json
{
  "RES_Request": {
    "Request_Type": "AddPayment",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" },
    "Reservation": [{
      "BookingId": "7",
      "PaymentId": "6076500000000000013",
      "CurrencyId": "6076500000000000001",
      "Payment": "525",
      "PaymentMode": "Cash",
      "PaymentComment": "Razorpay payment recorded - test"
    }]
  }
}
```
→ Error 116: `Invalid parameter (PaymentMode)` and `Invalid parameter (PaymentComment)`

**Corrected request** (only 4 fields):
```json
{
  "RES_Request": {
    "Request_Type": "AddPayment",
    "Authentication": { "HotelCode": "60765", "AuthCode": "****" },
    "Reservation": [{
      "BookingId": "7",
      "PaymentId": "6076500000000000013",
      "CurrencyId": "6076500000000000001",
      "Payment": "525"
    }]
  }
}
```

**Response**:
```json
{
  "Success": {
    "SuccessMsg": "Payment done successfully for booking 7",
    "Receipt": [{ "BookingId": "7", "ReceiptNo": "1" }]
  },
  "Errors": [{ "ErrorCode": "0", "ErrorMessage": "Success" }]
}
```

✅ ₹525 recorded as Cash payment. Receipt #1 issued.

**Key learning**: AddPayment accepts ONLY `BookingId`, `PaymentId`, `CurrencyId`, `Payment`. Any extra fields (PaymentMode, PaymentComment, Description, etc.) cause error 116.

---

### Test 21 — FetchSingleBooking (verification) ✅

**Endpoint**: `POST https://live.ipms247.com/pmsinterface/pms_connectivity.php`

**Response** (key fields for reservation 7):
```json
{
  "CurrentStatus": "Confirmed Reservation",
  "IsConfirmed": "1",
  "RoomID": "6076500000000000001",
  "RoomName": "101",
  "RoomTypeName": "Bed in Dormitory",
  "Start": "2026-04-07",
  "End": "2026-04-08",
  "TotalAmountAfterTax": "525.00",
  "TotalAmountBeforeTax": "500.00",
  "TotalTax": "25.00",
  "TotalPayment": "525.00",
  "FirstName": "Claude",
  "LastName": "TestBot",
  "Email": "test@vibehouse.in",
  "Mobile": "9999999999",
  "Source": "Internet Booking Engine",
  "TaxDeatil": [
    { "TaxCode": "SGST", "TaxAmount": "12.5000" },
    { "TaxCode": "CGST", "TaxAmount": "12.5000" }
  ],
  "PaymentDetail": [
    { "amount": "525.0000", "datetime": "2026-03-30 17:29:49", "method": "Cash" }
  ]
}
```

✅ Booking fully verified: room assigned (101), payment recorded (₹525), taxes calculated (SGST + CGST = ₹25).

---

### Test 22 — get_reservation with Real Booking ID ✅

**Endpoint**: `POST https://live.ipms247.com/channelbookings/vacation_rental.php`

**Response** for reservation 7:
```json
{
  "status": "success",
  "data": [{
    "hotel_id": "60765",
    "hotel_name": "Vibe House Kormangala",
    "room_id": "6076500000000000001",
    "room_name": "Bed in Dormitory",
    "room_code": "101",
    "reservation_id": "7",
    "booking_status": "Confirmed Reservation",
    "guest_name": "Mr. Claude TestBot",
    "check_in": "2026-04-07 12:00:00",
    "check_out": "2026-04-08 11:00:00",
    "total_amount": 525,
    "currency": "INR",
    "channel": "Internet Booking Engine",
    "payment_type": "Pay At Hotel"
  }]
}
```

✅ Full reservation details returned. `room_code` = "101" confirms room assignment visible in this endpoint too.

---

### Test 23 — RoomAvailability Post-Booking ✅

**Result**: Dormitory shows **23 available** beds (was 24). Room 101 correctly removed from availability list for Apr 7-8.

✅ Inventory correctly decremented after room assignment.

---

### Test 24 — AddExtraCharge ⚠️ (blocked — no ChargeIds configured)

Tested with `ChargeId: "1"`:
```json
{ "ErrorCode": "110", "ErrorMessage": "Charge ID is not valid or voucherno is not on AUTOGENERAL mode for booking 7." }
```

**Root cause**: No extra charge items are configured in the eZee hotel admin panel. The `ChargeId` must reference a pre-configured item.

**Action needed**: Ops team must configure extra charge items (Bath Towel, Early Check-in, etc.) in eZee dashboard → Settings → Extra Charges. Then retrieve the ChargeIds and use them in the API call.

---

## Confirmed Working Flow (E2E Tested 2026-03-30)

```
Step 1: RoomAvailability     → Find free rooms          ✅
Step 2: InsertBooking        → Create reservation       ✅ (form-data, NOT JSON)
Step 3: ProcessBooking       → Confirm booking           ✅
Step 4: AssignRoom           → Assign physical room      ✅
Step 5: AddPayment           → Record payment in folio   ✅
Step 6: FetchSingleBooking   → Verify all data           ✅
Step 7: get_reservation      → Channel-side verification ✅
```

**Test reservation created**: #7 — Claude TestBot, Room 101 (Dormitory), Apr 7-8, ₹525 paid.

---

## Remaining Blockers (Updated 2026-03-30)

| # | Blocker | Who | Priority | Status |
|---|---------|-----|----------|--------|
| ~~1~~ | ~~InsertBooking format~~ | ~~eZee support~~ | ~~P0~~ | ✅ RESOLVED — form-data body |
| ~~2~~ | ~~Real reservation ID~~ | ~~Ops~~ | ~~P1~~ | ✅ RESOLVED — reservation 7 created |
| 3 | AddExtraCharge needs configured ChargeIds | Ops — eZee admin panel → configure extra charges | P1 — blocks folio charge sync |
