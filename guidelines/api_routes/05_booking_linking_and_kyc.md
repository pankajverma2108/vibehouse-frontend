# Booking Linking & Pre-Check-in KYC — API Routes

> **Base URL**: `http://localhost:8080`
> **Auth**: Bearer token (JWT) — `Authorization: Bearer <token>`
> **All responses**: `Content-Type: application/json`

---

## MODULE 1: Booking Linking (`/guest/booking`)

Allows a signed-up guest to link their account to an eZee reservation. Determines
whether they are the PRIMARY booker or a SECONDARY guest, creates per-slot records,
and returns the booking + slot layout.

---

### 1. Link Booking

**POST** `/guest/booking/link`

Links the authenticated guest to a reservation. Creates `booking_guest_access` and
auto-creates slot placeholders for every bed/guest in the booking. Assigns the caller
to the first available slot. If already linked, returns existing state without creating duplicates.

**Auth**: Guest JWT required

#### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `ezee_reservation_id` | string | ✅ | eZee PMS reservation ID |

```json
{ "ezee_reservation_id": "EZEE-BND-2026-001" }
```

#### Response — 200 OK (already linked)

```json
{
  "message": "Already linked to this booking",
  "access": { "role": "PRIMARY", "status": "APPROVED" },
  "booking": {
    "ezee_reservation_id": "EZEE-BND-2026-001",
    "property_id": "prop-bandra-001",
    "room_type_name": "Mixed Dorm 6-Bed",
    "room_number": "D-101",
    "checkin_date": "2026-03-13T00:00:00.000Z",
    "checkout_date": "2026-03-17T00:00:00.000Z",
    "no_of_guests": 2,
    "source": "MakeMyTrip",
    "status": "CONFIRMED"
  },
  "slots": [
    { "slot_id": "slot-uuid-1", "slot_number": 1, "label": "Guest 1", "guest_id": "guest-arjun-001", "kyc_status": "NOT_STARTED" },
    { "slot_id": "slot-uuid-2", "slot_number": 2, "label": "Guest 2", "guest_id": null, "kyc_status": "NOT_STARTED" }
  ]
}
```

#### Response — 200 OK (new link)

```json
{
  "message": "Successfully linked as PRIMARY",
  "access": { "role": "PRIMARY", "status": "APPROVED" },
  "booking": { "...": "same as above" },
  "slots": [
    { "slot_id": "slot-uuid-1", "slot_number": 1, "label": "Guest 1", "guest_id": "guest-arjun-001", "kyc_status": "NOT_STARTED" },
    { "slot_id": "slot-uuid-2", "slot_number": 2, "label": "Guest 2", "guest_id": null, "kyc_status": "NOT_STARTED" }
  ]
}
```

**Role assignment logic:**
- Guest's `email` or `phone` matches `booker_email` / `booker_phone` in `ezee_booking_cache` → `PRIMARY`
- No match → `SECONDARY`

**Slot assignment:** Caller is placed in the first `guest_id = null` slot.

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |
| `400` | `ezee_reservation_id` missing |
| `404` | ERI not found in booking cache |

---

### 2. List My Bookings

**GET** `/guest/booking/mine`

Returns all bookings the authenticated guest has linked to, with KYC completion
counts per booking.

**Auth**: Guest JWT required

No body. No query params.

#### Response — 200 OK

```json
[
  {
    "ezee_reservation_id": "EZEE-BND-2026-001",
    "role": "PRIMARY",
    "status": "APPROVED",
    "room_type_name": "Mixed Dorm 6-Bed",
    "room_number": "D-101",
    "checkin_date": "2026-03-13T00:00:00.000Z",
    "checkout_date": "2026-03-17T00:00:00.000Z",
    "property_id": "prop-bandra-001",
    "source": "MakeMyTrip",
    "total_slots": 2,
    "kyc_completed_slots": 0
  },
  {
    "ezee_reservation_id": "EZEE-BND-2026-002",
    "role": "PRIMARY",
    "status": "APPROVED",
    "room_type_name": "Private Room",
    "room_number": "P-205",
    "checkin_date": "2026-04-05T00:00:00.000Z",
    "checkout_date": "2026-04-08T00:00:00.000Z",
    "property_id": "prop-bandra-001",
    "source": "Direct",
    "total_slots": 1,
    "kyc_completed_slots": 0
  }
]
```

