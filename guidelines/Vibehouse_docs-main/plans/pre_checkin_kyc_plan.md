# Pre-Check-in KYC — Implementation Plan

> **Created**: March 2026  
> **Status**: FINAL — Pending setup then implementation

---

## Goal

Build the **remote pre-check-in KYC flow** + **booking linking module** for Indian national guests. Guests upload a government ID to S3, we run Amazon Textract OCR, pre-fill a form, guest reviews/edits, and submits. Data is stored as `PRE_VERIFIED` for manual on-site verification by ops.

---

## Decisions (Finalized)

| Question | Decision |
|---|---|
| Document upload | **AWS S3** — backend generates presigned upload URLs |
| OCR provider | **Amazon Textract** — `AnalyzeID` API for Indian govt IDs |
| Slot creation timing | **Frontend-driven** — backend just provides create/list APIs |
| Unclaimed slot assignment | Remaining slots are interchangeable — next guest picks any open slot |
| Document images | **2 images max** (front + back) — covers all ID types |
| Accepted IDs | Aadhaar, Voter ID, Driving Licence, Passport (all need front; back optional) |
| Booking linking module | **Build now** — needed as prerequisite for KYC |
| Contact number | **Auto-filled** from `guests.phone` if available, editable by guest |
| Nationality | **Indian only** — foreigners get `400` with message to contact ops |
| Age gate | **18+** — DOB validated server-side |

---

## Constraints

| Rule | Detail |
|---|---|
| Indian nationals only | Foreigners handled manually by ops — rejected with helpful error |
| 18+ only | DOB (from OCR or manual entry) must be ≥ 18 years from today |
| Accepted IDs | Aadhaar, Voter ID, Driving Licence, Passport — **PAN not accepted** |
| On-site verification | KYC stored as `PRE_VERIFIED` — ops does manual check at property |

---

## AWS Setup Guide (Do This First)

### Step 1: Create an IAM User

