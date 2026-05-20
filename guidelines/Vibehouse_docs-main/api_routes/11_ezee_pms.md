# eZee PMS API Routes

> **Environment**: Production (`https://live.ipms247.com`)
> **Date documented**: 2026-03-26
> **Testing constraint**: Test dates must not exceed 2nd week of April 2026 (soft launch after that)

---

## Credentials

| Variable | Env Key |
|----------|---------|
| Hotel Code | `HOTEL_CODE` (60765) |
| Auth Code | `AUTH_CODE` |
| PMS Base URL | `API_URL` (`https://live.ipms247.com/pmsinterface/pms_connectivity.php`) |
| Kiosk Base URL | `https://live.ipms247.com/index.php/page/service.kioskconnectivity` |
| Channel Bookings URL | `https://live.ipms247.com/channelbookings/vacation_rental.php` |
| Reservation API URL | `https://live.ipms247.com/booking/reservation_api/listing.php` |

---

## Auth Patterns (3 Types)

| Pattern | Surface | Method |
|---------|---------|--------|
| **Body auth** | PMS Connectivity, Kiosk Connectivity | `HotelCode` + `AuthCode` in POST JSON body |
| **Header auth** | Channel Bookings | `AUTH_CODE: <value>` HTTP header |
| **Query string** | Reservation API Listing | `&APIKey=<AUTH_CODE>` in GET URL |

---

## 1. PMS Connectivity — Room Info

**Use case**: UC-02 — Master data (room types, rate types, rate plans, physical rooms). One-time setup call.

```
POST https://live.ipms247.com/pmsinterface/pms_connectivity.php
Content-Type: application/json

{
  "Request_Type": "RoomInfo",
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "NeedPhysicalRooms": "1"
}
```

**Expected response fields**:
- `RoomTypes`: array of `{ RoomTypeId, RoomTypeName, ShortCode, MaxOccupancy }`
- `RateTypes`: array of rate type objects
- `RatePlans`: array with associated RoomTypeId
- `Rooms`: physical room list with `RoomId`, `RoomName/Number`, `RoomTypeId`

**Error codes**:
- `100` — missing parameters
- `301` — unauthorized (wrong HotelCode / AuthCode)
- `500` — processing error

**curl**:
```bash
curl -s -X POST "https://live.ipms247.com/pmsinterface/pms_connectivity.php" \
  -H "Content-Type: application/json" \
  -d '{"Request_Type":"RoomInfo","HotelCode":"60765","AuthCode":"AUTH_CODE","NeedPhysicalRooms":"1"}'
```

---

## 2. Reservation API — Hotel List (Auth Check)

**Use case**: Verify credentials work; get property metadata.

```
GET https://live.ipms247.com/booking/reservation_api/listing.php
  ?request_type=HotelList
  &HotelCode=60765
  &APIKey=AUTH_CODE
```

**Expected response**: hotel name, city, state, country, property type

**curl**:
```bash
curl -s "https://live.ipms247.com/booking/reservation_api/listing.php?request_type=HotelList&HotelCode=60765&APIKey=AUTH_CODE"
```

---

## 3. Reservation API — Room Type List

**Use case**: Get room type names and occupancy for display; supplement UC-02 data.

```
GET https://live.ipms247.com/booking/reservation_api/listing.php
  ?request_type=RoomTypeList
  &HotelCode=60765
  &APIKey=AUTH_CODE
```

**Expected response**: `roomtypeunkid`, `roomtype`, `shortcode`, occupancy fields

**curl**:
```bash
curl -s "https://live.ipms247.com/booking/reservation_api/listing.php?request_type=RoomTypeList&HotelCode=60765&APIKey=AUTH_CODE"
```

---

## 4. Kiosk Connectivity — Room Availability

**Use case**: UC-03 — Stay extension; check if same bed / room type is available for proposed dates.

```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Content-Type: application/json

{
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "Request_Type": "RoomAvailability",
  "check_in_date": "2026-03-28",
  "check_out_date": "2026-04-05"
}
```

