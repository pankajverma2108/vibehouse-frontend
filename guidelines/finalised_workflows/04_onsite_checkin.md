# Workflow 04 — Onsite Check-in (Tablet Kiosk)

## Overview
When a guest arrives at the property, they interact with a **tablet kiosk at the entrance**. The kiosk retrieves their pre-submitted KYC data, performs a live **face match** against the uploaded ID photo (via Google Vision AI), scans the physical ID for an SSIM document match, generates a **G-Card (Guest Registration Card)** PDF, collects a **digital signature**, and marks the guest as `CHECKED_IN`. The smart lock PIN is issued upon successful check-in.

---

## 1. Prerequisites

| Requirement | Source |
|---|---|
| Guest has a `PRE_VERIFIED` KYC submission | `kyc_submissions.status = 'PRE_VERIFIED'` |
| Guest has an APPROVED booking access | `booking_guest_access.status = 'APPROVED'` |
| A `mygate_devices` row exists for the room | Admin pre-configured |

---

## 2. Step-by-Step Flow

### Step 1 — Start Session
```
Staff or guest taps "Start Check-in" on tablet
  → Kiosk session reset
  → Camera wakes up
```

### Step 2 — Guest Lookup
```
Enter: Mobile number OR Scan booking QR code
    ↓
Backend queries:
  SELECT kyc.*, booking.*
  FROM kyc_submissions kyc
  JOIN ezee_booking_cache booking ON kyc.ezee_reservation_id = booking.ezee_reservation_id
  WHERE kyc.status = 'PRE_VERIFIED'
  AND (guest.phone = $input OR booking.ezee_reservation_id = $input)
    ↓
Pulls: front_image_url, ocr_name, room_number, unit_code
  → Displays guest summary card on kiosk screen
```

### Step 3 — Liveness Check & Selfie Capture
```
Kiosk prompts: "Please look at the camera and blink"
  → Liveness detection: confirms live person (not photo)
  → Captures selfie frame
  → Uploads selfie to S3 → stores URL in checkin_records.selfie_url
```

### Step 4 — Face Match (AI)
```
Google Vision AI:
  - Compares: kiosk selfie vs. kyc_submissions.front_image_url (uploaded ID photo)
  - Returns: face_match_score (0.0 → 1.0)
    ↓
  Score > 0.85 → PASS
    UPDATE checkin_records SET face_match_score=X, face_match_status='PASS'

  Score ≤ 0.85 → FAIL (allowed 1 retry)
    → Prompt: "Please retake selfie in better lighting"
    → 2nd attempt still fails → face_match_status='FAIL'
    → Flag for staff: manual_override required

Manual Override (by staff):
  Staff taps override button → enters their Zoho staff ID
  UPDATE checkin_records SET
    manual_override = TRUE,
    override_by_zoho_staff_id = 'ZOHO-STAFF-001'
```

### Step 5 — Physical ID Scan (SSIM Check)
```
Kiosk prompts: "Place your ID document in front of camera"
  → High-res back camera captures physical ID
  → Stores URL in checkin_records.onsite_scan_url
  → Runs SSIM (Structural Similarity Index) comparison:
    Compares onsite scan vs. kyc_submissions.front_image_url
  → ssim_score > 0.75 → doc_match_status = 'MATCH'
  → ssim_score ≤ 0.75 → doc_match_status = 'MISMATCH' → flag staff
```

### Step 6 — G-Card Generation
```
Backend renders PDF using guest data:
  - Name, DOB, ID number, Address
  - Coming from, Going to, Purpose
  - Room number, Bed code
  - Check-in date/time
  - Property stamp/branding

Uploads PDF to S3 → stores URL in checkin_records.gcard_pdf_url
  → Displays PDF preview on kiosk for guest to review
```

### Step 7 — Digital Signature
```
Guest signs using finger on tablet touchscreen
  → Canvas drawing converted to PNG
  → Uploaded to S3 → stores in checkin_records.signature_png_url
  → Embedded into final G-Card PDF (re-rendered with signature)
```

### Step 8 — Final Submit
```
Guest/staff clicks "Complete Check-in"
    ↓
Atomic DB transaction:
  BEGIN;
  UPDATE checkin_records SET status = 'CHECKED_IN', checked_in_at = NOW();
  UPDATE ezee_booking_cache SET status = 'CHECKED_IN';
  COMMIT;
    ↓
Publish Kafka event: ops.task.checkin_complete
  → Ops Task Worker:
    1. Calls eZee API: Mark reservation as CHECKED_IN
    2. Calls MyGate API: Generate PIN (see Workflow 05)
    3. Publishes: notify.guest (with room + PIN info)
  → Notification Worker:
    → WhatsApp to guest:
      "🏠 You're checked in! Room 101, Bed A
       Your door PIN: 7823 (valid until [checkout_date])"
```

---

## 3. Check-in Record States

```
PENDING → (face match + doc scan done) → VERIFIED → (submit clicked) → CHECKED_IN
```

---

## 4. Group / Partial Check-in

- Each guest in a group booking has their own `kyc_submissions` and `checkin_records` row
- Partial check-in is allowed: some guests can check in while others remain `PENDING`
- A 5-hour SLA timer starts for remaining guests in the group
- If SLA expires, staff is notified via Zoho to investigate (flight delay exception applies)

---

## 5. DB Tables Involved

| Table | What Gets Written |
|---|---|
| `checkin_records` | Face match score, selfie, doc scan, G-Card, signature, status |
| `ezee_booking_cache` | Status updated to CHECKED_IN |
| `smart_lock_access` | New row created with PIN (see Workflow 05) |
| `ezee_sync_log` | eZee check-in sync outcome |
| `notification_log` | WhatsApp confirmation record |