1. Go to [AWS Console → IAM](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. Name: `vibehouse-backend`
4. Check **"Provide user access to the AWS Management Console"** → Skip (not needed)
5. Click **Next** → **Attach policies directly**
6. Search and attach these 2 policies:
   - `AmazonS3FullAccess` (or create a scoped one later)
   - `AmazonTextractFullAccess`
7. Click **Next** → **Create user**
8. Click on the new user → **Security credentials** tab
9. **Create access key** → Select "Application running outside AWS"
10. Copy and save:
    - `Access Key ID` → e.g. `AKIA...`
    - `Secret Access Key` → e.g. `wJal...`

> [!CAUTION]
> Save the Secret Access Key immediately — AWS only shows it once!

### Step 2: Create an S3 Bucket

1. Go to [AWS Console → S3](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Settings:
   - Bucket name: `vibehouse-kyc-documents` (must be globally unique — try `vibehouse-kyc-docs-prod` if taken)
   - Region: **ap-south-1** (Mumbai — closest to your users)
   - **Uncheck** "Block all public access" → We'll use presigned URLs, not public access  
     Actually, **keep "Block all public access" checked** — presigned URLs work even with this on  
   - Leave everything else as default
4. Click **Create bucket**

### Step 3: Set CORS on the S3 Bucket

The frontend needs to upload directly to S3 using the presigned URL. S3 blocks cross-origin requests by default.

1. Go to the bucket → **Permissions** tab → scroll to **CORS configuration** → Edit
2. Paste this JSON:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Save changes.

> [!NOTE]
> In production, replace `"AllowedOrigins": ["*"]` with your actual domain (e.g., `https://vibehouse.in`).

### Step 4: Add Environment Variables

Add these to your `.env` file (and Railway dashboard for deployment):

```env
# AWS (S3 + Textract)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...your-key...
AWS_SECRET_ACCESS_KEY=wJal...your-secret...
AWS_S3_KYC_BUCKET=vibehouse-kyc-documents
```

### Step 5: Verify (Quick Test)

After adding env vars, you can verify with AWS CLI (optional):

```bash
# Install AWS CLI if not already
# pip install awscli

aws configure
# Enter your Access Key ID, Secret, region: ap-south-1, format: json

# Test S3
aws s3 ls s3://vibehouse-kyc-documents/

# Test Textract (needs an image)
aws textract analyze-id --document-pages '[{"S3Object":{"Bucket":"vibehouse-kyc-documents","Name":"test.jpg"}}]'
```

If both commands work (even if they return empty/error for missing files), your IAM user is correctly set up.

---

## NPM Dependencies to Install

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-textract
```

| Package | Purpose |
|---|---|
| `@aws-sdk/client-s3` | S3 operations (PutObject, etc.) |
| `@aws-sdk/s3-request-presigner` | Generate presigned upload URLs |
| `@aws-sdk/client-textract` | Amazon Textract `AnalyzeID` API |

---

## Database Changes

### New Table: `booking_slots`

Represents each bed/slot under a multi-guest reservation.

```sql
CREATE TABLE booking_slots (
  id                    VARCHAR(36) PRIMARY KEY,
  ezee_reservation_id   VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
  slot_number           INT NOT NULL,
  guest_id              VARCHAR(36) REFERENCES guests(id),
  label                 VARCHAR(50) NOT NULL,
  kyc_status            VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  created_at            TIMESTAMP(6) NOT NULL DEFAULT NOW(),

  UNIQUE(ezee_reservation_id, slot_number)
);

CREATE INDEX idx_booking_slots_eri ON booking_slots(ezee_reservation_id);
```

**`kyc_status` values:** `NOT_STARTED` → `PENDING` → `PRE_VERIFIED` → `VERIFIED` → `REJECTED`

### Extended: `kyc_submissions`

Add these columns to the existing `kyc_submissions` table:

```sql
ALTER TABLE kyc_submissions
  ADD COLUMN slot_id              VARCHAR(36) REFERENCES booking_slots(id),
  ADD COLUMN full_name            VARCHAR(255),
  ADD COLUMN date_of_birth        DATE,
  ADD COLUMN id_number            VARCHAR(100),
  ADD COLUMN permanent_address    TEXT,
  ADD COLUMN contact_number       VARCHAR(20),
  ADD COLUMN submitted_by_guest_id VARCHAR(36) REFERENCES guests(id);
```

**Existing columns kept as-is:** `nationality_type`, `id_type`, `front_image_url`, `back_image_url`, `ocr_name`, `ocr_dob`, `ocr_id_number`, `ocr_address`, `coming_from`, `going_to`, `purpose`, `consent_given`, `status`, `submitted_at`.

---

## Module 1: Booking Linking (`guest/booking`)

### New API Routes

| # | Method | Path | Auth | Description |
|---|---|---|---|---|
| 1 | `POST` | `/guest/booking/link` | Guest JWT | Link guest to an ERI — creates `booking_guest_access` + auto-creates slots |
| 2 | `GET` | `/guest/booking/mine` | Guest JWT | List all my linked bookings with slot summaries |

### Route 1 — Link Booking

Since eZee API isn't live, we'll match against `ezee_booking_cache` (pre-seeded data). In production, this would call eZee first.

```
POST /guest/booking/link
{ "ezee_reservation_id": "EZEE-BND-2026-001" }
```

**Logic:**
1. Look up ERI in `ezee_booking_cache`
2. If not found → `404`
3. Check if guest is already linked → return existing access
4. Match `guest.email/phone` against `booker_email/booker_phone`:
   - Match → role = `PRIMARY`, status = `APPROVED`, auto-create slots
   - No match → role = `SECONDARY`, status = `APPROVED` (skipping approval for now — 2FA later)
5. If slots don't exist yet for this ERI → auto-create `no_of_guests` slots
6. Assign guest to first available slot

### Route 2 — My Bookings

```
GET /guest/booking/mine
```

**Response:**
```json
[
  {
    "ezee_reservation_id": "EZEE-BND-2026-001",
    "role": "PRIMARY",
    "status": "APPROVED",
    "room_type_name": "Mixed Dorm 6-Bed",
    "room_number": "D-101",
    "checkin_date": "2026-03-13",
    "checkout_date": "2026-03-17",
    "total_slots": 2,
    "kyc_completed_slots": 1
  }
]
```

---

## Module 2: Guest KYC (`guest/kyc`)

### API Routes

| # | Method | Path | Auth | Description |
|---|---|---|---|---|
| 1 | `GET` | `/guest/kyc/:eri/slots` | Guest JWT | List all slots with KYC status |
| 2 | `GET` | `/guest/kyc/:eri/slots/:slotId` | Guest JWT | Get full KYC details for a slot |
| 3 | `POST` | `/guest/kyc/:eri/upload-url` | Guest JWT | Get S3 presigned upload URL(s) |
| 4 | `POST` | `/guest/kyc/:eri/slots/:slotId/ocr` | Guest JWT | Run Textract on uploaded images, return extracted data |
| 5 | `POST` | `/guest/kyc/:eri/slots/:slotId/submit` | Guest JWT | Submit the final reviewed KYC form |

---

### Route 1 — List Slots

```
GET /guest/kyc/EZEE-BND-2026-001/slots
```

**Response:**
```json
{
  "ezee_reservation_id": "EZEE-BND-2026-001",
  "total_slots": 3,
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
    },
    {
      "slot_id": "slot-uuid-3",
      "slot_number": 3,
      "label": "Guest 3",
      "guest_id": null,
      "guest_name": null,
      "kyc_status": "NOT_STARTED",
      "can_edit": true
    }
  ]
}
```

**`can_edit` logic:**
- PRIMARY → can edit any slot that isn't `PRE_VERIFIED` or `VERIFIED`
- SECONDARY → only their own assigned slot
- Already `PRE_VERIFIED` → `can_edit: false`

---

### Route 3 — Get Presigned Upload URL

```
POST /guest/kyc/EZEE-BND-2026-001/upload-url
{ "file_name": "aadhaar_front.jpg", "content_type": "image/jpeg" }
```

**Response:**
```json
{
  "upload_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/kyc/EZEE-BND-.../front_abc123.jpg?X-Amz-...",
  "file_key": "kyc/EZEE-BND-2026-001/front_abc123.jpg",
  "expires_in_seconds": 300
}
```

Frontend uploads directly to this URL via HTTP `PUT`. The `file_key` is sent back in the submit/OCR calls.

---

### Route 4 — Run OCR (Textract)

```
POST /guest/kyc/EZEE-BND-2026-001/slots/slot-uuid-2/ocr
{
  "front_image_key": "kyc/EZEE-BND-2026-001/front_abc123.jpg",
  "back_image_key": "kyc/EZEE-BND-2026-001/back_def456.jpg"
}
```

**Backend:**
1. Calls `TextractClient.analyzeId()` with the S3 keys
2. Extracts: Name, DOB, ID Number, Address from Textract response
3. Returns extracted fields for the frontend to display in the form

**Response:**
```json
{
  "ocr_name": "NEHA KAPOOR",
  "ocr_dob": "1998-05-15",
  "ocr_id_number": "1234 5678 9012",
  "ocr_address": "42, MG Road, Pune, Maharashtra 411001",
  "id_type_detected": "AADHAAR",
  "confidence": {
    "name": 0.95,
    "dob": 0.92,
    "id_number": 0.98,
    "address": 0.85
  }
}
```

Guest reviews this on the frontend, edits if needed, then submits via Route 5.

---

### Route 5 — Submit KYC

```
POST /guest/kyc/EZEE-BND-2026-001/slots/slot-uuid-2/submit
{
  "nationality_type": "INDIAN",
  "id_type": "AADHAAR",
  "full_name": "Neha Kapoor",
  "date_of_birth": "1998-05-15",
  "id_number": "1234 5678 9012",
  "permanent_address": "42, MG Road, Pune 411001",
  "contact_number": "+919000000002",
  "coming_from": "Pune",
  "going_to": "Mumbai",
  "purpose": "LEISURE",
  "front_image_url": "https://vibehouse-kyc-documents.s3.../front_abc123.jpg",
  "back_image_url": "https://vibehouse-kyc-documents.s3.../back_def456.jpg",
  "consent_given": true
}
```

**Validations:**
1. Guest has APPROVED access to this ERI
2. Slot belongs to this ERI
3. Slot is editable by this caller (PRIMARY can edit any open slot, SECONDARY only their own)
4. `nationality_type === 'INDIAN'` (reject with: "International guests — please contact the front desk")
5. `id_type` ∈ `[AADHAAR, VOTER_ID, DRIVING_LICENCE, PASSPORT]`
6. `date_of_birth` → guest is ≥ 18 years old today
7. `consent_given === true`
8. All mandatory fields non-empty: `full_name`, `date_of_birth`, `id_number`, `permanent_address`, `contact_number`, `coming_from`, `going_to`, `purpose`
9. `purpose` ∈ `[BUSINESS, LEISURE, MEDICAL, TRANSIT, OTHER]`
10. `front_image_url` is required; `back_image_url` is optional

**On success:**
- Creates/updates `kyc_submissions` row
- Updates `booking_slots.kyc_status` → `PRE_VERIFIED`
- Sets `submitted_at = NOW()`, `submitted_by_guest_id = caller`

---

## File Impact Summary

### New Files (9 files)

| File | Purpose |
|---|---|
| `src/aws/aws.module.ts` | Global module — S3 + Textract client init |
| `src/aws/s3.service.ts` | Presigned URL generation, file key builder |
| `src/aws/textract.service.ts` | Textract `AnalyzeID` wrapper, field extraction |
| `src/guest/booking/guest-booking.module.ts` | Booking linking module |
| `src/guest/booking/guest-booking.controller.ts` | Link + list routes |
| `src/guest/booking/guest-booking.service.ts` | Linking logic, slot creation |
| `src/guest/kyc/guest-kyc.module.ts` | KYC module |
| `src/guest/kyc/guest-kyc.controller.ts` | 5 KYC routes |
| `src/guest/kyc/guest-kyc.service.ts` | KYC business logic |

### New DTO Files (5 files)

| File | Purpose |
|---|---|
| `src/guest/booking/dto/link-booking.dto.ts` | Link booking request validation |
| `src/guest/kyc/dto/upload-url.dto.ts` | Presigned URL request |
| `src/guest/kyc/dto/run-ocr.dto.ts` | OCR request (image keys) |
| `src/guest/kyc/dto/submit-kyc.dto.ts` | Full KYC submission with all validations |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `booking_slots` model, extend `kyc_submissions` |
| `src/app.module.ts` | Import `AwsModule`, `GuestBookingModule`, `GuestKycModule` |
| `prisma/seed.ts` | Add slot seeding for existing bookings |

---

## Verification Plan

### API Tests (via curl — run after `npm run start:dev`)

**1. Booking Linking**
```bash
# Login as Arjun (PRIMARY)
curl -s -X POST http://localhost:8080/guest/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun@vibehouse.in","password":"Vibe@2026!"}' | jq .access_token