**Variant — same-bed check** (pass specific RoomId):
```json
{
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "Request_Type": "RoomAvailability",
  "check_in_date": "2026-03-28",
  "check_out_date": "2026-04-05",
  "RoomId": "<ROOM_ID>"
}
```

**Expected response**: rooms grouped by room type with `RoomId` + room name/number

**curl**:
```bash
curl -s -X POST "https://live.ipms247.com/index.php/page/service.kioskconnectivity" \
  -H "Content-Type: application/json" \
  -d '{"HotelCode":"60765","AuthCode":"AUTH_CODE","Request_Type":"RoomAvailability","check_in_date":"2026-03-28","check_out_date":"2026-04-05"}'
```

---

## 5. Kiosk Connectivity — Identity Types

**Use case**: Get list of valid ID types (Passport, Aadhaar, etc.) for KYC form.

```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Content-Type: application/json

{
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "Request_Type": "RetrieveIdentityType"
}
```

**Expected response**: array of `{ IdentityTypeID, Name }`

**curl**:
```bash
curl -s -X POST "https://live.ipms247.com/index.php/page/service.kioskconnectivity" \
  -H "Content-Type: application/json" \
  -d '{"HotelCode":"60765","AuthCode":"AUTH_CODE","Request_Type":"RetrieveIdentityType"}'
```

---

## 6. Reservation API — Calculate Extra Charge (Rate Probe)

**Use case**: UC-04 — probe whether this endpoint can return nightly room rates for stay extension pricing.

```
GET https://live.ipms247.com/booking/reservation_api/listing.php
  ?request_type=CalculateExtraCharge
  &HotelCode=60765
  &APIKey=AUTH_CODE
  &check_in_date=2026-03-28
  &check_out_date=2026-03-29
  &ExtraChargeId=1
  &Total_ExtraItem=1
```

> **Note**: `ExtraChargeId=1` is a discovery probe. We expect either a rate value or an error indicating the charge ID doesn't exist. The actual extra charge IDs for the property come from the `RoomInfo` or a separate config call.

**curl**:
```bash
curl -s "https://live.ipms247.com/booking/reservation_api/listing.php?request_type=CalculateExtraCharge&HotelCode=60765&APIKey=AUTH_CODE&check_in_date=2026-03-28&check_out_date=2026-03-29&ExtraChargeId=1&Total_ExtraItem=1"
```

---

## 7. Channel Bookings — Get Reservation Details

**Use case**: UC-01 — Booking linking; fetch reservation by ID to populate `ezee_booking_cache`.

> **Requires**: A real eZee reservation ID (from an actual booking in the system).

```
POST https://live.ipms247.com/channelbookings/vacation_rental.php
AUTH_CODE: AUTH_CODE
Content-Type: application/json

// Body MUST be wrapped in a "body" key (confirmed by live testing):
{
  "body": {
    "request_type": "get_reservation",
    "hotel_id": "60765",
    "reservation_id": "<REAL_RESERVATION_ID>"
  }
}
```

**Expected response**: booker name, email, phone, room type, room number, unit code, check-in/out timestamps, booking status, guest count, total amount, channel/source

**Error codes**:
- `101` — invalid hotel
- `102` — auth failure
- `103-115` — missing params, authorization issues

**curl**:
```bash
curl -s -X POST "https://live.ipms247.com/channelbookings/vacation_rental.php" \
  -H "AUTH_CODE: AUTH_CODE" \
  -H "Content-Type: application/json" \
  -d '{"body":{"request_type":"get_reservation","hotel_id":"60765","reservation_id":"<REAL_RESERVATION_ID>"}}'
```

---

## 8. Discovery — Add Extra Charge (Folio Write)

**Use case**: UC-05 — Post-payment folio sync. Endpoint not documented in public docs; this is a discovery test.

> **Requires**: A real BookingId (checked-in reservation). Use designated test booking only.

**Attempt A — Kiosk Connectivity**:
```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Content-Type: application/json

{
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "Request_Type": "AddExtraCharge",
  "BookingId": "<TEST_BOOKING_ID>",
  "ItemName": "Test Charge - Ignore",
  "Amount": 1.00,
  "PaymentStatus": "Paid",
  "PaymentRef": "TEST-REF-001"
}
```

