# eZee PMS Integration — Code Review & Test Findings

> **Date**: 2026-03-31
> **Scope**: Full code review of eZee integration service, sync worker, payment wiring, caching, and module wiring
> **Files reviewed**: 11 files (3 new, 8 modified)

---

## Summary

| # | Area | Status | Finding |
|---|------|--------|---------|
| 1 | `EzeeService` HTTP client | **Fixed** | `checkKioskError` had duplicate field reference |
| 2 | Room availability caching | **Fixed** | Missing post-booking cache invalidation |
| 3 | `EzeeService` | **Info** | `toEzeeDate()` method defined but never called (dead code) |
| 4 | `getBookedBedsMap` | **Pre-existing bug** | Matches by composite `room_type_name` string — never matches |
| 5 | `EzeeSyncWorker` | **OK** | 5-step flow, idempotent, partial failure handling correct |
| 6 | Payment wiring | **OK** | Both `sendEzeeInsertBooking` and `sendEzeeAddExtraCharge` emit correctly |
| 7 | Module wiring | **OK** | `EzeeModule` imported in `AppModule`, `SqsModule`, `GuestBookingModule` |
| 8 | Prisma schema | **OK** | All 6 new columns present, client generated, `tsc --noEmit` passes |
| 9 | SQS message types | **OK** | `EzeeInsertBookingPayload`, `EzeeAddExtraChargePayload` correctly typed |
| 10 | Cache service | **OK** | `roomAvailabilityKey` + `TTL_ROOM_AVAILABILITY` (30min) added |
| 11 | TypeScript build | **OK** | `tsc --noEmit` and `nest build` both pass with zero errors |

---

## Detailed Findings

### 1. FIXED — `checkKioskError` duplicate field reference

**File**: `src/ezee/ezee.service.ts:302`

**Before** (bug):
```ts
const code = err.ErrorCode ?? err.ErrorCode; // both sides identical
```

**After** (fixed):
```ts
const code = err.ErrorCode ?? err.errorCode; // handles both casing variants
```

**Impact**: If eZee returned an error with lowercase `errorCode` key, it would be silently ignored. Now handles both casings.

---

### 2. FIXED — Missing post-booking cache invalidation

**File**: `src/guest/booking/guest-booking.service.ts`

**Problem**: After `createBookingOrder` completes the transaction, the room availability cache still contains pre-booking counts. A concurrent guest calling `getRoomAvailability` within the 30min TTL would see stale availability (beds shown as available when already reserved).

**Fix**: Added `await this.cache.del(cacheKey)` after the transaction completes (line 333), in addition to the existing pre-booking invalidation (line 239).

**Cache invalidation points** (all 3):
1. Before `createBookingOrder` → fetch fresh eZee data for validation
2. After `createBookingOrder` → next caller sees updated counts
3. After eZee sync worker AssignRoom → room is occupied in eZee

---

### 3. INFO — `toEzeeDate()` is dead code

**File**: `src/ezee/ezee.service.ts:50-53`

The `toEzeeDate(isoDate)` method converts `YYYY-MM-DD` → `DD/MM/YYYY` but is never called anywhere. eZee's Kiosk and Reservation APIs accept `YYYY-MM-DD` directly (confirmed by live tests). This method was likely planned for an endpoint that uses `DD/MM/YYYY` format but hasn't been needed yet.

**Action**: Leave as-is — may be needed for future endpoints (e.g., reporting APIs).

---

### 4. PRE-EXISTING BUG — `getBookedBedsMap` name matching is broken

**File**: `src/guest/booking/guest-booking.service.ts:471`

```ts
const rt = roomTypes.find((r) => r.name === b.room_type_name);
```

**Problem**: `b.room_type_name` is a composite summary string like `"6 Bed Mixed Dormitory x2, Queen Size Room x1"` (built at line 254). It will never equal a single room type name like `"6 Bed Mixed Dormitory"`. This means the local fallback bed count is always 0 for bookings created by our system.

**Impact**: Low — now that eZee availability is the primary data source for mapped room types, this fallback path is only hit when eZee is down. For eZee-sourced bookings (which store a single room type name), the matching works correctly.

**Potential fix** (future): Parse `booking_rooms_json` instead of matching by name string, or store individual room type entries instead of a composite string.

---

### 5. OK — EzeeSyncWorker implementation

**File**: `src/sqs/workers/ezee-sync.worker.ts`

Reviewed the full 5-step booking sync flow:

| Step | API Call | Delay | Fatal? |
|------|----------|-------|--------|
| 1 | `InsertBooking` | 2.5s | Yes — SQS retries |
| 2 | `ProcessBooking` | 2.5s | Yes — SQS retries |
| 3 | `RoomAvailability` | 2.5s | Yes — SQS retries |
| 4 | `AssignRoom` | 2.5s | No — front desk can assign manually |
| 5 | `AddPayment` | — | No — folio can be updated manually |