Returns `[]` if no bookings are linked.

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |

---

## MODULE 2: Pre-Check-in KYC (`/guest/kyc`)

Handles document upload, OCR extraction, and KYC form submission for each slot in
a booking. PRIMARY guests can fill KYC for all unverified slots. SECONDARY guests
can only fill their own slot.

**Accepted IDs**: Aadhaar, Voter ID, Driving Licence, Passport — **PAN not accepted**
**Nationality**: Indian nationals only — foreigners contact front desk
**Age**: 18+ — validated server-side on submit

---

### 3. List Slots

**GET** `/guest/kyc/:eri/slots`

Lists all booking slots for a reservation with per-slot KYC status and edit
permissions for the calling guest.

**Auth**: Guest JWT required. Caller must have APPROVED booking access.

#### Path Parameter

| Param | Description |
|---|---|
| `eri` | eZee reservation ID (e.g. `EZEE-BND-2026-001`) |

#### Response — 200 OK

```json
{
  "ezee_reservation_id": "EZEE-BND-2026-001",
  "total_slots": 2,
  "slots": [
    {
      "slot_id": "slot-uuid-1",
      "slot_number": 1,
      "label": "Guest 1",
      "guest_id": "guest-arjun-001",
      "guest_name": "Arjun Mehta",
      "kyc_status": "PRE_VERIFIED",
      "can_edit": false
    },
    {
      "slot_id": "slot-uuid-2",
      "slot_number": 2,
      "label": "Guest 2",
      "guest_id": null,
      "guest_name": null,
      "kyc_status": "NOT_STARTED",
      "can_edit": true
    }
  ]
}
```

**`kyc_status` values:** `NOT_STARTED` → `PENDING` → `PRE_VERIFIED` → `VERIFIED` → `REJECTED`

**`can_edit` logic:**
- `PRE_VERIFIED` or `VERIFIED` slots → always `false`
- PRIMARY caller → `true` for any remaining unverified slot
- SECONDARY caller → `true` only for their own slot

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |
| `403` | Guest doesn't have APPROVED access to this booking |
| `404` | No slots found — call `POST /guest/booking/link` first |

---

### 4. Get Slot KYC Detail

**GET** `/guest/kyc/:eri/slots/:slotId`

Returns the full KYC details for a specific slot, including OCR-extracted fields
and guest-confirmed values.

**Auth**: Guest JWT required.

#### Path Parameters

| Param | Description |
|---|---|
| `eri` | eZee reservation ID |
| `slotId` | UUID of the slot |

#### Response — 200 OK

```json
{
  "slot": {
    "slot_id": "slot-uuid-1",
    "slot_number": 1,
    "label": "Guest 1",
    "guest_id": "guest-arjun-001",
    "guest_name": "Arjun Mehta",
    "kyc_status": "PRE_VERIFIED"
  },
  "kyc": {
    "id": "kyc-uuid",
    "nationality_type": "INDIAN",
    "id_type": "AADHAAR",
    "full_name": "Arjun Mehta",
    "date_of_birth": "2000-01-15",
    "id_number": "1234 5678 9012",
    "permanent_address": "123 MG Road, Mumbai 400001",
    "contact_number": "+919000000001",
    "coming_from": "Delhi",
    "going_to": "Mumbai",
    "purpose": "LEISURE",
    "front_image_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/kyc/...",
    "back_image_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/kyc/...",
    "ocr_name": "ARJUN MEHTA",
    "ocr_dob": "15/01/2000",
    "ocr_id_number": "1234 5678 9012",
    "ocr_address": "123, MG Road, Mumbai",
    "consent_given": true,
    "status": "PRE_VERIFIED",
    "submitted_at": "2026-03-18T10:30:00.000Z",
    "submitted_by_guest_id": "guest-arjun-001"
  }
}
```

`kyc` is `null` if no submission exists yet for this slot.

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |
| `403` | No APPROVED booking access |
| `404` | Slot not found for this ERI |

---

### 5. Get Presigned Upload URL

**POST** `/guest/kyc/:eri/upload-url`

Returns a presigned AWS S3 URL the frontend uses to upload a document image directly
to S3 (HTTP PUT). The returned `file_key` is used in subsequent OCR and submit calls.