**Attempt B — PMS Connectivity** (if A fails):
```
POST https://live.ipms247.com/pmsinterface/pms_connectivity.php
Content-Type: application/json

{
  "Request_Type": "AddExtraCharge",
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "BookingId": "<TEST_BOOKING_ID>",
  "ItemName": "Test Charge - Ignore",
  "Amount": 1.00
}
```

---

## 9. Discovery — Modify Reservation (Update Checkout Date)

**Use case**: UC-06 — Stay extension; update reservation checkout date after payment.

> **Requires**: A real BookingId. Use designated test booking only.

**Attempt A — PMS Connectivity**:
```
POST https://live.ipms247.com/pmsinterface/pms_connectivity.php
Content-Type: application/json

{
  "Request_Type": "ModifyReservation",
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "BookingId": "<TEST_BOOKING_ID>",
  "CheckOutDate": "2026-04-10"
}
```

**Attempt B — Kiosk Connectivity** (if A fails):
```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Content-Type: application/json

{
  "HotelCode": "60765",
  "AuthCode": "AUTH_CODE",
  "Request_Type": "ModifyReservation",
  "BookingId": "<TEST_BOOKING_ID>",
  "CheckOutDate": "2026-04-10"
}
```

---

## 10. InsertBooking — Create Reservation

**Use case**: UC-07 — Create a new booking in eZee after Razorpay payment is confirmed.

> **Critical**: Booking data must be sent as **form-data in the request body**, with `ApiKey`, `HotelCode`, and `request_type` in the **query parameters**. The official docs at `api.ezeetechnosys.com` show the wrong format (JSON body). This was confirmed through live testing on 2026-03-30.

```
POST https://live.ipms247.com/booking/reservation_api/listing.php
  ?request_type=InsertBooking
  &HotelCode=60765
  &APIKey=AUTH_CODE

Body (form-data):
  BookingData = <JSON string below>
```

**BookingData JSON**:
```json
{
  "Room_Details": {
    "Room_1": {
      "Rateplan_Id": "6076500000000000001",
      "Ratetype_Id": "6076500000000000001",
      "Roomtype_Id": "6076500000000000001",
      "baserate": "500",
      "extradultrate": "0",
      "extrachildrate": "0",
      "number_adults": "1",
      "number_children": "0",
      "ExtraChild_Age": "",
      "Title": "Mr",
      "First_Name": "Test",
      "Last_Name": "Guest",
      "Gender": "Male",
      "SpecialRequest": ""
    }
  },
  "check_in_date": "2026-04-07",
  "check_out_date": "2026-04-08",
  "Booking_Payment_Mode": "",
  "Email_Address": "guest@vibehouse.in",
  "Source_Id": "",
  "MobileNo": "9999999999",
  "Address": "Mumbai",
  "State": "Maharashtra",
  "Country": "India",
  "City": "Mumbai",
  "Zipcode": "400001",
  "Fax": "",
  "Device": "",
  "Languagekey": "en",
  "paymenttypeunkid": ""
}
```

**Expected response**:
```json
{
  "ReservationNo": "7",
  "SubReservationNo": ["7"],
  "Inventory_Mode": "REGULAR",
  "lang_key": "en",
  "contactunkid": "6076500000000000011"
}
```

**Notes**:
- `paymenttypeunkid` can be left empty — no online payment gateway needed
- `Booking_Payment_Mode` can be left empty
- For multi-room bookings, add `Room_2`, `Room_3`, etc. inside `Room_Details`
- Returns `ReservationNo` (booking ID used in all subsequent calls)
- Booking is created as **unassigned** — must call AssignRoom separately

