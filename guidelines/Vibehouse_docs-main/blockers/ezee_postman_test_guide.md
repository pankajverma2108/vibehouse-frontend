# eZee API — Postman Test Guide

> **Purpose**: Verify eZee room types and test the full booking flow.
> Take screenshots at each step for the eZee team.

---

## Postman Environment Setup

Create a Postman Environment with these variables:

| Variable | Value |
|---|---|
| `base_url` | `https://live.ipms247.com` |
| `hotel_code` | `60765` |
| `auth_code` | *(your AUTH_CODE from `.env`)* |

---

## Step 0 — Get ALL Room Types (Vacation Rental API)

> ⭐ **This is the API the eZee team pointed us to.** Returns every room type in eZee — **no dates, no availability filter**.

**Method**: `POST`

**URL** — no query params, no auth in URL:
```
{{base_url}}/channelbookings/vacation_rental.php
```

### ⚠️ Auth — This endpoint is different from other eZee APIs

The other eZee endpoints (RoomList, InsertBooking) take auth as `&APIKey=...` in the URL.
This endpoint takes auth as a **separate request header** called `AUTH_CODE`.

**In Postman → Headers tab, add TWO rows:**

| Key | Value |
|---|---|
| `Content-Type` | `application/json` |
| `AUTH_CODE` | `{{auth_code}}` |

> ⚠️ **Do NOT combine them** into a single Content-Type value like `application/json; AUTH_CODE: xxx` — that returns error 104 (Invalid Content-Type). They must be **two separate headers**.
>
> ⚠️ **Do NOT add `APIKey` to the URL** — this endpoint ignores query params for auth.

**Where to get `auth_code`**: It is the same credential used for all eZee APIs — stored in:
- `.env` file as `EZEE_AUTH_CODE` (or `AUTH_CODE`)
- Database: `ezee_connection.api_key` column

**Body** (in Postman → Body → raw → JSON):
```json
{
  "request_type": "get_rooms",
  "body": {
    "hotel_id": "{{hotel_code}}"
  }
}
```

> ⚠️ `hotel_id` must be the **hotel code as a string** (e.g. `"60765"`).

**Expected Response** (200):
```json
{
  "status": "success",
  "data": {
    "rooms": [
      {
        "room_id": "6076500000000000001",
        "room_name": "4 Bed Mixed Dormitory",
        "rooms": "202 A,202 B,202 C",
        "room_code": "202 A : Active,202 B : Active"
      },
      {
        "room_id": "6076500000000000002",
        "room_name": "Deluxe",
        "rooms": "105,106,201",
        "room_code": "105 : Active,106 : Active"
      },
      {
        "room_id": "6076500000000000004",
        "room_name": "6 Bed Mixed Dormitory",
        "rooms": "203 A,203 B,203 C",
        "room_code": "203 A : Active"
      },
      {
        "room_id": "6076500000000000005",
        "room_name": "4 Bed Dormitory Female",
        "rooms": "101 A,101 B,101 C,101 D",
        "room_code": "101 A : Active"
      },
      {
        "room_id": "6076500000000000006",
        "room_name": "6 Bed Dormitory Female",
        "rooms": "102 A,102 B,102 C",
        "room_code": "102 A : Active"
      }
    ]
  }
}
```

**Troubleshooting**:

| Error | Cause | Fix |
|---|---|---|
| `error_code: 102` | Wrong AUTH_CODE value | Copy the exact value from `.env` / `ezee_connection.api_key` |
| `error_code: 104` | Combined Content-Type header | Use **two separate headers**, not `application/json; AUTH_CODE: xxx` |
| `error_code: 101` | Wrong hotel_id | Use `"60765"` as a string |
| `error_code: 103` | Empty body | Ensure Body → raw → JSON is set correctly |
| `error_code: 105` | Missing field | Both `request_type` and `body.hotel_id` are required |

**Error codes**:

| Code | Meaning |
|---|---|
| 101 | Invalid Hotel Id — check `hotel_id` value |
| 102 | Invalid Authentication — AUTH_CODE wrong or missing |
| 103 | Blank Request — body is empty |
| 105 | Missing Required Parameter — `request_type` or `hotel_id` missing |

---

## Step 1 — Check Availability + Rates for Specific Dates (RoomList)

> This is a **different API** from Step 0. It requires check-in/check-out dates and only returns rooms that have **both a configured rate plan AND availability** on those dates. Rooms without a rate plan are silently omitted — this is why only 2 of our 5 rooms appear here.

**Method**: `GET`

**URL**:
```
{{base_url}}/booking/reservation_api/listing.php?request_type=RoomList&HotelCode={{hotel_code}}&APIKey={{auth_code}}&check_in_date=2026-04-20&check_out_date=2026-04-21&RoomType=all
```

**No body, no headers** — all params are in the query string.

**Expected Response** (200, array):
```json
[
  {
    "Roomtype_Name": "4 Bed Mixed Dormitory",
    "roomtypeunkid": "6076500000000000001",
    "roomrateunkid": "6076500000000000001",
    "ratetypeunkid": "6076500000000000001",
    "min_ava_rooms": 61,
    "room_rates_info": {
      "avg_per_night_without_tax": 500
    }
  },
  {
    "Roomtype_Name": "Deluxe",
    "roomtypeunkid": "6076500000000000002",
    "roomrateunkid": "6076500000000000002",
    "ratetypeunkid": "6076500000000000001",
    "min_ava_rooms": 14,
    "room_rates_info": {
      "avg_per_night_without_tax": 1500
    }
  }
]
```

