# eZee as Single Source of Truth — Divergence Audit

> **Date**: 2026-04-01
> eZee is the PMS. Our `ezee_booking_cache` is exactly that — a cache.
> Any state in our DB that contradicts eZee is wrong. This doc covers every
> divergence scenario, what breaks, and how we handle it.

---

## Scenarios Where Our Cache Can Drift from eZee

### 1. Guest cancels from eZee front desk UI
| | Before fix | After fix |
|---|---|---|
| Our DB | CONFIRMED | CONFIRMED → **CANCELLED** |
| eZee | Cancelled Reservation | Cancelled Reservation |
| Risk | Guest gets smart lock PIN for cancelled room | ✓ Fixed |

**How fixed**: Reconciliation service fetches each active booking from eZee on startup and periodically. If eZee says "Cancelled Reservation", we mark `status=CANCELLED, is_active=false`.

---

### 2. Staff checks in a guest from eZee front desk
| | Before fix | After fix |
|---|---|---|
| Our DB | CONFIRMED | CONFIRMED → **CHECKED_IN** |
| eZee | Checked In | Checked In |

**How fixed**: Same reconciliation — "Checked In" in eZee → `CHECKED_IN` in our DB. Smart lock PIN remains valid. KYC checks can key off `CHECKED_IN` status.

---

### 3. Staff checks out a guest from eZee
| | Before fix | After fix |
|---|---|---|
| Our DB | CHECKED_IN | CHECKED_IN → **CHECKED_OUT** |
| eZee | Checked Out | Checked Out |
| Risk | Smart lock PIN still valid after checkout | ✓ Fixed |

**How fixed**: "Checked Out" in eZee → `status=CHECKED_OUT, is_active=false`. PIN revocation should key off `is_active=false`.

---

### 4. Walk-in booking created directly in eZee (no app)
| | Status |
|---|---|
| Our DB | **Does not exist** |
| eZee | Confirmed Reservation |

**Current state**: Not handled — walk-in bookings don't appear in our app at all.

**Recommended fix (Phase 2)**: Add an admin endpoint `POST /admin/bookings/import-from-ezee` that staff use after taking a walk-in. Or add `FetchReservation` polling to the reconciliation service to detect new eZee bookings with no matching VH- ERI and create cache entries.

---

### 5. Room number changed in eZee (room swap)
| | Before fix | After fix |
|---|---|---|
| Our DB | `room_number: null` or old room | Updated to eZee's current room |
| eZee | Room 102 | Room 102 |

**How fixed**: Reconciliation compares `tran.RoomName` against our cached `room_number` and updates if different.

---

### 6. Guest cancels from our app
| | Status |
|---|---|
| Our DB | CANCELLED, is_active=false |
| eZee | Still shows **Confirmed Reservation** ❌ |

**Current state**: We write to our DB but never call eZee to cancel. **THIS IS A BUG.**

**Fix needed**: When a booking is cancelled in our system, queue an `UPDATE_RESERVATION` SQS message that calls eZee's `CancelBooking` API. The `handleUpdateReservation` stub in `ezee-sync.worker.ts` is the placeholder for this.

---

### 7. Date change (stay extension or modification) in eZee
| | Status |
|---|---|
| Our DB | Old checkin/checkout dates |
| eZee | Updated dates |

**Current state**: Not reconciled. Checkout date determines when smart lock PIN expires.

**Fix needed**: Add `checkin_date` / `checkout_date` to the state drift check in reconciliation, then update them if eZee differs.

---

### 8. Payment posted directly in eZee (cash at front desk)
| | Status |
|---|---|
| Our DB | Only Razorpay payment |
| eZee | Additional cash payment |

**Current state**: Not handled. Our payment records are Razorpay-only.
This is acceptable — our payments table is for Razorpay tracking. eZee is the folio truth.

---

## What `booking_guest_access` Actually Tracks

This is NOT a duplicate of eZee. It serves a different purpose:

| | eZee | `booking_guest_access` |
|---|---|---|
| Manages | Physical room reservations | Who can VIEW the booking in our app |
| Controls | Room assignment, folio | App access: PRIMARY vs SECONDARY guests |
| Example | "Room 101 reserved for Arjun" | "Vatsal can also see this booking in the app" |

If a booking is cancelled, **both** need to be updated:
- eZee: cancel the reservation (done via SQS worker — Phase 2)
- Our DB: `is_active=false` on the booking (done now by reconciliation)
- `booking_guest_access` entries remain as history (no need to delete — they become inert once `is_active=false`)

---

## Reconciliation Schedule

Currently runs on:
- **App startup** (every deploy, every Railway restart)

Recommended addition (Phase 2):
- **Every 15 minutes** via a cron job or NestJS `@Cron` decorator
- This caps the maximum drift window to 15 minutes

---

## ERI Naming (Fixed)

Previously: `VH-BANDRA-XXXX-XXXX` (derived from property_id second segment)
Now: `VH-MUMBAI-XXXX-XXXX` / `VH-KORMANGALA-XXXX-XXXX` (derived from `properties.city`)

The ERI is a **pre-payment correlation ID** only — eZee never sees it.
After sync, `ezee_reservation_no` (e.g. "30") is the eZee-side identifier.

---

## Summary: What Is and Isn't Fixed

| Scenario | Fixed? |
|---|---|
| Cancel from eZee → reflect in our DB | ✅ Reconciliation on startup |
| Check-in from eZee → reflect in our DB | ✅ Reconciliation on startup |
| Check-out from eZee → reflect in our DB | ✅ Reconciliation on startup |
| Room number updated in eZee → our cache | ✅ Reconciliation on startup |
| Unsynced bookings on startup → re-queue | ✅ Already existed |
| Cancel from our app → call eZee cancel | ❌ Phase 2 (stub exists) |
| Walk-in in eZee → import to our DB | ❌ Phase 2 |
| Date changes in eZee → our cache | ❌ Phase 2 |
| 15-min periodic reconciliation cron | ❌ Phase 2 |