**curl**:
```bash
BOOKING_DATA='{"Room_Details":{"Room_1":{"Rateplan_Id":"6076500000000000001","Ratetype_Id":"6076500000000000001","Roomtype_Id":"6076500000000000001","baserate":"500","extradultrate":"0","extrachildrate":"0","number_adults":"1","number_children":"0","ExtraChild_Age":"","Title":"Mr","First_Name":"Test","Last_Name":"Guest","Gender":"Male","SpecialRequest":""}},"check_in_date":"2026-04-07","check_out_date":"2026-04-08","Booking_Payment_Mode":"","Email_Address":"guest@vibehouse.in","Source_Id":"","MobileNo":"9999999999","Address":"Mumbai","State":"Maharashtra","Country":"India","City":"Mumbai","Zipcode":"400001","Fax":"","Device":"","Languagekey":"en","paymenttypeunkid":""}'

curl -s -X POST "https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode=60765&APIKey=AUTH_CODE" \
  --data-urlencode "BookingData=$BOOKING_DATA"
```

---

## 11. AssignRoom — Assign Physical Room to Booking

**Use case**: UC-08 — Assign a specific bed/room after InsertBooking (which creates an unassigned reservation).

> **Important**: InsertBooking only accepts `Roomtype_Id` (room type). To assign a specific physical room, you MUST call AssignRoom as a follow-up step.

```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Content-Type: application/json

{
  "RES_Request": {
    "Request_Type": "AssignRoom",
    "Authentication": { "HotelCode": "60765", "AuthCode": "AUTH_CODE" },
    "RoomAssign": [
      {
        "BookingId": "<RESERVATION_NO>",
        "RoomTypeID": "<ROOM_TYPE_ID>",
        "RoomID": "<PHYSICAL_ROOM_ID>"
      }
    ]
  }
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `BookingId` | VARCHAR(100) | Yes | ReservationNo from InsertBooking |
| `RoomTypeID` | BIGINT(20) | Yes | Room type ID (must match the room's actual type) |
| `RoomID` | BIGINT(20) | Yes | Specific physical room ID from RoomAvailability |

**Expected response**:
```json
{
  "Success": { "SuccessMsg": "Room Assignment is successfully done for Booking 7" },
  "Errors": [{ "ErrorCode": "0", "ErrorMessage": "Success" }]
}
```

**Constraints**:
- Max 5 bookings per request
- Booking must be in Confirmed status (error 127 if not)
- Room must not be assigned to another booking for overlapping dates (error 131)
- RoomID must belong to the specified RoomTypeID (error 111)

**curl**:
```bash
curl -s -X POST "https://live.ipms247.com/index.php/page/service.kioskconnectivity" \
  -H "Content-Type: application/json" \
  -d '{"RES_Request":{"Request_Type":"AssignRoom","Authentication":{"HotelCode":"60765","AuthCode":"AUTH_CODE"},"RoomAssign":[{"BookingId":"7","RoomTypeID":"6076500000000000001","RoomID":"6076500000000000001"}]}}'
```

---

## 12. ProcessBooking — Confirm Reservation

**Use case**: Confirm a booking after InsertBooking. Required before check-in.

```
GET https://live.ipms247.com/booking/reservation_api/listing.php
  ?request_type=ProcessBooking
  &HotelCode=60765
  &APIKey=AUTH_CODE
  &Process_Data={"Action":"ConfirmBooking","ReservationNo":"<ID>","Inventory_Mode":"REGULAR","Error_Text":""}
```

**Expected response**:
```json
{ "result": "success", "message": "Booking Processed Succesfully" }
```

**curl**:
```bash
curl -s "https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ProcessBooking&HotelCode=60765&APIKey=AUTH_CODE&Process_Data=%7B%22Action%22%3A%22ConfirmBooking%22%2C%22ReservationNo%22%3A%227%22%2C%22Inventory_Mode%22%3A%22REGULAR%22%2C%22Error_Text%22%3A%22%22%7D"
```

---

## 13. AddPayment — Record Payment in eZee Folio

**Use case**: After Razorpay confirms payment, record the amount in eZee's folio so the booking shows as paid.

```
POST https://live.ipms247.com/index.php/page/service.kioskconnectivity
Content-Type: application/json