> **Screenshot this alongside Step 0** to send to eZee team.
> Step 0 returns 5 rooms. This returns only 2.
> The 3 missing rooms (`6 Bed Mixed Dormitory`, `4 Bed Dormitory Female`, `6 Bed Dormitory Female`) do not have rate plans configured in eZee.

---

## Step 2 — Create a Test Booking (InsertBooking)

**Method**: `POST`

**URL**:
```
{{base_url}}/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode={{hotel_code}}&APIKey={{auth_code}}
```

**Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Body** (`x-www-form-urlencoded`):

| Key | Value |
|---|---|
| `BookingData` | *(paste JSON below)* |

```json
{"Room_Details":{"Room_1":{"Rateplan_Id":"6076500000000000001","Ratetype_Id":"6076500000000000001","Roomtype_Id":"6076500000000000001","baserate":"500","extradultrate":"0","extrachildrate":"0","number_adults":"1","number_children":"0","ExtraChild_Age":"","Title":"Mr","First_Name":"Test","Last_Name":"Booking","Gender":"Male","SpecialRequest":""}},"check_in_date":"2026-04-20","check_out_date":"2026-04-21","Booking_Payment_Mode":"","Email_Address":"test@thedailysocial.in","Source_Id":"","MobileNo":"+919999999999","Address":"","State":"","Country":"India","City":"Bangalore","Zipcode":"","Fax":"","Device":"","Languagekey":"en","paymenttypeunkid":""}
```

**Room type values** (use IDs from Step 0):

| Room | Roomtype_Id | Rateplan_Id | Ratetype_Id | baserate |
|---|---|---|---|---|
| 4 Bed Mixed Dormitory | `6076500000000000001` | `6076500000000000001` | `6076500000000000001` | `500` |
| Deluxe | `6076500000000000002` | `6076500000000000002` | `6076500000000000001` | `1500` |

**Multi-night** — comma-separate one value per night:
```json
"baserate": "500,500,500",
"extradultrate": "0,0,0",
"extrachildrate": "0,0,0"
```

**Expected Response**:
```json
{
  "ReservationNo": "12345",
  "SubReservationNo": ["12345-1"],
  "Inventory_Mode": "REGULAR"
}
```

> Copy `ReservationNo` — needed for Steps 3 and 4.

---

## Step 3 — Confirm the Booking (ProcessBooking)

**Method**: `GET`

**URL**:
```
{{base_url}}/booking/reservation_api/listing.php?request_type=ProcessBooking&HotelCode={{hotel_code}}&APIKey={{auth_code}}&Process_Data={"Action":"ConfirmBooking","ReservationNo":"PASTE_HERE","Inventory_Mode":"REGULAR","Error_Text":""}
```

> URL-encode the `Process_Data` value if Postman doesn't do it automatically (Params tab → check "Encode").

**Expected Response**:
```json
{ "result": "success", "message": "Booking Confirmed" }
```

---

## Step 4 — Record Payment (AddPayment)

Uses the **Kiosk API** — note the different endpoint.

**Method**: `POST`

**URL**:
```
{{base_url}}/index.php/page/service.kioskconnectivity
```

**Headers**:
```
Content-Type: application/json
```

**Body** (`raw` → `JSON`):
```json
{
  "RES_Request": {
    "Request_Type": "AddPayment",
    "Authentication": {
      "HotelCode": "{{hotel_code}}",
      "AuthCode": "{{auth_code}}"
    },
    "Reservation": [
      {
        "BookingId": "PASTE_RESERVATION_NO",
        "PaymentId": "6076500000000000013",
        "CurrencyId": "6076500000000000001",
        "Payment": "500"
      }
    ]
  }
}
```

> `PaymentId: 6076500000000000013` = Cash. `CurrencyId: 6076500000000000001` = INR.

**Expected Response**:
```json
{
  "Success": {
    "Receipt": [{ "ReceiptNo": "REC-0001" }]
  }
}
```

---

## Message Template for eZee Team

> Hi team,
>
> Using the `get_rooms` Vacation Rental API (no dates), we can see **5 room types** configured for Hotel Code `60765` (see Screenshot A).
>
> However, the `RoomList` reservation API only returns **2 of the 5** for any date range we query (see Screenshot B).
>
> The 3 missing room types are:
> - `6 Bed Mixed Dormitory` (room_id: `6076500000000000004`)
> - `4 Bed Dormitory Female` (room_id: `6076500000000000005`)
> - `6 Bed Dormitory Female` (room_id: `6076500000000000006`)
>
> Could you confirm if rate plans are configured and published via the API for these room types?

---

## Quick Reference

| API | Endpoint | Auth | Dates Needed? |
|---|---|---|---|
| **Get all rooms** (catalog) | `POST /channelbookings/vacation_rental.php` | Header: `AUTH_CODE` | ❌ No |
| Room availability + rates | `GET /booking/reservation_api/listing.php?request_type=RoomList` | Query: `APIKey` | ✅ Yes |
| Insert booking | `POST /booking/reservation_api/listing.php?request_type=InsertBooking` | Query: `APIKey` | ✅ Yes (in body) |
| Confirm booking | `GET /booking/reservation_api/listing.php?request_type=ProcessBooking` | Query: `APIKey` | ❌ No |
| Add payment | `POST /index.php/page/service.kioskconnectivity` | Body: `AuthCode` | ❌ No |
