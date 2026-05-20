# Postman — Full Booking + eZee Sync Test Guide

> **Date**: 2026-04-01
> **Base URL**: `https://vibehousebackend-production.up.railway.app` (prod) or `http://localhost:8080` (local)
> **eZee Dashboard**: `https://live.ipms247.com` → login → Reservations to verify
> **Date constraint**: Booking dates must be before April 14, 2026

---

## Quick Summary

```
Step 1: Login as guest              → get access_token
Step 2: Browse rooms                → see available room types + eZee IDs
Step 3: Create booking order        → get ERI + grand_total
Step 4: Create Razorpay payment     → get razorpay_order_id
Step 5: Simulate payment capture    → booking CONFIRMED + eZee sync triggered
Step 6: Verify in DB                → check ezee_reservation_no is populated
Step 7: Verify in eZee dashboard    → booking shows as ASSIGNED with room number
```

---

## Step 1: Login as Guest

```
POST {{base_url}}/guest/auth/login
Content-Type: application/json

{
  "email": "samir@gmail.com",
  "password": "Vibe@2026!"
}
```

**Save from response**: `access_token`

---

## Step 2: Browse Available Rooms

```
GET {{base_url}}/guest/booking/rooms?property_id=60765&checkin=2026-04-10&checkout=2026-04-11
```

**No auth needed.**

**Expected response** — should include `ezee_room_type_id` fields:
```json
{
  "room_types": [
    {
      "id": "rt-6dorm",
      "name": "6 Bed Mixed Dormitory",
      "available_beds": 24,
      "base_price_per_night": 449,
      "total_price": 449,
      "ezee_room_type_id": "6076500000000000001",
      "ezee_rate_plan_id": "6076500000000000001",
      "ezee_rate_type_id": "6076500000000000001"
    }
  ]
}
```

**Check**: If `ezee_room_type_id` is `null`, the eZee mapping is missing in DB — sync will fail.

---

## Step 3: Create Booking Order

```
POST {{base_url}}/guest/booking/create-order
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "property_id": "60765",
  "checkin_date": "2026-04-10",
  "checkout_date": "2026-04-11",
  "rooms": [
    { "room_type_id": "rt-6dorm", "quantity": 1 }
  ]
}
```

**Save from response**:
- `ezee_reservation_id` (e.g., `VH-BANDRA-XXXXX-XXXX`)
- `grand_total` (e.g., `449`)

---

## Step 4: Create Razorpay Payment Order

```
POST {{base_url}}/payment/create-booking-order
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "ezee_reservation_id": "{{ezee_reservation_id}}",
  "grand_total": {{grand_total}}
}
```

**Save from response**: `razorpay_order_id`

---

## Step 5: Simulate Payment Capture (Dev Only)

```
POST {{base_url}}/payment/dev/simulate-capture
Content-Type: application/json

{
  "razorpay_order_id": "{{razorpay_order_id}}"
}
```

**Expected response**: `"Booking confirmed, payment captured"`

**What happens behind the scenes**:
1. Payment status → `CAPTURED`
2. Booking status → `CONFIRMED`
3. `sendEzeeInsertBooking` SQS message emitted
4. eZee sync worker picks it up (async, ~15s total):
   - InsertBooking → gets ReservationNo
   - ProcessBooking → confirms it
   - RoomAvailability → finds free room
   - AssignRoom → assigns specific bed
   - AddPayment → records payment in eZee folio
5. DB updated: `ezee_reservation_no`, `room_number` populated

---

## Step 6: Verify in DB (Optional — via API or direct query)

```
GET {{base_url}}/admin/bookings/{{ezee_reservation_id}}
Authorization: Bearer {{admin_access_token}}
```

**Check these fields**:
- `status` → should be `CONFIRMED`
- `room_number` → should be populated (e.g., `102`) after sync

**Or direct DB query**:
```sql
SELECT ezee_reservation_id, ezee_reservation_no, room_number, status
FROM ezee_booking_cache
WHERE ezee_reservation_id = 'VH-BANDRA-XXXXX-XXXX';
```

---

## Step 7: Verify in eZee Dashboard

1. Go to `https://live.ipms247.com`
2. Login with your eZee credentials
3. Navigate to **Reservations** or **Front Desk**
4. Look for the ReservationNo from Step 6
5. **Should show**: Confirmed, room assigned, payment recorded

---

## Direct eZee API Verification (curl)

If you want to verify via API instead of dashboard:

### Fetch the booking from eZee
```bash
curl -s -X POST "https://live.ipms247.com/pmsinterface/pms_connectivity.php" \
  -H "Content-Type: application/json" \
  -d '{
    "RES_Request": {
      "Request_Type": "FetchSingleBooking",
      "BookingId": "{{ezee_reservation_no}}",
      "Authentication": {
        "HotelCode": "60765",
        "AuthCode": "{{AUTH_CODE}}"
      }
    }
  }'
```

**Check**:
- `CurrentStatus`: "Confirmed Reservation"
- `RoomName`: should have a room number (e.g., "102")
- `TotalPayment`: should match the booking amount

