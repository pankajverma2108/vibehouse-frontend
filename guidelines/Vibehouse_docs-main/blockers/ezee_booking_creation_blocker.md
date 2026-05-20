# eZee Support Ticket — Unable to Create Booking via `InsertBooking` API

> **Property**: Vibe House Kormangala
> **Hotel Code**: 60765
> **Date**: 2026-03-27
> **Priority**: Critical — blocks guest booking flow

---

## Our Use Case

We are building a **guest-facing web application** for Vibe House. The booking flow works as follows:

1. Guest browses rooms on our web app
2. Guest selects room + dates
3. Guest pays via **Razorpay** (our payment gateway) on our platform
4. After Razorpay confirms payment, our backend calls **eZee `InsertBooking`** to create the reservation in eZee PMS
5. eZee returns a `ReservationNo` which we store and show to the guest
6. Our backend calls **`ProcessBooking` (ConfirmBooking)** to confirm the reservation in eZee
7. Our backend calls **`AddPayment`** (Kiosk API) to record the Razorpay payment in the eZee folio

We do **not** want eZee to process the payment — we handle payment ourselves via Razorpay. We only need eZee to create and confirm the reservation, then record the payment amount in the folio.

---

## End-to-End Simulation We Ran

We ran the complete flow. Razorpay works. eZee InsertBooking fails.

---

### Step 1 — Create Razorpay Order ✅ SUCCESS

```bash
POST https://api.razorpay.com/v1/orders
{
  "amount": 50000,       # INR 500 (1 night)
  "currency": "INR",
  "receipt": "vh_test_booking_001"
}
```

**Response:**
```json
{
  "id": "order_SW9KUvgmg6Nwkq",
  "status": "created",
  "amount": 50000,
  "currency": "INR"
}
```

Razorpay order creation works. ✅

---

### Step 2 — Razorpay Payment Confirmed (webhook fires) ✅ SUCCESS

In production, guest pays via Razorpay checkout → Razorpay fires `payment.captured` webhook to our backend. Our backend verifies the order:

```bash
GET https://api.razorpay.com/v1/orders/order_SW9KUvgmg6Nwkq
```

**Response:**
```json
{
  "id": "order_SW9KUvgmg6Nwkq",
  "status": "created",
  "amount": 50000,
  "currency": "INR"
}
```

Payment flow confirmed. ✅

---

### Step 3 — InsertBooking in eZee (triggered after Razorpay webhook) ❌ FAILED

This is the step that is blocked. Our backend calls:

```
GET https://live.ipms247.com/booking/reservation_api/listing.php
  ?request_type=InsertBooking
  &HotelCode=60765
  &APIKey=<AUTH_KEY>
  &BookingData=<JSON_BELOW>
```

**BookingData sent:**
```json
{
  "Room_Details": {
    "Room_1": {
      "Rateplan_Id": "6076500000000000001",
      "Ratetype_Id": "6076500000000000001",
      "Roomtype_Id": "6076500000000000001",
      "baserate": "500",
      "extradultrate": "500",
      "extrachildrate": "500",
      "number_adults": "1",
      "number_children": "0",
      "ExtraChild_Age": "",
      "Title": "",
      "First_Name": "VH",
      "Last_Name": "TestGuest",
      "Gender": "",
      "SpecialRequest": ""
    }
  },
  "check_in_date": "2026-04-01",
  "check_out_date": "2026-04-02",
  "Booking_Payment_Mode": "",
  "Email_Address": "test@vibehouse.in",
  "Source_Id": "",
  "MobileNo": "9999999999",
  "Address": "",
  "State": "",
  "Country": "India",
  "City": "",
  "Zipcode": "",
  "Fax": "",
  "Device": "",
  "Languagekey": "",
  "paymenttypeunkid": ""
}
```

**Response:**
```json
[{"Error Details": {"Error_Code": "ParametersMissing", "Error_Message": "Missing parameters."}}]
```

❌ Booking creation fails. Steps 4, 5, 6 (ProcessBooking and AddPayment) cannot be reached.

---

## Everything We Have Tried

We have exhausted all documented approaches:

### Attempt A — Exact Official Postman Spec
Used the exact JSON structure from the official eZee Postman collection with all fields, including all optional ones as empty strings. `paymenttypeunkid: ""`. Same error.

### Attempt B — Using Kiosk PayMethod IDs
Called `RetrievePayMethods` via Kiosk Connectivity. Got:
- Cash: `PayMethodID = 6076500000000000002`
- Credit Card: `PayMethodID = 6076500000000000003`

Tried both as `paymenttypeunkid`. Same error.

### Attempt C — Booking_Payment_Mode Variations
Tried `Booking_Payment_Mode` as `""`, `"Hotel"`, `"0"`. Same error every time.

### Attempt D — HTTP POST Instead of GET
Sent InsertBooking as POST with BookingData in the request body. Same error.

### Attempt E — Omitting paymenttypeunkid Entirely
Removed the key completely from BookingData. Same error.

### Attempt F — ConfiguredPGList (Root Cause Found)
```
GET .../listing.php?request_type=ConfiguredPGList&HotelCode=60765&APIKey=<KEY>
```
**Response:** `{"Error_Code": -1, "Error_Message": "No Data found."}`

**No online payment gateway is configured in the eZee booking engine for this property.** This is why `paymenttypeunkid` cannot be validated — there is nothing to validate against.

### Confirmation — eZee Reservation Module IS Active
We tested with wrong hotel identifier to isolate the error:
- `HotelCode=69227` (wrong) → `NORESACC` (auth fails as expected)
- `HotelCode=60765` (correct) → `ParametersMissing` (auth passes, module active)

This confirms eZee Reservation is enabled. The blocker is purely the missing payment gateway configuration.

---

## APIs Confirmed Working (for context)

| API | Endpoint | Result |
|-----|----------|--------|
| `HotelList` | reservation_api | ✅ Hotel info returned |
| `RoomTypeList` | reservation_api | ✅ Room types returned |
| `RoomList` | reservation_api | ✅ Live rates + availability |
| `ConfiguredPGList` | reservation_api | ✅ Responds (but empty — no PG configured) |
| `ProcessBooking` | reservation_api | ✅ Endpoint works (`ReservationNotExist` — expected, no booking yet) |
| `RetrievePayMethods` | kioskconnectivity | ✅ Returns Cash, Credit Card, Debit Card |
| `RetrieveCurrency` | kioskconnectivity | ✅ Returns INR (`CurrencyID: 6076500000000000001`) |
| `AddPayment` | kioskconnectivity | ✅ Endpoint works (needs a BookingId) |

**Only `InsertBooking` is failing.**

---

## Questions for eZee Support

### Q1 — Can InsertBooking work without an online payment gateway configured?

Our payment is collected via Razorpay **on our own platform**. We do not need eZee to process or redirect payment. We just need to:
1. Create the reservation in eZee after payment is already confirmed
2. Record the payment amount in eZee folio via `AddPayment`

Is there a way to call `InsertBooking` without a configured online payment gateway? For example:
- A special value for `paymenttypeunkid` indicating "paid externally"?
- A flag or field to bypass gateway validation?

### Q2 — If a payment option must be configured, how do we add "Pay at Hotel"?

If at least one option must exist in `ConfiguredPGList` for `InsertBooking` to work, can we enable a **"Pay at Hotel" / "Collect on Arrival"** option in the booking engine settings — without linking to a real payment processor? This would give us a valid `paymenttypeunkid` while actual payment continues to be handled by Razorpay on our side.

---

## The Flow We Want to Achieve (Once Unblocked)

```
Guest pays INR 500 via Razorpay on our web app
          ↓
Razorpay webhook: payment.captured
          ↓
Our backend → InsertBooking (paymenttypeunkid = "Pay at Hotel" ID)
          ← eZee returns ReservationNo
          ↓
Our backend → ProcessBooking (Action: ConfirmBooking, ReservationNo: <id>)
          ← eZee confirms reservation
          ↓
Our backend → AddPayment (Kiosk API)
              BookingId  = <ReservationNo>
              PaymentId  = 6076500000000000002  (Cash)
              CurrencyId = 6076500000000000001  (INR)
              Payment    = 500
          ← Payment recorded in eZee folio
```

All steps except `InsertBooking` are confirmed working.
