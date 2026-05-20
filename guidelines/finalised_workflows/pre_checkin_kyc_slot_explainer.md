# Pre-Check-in KYC — Slot System Explainer

> This document explains how **booking slots** work and how the KYC APIs fit
> together, using end-to-end example workflows.

---

## The Core Idea

When a guest makes a booking, they might be booking **more than one bed/room**.
Each person staying = one **slot**. Each slot needs its own KYC form filled in
(because the hotel needs identity proof for every person staying).

```
Booking (ERI: EZEE-BND-2026-001, 3 beds)
├── Slot 1  →  Guest A fills (or anyone fills for Guest A)
├── Slot 2  →  Guest B fills (or anyone fills for Guest B)
└── Slot 3  →  Guest C fills (or anyone fills for Guest C)
```

Slots are identified by a `slot_id` (UUID). This is different from the
`ezee_reservation_id` (ERI) which identifies the *booking*.

---

## Key Concepts

| Term | What it is | Example |
|---|---|---|
| `ezee_reservation_id` (ERI) | The booking's ID from eZee PMS | `EZEE-BND-2026-001` |
| `slot_id` | UUID for one specific person within the booking | `cc0be726-...` |
| `slot_number` | Human-readable sequence number | `1`, `2`, `3` |
| `label` | Display name for the slot | `"Guest 1"`, `"Guest 2"` |
| `kyc_status` | Where the slot stands in KYC | `NOT_STARTED` → `PRE_VERIFIED` → `VERIFIED` |
| `guest_id` | Which registered guest is assigned to this slot | UUID or `null` if unassigned |
| `role` | PRIMARY (the booker) or SECONDARY (someone else) — **no enforcement impact on KYC** | `PRIMARY` / `SECONDARY` |

---

## Permission Model (Flat)

**Anyone who has APPROVED booking access can:**
- Fill or update KYC for **any** slot in that booking
- Add new slots
- Delete any slot (except ops-VERIFIED ones)

The PRIMARY/SECONDARY distinction is recorded for audit purposes only and does
**not** restrict what a guest can do.

**The only hard lock:** `VERIFIED` slots (ops-confirmed at check-in) cannot be
edited or deleted by anyone.

---

## How Slots Are Created

Slots **don't exist until a guest calls `POST /guest/booking/link`** for the
first time on a booking. That call:

1. Creates `booking_guest_access` for the caller
2. Creates **N slots** where N = `no_of_guests` from eZee (defaults to 1 if missing)
3. Assigns the caller to Slot 1

If slots already exist (someone already linked earlier), new linkers are assigned
to the next available unassigned slot.

After that, **any linked guest can add more slots manually** via
`POST /guest/kyc/:eri/slots/add`.

---

## Workflow 1 — Solo Guest, 1 Bed

**Guest A books 1 bed. Only they are staying.**

```
1. POST /guest/booking/link  { eri: "EZEE-010" }
   → 1 slot created: Slot 1 → Guest A, NOT_STARTED

2. GET /guest/kyc/EZEE-010/slots
   → [ { slot_id: "aaa-111", can_edit: true } ]

3. POST /guest/kyc/EZEE-010/upload-url  →  uploadUrl + fileKey
   PUT <uploadUrl>  (frontend uploads image directly to S3)

4. POST /guest/kyc/EZEE-010/slots/aaa-111/ocr  { front_image_key: "..." }
   → Pre-filled: { ocr_name: "Arjun Mehta", ocr_dob: "...", ... }

5. POST /guest/kyc/EZEE-010/slots/aaa-111/submit  { full_name: "Arjun Mehta", ... }
   → Slot 1 = PRE_VERIFIED ✅
```

---

## Workflow 2 — Booker + Friends, One Person Fills All KYC

**Guest A books 3 beds. Friends don't have the app. A fills KYC for everyone.**

```
1. POST /guest/booking/link  { eri: "EZEE-011" }
   → 3 slots: Slot 1 → Guest A, Slots 2-3 → null, all NOT_STARTED

2. Guest A fills Slot 1 (themselves)
   POST .../slots/slot1-id/submit  { full_name: "Arjun", ... }  → PRE_VERIFIED ✅

3. Guest A fills Slot 2 (friend's details, typed manually)
   POST .../slots/slot2-id/submit  { full_name: "Riya", ... }   → PRE_VERIFIED ✅

4. Guest A fills Slot 3
   POST .../slots/slot3-id/submit  { full_name: "Dev", ... }    → PRE_VERIFIED ✅
```

All 3 done. Any linked guest could have filled any slot — no restriction.

---

## Workflow 3 — Friends Self-Fill + Dynamic Slot Add

**Guest A books a private room (eZee says 1 guest). At the last minute,
2 more friends join. Guest A adds slots for them.**

```
1. POST /guest/booking/link  { eri: "EZEE-012" }
   → eZee no_of_guests = 1, so: 1 slot created
     Slot 1 → Guest A, NOT_STARTED

2. Guest A adds a slot for Friend B
   POST /guest/kyc/EZEE-012/slots/add
   → Slot 2 created: "Guest 2", NOT_STARTED, guest_id: null

3. Guest A adds another slot for Friend C
   POST /guest/kyc/EZEE-012/slots/add
   → Slot 3 created: "Guest 3", NOT_STARTED, guest_id: null

4. Guest B links (gets SECONDARY access)
   POST /guest/booking/link  { eri: "EZEE-012" }
   → Assigned to Slot 2 (first unassigned slot)

5. Guest B changes her mind, won't come — Guest A deletes Slot 2
   DELETE /guest/kyc/EZEE-012/slots/slot2-id
   → { message: "Slot \"Guest 2\" deleted successfully" }

6. All 3 remaining guests fill their own slots independently
   → All PRE_VERIFIED ✅
```

---

## How to Find the `slot_id`

Always call **list slots** first — the `slot_id` for each slot is in the response:

```
GET /guest/kyc/:eri/slots
→ {
    "slots": [
      { "slot_id": "cc0be726-...", "slot_number": 1, "label": "Guest 1", "can_edit": true },
      { "slot_id": "8ba-bdcd-...", "slot_number": 2, "label": "Guest 2", "can_edit": true }
    ]
  }
```

**Frontend flow:**
```
List Slots  →  pick slot_id
    ↓
Upload URL  →  PUT image to S3
    ↓
/ocr  →  pre-fill form
    ↓
/submit  →  PRE_VERIFIED ✅
```

---

## KYC Status Lifecycle

```
NOT_STARTED
    │  (submit form)
    ▼
PRE_VERIFIED   ← submitted remotely, awaiting on-site ops check
    │  (can still be re-submitted or deleted before ops verifies)
    │  (ops verifies at check-in)
    ▼
VERIFIED  ← locked, no further edits or deletion allowed
    │
    ▼ (optional)
REJECTED  ← ops rejects, guest must resubmit
```

---

## Summary — Which ID Do I Use When?

| I want to... | I need... |
|---|---|
| Know which booking to work with | `ezee_reservation_id` (ERI) |
| List slots & see their IDs | `GET /guest/kyc/:eri/slots` |
| Add a new slot | `POST /guest/kyc/:eri/slots/add` |
| Delete a slot | `DELETE /guest/kyc/:eri/slots/:slotId` |
| Upload doc, run OCR, submit KYC | `slot_id` + upload-url → ocr → submit |
| Check overall booking KYC progress | `GET /guest/booking/mine` → `kyc_completed_slots` / `total_slots` |
