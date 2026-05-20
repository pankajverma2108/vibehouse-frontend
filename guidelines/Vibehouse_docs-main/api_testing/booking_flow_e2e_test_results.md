# E2E Booking Flow — Test Results

> **Date**: 2026-03-30 | **Environment**: Local Development
> **Backend**: NestJS on `http://localhost:8080` | **SQS**: ap-south-1 (live AWS queues)
> **Booking Engine**: Mock (local ERI generation — no eZee PMS yet)
> **Payment Gateway**: Razorpay (dev simulate — no real charges)
> **Result**: ✅ **18/18 tests passed, 0 failed**

---

## Summary

| Flow | Tests | Passed | Failed |
|------|-------|--------|--------|
| **Flow A**: Book → Pay → Confirmed | 8 | 8 | 0 |
| **Flow B**: Book → Pay Fails → Rollback | 4 | 4 | 0 |
| **Flow C**: Addon Cart → Pay → PAID | 6 | 6 | 0 |
| **Total** | **18** | **18** | **0** |

---

## Flow Architecture (What Was Tested)

```
  Guest Login                       Browse Rooms                    Create Order
  ───────────                       ────────────                    ────────────
  POST /guest/auth/login      →    GET /guest/booking/rooms    →   POST /guest/booking/create-order
  Returns: JWT token                Returns: room types +           Returns: ERI, grand_total,
                                    availability + pricing          addon_order_id, PENDING_PAYMENT
          │                                                                │
          │                                                                ▼
          │                                                      Create Razorpay Order
          │                                                      ────────────────────
          │                                                      POST /payment/create-booking-order
          │                                                      Returns: razorpay_order_id
          │                                                                │
          │                              ┌─────────────────────────────────┤
          │                              ▼                                 ▼
          │                    Simulate Capture (dev)            Simulate Failure (dev)
          │                    ─────────────────────            ────────────────────────
          │                    POST /payment/dev/               POST /payment/dev/
          │                         simulate-capture                 simulate-fail
          │                              │                                 │
          │                              ▼                                 ▼
          │                    ┌──────────────────┐           ┌────────────────────────┐
          │                    │ BOOKING CONFIRMED │           │ BOOKING ROLLED BACK    │
          │                    │ Payment: CAPTURED │           │ Payment: FAILED        │
          │                    │ Addons: PAID      │           │ Inventory: RELEASED    │
          │                    │ SQS: audit_log    │           │ SQS: audit_log (fail)  │
          │                    │ SQS: booking_conf │           │ Booking: CANCELLED     │
          │                    └──────────────────┘           └────────────────────────┘
```

---

## Flow A: Guest Books → Pays → Confirmed

### Step 1: Server Health
| | |
|---|---|
| **Request** | `GET http://localhost:8080` |
| **Result** | ✅ PASS — Server responding |

### Step 2: Guest Login
| | |
|---|---|
| **Request** | `POST /guest/auth/login` |
| **Body** | `{ "email": "samir@gmail.com", "password": "Vibe@2026!" }` |
| **Result** | ✅ PASS |
| **Details** | JWT token issued, Guest: **Samir Desai** (`guest-samir-004`) |

### Step 3: Browse Available Rooms
| | |
|---|---|
| **Request** | `GET /guest/booking/rooms?property_id=60765&checkin=2026-05-01&checkout=2026-05-03` |
| **Result** | ✅ PASS |
| **Details** | 3 room types returned |

| Room Type | Beds Available | Price/Night |
|-----------|---------------|-------------|
| 6 Bed Mixed Dormitory | 24 | ₹449 |
| 4 Bed Mixed Dormitory | 80 | ₹599 |
| Queen Size Room | 15 | ₹1,999 |