**Auth**: Guest JWT required.

> Call this once per image (front + back = 2 calls).

#### Path Parameter

| Param | Description |
|---|---|
| `eri` | eZee reservation ID |

#### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `file_name` | string | ✅ | Original filename, used to determine extension (e.g. `aadhaar_front.jpg`) |
| `content_type` | string | ✅ | MIME type (e.g. `image/jpeg`, `image/png`, `image/heic`) |

```json
{
  "file_name": "aadhaar_front.jpg",
  "content_type": "image/jpeg"
}
```

#### Response — 200 OK

```json
{
  "uploadUrl": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/kyc/EZEE-BND-2026-001/a1b2c3d4.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-...",
  "fileKey": "kyc/EZEE-BND-2026-001/a1b2c3d4.jpg",
  "expiresInSeconds": 300
}
```

**Frontend flow:**
1. Call this endpoint to get `uploadUrl` and `fileKey`
2. `PUT <uploadUrl>` with the binary file data and `Content-Type` header
3. Send `fileKey` in the OCR/submit requests

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |
| `403` | No APPROVED booking access |
| `400` | Missing `file_name` or `content_type` |

---

### 8. Add Slot

**POST** `/guest/kyc/:eri/slots/add`

Adds a new empty slot to an existing booking. Any guest with APPROVED booking access
can call this. The new slot gets the next sequential number and label (`"Guest N"`).

**Auth**: Guest JWT required.

No request body.

#### Path Parameter

| Param | Description |
|---|---|
| `eri` | eZee reservation ID |

#### Response — 200 OK

```json
{
  "slot_id": "new-slot-uuid",
  "slot_number": 3,
  "label": "Guest 3",
  "kyc_status": "NOT_STARTED",
  "guest_id": null
}
```

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |
| `403` | Guest doesn't have APPROVED access to this booking |

---

### 9. Delete Slot

**DELETE** `/guest/kyc/:eri/slots/:slotId`

Deletes a booking slot and its associated KYC submission (if any). Any guest with
APPROVED booking access can delete any slot, **unless** the slot has been `VERIFIED`
by ops — those are permanently locked.

PRE_VERIFIED slots **can** be deleted (the guest re-adds a slot and re-submits if needed).

**Auth**: Guest JWT required.

#### Path Parameters

| Param | Description |
|---|---|
| `eri` | eZee reservation ID |
| `slotId` | UUID of the slot to delete |

#### Response — 200 OK

```json
{ "message": "Slot \"Guest 2\" deleted successfully" }
```

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |
| `403` | Slot is `VERIFIED` by ops — cannot be deleted |
| `404` | Slot not found for this ERI |

---

### 10. Run OCR (Amazon Textract + GPT-4o-mini)

**POST** `/guest/kyc/:eri/slots/:slotId/ocr`

Runs Amazon Textract `AnalyzeID` on the uploaded document image(s) and returns
extracted field values for pre-filling the KYC form. The guest reviews and edits
on the frontend, then submits via the submit endpoint.

**Auth**: Guest JWT required.

> OCR failure is non-fatal — returns empty fields so guest can fill manually.

#### Path Parameters

| Param | Description |
|---|---|
| `eri` | eZee reservation ID |
| `slotId` | UUID of the slot |

#### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `front_image_key` | string | ✅ | S3 file key returned by the upload-url endpoint |
| `back_image_key` | string | ❌ | S3 key for the back of the document (optional) |

```json
{
  "front_image_key": "kyc/EZEE-BND-2026-001/a1b2c3d4.jpg",
  "back_image_key": "kyc/EZEE-BND-2026-001/b5c6d7e8.jpg"
}
```

#### Response — 200 OK

```json
{
  "ocr_name": "ARJUN MEHTA",
  "ocr_dob": "15/01/2000",
  "ocr_id_number": "1234 5678 9012",
  "ocr_address": "123, MG Road, Mumbai, Maharashtra 400001",
  "id_type_detected": "AADHAAR",
  "confidence": {
    "name": 0.97,
    "dob": 0.94,
    "id_number": 0.99,
    "address": 0.88
  }
}
```

If OCR fails or can't parse a field, that field will be `null` — guest fills it manually.

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |
| `403` | No APPROVED access, or caller cannot edit this slot |
| `404` | Slot not found |

