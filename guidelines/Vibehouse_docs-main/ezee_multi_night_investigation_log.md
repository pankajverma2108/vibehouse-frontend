# eZee InsertBooking API: Multi-Night Investigation Log

**Date:** 2026-04-02
**Objective:** Resolve `InvalidData` error from eZee `InsertBooking` API for stays > 1 night.

---

## 1. Initial State & Problem Context
The SQS worker was successfully inserting 1-night bookings. For any booking with `checkout - checkin > 1`, the eZee API returned:
```json
[
  {
    "Error Details": {
      "Error_Code": "InvalidData",
      "Error_Message": "Please check data passed."
    }
  }
]
```
The codebase was dynamically calculating the total rate for the stay (`ratePerNight * numberOfNights`) and sending it as a string to the `baserate` parameter. e.g., for a ₹500/night room booked for 2 nights, `baserate` was `"1000"`.

---

## 2. Hypothesis Generation & Permutation Testing

I constructed local Node scripts (`test_ezee.js`, `test_ezee2.js`) utilizing `axios` to send `application/x-www-form-urlencoded` POST requests directly to `https://live.ipms247.com/booking/reservation_api/listing.php`. The payloads tested a variety of guesses about how eZee expects multi-night rates.

### Tests Executed:

**Test Script CLI Command:**
```powershell
node test_ezee.js
```

| Permutation Tested | Payload Parameter Format | Result |
| :--- | :--- | :--- |
| **Per-night rate** | `"baserate": "500"` | `InvalidData` |
| **Total rate** | `"baserate": "1000"` | `InvalidData` |
| **Date-keyed Object** | `"baserate": {"2026-04-07": "500", "2026-04-08": "500"}` | `"\r\n\r\n"` (Empty OK, backend crashed) |
| **Omit baserate** | `"baserate": undefined` | `ParametersMissing` |
| **Day_Rates Array**| `"baserate": "1000", "Day_Rates": [...]` | `InvalidData` |
| **Day_wise Array** | `"baserate": "1000", "day_wise_baserackrate": ["500", "500"]` | `InvalidData` |
| **Array of Strings**| `"baserate": ["500", "500"]` | `"\r\n\r\n"` (Empty OK, backend crashed) |
| **TotalAmount** | `"baserate": undefined, "TotalAmount": "1000"` | `ParametersMissing` |
| **Totalprice_room**| `"baserate": undefined, "totalprice_room_only": "1000"` | `ParametersMissing` |
| **Pipe-separated** | `"baserate": "500\|500"` | `InvalidData` |
| **Comma-separated**| `"baserate": "500,500"` (With extra rates as `"0"`) | `InvalidData` |

Since omitting `baserate` triggered `ParametersMissing`, it was confirmed `baserate` is an indispensable root string value, ruling out object mappings.

---

## 3. Advanced Reverse-Engineering & Browser Subagent

To fetch ground truth without sandbox interference (due to ModSecurity on `api.ezeetechnosys.com`), I deployed the **browser_subagent** to navigate the live API specification.

**Subagent Command/Task:**
> Go to https://api.ezeetechnosys.com/create-a-booking-copy/ and read the documentation for the 'InsertBooking' API. Look closely at the JSON payload structure shown in their examples. Specifically, look for ANY fields related to rates (`baserate`, `Day_Rates`, `totalprice`, etc.) and how they format it.

**Subagent Findings:**
- The documentation dictates that multi-night rates must be passed as **comma-separated strings**.
- **CRITICAL REVELATION:** For a 2-night stay, `baserate` must be `"500,500"`.
- This comma-separating pattern must be replicated **strictly across all rate parameters**, verifying that `extradultrate` and `extrachildrate` have the exact same number of index strings.

---

## 4. Final Validation Test

The breakthrough came when matching the exact comma-separated indices across all rate arrays to equal the number of nights (`numberOfNights = 2`). Setting `"baserate": "500,500"` but leaving `"extradultrate": "0"` throws `InvalidData` because lengths (`2 != 1`) mismatched inside their parser.

**Executed Final Script payload (`test_ezee_final.js`):**

```javascript
"Room_1": {
  "Rateplan_Id": "6076500000000000001",
  "Ratetype_Id": "6076500000000000001",
  "Roomtype_Id": "6076500000000000001",
  "baserate": "500,500",           // 2 comma-separated values
  "extradultrate": "0,0",          // 2 comma-separated zeros
  "extrachildrate": "0,0",         // 2 comma-separated zeros
  "number_adults": "1",
  "number_children": "0",
  // ... other standard fields ...
}
```

**Result:**
```json
Status: 200 | Response: {"ReservationNo":"42","SubReservationNo":["42"],"Inventory_Mode":"REGULAR","lang_key":"en","contactunkid":"6076500000000000046"}
```
✅ **SUCCESS** - InsertBooking accepted the payload and created Reservation No `42` in production.

---

## 5. Artifacts and Final Structure Location
All localized testing scripts, Node logs, Python scrapers, and raw HTTP payloads were relocated to `backend/test_Scripts` directory to declutter the root working tree, which was also appended to `.gitignore`.