### Step 4: Create Booking Order
| | |
|---|---|
| **Request** | `POST /guest/booking/create-order` |
| **Body** | `{ property_id: "60765", checkin_date: "2026-05-01", checkout_date: "2026-05-03", rooms: [{ room_type_id: "rt-6dorm", quantity: 1 }], addons: [{ product_id: "prod-toilet-kit", quantity: 1 }] }` |
| **Result** | ✅ PASS |
| **ERI** | `VH-BANDRA-MNCURRE3-3E17` |
| **Breakdown** | Rooms: ₹898 (1×6-Bed Dorm × 2 nights) + Addons: ₹150 (1× Toilet Kit) = **₹1,048** |
| **Status** | `PENDING_PAYMENT` |

**What happened behind the scenes:**
1. ✅ Room availability validated against overlapping bookings
2. ✅ Addon stock validated (Toilet Kit is COMMODITY)
3. ✅ Addon inventory reserved (`available_stock--`, `reserved_stock++`)
4. ✅ `ezee_booking_cache` created (status: PENDING_PAYMENT)
5. ✅ `booking_guest_access` created (role: PRIMARY)
6. ✅ `addon_orders` + `addon_order_items` created
7. ✅ `booking_slots` created for guest

### Step 5: Create Razorpay Payment
| | |
|---|---|
| **Request** | `POST /payment/create-booking-order` |
| **Body** | `{ ezee_reservation_id: "VH-BANDRA-MNCURRE3-3E17", grand_total: 1048, addon_order_id: "<id>" }` |
| **Result** | ✅ PASS |
| **Razorpay Order ID** | `order_SXLoijJYReOle2` |
| **Payment ID** | `aa8c68c3-35a7-4cfb-9a05-694c7c584515` |
| **Amount** | ₹1,048 (104,800 paise) |

**SQS Event**: `audit_log` → `BOOKING_PAYMENT_CREATED` emitted to `vibehouse-ops.fifo`

### Step 6: Simulate Payment Capture
| | |
|---|---|
| **Request** | `POST /payment/dev/simulate-capture` |
| **Body** | `{ razorpay_order_id: "order_SXLoijJYReOle2" }` |
| **Result** | ✅ PASS |
| **Message** | "Booking confirmed, payment captured" |
| **Status** | `CONFIRMED` |

**SQS Events emitted:**
- `audit_log` → `BOOKING_CONFIRMED` → writes to `admin_activity_log`
- `booking_confirmed` → `{ eri, payment_id, guest_id, room_type, checkin, checkout }`

**Synchronous actions completed:**
1. ✅ `ezee_booking_cache.status` → `CONFIRMED`
2. ✅ `payments.status` → `CAPTURED`
3. ✅ `addon_orders.status` → `PAID`
4. ✅ Addon inventory finalized (`reserved_stock--`, `sold_count++`)
5. ✅ Property cache invalidated

### Step 7: Verify Booking in Guest Profile
| | |
|---|---|
| **Request** | `GET /guest/auth/me` |
| **Result** | ✅ PASS |
| **Details** | Booking `VH-BANDRA-MNCURRE3-3E17` visible — Role: PRIMARY, Status: APPROVED, Room: 6 Bed Mixed Dormitory ×1 |

### Step 8: Admin Booking Verification
| | |
|---|---|
| **Request** | `GET /admin/bookings/<eri>` (with admin JWT) |
| **Result** | ✅ PASS |
| **Details** | Admin can see booking — Status: `CONFIRMED`, Room: 6 Bed Mixed Dormitory ×1 |

---

## Flow B: Guest Books → Payment Fails → Rollback

### Step 9: Create Booking for Failure Test
| | |
|---|---|
| **Request** | `POST /guest/booking/create-order` |
| **Body** | `{ property_id: "60765", checkin_date: "2026-06-10", checkout_date: "2026-06-12", rooms: [{ rt-queen, qty: 1 }], addons: [{ prod-water-bottle, qty: 2 }] }` |
| **Result** | ✅ PASS |
| **ERI** | `VH-BANDRA-MNCURVUM-2050` |
| **Total** | ₹4,198 (1× Queen Room × 2 nights + 2× Water Bottles) |
| **Status** | `PENDING_PAYMENT` |

