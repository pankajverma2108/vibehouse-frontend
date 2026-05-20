# Workflow 03 — Pre-Arrival KYC (Remote Guest Onboarding)

## Overview
Guests complete identity verification remotely via the PWA before arriving at the property. This eliminates front-desk paperwork. The process uploads ID documents, runs Google Vision OCR, collects travel info, and marks the guest as `PRE_VERIFIED`. Onsite check-in (Workflow 04) completes the physical verification.

---

## 1. Trigger

Guest receives a WhatsApp/email link post-booking:
`https://vibehouse.in/checkin?res=RES-12345`

Or guest navigates to "Complete KYC" in their PWA dashboard.

**Prerequisite**: Guest must have an APPROVED row in `booking_guest_access` for this reservation.

---

## 2. Step-by-Step Flow

### Step 1 — Identity Type Selection
```
Guest selects: "Indian Citizen" or "International Guest"
    ↓
Sets nationality_type variable:
  Indian → Show: Aadhaar / Passport / Driving Licence options
  International → Show: Passport only
```

### Step 2 — Document Selection & Upload
```
Guest selects document type (e.g., Aadhaar)
    ↓
Upload FRONT of ID:
  - Opens mobile camera/gallery
  - Uploads to S3 storage
  - Stores URL in kyc_submissions.front_image_url

Upload BACK of ID (if Indian ID — Aadhaar, DL):
  - Uploads to S3
  - Stores URL in kyc_submissions.back_image_url
  (Passport = single-sided → back_image_url = NULL)
```

### Step 3 — OCR Processing (Automatic)
```
Both images uploaded successfully
    ↓
Backend calls Google Vision AI (OCR):
  - Extracts: name, date_of_birth, id_number, address
  - Confidence score returned per field
    ↓
Store extracted data:
  UPDATE kyc_submissions SET
    ocr_name = '...',
    ocr_dob = '...',
    ocr_id_number = '...',
    ocr_address = '...'
    ↓
If OCR confidence < threshold on any field:
  → Highlight that field in red on review screen
  → Guest must manually correct it
```

### Step 4 — Data Review by Guest
```
Guest sees pre-filled form with OCR data
  → Edits any incorrect fields
  → OCR failures handled: guest manually types the field
```

### Step 5 — Travel Information (Form C / Police Compliance)
```
Guest fills in:
  - coming_from (city/country)
  - going_to (city/country)
  - purpose (Travel/Business/Leisure/Other)

These are MANDATORY — required by Indian Police
Form C regulation for hostels/hotels.
```

### Step 6 — Consent & Submission
```
Guest checks: "I confirm the above information is correct"
Guest clicks: "Submit & Save"
    ↓
UPDATE kyc_submissions SET
  consent_given = TRUE,
  status = 'PRE_VERIFIED',
  submitted_at = NOW()
    ↓
Publish Kafka event: notify.guest
  → Notification Worker sends WhatsApp:
    "✅ KYC complete! See you at The Daily Social on [date].
     Show this at the kiosk: [booking_id]"
```

---

## 3. KYC States

```
PENDING → (guest submits) → PRE_VERIFIED → (kiosk completes) → 
[See Workflow 04: VERIFIED → CHECKED_IN]

REJECTED (by staff override if documents are fraudulent)
```

---

## 4. Document Rules

| Document | Front | Back | Notes |
|---|---|---|---|
| Aadhaar | ✅ | ✅ | Both sides required |
| Passport | ✅ | ❌ | Front (photo page) only |
| Driving Licence | ✅ | ✅ | Both sides required |
| PAN Card | ❌ | ❌ | **NOT accepted** |

**Age restriction**: Guests must be 18+. OCR DOB is validated against today's date.

---

## 5. DB Tables Involved

| Table | What Gets Written |
|---|---|
| `kyc_submissions` | All KYC data, OCR results, travel info, status |
| `otp_logs` | (if OTP re-auth required mid-flow) |
| `notification_log` | Confirmation WhatsApp record |