---

### 7. Submit KYC

**POST** `/guest/kyc/:eri/slots/:slotId/submit`

Submits the final reviewed KYC form. Validates nationality (Indian only), age (18+),
ID type, and consent. On success, sets slot `kyc_status` to `PRE_VERIFIED` and
stores the submission for on-site manual verification.

**Auth**: Guest JWT required.

> Can be called with or without prior document upload (manual fill supported).
> Re-submitting an already-submitted slot overwrites the previous submission.

#### Path Parameters

| Param | Description |
|---|---|
| `eri` | eZee reservation ID |
| `slotId` | UUID of the slot to submit KYC for |

#### Request Body (JSON)

| Field | Type | Required | Notes |
|---|---|---|---|
| `nationality_type` | string | ✅ | Must be `"INDIAN"` — others rejected with `400` |
| `id_type` | string | ✅ | `AADHAAR` \| `VOTER_ID` \| `DRIVING_LICENCE` \| `PASSPORT` |
| `full_name` | string | ✅ | Guest's full name as on the ID |
| `date_of_birth` | string (ISO date) | ✅ | Format: `YYYY-MM-DD`. Guest must be ≥ 18 |
| `id_number` | string | ✅ | ID document number |
| `permanent_address` | string | ✅ | Permanent residential address |
| `contact_number` | string | ✅ | Phone with country code (e.g. `+919876543210`) |
| `coming_from` | string | ✅ | City/origin of travel (Form C compliance) |
| `going_to` | string | ✅ | City/destination of travel |
| `purpose` | string | ✅ | `BUSINESS` \| `LEISURE` \| `MEDICAL` \| `TRANSIT` \| `OTHER` |
| `front_image_url` | string | ❌ | Full S3 URL of document front image |
| `back_image_url` | string | ❌ | Full S3 URL of document back image |
| `consent_given` | boolean | ✅ | Must be `true` — guest confirms details are correct |

```json
{
  "nationality_type": "INDIAN",
  "id_type": "AADHAAR",
  "full_name": "Arjun Mehta",
  "date_of_birth": "2000-01-15",
  "id_number": "1234 5678 9012",
  "permanent_address": "123 MG Road, Mumbai 400001",
  "contact_number": "+919000000001",
  "coming_from": "Delhi",
  "going_to": "Mumbai",
  "purpose": "LEISURE",
  "front_image_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/kyc/EZEE-BND-2026-001/a1b2c3d4.jpg",
  "back_image_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/kyc/EZEE-BND-2026-001/b5c6d7e8.jpg",
  "consent_given": true
}
```

#### Response — 200 OK

```json
{
  "message": "KYC submitted successfully — pending on-site verification",
  "kyc_id": "kyc-uuid",
  "slot_id": "slot-uuid-1",
  "status": "PRE_VERIFIED",
  "full_name": "Arjun Mehta"
}
```

#### Error Responses

| Status | Scenario | Body |
|---|---|---|
| `400` | `nationality_type` is not `INDIAN` | `{ "message": "International guests — please contact the front desk..." }` |
| `400` | `id_type` is `PAN` or invalid | `{ "message": "Accepted IDs: Aadhaar, Voter ID, Driving Licence, Passport. PAN is not accepted." }` |
| `400` | Guest is under 18 years old | `{ "message": "Guest must be 18 years or older..." }` |
| `400` | `consent_given` is `false` | `{ "message": "You must confirm that the information is correct" }` |
| `400` | Any mandatory field missing | `{ "message": ["full_name should not be empty", ...] }` |
| `401` | Missing or expired token | — |
| `403` | No APPROVED access to booking | `{ "message": "You do not have access to this booking" }` |
| `403` | SECONDARY trying to edit another guest's slot | `{ "message": "You cannot edit this slot..." }` |
| `403` | Slot is already `PRE_VERIFIED`/`VERIFIED` | `{ "message": "You cannot edit this slot..." }` |
| `404` | Slot not found in this booking | — |

---

## Testing with Postman / curl

### Step 1 — Login as Arjun
```bash
curl -s -X POST http://localhost:8080/guest/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun@thedailysocial.in","password":"Vibe@2026!"}' | jq '.access_token'
```

Save token as `ARJUN_TOKEN`.