# Link booking (should auto-assign PRIMARY + create slots)
curl -s -X POST http://localhost:8080/guest/booking/link \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"ezee_reservation_id":"EZEE-BND-2026-001"}'

# List my bookings
curl -s http://localhost:8080/guest/booking/mine \
  -H "Authorization: Bearer <token>" | jq .
```

**2. KYC Slots**
```bash
# List slots for the booking
curl -s http://localhost:8080/guest/kyc/EZEE-BND-2026-001/slots \
  -H "Authorization: Bearer <token>" | jq .
```

**3. Upload + OCR (requires S3/Textract to be set up)**
```bash
# Get presigned URL
curl -s -X POST http://localhost:8080/guest/kyc/EZEE-BND-2026-001/upload-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"file_name":"aadhaar_front.jpg","content_type":"image/jpeg"}' | jq .

# Upload image to the returned URL (frontend does this)
curl -X PUT "<presigned_url>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test_aadhaar.jpg

# Trigger OCR
curl -s -X POST http://localhost:8080/guest/kyc/EZEE-BND-2026-001/slots/<slotId>/ocr \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"front_image_key":"kyc/EZEE-BND-2026-001/front_xxx.jpg"}' | jq .
```

**4. Submit KYC — Happy Path**
```bash
curl -s -X POST http://localhost:8080/guest/kyc/EZEE-BND-2026-001/slots/<slotId>/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nationality_type":"INDIAN","id_type":"AADHAAR",
    "full_name":"Arjun Mehta","date_of_birth":"2000-01-15",
    "id_number":"1234 5678 9012","permanent_address":"123 MG Road, Mumbai",
    "contact_number":"+919000000001","coming_from":"Delhi","going_to":"Mumbai",
    "purpose":"LEISURE","front_image_url":"https://...","consent_given":true
  }'
# Expect: 200 + status PRE_VERIFIED
```

**5. Submit KYC — Error Cases**
```bash
# Under 18 — expect 400
curl -s -X POST .../submit -d '{"date_of_birth":"2015-01-01",...}'

# International — expect 400
curl -s -X POST .../submit -d '{"nationality_type":"INTERNATIONAL",...}'

# PAN card — expect 400
curl -s -X POST .../submit -d '{"id_type":"PAN",...}'

# SECONDARY tries to edit PRIMARY's slot — expect 403
# Login as Neha, try to submit on Arjun's slot
```

**6. Booking Linking Edge Cases**
```bash
# Already linked — expect existing access returned, no duplicate
curl -X POST .../link -d '{"ezee_reservation_id":"EZEE-BND-2026-001"}'

# Non-existent ERI — expect 404
curl -X POST .../link -d '{"ezee_reservation_id":"DOES-NOT-EXIST"}'
```