**Idempotency**: Checks `ezee_reservation_no` before Step 1. If already set (SQS retry), skips InsertBooking and resumes from ProcessBooking. This prevents duplicate bookings.

**Sync log**: Creates `ezee_sync_log` entry (PENDING → SUCCESS/FAILED) for every operation.

**AddExtraCharge handler**: Correctly throws if `ezee_reservation_no` not yet synced (triggers SQS retry — booking sync may be in progress).

---

### 6. OK — Payment flow wiring

**File**: `src/payment/payment.service.ts`

| Trigger | SQS Message | Queue |
|---------|-------------|-------|
| `fulfilBookingOrder()` (line ~823) | `sendEzeeInsertBooking` | `vibehouse-ezee-sync.fifo` |
| `fulfilOrder()` (line ~647) | `sendEzeeAddExtraCharge` | `vibehouse-ezee-sync.fifo` |

Both emit AFTER the Razorpay payment is confirmed and local DB is updated. Correct ordering.

---

### 7. OK — Module wiring

| Module | Import | Purpose |
|--------|--------|---------|
| `AppModule` | `EzeeModule` | Makes `EzeeService` available app-wide |
| `SqsModule` | `EzeeModule` | Worker needs `EzeeService` for API calls |
| `GuestBookingModule` | `EzeeModule` | Service needs `EzeeService` for room availability |

---

## Files Changed (This Session)

### New files (3)
| File | Lines | Purpose |
|------|-------|---------|
| `src/ezee/ezee.types.ts` | 78 | TypeScript types for eZee API |
| `src/ezee/ezee.service.ts` | 308 | HTTP client for 6 eZee API endpoints |
| `src/ezee/ezee.module.ts` | 8 | NestJS module |

### Modified files (8)
| File | Change |
|------|--------|
| `prisma/schema.prisma` | +3 cols on `room_types`, +3 cols on `ezee_booking_cache` |
| `src/sqs/workers/ezee-sync.worker.ts` | Replaced stubs with real 5-step booking sync |
| `src/payment/payment.service.ts` | Added `sendEzeeInsertBooking` + `sendEzeeAddExtraCharge` emissions |
| `src/redis/cache.service.ts` | Added `TTL_ROOM_AVAILABILITY` + `roomAvailabilityKey()` |
| `src/guest/booking/guest-booking.service.ts` | eZee availability, caching, `booking_rooms_json` storage |
| `src/guest/booking/guest-booking.module.ts` | Import `EzeeModule` |
| `src/sqs/sqs.module.ts` | Import `EzeeModule` |
| `src/app.module.ts` | Import `EzeeModule` |

---

## E2E Test Plan

### Test 1 — Room availability with eZee + cache

```
1. GET /guest/booking/rooms?property_id=60765&checkin=2026-04-07&checkout=2026-04-08
   → Should return room types with eZee-sourced available_beds
   → Check response includes ezee_room_type_id fields

2. Call again immediately
   → Should be served from Redis cache (check server logs for "Cache HIT")

3. Wait 30+ minutes (or manually delete Redis key)
   → Should re-fetch from eZee
```

### Test 2 — Full booking + eZee sync

```
1. POST /guest/booking/create-order (rooms + optional addons)
   → Creates PENDING_PAYMENT booking with booking_rooms_json

2. POST /payment/create-booking-order → get razorpay_order_id

3. POST /payment/dev/simulate-capture
   → Booking: PENDING_PAYMENT → CONFIRMED
   → SQS: sendEzeeInsertBooking emitted
   → Check SQS console for message

4. Watch ezee-sync worker logs:
   → InsertBooking → ReservationNo returned
   → ProcessBooking → confirmed
   → RoomAvailability → rooms fetched
   → AssignRoom → room assigned
   → AddPayment → folio updated

5. Verify DB:
   → ezee_booking_cache.ezee_reservation_no is set
   → ezee_booking_cache.ezee_sub_reservation_nos is set
   → ezee_booking_cache.room_number is set
   → ezee_sync_log entry with status=SUCCESS
```

### Test 3 — Addon charge sync

```
1. Create booking with addons → pay → confirm
2. Check SQS for both sendEzeeInsertBooking AND sendEzeeAddExtraCharge messages
3. Worker should call AddPayment for addon total after booking sync
```

### Test 4 — During-stay addon purchase

```
1. Guest buys addon during stay (POST /payment/create-addon-order)
2. Pay → webhook
3. Check SQS for sendEzeeAddExtraCharge
4. Worker calls AddPayment with addon total
```

### Test 5 — Idempotency (SQS retry)

```
1. Create booking, let eZee sync complete (ezee_reservation_no is set)
2. Re-process the same SQS message (simulate retry)
3. Worker should skip InsertBooking (already done) and resume from ProcessBooking
4. No duplicate booking in eZee
```

### Test 6 — eZee unavailable (graceful fallback)

```
1. Disconnect eZee (disable connection or use invalid creds)
2. GET /guest/booking/rooms
   → Should still return room types with local DB availability
   → Logs should show "eZee room availability failed, using local data"
```