{
  "RES_Request": {
    "Request_Type": "AddPayment",
    "Authentication": { "HotelCode": "60765", "AuthCode": "AUTH_CODE" },
    "Reservation": [
      {
        "BookingId": "<RESERVATION_NO>",
        "PaymentId": "6076500000000000013",
        "CurrencyId": "6076500000000000001",
        "Payment": "525"
      }
    ]
  }
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `BookingId` | VARCHAR | Yes | ReservationNo |
| `PaymentId` | BIGINT | Yes | Payment method ID from RetrievePayMethods (Cash = `...013`) |
| `CurrencyId` | BIGINT | Yes | Currency ID (INR = `6076500000000000001`) |
| `Payment` | VARCHAR | Yes | Amount in INR (e.g., "525") |

> **Warning**: Do NOT include `PaymentMode` or `PaymentComment` fields — they cause error 116 (invalid parameter).

**Expected response**:
```json
{
  "Success": {
    "SuccessMsg": "Payment done successfully for booking 7",
    "Receipt": [{ "BookingId": "7", "ReceiptNo": "1" }]
  },
  "Errors": [{ "ErrorCode": "0", "ErrorMessage": "Success" }]
}
```

**Payment Method IDs** (from RetrievePayMethods):

| Method | PayMethodID | PaymentID (for AddPayment) |
|--------|-------------|----------------------------|
| Cash | `6076500000000000002` | `6076500000000000013` |
| Credit Card | `6076500000000000003` | `6076500000000000014` |
| Debit Card | `6076500000000000004` | `6076500000000000015` |

**curl**:
```bash
curl -s -X POST "https://live.ipms247.com/index.php/page/service.kioskconnectivity" \
  -H "Content-Type: application/json" \
  -d '{"RES_Request":{"Request_Type":"AddPayment","Authentication":{"HotelCode":"60765","AuthCode":"AUTH_CODE"},"Reservation":[{"BookingId":"7","PaymentId":"6076500000000000013","CurrencyId":"6076500000000000001","Payment":"525"}]}}'
```

---

## 14. FetchSingleBooking — Get Full Booking Details

**Use case**: Verify booking state (room assignment, payment status, guest info).

```
POST https://live.ipms247.com/pmsinterface/pms_connectivity.php
Content-Type: application/json

{
  "RES_Request": {
    "Request_Type": "FetchSingleBooking",
    "BookingId": "<RESERVATION_NO>",
    "Authentication": { "HotelCode": "60765", "AuthCode": "AUTH_CODE" }
  }
}
```

**Expected response** (key fields):
- `CurrentStatus`: "Confirmed Reservation"
- `RoomID`, `RoomName`: assigned physical room
- `TotalAmountAfterTax`: total with tax
- `TotalPayment`: amount paid
- `PaymentDetail`: array of payment records
- `TaxDeatil`: SGST + CGST breakdown
- `RentalInfo`: per-night rate breakdown

---

## Complete Booking Flow (Confirmed Working — 2026-03-30)

```
1. RoomAvailability   → pick a free room (RoomID)
2. InsertBooking      → get ReservationNo (booking is UNASSIGNED)
3. ProcessBooking     → confirm booking (Action: ConfirmBooking)
4. AssignRoom         → assign specific room/bed to booking
5. AddPayment         → record Razorpay payment in eZee folio
6. FetchSingleBooking → verify everything is correct
```

All 6 steps tested and working with reservation #7 on 2026-03-30.

---

## Response Error Code Reference

| Code | Meaning |
|------|---------|
| `0` | Success |
| `100` | Missing required parameters |
| `101` | Invalid hotel code |
| `102` / `301` | Unauthorized — wrong AuthCode |
| `110` | Invalid ChargeId or voucher mode not AUTOGENERAL |
| `111` | Room type mismatch (RoomID doesn't belong to RoomTypeID) |
| `113` | Invalid booking status for this operation / booking not found |
| `116` | Invalid parameter name in request |
| `118` | Already checked out |
| `127` | Booking not in Confirmed status (for AssignRoom) |
| `129` | Room already assigned to this booking / batch limit exceeded (max 5) |
| `130` | Guest already checked out |
| `131` | Room already assigned to another booking |
| `203` | No data found |
| `500` | Internal processing error |
| `502` | Missing request type |