### Step 10: Create Payment for Failure Test
| | |
|---|---|
| **Request** | `POST /payment/create-booking-order` |
| **Result** | ✅ PASS |
| **Razorpay Order** | `order_SXLop4f4EN2jVd` |
| **Amount** | ₹4,198 |

### Step 11: Simulate Payment Failure
| | |
|---|---|
| **Request** | `POST /payment/dev/simulate-fail` |
| **Body** | `{ razorpay_order_id: "order_SXLop4f4EN2jVd" }` |
| **Result** | ✅ PASS |
| **Message** | "Booking payment failed. Pending booking rolled back. You can try again." |

**SQS Event**: `audit_log` → `BOOKING_PAYMENT_FAILED` emitted

**Rollback actions completed:**
1. ✅ `payments.status` → `FAILED`
2. ✅ Addon inventory released (`available_stock++`, `reserved_stock--`)
3. ✅ `addon_order_items` deleted
4. ✅ `addon_orders` deleted
5. ✅ `booking_slots` deleted
6. ✅ `booking_guest_access` deleted
7. ✅ `ezee_booking_cache.status` → `CANCELLED`, `is_active` → `false`

### Step 12: Verify Rollback
| | |
|---|---|
| **Request** | `GET /guest/auth/me` |
| **Result** | ✅ PASS |
| **Details** | Booking `VH-BANDRA-MNCURVUM-2050` **no longer appears** in guest profile — correctly rolled back |

---

## Flow C: Existing Booking → Addon Purchase

> This tests the post-booking upsell flow — guest has an existing confirmed booking and buys addons separately.

### Step 13: Login as Samir (has EZEE-BND-2026-003)
| | |
|---|---|
| **Request** | `POST /guest/auth/login` |
| **Result** | ✅ PASS |
| **Details** | Guest: `guest-samir-004`, has seeded booking |

### Step 14: Add Items to Cart
| | |
|---|---|
| **Request** | `POST /guest/store/cart/EZEE-BND-2026-003/add` |
| **Body** | `{ product_id: "prod-water-bottle", quantity: 2, unit_code: "BED-D102-B" }` |
| **Result** | ✅ PASS |
| **Details** | 2× Water Bottle added to cart for booking EZEE-BND-2026-003 |

### Step 15: Review Cart (Checkout)
| | |
|---|---|
| **Request** | `POST /guest/store/cart/EZEE-BND-2026-003/checkout` |
| **Result** | ✅ PASS |
| **Details** | Total: ₹200 (2× Water Bottle @ ₹100), 1 item |

### Step 16: Create Addon Payment
| | |
|---|---|
| **Request** | `POST /payment/create-order` |
| **Body** | `{ ezee_reservation_id: "EZEE-BND-2026-003" }` |
| **Result** | ✅ PASS |
| **Razorpay Order** | `order_SXLosyQtVQLCol` |
| **Amount** | ₹200 |

**SQS Event**: `audit_log` → `PAYMENT_CREATED` emitted

### Step 17: Simulate Addon Payment Capture
| | |
|---|---|
| **Request** | `POST /payment/dev/simulate-capture` |
| **Body** | `{ razorpay_order_id: "order_SXLosyQtVQLCol" }` |
| **Result** | ✅ PASS |
| **Message** | "Payment captured, order fulfilled" |

**SQS Events emitted:**
- `audit_log` → `PAYMENT_CAPTURED`
- `payment_success` → `{ eri, payment_id, amount, items, ... }`

**Synchronous actions:**
1. ✅ Inventory locked with `SELECT ... FOR UPDATE` (race condition protection)
2. ✅ Stock decremented for Water Bottles
3. ✅ `payments.status` → `CAPTURED`
4. ✅ `addon_orders.status` → `PAID`