---

## Troubleshooting

### Booking created but `ezee_reservation_no` stays null

**Possible causes**:
1. **SQS not processing** — check Railway logs for `[EzeeSyncWorker]` entries
2. **AWS credentials wrong** — Railway must have correct `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` that can access the SQS queue on account `985345988013`
3. **`SQS_CONSUMERS_ENABLED` not set** — must be `true` in Railway env vars
4. **`booking_rooms_json` is null** — check if the booking was created before the eZee code was deployed

### Booking synced but shows "Unassigned" in eZee

**Possible causes**:
1. **Date past allowed range** — eZee rejects dates after April 14, 2026
2. **No rooms available** — all rooms occupied for those dates
3. **AssignRoom failed** — check `ezee_sync_log` for errors (non-fatal, front desk can assign manually)

### eZee returns "InvalidData" on InsertBooking

**Possible causes**:
1. **Date too far in future** — eZee rate plan may not cover that period
2. **Room type not configured** — `ezee_room_type_id` doesn't match eZee's setup
3. **baserate = 0** — eZee may reject zero-rate bookings

---

## Manual eZee Booking Test (Bypass App — Direct API)

If you want to test eZee directly without the app flow:

### 1. InsertBooking
```bash
curl -s -X POST "https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode=60765&APIKey={{AUTH_CODE}}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode 'BookingData={"Room_Details":{"Room_1":{"Rateplan_Id":"6076500000000000001","Ratetype_Id":"6076500000000000001","Roomtype_Id":"6076500000000000001","baserate":"449","extradultrate":"0","extrachildrate":"0","number_adults":"1","number_children":"0","ExtraChild_Age":"","Title":"Mr","First_Name":"Test","Last_Name":"Guest","Gender":"Male","SpecialRequest":""}},"check_in_date":"2026-04-10","check_out_date":"2026-04-11","Booking_Payment_Mode":"","Email_Address":"test@vibehouse.in","Source_Id":"","MobileNo":"9999999999","Address":"Mumbai","State":"Maharashtra","Country":"India","City":"Mumbai","Zipcode":"400001","Fax":"","Device":"","Languagekey":"en","paymenttypeunkid":""}'
```
→ Save `ReservationNo`

### 2. ProcessBooking
```
GET https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ProcessBooking&HotelCode=60765&APIKey={{AUTH_CODE}}&Process_Data={"Action":"ConfirmBooking","ReservationNo":"{{ReservationNo}}","Inventory_Mode":"REGULAR","Error_Text":""}
```

### 3. RoomAvailability (pick a free room)
```bash
curl -s -X POST "https://live.ipms247.com/index.php/page/service.kioskconnectivity" \
  -H "Content-Type: application/json" \
  -d '{"RES_Request":{"Request_Type":"RoomAvailability","Authentication":{"HotelCode":"60765","AuthCode":"{{AUTH_CODE}}"},"RoomData":{"from_date":"2026-04-10","to_date":"2026-04-11"}}}'
```
→ Pick a `RoomID` from the response

### 4. AssignRoom
```bash
curl -s -X POST "https://live.ipms247.com/index.php/page/service.kioskconnectivity" \
  -H "Content-Type: application/json" \
  -d '{"RES_Request":{"Request_Type":"AssignRoom","Authentication":{"HotelCode":"60765","AuthCode":"{{AUTH_CODE}}"},"RoomAssign":[{"BookingId":"{{ReservationNo}}","RoomTypeID":"6076500000000000001","RoomID":"{{RoomID}}"}]}}'
```

### 5. AddPayment
```bash
curl -s -X POST "https://live.ipms247.com/index.php/page/service.kioskconnectivity" \
  -H "Content-Type: application/json" \
  -d '{"RES_Request":{"Request_Type":"AddPayment","Authentication":{"HotelCode":"60765","AuthCode":"{{AUTH_CODE}}"},"Reservation":[{"BookingId":"{{ReservationNo}}","PaymentId":"6076500000000000013","CurrencyId":"6076500000000000001","Payment":"449"}]}}'
```

### 6. FetchSingleBooking (Verify)
```bash
curl -s -X POST "https://live.ipms247.com/pmsinterface/pms_connectivity.php" \
  -H "Content-Type: application/json" \
  -d '{"RES_Request":{"Request_Type":"FetchSingleBooking","BookingId":"{{ReservationNo}}","Authentication":{"HotelCode":"60765","AuthCode":"{{AUTH_CODE}}"}}}'
```

---

## eZee Room Type Mapping

| VH Room Type | eZee Room Type | eZee ID |
|---|---|---|
| rt-4dorm (4 Bed Mixed Dormitory) | Bed in Dormitory | `6076500000000000001` |
| rt-6dorm (6 Bed Mixed Dormitory) | Bed in Dormitory | `6076500000000000001` |
| rt-queen (Queen Size Room) | Deluxe | `6076500000000000002` |

All three share the same pattern: `ezee_room_type_id = ezee_rate_plan_id = ezee_rate_type_id`.