### Step 2 — Link to Booking
```bash
curl -s -X POST http://localhost:8080/guest/booking/link \
  -H "Authorization: Bearer $ARJUN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ezee_reservation_id":"EZEE-BND-2026-001"}' | jq .
```

### Step 3 — List My Bookings
```bash
curl -s http://localhost:8080/guest/booking/mine \
  -H "Authorization: Bearer $ARJUN_TOKEN" | jq .
```

### Step 4 — List Slots for a Booking
```bash
curl -s http://localhost:8080/guest/kyc/EZEE-BND-2026-001/slots \
  -H "Authorization: Bearer $ARJUN_TOKEN" | jq .
# Save slot_id from response as SLOT_ID
```

### Step 5 — Get Presigned Upload URL
```bash
curl -s -X POST http://localhost:8080/guest/kyc/EZEE-BND-2026-001/upload-url \
  -H "Authorization: Bearer $ARJUN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_name":"aadhaar_front.jpg","content_type":"image/jpeg"}' | jq .
# Use uploadUrl to PUT the image file, save fileKey as FRONT_KEY
```

### Step 6 — Run OCR
```bash
curl -s -X POST http://localhost:8080/guest/kyc/EZEE-BND-2026-001/slots/$SLOT_ID/ocr \
  -H "Authorization: Bearer $ARJUN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"front_image_key\":\"$FRONT_KEY\"}" | jq .
```

### Step 7 — Submit KYC (no images — manual fill)
```bash
curl -s -X POST http://localhost:8080/guest/kyc/EZEE-BND-2026-001/slots/$SLOT_ID/submit \
  -H "Authorization: Bearer $ARJUN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nationality_type":"INDIAN",
    "id_type":"AADHAAR",
    "full_name":"Arjun Mehta",
    "date_of_birth":"2000-01-15",
    "id_number":"1234 5678 9012",
    "permanent_address":"123 MG Road, Mumbai 400001",
    "contact_number":"+919000000001",
    "coming_from":"Delhi",
    "going_to":"Mumbai",
    "purpose":"LEISURE",
    "consent_given":true
  }' | jq .
# Expect: { "status": "PRE_VERIFIED" }
```

### Error cases to test

```bash
# Under 18 — expect 400
curl -s -X POST .../submit -d '{"date_of_birth":"2015-01-01",...}'

# International nationality — expect 400
curl -s -X POST .../submit -d '{"nationality_type":"INTERNATIONAL",...}'

# PAN card — expect 400
curl -s -X POST .../submit -d '{"id_type":"PAN",...}'

# SECONDARY tries to edit PRIMARY's slot — expect 403
# Login as Neha (SECONDARY), try submitting to Arjun's slot
```

---

## Permission Matrix

| Endpoint | Auth Required | Booking Access (APPROVED) | Role Restriction |
|---|---|---|---|
| `POST /guest/booking/link` | ✅ | N/A — creates access | None |
| `GET /guest/booking/mine` | ✅ | N/A | None |
| `GET /guest/kyc/:eri/slots` | ✅ | ✅ | None — all linked guests can list |
| `GET /guest/kyc/:eri/slots/:slotId` | ✅ | ✅ | None |
| `POST /guest/kyc/:eri/upload-url` | ✅ | ✅ | None |
| `POST /guest/kyc/:eri/slots/:slotId/ocr` | ✅ | ✅ | PRIMARY: any slot; SECONDARY: own slot only |
| `POST /guest/kyc/:eri/slots/:slotId/submit` | ✅ | ✅ | PRIMARY: any unverified slot; SECONDARY: own slot only |

---

## Dev Seed Data

All guests share password: **`Vibe@2026!`**

| Email | Role | ERI |
|---|---|---|
| `arjun@thedailysocial.in` | PRIMARY | `EZEE-BND-2026-001`, `EZEE-BND-2026-002` |
| `neha@thedailysocial.in` | SECONDARY | `EZEE-BND-2026-001` |
| `samir@gmail.com` | PRIMARY | `EZEE-BND-2026-003` |

> Note: Seeded guests already have `booking_guest_access` rows. Call `POST /guest/booking/link`
> with these ERIs to auto-create the `booking_slots` rows.

---

## MODULE 3: Admin KYC Tools (`/admin/kyc`)

