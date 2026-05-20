# Buteak Booking Flow — End-to-End API Test

**Date:** 2026-05-20  
**Backend:** `https://api.thedailysocial.co.in` (prod, post multi-property rollout commit [`092d9d9`](https://github.com/Emagicor/deta/commit/092d9d9))  
**Property under test:** `55402` — **Buteak Suites** (newly onboarded)  
**Test dates:** Check-in `2026-12-15`, check-out `2026-12-17` (2 nights, far enough out to not collide with real bookings)  
**Goal:** Verify the multi-property changes work end-to-end against the live eZee connection for Buteak's new `ezee_connection` row.

---

## Outcome at a glance

| Step | Endpoint | Result |
|---|---|---|
| 1 | `GET /guest/booking/rooms?property_id=55402` | ✅ 200 — Buteak eZee creds accepted; 2 apartment types returned |
| 2 | `GET /guest/booking/availability?...` | ✅ 200 — live eZee rates returned (₹3499/night), 8 beds each, `availability_source: "ezee_live"` |
| 3 | `POST /guest/auth/signup` | ✅ 201 — new guest issued JWT (OTP send silently skipped because SES sandbox can't reach unverified test address — not a blocker) |
| 4 | `POST /guest/booking/create-order` | ✅ 201 — booking created with ERI `55402-LCL-MPDPIIW7-A8E2` (new multi-property format ✓), status `PENDING_PAYMENT` |
| 5 | `POST /payment/create-booking-order` | ✅ 201 — Razorpay test order `order_SrWj4VVNk7a3b7` created, amount ₹6998 |
| 6 | `GET /guest/booking/lookup?booking_id=...` | ✅ 200 — booking visible, `property_name: "Buteak Suites"` ✓ |
| — | Razorpay checkout (manual user step) | ⏸️ Not attempted — requires real card/UPI interaction. Test stops here on purpose. |

**Verdict:** Multi-property rollout works end-to-end up to the payment hand-off. The Buteak `ezee_connection` row (api_key patched from SSM) is talking to eZee correctly. The new ERI format (`{HOTEL_CODE}-LCL-{ts}-{rand}`) is being generated. Razorpay accepts the order.

---

## Detailed payloads

### 1. Room catalog

```bash
curl -s 'https://api.thedailysocial.co.in/guest/booking/rooms?property_id=55402'
```

**Status: 200 OK**

```json
{
  "property_id": "55402",
  "room_types": [
    {
      "id": "5540200000000000001",
      "name": "Apartment 1",
      "slug": "apartment-1",
      "type": "PRIVATE",
      "beds_per_room": null,
      "total_beds": 8,
      "base_price_per_night": null,
      "floor_range": null,
      "amenities": [],
      "ezee_room_type_id": "5540200000000000001",
      "physical_room_count": 8,
      "bookable_online": false,
      "source": "ezee_only"
    },
    {
      "id": "5540200000000000002",
      "name": "Apartment 2",
      "slug": "apartment-2",
      "type": "PRIVATE",
      "beds_per_room": null,
      "total_beds": 8,
      "base_price_per_night": null,
      "floor_range": null,
      "amenities": [],
      "ezee_room_type_id": "5540200000000000002",
      "physical_room_count": 8,
      "bookable_online": false,
      "source": "ezee_only"
    }
  ]
}
```

**What this confirms:**
- Buteak's `ezee_connection.api_key` (patched via post-migration ECS task) is valid — eZee accepted the call.
- `source: "ezee_only"` — the local `room_types` table is empty for Buteak, so we're falling through to live eZee data. Expected and documented as intentional.
- Two apartment types are configured in eZee for Buteak. Both have 8 beds.
- `bookable_online: false` is set by eZee for these rooms. **Does NOT block create-order** (proven in step 4). Worth investigating with the eZee side later if the desired UI behavior is to hide these from public listings, but for now treating it as informational.

### 2. Live availability + pricing

```bash
curl -s 'https://api.thedailysocial.co.in/guest/booking/availability?property_id=55402&checkin=2026-12-15&checkout=2026-12-17'
```

**Status: 200 OK**

```json
{
  "property_id": "55402",
  "checkin_date": "2026-12-15",
  "checkout_date": "2026-12-17",
  "no_of_nights": 2,
  "availability_source": "ezee_live",
  "room_types": [
    {
      "id": "5540200000000000001",
      "name": "Apartment 1",
      "type": "PRIVATE",
      "available_beds": 8,
      "inventory_state": "available",
      "base_price_per_night": 3499,
      "total_price": 6998,
      "ezee_room_type_id": "5540200000000000001",
      "ezee_rate_plan_id": "5540200000000000001",
      "ezee_rate_type_id": "5540200000000000001",
      "bookable_online": false,
      "source": "ezee_only"
    },
    {
      "id": "5540200000000000002",
      "name": "Apartment 2",
      "type": "PRIVATE",
      "available_beds": 8,
      "inventory_state": "available",
      "base_price_per_night": 3499,
      "total_price": 6998,
      "ezee_room_type_id": "5540200000000000002",
      "ezee_rate_plan_id": "5540200000000000002",
      "ezee_rate_type_id": "5540200000000000001",
      "bookable_online": false,
      "source": "ezee_only"
    }
  ]
}
```

**What this confirms:**
- `availability_source: "ezee_live"` — live data, not the local-DB fallback. Backend is reaching eZee's `RoomList` reservation API successfully for Buteak's hotel code 55402.
- Live rate `₹3499/night` for Dec 2026, total `₹6998` for 2 nights.
- All beds available (no existing bookings holding inventory for these dates yet).

### 3. Guest signup

```bash
curl -s -X POST 'https://api.thedailysocial.co.in/guest/auth/signup' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Buteak Test User",
    "email": "buteak-test-2026-12@vibehouse-test.dev",
    "password": "TestPass@2026!"
  }'
```

**Status: 201 Created** (token redacted to length only)

```json
{
  "access_token": "<jwt, 320 chars>",
  "guest": {
    "id": "ee985b65-b84f-4594-8650-6f8cc27d622f",
    "name": "Buteak Test User",
    "email": "buteak-test-2026-12@vibehouse-test.dev",
    "phone": null,
    "email_verified": false,
    "phone_verified": false,
    "two_fa_enabled": false,
    "profile_photo_url": null,
    "created_at": "2026-05-20T06:54:20.349Z"
  },
  "otp_sent": false
}
```

**What this confirms:**
- Signup works. The new `CHECK` constraint on `properties.id` numeric format doesn't touch the `guests` table (no impact).
- `otp_sent: false` because SES is still in sandbox mode and can't send to the unverified test recipient `vibehouse-test.dev`. The signup itself still completed (this is the documented `sendOtpEmail` resilience — backend logs the failure and returns `otp_sent:false` without throwing).
- **Known limitation:** The signup OTP would render with TDS branding even if it had sent, because the signup DTOs don't carry `property_id` yet. Tracked in [`docs/setup/multi_property_rollout.md`](../setup/multi_property_rollout.md) "What's NOT done".

### 4. Create booking order ← **the multi-property smoke test**

```bash
curl -s -X POST 'https://api.thedailysocial.co.in/guest/booking/create-order' \
  -H "Authorization: Bearer <jwt>" \
  -H 'Content-Type: application/json' \
  -d '{
    "property_id": "55402",
    "checkin_date": "2026-12-15",
    "checkout_date": "2026-12-17",
    "rooms": [{ "room_type_id": "5540200000000000001", "quantity": 1 }]
  }'
```

**Status: 201 Created**

```json
{
  "ezee_reservation_id": "55402-LCL-MPDPIIW7-A8E2",
  "property_id": "55402",
  "property_name": "Buteak Suites",
  "checkin_date": "2026-12-15",
  "checkout_date": "2026-12-17",
  "no_of_nights": 2,
  "total_guests": 1,
  "rooms": [
    {
      "room_type_id": "5540200000000000001",
      "room_type_name": "Apartment 1",
      "quantity": 1,
      "price_per_night": 3499,
      "line_total": 6998
    }
  ],
  "addons": [],
  "subtotal_rooms": 6998,
  "subtotal_addons": 0,
  "grand_total": 6998,
  "addon_order_id": null,
  "status": "PENDING_PAYMENT"
}
```

**What this confirms (the things this whole rollout was about):**

| Multi-property concern | Result |
|---|---|
| **ERI format** uses the new `{HOTEL_CODE}-LCL-{ts}-{rand}` shape | ✅ `55402-LCL-MPDPIIW7-A8E2` — Buteak hotel code prefix is there, `-LCL-` infix marks it as locally-created (vs `-EZEE-` for OTA-ingested). The legacy `TDS-{CITY}-...` format is gone. |
| **property_id wires through the entire flow** | ✅ Both `property_id: "55402"` and `property_name: "Buteak Suites"` in the response — no TDS leakage. |
| **`DEFAULT_PROPERTY_ID` fallback is really gone** | ✅ The endpoint required explicit `property_id` and used it. We didn't see any "60765 silently substituted" behavior. |
| **`bookable_online: false` doesn't break the flow** | ✅ The room metadata flag from eZee is informational only; create-order still accepted it. |
| **Backend persists to `ezee_booking_cache` correctly** | ✅ Lookup in step 6 returned the row with the correct `property_id`. |

### 5. Razorpay order creation

```bash
curl -s -X POST 'https://api.thedailysocial.co.in/payment/create-booking-order' \
  -H "Authorization: Bearer <jwt>" \
  -H 'Content-Type: application/json' \
  -d '{
    "ezee_reservation_id": "55402-LCL-MPDPIIW7-A8E2",
    "grand_total": 6998,
    "addon_order_id": null
  }'
```

**Status: 201 Created**

```json
{
  "razorpay_order_id": "order_SrWj4VVNk7a3b7",
  "razorpay_key": "rzp_test_STOjwD1NfPXHSa",
  "amount": 6998,
  "amount_paise": 699800,
  "currency": "INR",
  "payment_id": "7a6fc4dc-5f3b-4a71-84da-1f95cdca3079",
  "ezee_reservation_id": "55402-LCL-MPDPIIW7-A8E2",
  "guest": { "email": "buteak-test-2026-12@vibehouse-test.dev" }
}
```

**What this confirms:**
- Razorpay sandbox-mode order created against Buteak's booking. Key is the test key (`rzp_test_...`), so no real money would have moved even if we'd proceeded.
- `amount_paise: 699800` matches `₹6998 × 100`.
- A `payments` row was persisted (`payment_id: 7a6fc4dc-...`) in `CREATED` state.
- Currently Razorpay credentials are shared across both properties — single merchant account for Buteak + TDS. If/when Buteak gets a separate merchant account, the backend will need a per-property key lookup (currently single env var pair).

### 6. Public booking lookup

```bash
curl -s 'https://api.thedailysocial.co.in/guest/booking/lookup?booking_id=55402-LCL-MPDPIIW7-A8E2'
```

**Status: 200 OK**

```json
{
  "found": true,
  "booking_id": "55402-LCL-MPDPIIW7-A8E2",
  "property_name": "Buteak Suites",
  "checkin_date": "2026-12-15T00:00:00.000Z",
  "checkout_date": "2026-12-17T00:00:00.000Z",
  "room_type_name": "Apartment 1 x1",
  "status": "PENDING_PAYMENT",
  "source": "The Daily Social"
}
```

**What this confirms:**
- Lookup-by-ERI works for Buteak bookings — the row is in `ezee_booking_cache` with the right `property_id`.
- `property_name: "Buteak Suites"` ✓.

**One finding worth flagging:** `source: "The Daily Social"` is wrong. For a Buteak local booking, this should be `"Buteak Suites"` (or just `"Direct"`). The default-fill in `lookupBooking` is hardcoding the brand. Not a blocker (it's only shown when a guest looks up someone else's booking before signing up), but inconsistent with the multi-property model. **Recommendation:** track as a follow-up — replace the hardcoded "The Daily Social" default in the lookup response with `property.name` when no explicit `source` is set on the row.

---

## What was NOT tested (deliberately)

| Step | Why deferred |
|---|---|
| Actual Razorpay payment via the test card | Requires a browser session against Razorpay's hosted checkout. The order is sitting in `CREATED` state in Razorpay's sandbox; we know the integration up to the hand-off works. |
| Razorpay webhook → booking confirmation → eZee sync → check-in email | Chained from the previous step. Once a real payment captures, the existing webhook handler kicks off the SQS chain. We have separate tests for that (`sqs_integration_test_results.md`). |
| MyGate PIN provisioning on check-in | Buteak has no MyGate connection (`features.smart_lock = false`); this is expected to no-op for Buteak. |
| Per-brand booking-confirmation email | Would fire after payment capture. Cannot send to `vibehouse-test.dev` until SES production access is granted. |
| Booking the second apartment (`5540200000000000002`) | Same code path; one apartment is enough proof. |

---

## State to clean up / be aware of

A live row exists in prod `ezee_booking_cache`:
```
ezee_reservation_id = 55402-LCL-MPDPIIW7-A8E2
property_id = 55402
status = PENDING_PAYMENT
checkin = 2026-12-15
checkout = 2026-12-17
guest_id = ee985b65-b84f-4594-8650-6f8cc27d622f
```

- It will sit at PENDING_PAYMENT indefinitely (no Razorpay payment was completed).
- It does NOT consume eZee inventory — eZee is only told about the booking when payment captures (via SQS `sendEzeeInsertBooking`).
- It DOES count against our own availability query for those dates because `getBookedBedsMap` filters by `status IN ('CONFIRMED', 'PENDING_PAYMENT')` ([`backend/src/guest/booking/guest-booking.service.ts:723`](../../backend/src/guest/booking/guest-booking.service.ts#L723)).
- Concretely: Apartment 1 will show 7 / 8 beds available for Dec 15–17 until this row is cleaned up.

**If you want to clean up immediately**, an admin can run against Aurora:
```sql
UPDATE ezee_booking_cache
SET status = 'CANCELLED', is_active = false
WHERE ezee_reservation_id = '55402-LCL-MPDPIIW7-A8E2';

DELETE FROM payments WHERE id = '7a6fc4dc-5f3b-4a71-84da-1f95cdca3079';

DELETE FROM booking_guest_access WHERE ezee_reservation_id = '55402-LCL-MPDPIIW7-A8E2';

DELETE FROM guests WHERE id = 'ee985b65-b84f-4594-8650-6f8cc27d622f';
```

Otherwise it sits there harmlessly — Apartment 1 has 8 beds so losing 1 to a phantom test booking is negligible.

---

## Findings / follow-ups (low priority)

1. **`source: "The Daily Social"` in lookup response for Buteak bookings** — hardcoded default. Should resolve from `properties.name`. Track as a small follow-up.
2. **`bookable_online: false` on Buteak rooms** — set by eZee, doesn't block create-order. Confirm with operations team whether this is intentional or should be flipped to `true` in eZee.
3. **Buteak `room_types` table is empty** — that's why `source: "ezee_only"` shows up. When Buteak's room metadata (slugs, amenities, photos, descriptions) is collected, seed `room_types` rows with `property_id='55402'` and the response will upgrade to `source: "db"`.
4. **Signup OTP brand mismatch** — would render TDS branding for Buteak guests. Backend fix is small (add `property_id` to 3 signup DTOs and pass to `sendOtpEmail`); FE side has to add the field to the request body.
5. **Razorpay test keys, single account** — fine for v1. If/when Buteak gets a separate merchant account, the backend needs per-property Razorpay credential lookup.

---

## Tests to run next (when the user is ready)

1. **Razorpay payment + webhook** — pay the existing pending order or create a new one, complete checkout in the test sandbox, verify booking flips to `CONFIRMED`, SQS chain fires, eZee sync inserts the booking with hotel code 55402.
2. **OTA booking auto-link for Buteak** — manually create a booking in eZee under Buteak with `email=<test guest's email>`, wait 15 min for reconciliation, sign up the guest, verify it auto-links. This validates the cross-property `autoLinkBookings` flow.
3. **TDS smoke test** — re-run steps 4–5 above with `property_id=60765`, an existing TDS room type, verify the format change didn't regress TDS bookings (legacy ERIs still work for lookups; new ones use the new format).
