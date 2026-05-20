# KYC to eZee ID Mapping Handoff

Date: 2026-05-05
Owner: Frontend team
Audience: Backend API team
Scope: Guest KYC submission flow and any future eZee reservation update for identity data

## 1) What We Need

We need a backend contract that confirms whether guest identity details captured during web check-in are pushed into eZee PMS, and if so, exactly which field is mapped.

The specific frontend question is simple:

- When a guest submits KYC, does `id_number` reach eZee?
- If yes, which eZee request carries it and which eZee field receives it?
- If no, what backend action should own that sync?

## 2) Current Backend Behavior

Based on the current backend code, the answer is no: guest KYC data is stored locally, but it is not sent to eZee.

Observed backend behavior:

- `POST /guest/kyc/:eri/slots/:slotId/submit` writes a row into `kyc_submissions`
- The same request updates `booking_slots.kyc_status` to `PRE_VERIFIED`
- The submitted `id_number` is persisted in the backend database
- The eZee reservation-update path exists only as a stub in the eZee sync worker
- The live eZee booking insert path does not include KYC identity fields

## 3) Current Data Stored by Backend

The backend stores the following KYC fields locally:

- `nationality_type`
- `id_type`
- `full_name`
- `date_of_birth`
- `id_number`
- `permanent_address`
- `contact_number`
- `coming_from`
- `going_to`
- `purpose`
- `front_image_url`
- `back_image_url`
- `consent_given`
- `status = PRE_VERIFIED`

The Prisma model also keeps OCR-derived fields separately:

- `ocr_name`
- `ocr_dob`
- `ocr_id_number`
- `ocr_address`

## 4) What Is Missing

There is currently no backend implementation that maps KYC identity data into eZee.

The main gap is:

- The eZee update reservation handler is only a stub
- No code path sends `id_number` from `submitKyc` into the eZee sync queue
- The active booking insert payload only includes booking contact details and room details
- No eZee request type in the current code includes an identity field contract for KYC submission

## 5) Practical Impact For Frontend

From the frontend point of view:

- We can submit KYC successfully
- We can show the guest as `PRE_VERIFIED`
- We cannot truthfully claim that the ID number was sent to eZee
- Any UI text implying eZee sync for identity data would be inaccurate right now

## 6) Backend Contract Needed

Please confirm one of these backend outcomes:

1. KYC is database-only and never synced to eZee
2. KYC should be synced to eZee through a new reservation update request
3. KYC should be synced only for specific booking states or specific properties

If option 2 or 3 is intended, please define:

- the exact event that triggers the sync
- the eZee API request name
- the eZee field name for `id_number`
- whether other KYC fields should also be synced
- whether updates should be immediate or queued through SQS

## 7) Recommended Backend Change If Sync Is Required

If identity sync is required, the backend should expose one clear path such as:

- `submitKyc` persists the DB row
- backend enqueues a dedicated eZee sync message
- eZee worker performs the reservation update
- worker writes a sync log and returns a deterministic status

Suggested payload shape for the sync message:

```json
{
  "eri": "TDS-...",
  "property_id": "...",
  "updates": {
    "id_number": "123456789012",
    "id_type": "AADHAAR",
    "full_name": "Guest Name"
  }
}
```

If eZee only accepts a single identity field, then the contract should still be explicit and documented in one place.

## 8) Acceptance Criteria For Backend

Please confirm the final behavior with one of these outcomes:

- KYC submit returns success and explicitly says it is DB-only
- KYC submit returns success and also confirms eZee sync was queued
- KYC submit returns success only after eZee sync succeeds

For frontend reliability, the backend should also provide:

- a sync status field
- a failure code if eZee update fails
- a clear retry story if the queue or eZee API is down

## 9) Suggested Tests

Backend-side test cases should cover:

1. valid KYC submit saves `id_number` locally
2. valid KYC submit updates `booking_slots.kyc_status`
3. no eZee request is emitted if the flow is DB-only
4. if sync is enabled, eZee update receives the expected field mapping
5. failed eZee sync is visible in logs or sync state

## 10) Frontend Follow-Up

Once backend confirms the contract, frontend can align copy and state handling to one of these modes:

- local verification only
- verification plus queued eZee sync
- verification blocked until eZee sync succeeds

## 11) Relevant Backend Files

- `guidelines/Vibehouse_backend/src/guest/kyc/guest-kyc.service.ts`
- `guidelines/Vibehouse_backend/src/guest/kyc/dto/submit-kyc.dto.ts`
- `guidelines/Vibehouse_backend/src/sqs/workers/ezee-sync.worker.ts`
- `guidelines/Vibehouse_backend/src/sqs/types/messages.ts`
- `guidelines/Vibehouse_backend/src/ezee/ezee.service.ts`
- `guidelines/Vibehouse_backend/src/ezee/ezee.types.ts`
- `guidelines/Vibehouse_backend/prisma/schema.prisma`

## 12) Bottom Line

As the code stands now, KYC identity data is stored in the backend database and not pushed into eZee. If the product expects eZee to receive `id_number`, the backend needs a new explicit sync contract before frontend can treat that as real behavior.