Admin-only endpoints. Require an **admin JWT** (from `POST /admin/auth/login`).

---

### 8. Test OCR

**POST** `/admin/kyc/test-ocr`

Accepts 1–2 base64-encoded ID images, runs Amazon Textract `AnalyzeID`, and returns
extracted fields. **Nothing is stored** — images are passed as raw bytes directly to
Textract and discarded after the response.

Used by ops staff to verify Textract is working correctly on a given document before
guests go through the pre-check-in flow.

**Auth**: Admin JWT required (any admin role)

#### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `front_image_base64` | string | ✅ | Base64-encoded image (with or without `data:image/...;base64,` prefix). Max ~5 MB image |
| `back_image_base64` | string | ❌ | Base64-encoded back of the document (optional) |

> The admin frontend's OCR Test tab handles the base64 encoding automatically when you drag/click an image.

#### Response — 200 OK

```json
{
  "ocr_name": "ARJUN MEHTA",
  "ocr_dob": "15/01/2000",
  "ocr_id_number": "1234 5678 9012",
  "ocr_address": "123, MG Road, Mumbai, Maharashtra 400001",
  "id_type_detected": "AADHAAR",
  "confidence": {
    "name": 0.97,
    "dob": 0.94,
    "id_number": 0.99,
    "address": 0.88
  },
  "raw_fields": [
    { "type": "FIRST_NAME",       "value": "ARJUN",          "confidence": 99.1 },
    { "type": "LAST_NAME",        "value": "MEHTA",          "confidence": 98.7 },
    { "type": "DATE_OF_BIRTH",    "value": "15/01/2000",     "confidence": 94.2 },
    { "type": "DOCUMENT_NUMBER",  "value": "1234 5678 9012", "confidence": 99.0 },
    { "type": "ADDRESS",          "value": "123, MG Road...", "confidence": 88.3 },
    { "type": "ID_TYPE",          "value": "AADHAAR",        "confidence": 100.0 }
  ],
  "error": null
}
```

If Textract fails (network error, bad image, unsupported format), the response is still
`200` but with all fields `null` and `error` containing the error message — the caller
can distinguish this from a successful but empty extraction.

#### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired admin token |
| `400` | `front_image_base64` missing or image > 5 MB base64 |
| `413` | Payload exceeds server body limit (15 MB) |

#### Testing with curl

```bash
# 1. Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin_email>","password":"<password>","role":"OWNER"}' | jq -r '.access_token')

# 2. Convert image to base64 and test OCR
IMG_B64=$(base64 -w 0 /path/to/aadhaar_front.jpg)
curl -s -X POST http://localhost:8080/admin/kyc/test-ocr \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"front_image_base64\":\"$IMG_B64\"}" | jq .
```

> **Easier**: use the **OCR Test** tab in the admin frontend — drag the image, click "Run OCR".

---

## Permission Matrix (Updated)

Permissions are now **flat** — any guest with APPROVED booking access can perform any
action on any slot. The PRIMARY/SECONDARY distinction is retained for record-keeping only
and has no enforcement impact on KYC operations.

| Endpoint | Auth | Access Rule |
|---|---|---|
| `POST /guest/booking/link` | Guest JWT | Any authenticated guest |
| `GET /guest/booking/mine` | Guest JWT | Any authenticated guest |
| `GET /guest/kyc/:eri/slots` | Guest JWT | Any guest with APPROVED booking access |
| `POST /guest/kyc/:eri/slots/add` | Guest JWT | Any guest with APPROVED booking access |
| `GET /guest/kyc/:eri/slots/:slotId` | Guest JWT | Any guest with APPROVED booking access |
| `DELETE /guest/kyc/:eri/slots/:slotId` | Guest JWT | Any guest with APPROVED access · blocked if slot is VERIFIED |
| `POST /guest/kyc/:eri/upload-url` | Guest JWT | Any guest with APPROVED booking access |
| `POST /guest/kyc/:eri/slots/:slotId/ocr` | Guest JWT | Any guest with APPROVED access · blocked if slot is VERIFIED |
| `POST /guest/kyc/:eri/slots/:slotId/submit` | Guest JWT | Any guest with APPROVED access · blocked if slot is VERIFIED |
| `POST /admin/kyc/test-ocr` | **Admin JWT** | Any admin role |