### Step 18: Verify Addon Order is PAID
| | |
|---|---|
| **Request** | `GET /guest/store/EZEE-BND-2026-003/orders` |
| **Result** | ✅ PASS |
| **Details** | Order `87385119-...` — Status: `PAID` |

---

## ERI Format (Mock Booking Engine)

Since eZee PMS is not yet integrated, the system generates local ERIs:

```
VH-{PROPERTY_CODE}-{TIMESTAMP_BASE36}-{RANDOM_4}
```

| ERI | Flow | Status |
|-----|------|--------|
| `VH-BANDRA-MNCURRE3-3E17` | Flow A (success) | CONFIRMED |
| `VH-BANDRA-MNCURVUM-2050` | Flow B (failure) | CANCELLED (rolled back) |
| `EZEE-BND-2026-003` | Flow C (seeded) | CONFIRMED (pre-existing) |

> [!NOTE]
> When eZee integration is live, the `EzeeSyncWorker` will push confirmed bookings to eZee and map/update the ERI. The SQS `booking_confirmed` event is already being emitted for this purpose.

---

## SQS Events Verified

| Event | Queue | Trigger | Status |
|-------|-------|---------|--------|
| `audit_log` (BOOKING_PAYMENT_CREATED) | vibehouse-ops.fifo | Payment order created | ✅ Emitted |
| `audit_log` (BOOKING_CONFIRMED) | vibehouse-ops.fifo | Booking confirmed after capture | ✅ Emitted |
| `booking_confirmed` | vibehouse-ops.fifo | Booking payment captured | ✅ Emitted |
| `audit_log` (BOOKING_PAYMENT_FAILED) | vibehouse-ops.fifo | Payment failure rollback | ✅ Emitted |
| `audit_log` (PAYMENT_CREATED) | vibehouse-ops.fifo | Addon payment created | ✅ Emitted |
| `audit_log` (PAYMENT_CAPTURED) | vibehouse-ops.fifo | Addon payment captured | ✅ Emitted |
| `payment_success` | vibehouse-ops.fifo | Addon payment fulfilled | ✅ Emitted |

---

## How to Re-run Tests

```bash
# Ensure backend is running
npm run start:dev

# In a separate terminal
npx ts-node scripts/test-booking-flow.ts

# Results written to booking-flow-test-results.json
```

---

## Booking Status Lifecycle (Verified)

```
PENDING_PAYMENT  →  CONFIRMED     ✅ (Flow A — payment captured)
PENDING_PAYMENT  →  CANCELLED     ✅ (Flow B — payment failed, full rollback)
```

## Payment Status Lifecycle (Verified)

```
CREATED  →  CAPTURED      ✅ (Flow A, Flow C — payment captured)
CREATED  →  FAILED        ✅ (Flow B — payment failed)
```

---

## What Is Mock vs Real

| Component | Status | Notes |
|-----------|--------|-------|
| Guest Auth (JWT) | ✅ Real | Full signup/login/JWT flow |
| Room Browsing | ✅ Real | Reads from `room_types` + `booking_slots` |
| Booking Creation | ✅ Real | Full validation, inventory reservation, DB writes |
| ERI Generation | 🔸 Mock | Local `VH-` prefix instead of eZee-generated |
| Razorpay Order Creation | ✅ Real | Calls live Razorpay test API |
| Payment Capture | 🔸 Mock | Uses `/dev/simulate-capture` (skips Razorpay webhook) |
| Inventory Stock | ✅ Real | Row-level locking with `FOR UPDATE` |
| SQS Message Emission | ✅ Real | Messages sent to live AWS SQS queues |
| SQS Consumer/Worker | ✅ Real | Workers process messages + write `admin_activity_log` |
| eZee Sync | ⏸️ Stubbed | `EzeeSyncWorker` handlers log only (blocked on eZee config) |
| Notifications | ⏸️ Stubbed | `NotifyWorker` writes `notification_log` (Wati not configured) |
