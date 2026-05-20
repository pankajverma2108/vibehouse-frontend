# Payment API Routes (Razorpay Integration)

> **Module**: `PaymentModule` (`src/payment/`)
> **Base URL**: `http://localhost:8080`

---

## Flow Overview

```
Guest adds items to cart (POST /guest/store/cart/:eri/add)
  → Guest reviews cart (POST /guest/store/cart/:eri/checkout)  ← now returns summary only
  → Guest initiates payment (POST /payment/create-order)      ← creates Razorpay order
  → Frontend opens Razorpay checkout modal (or dev simulate)
  → On success: POST /payment/verify (frontend) OR webhook (server-to-server)
  → Order marked PAID, inventory decremented
```

---

## 1. POST `/payment/create-order`

Creates a Razorpay order for the guest's PENDING addon cart.

**Auth**: Guest JWT required

**Request**:
```json
{
  "ezee_reservation_id": "EZEE-BND-2026-001"
}
```

**Response** (200):
```json
{
  "razorpay_order_id": "order_STQ3wL01PVlsiG",
  "razorpay_key": "rzp_test_STOjwD1NfPXHSa",
  "amount": 800,
  "amount_paise": 80000,
  "currency": "INR",
  "payment_id": "ec68a973-...",
  "order_id": "f852744f-...",
  "guest": {
    "email": "arjun@vibehouse.in"
  }
}
```

**Errors**:
- `400` — Cart is empty
- `400` — Insufficient stock for item
- `400` — Cart total must be greater than zero
- `404` — Booking not found

**What happens**:
1. Validates cart is non-empty with total > 0
2. Validates stock for all COMMODITY items
3. Calls Razorpay API to create order (amount in paise)
4. Creates PENDING payment record in `payments` table
5. Links payment to the `addon_orders` row

---

## 2. POST `/payment/verify`

Frontend calls this after Razorpay checkout modal returns success. Verifies signature and fulfils the order.

**Auth**: Guest JWT required

**Request**:
```json
{
  "razorpay_order_id": "order_STQ3wL01PVlsiG",
  "razorpay_payment_id": "pay_STQ4abc123",
  "razorpay_signature": "d41d8cd98f00b204e9800998ecf8427e..."
}
```

**Response** (200):
```json
{
  "message": "Payment captured, order fulfilled",
  "payment_id": "ec68a973-...",
  "order_id": "f852744f-...",
  "total": 800,
  "items_count": 3
}
```

**Errors**:
- `400` — Invalid payment signature
- `400` — Payment does not belong to this guest
- `404` — Payment record not found

**What happens**:
1. Verifies `SHA256(razorpay_order_id|razorpay_payment_id)` against signature using `RAZORPAY_TEST_API_SECRET`
2. Marks payment as CAPTURED
3. Marks addon_order as PAID
4. Decrements inventory for COMMODITY items
5. Invalidates property cache

---

## 3. POST `/webhook/razorpay`

Razorpay server-to-server webhook. No auth header — signature verified via `x-razorpay-signature`.

**Auth**: None (webhook signature verification)

**Headers**:
```
x-razorpay-signature: <hmac-sha256-of-raw-body>
Content-Type: application/json
```

**Handled events**:

| Event | Action |
|---|---|
| `payment.captured` | Fulfils order (same as verify) |
| `order.paid` | Fulfils order (same as verify) |
| `payment.failed` | Marks payment as FAILED |

**Response** (200):
```json
{ "status": "captured" }
// or
{ "status": "failed_recorded" }
// or
{ "status": "already_captured" }
// or
{ "status": "ignored", "reason": "..." }
```

**What happens**:
1. Verifies webhook signature using `RAZORPAY_WEBHOOK_SECRET`
2. Extracts `razorpay_order_id` and `razorpay_payment_id` from event payload
3. Looks up our payment record
4. If `payment.captured` or `order.paid` — fulfils order (idempotent, won't double-capture)
5. If `payment.failed` — marks payment as FAILED, unlinks from order so guest can retry

**Razorpay Dashboard Config**:
- Webhook URL: value from `RAZORPAY_WEBHOOK_URL` env var
- Events: `payment.captured`, `order.paid`, `payment.failed`
- Secret: value from `RAZORPAY_WEBHOOK_SECRET` env var

---

## 4. POST `/payment/dev/simulate-capture`

**Development only** — simulates a successful payment capture for local testing where Razorpay webhooks can't reach localhost.

**Auth**: None (but only works when `NODE_ENV=development`)

**Request**:
```json
{
  "razorpay_order_id": "order_STQ3wL01PVlsiG"
}
```

**Response** (200):
```json
{
  "message": "Payment captured, order fulfilled",
  "payment_id": "ec68a973-...",
  "order_id": "f852744f-...",
  "total": 800,
  "items_count": 3
}
```

**Errors**:
- `400` — Dev simulate only available in development
- `404` — Payment record not found

---

## 5. POST `/payment/fail`

Frontend calls this if the Razorpay modal is dismissed or payment fails client-side. Marks payment FAILED and unlinks from order so the guest can retry.

**Auth**: Guest JWT required

**Request**:
```json
{
  "razorpay_order_id": "order_STQ3wL01PVlsiG"
}
```

**Response** (200):
```json
{
  "message": "Payment failed. Cart is available for retry.",
  "payment_id": "9f1dd1f3-...",
  "razorpay_order_id": "order_STQ3wL01PVlsiG"
}
```

**What happens**:
1. Marks payment as FAILED
2. Unlinks payment_id from addon_orders (sets to null)
3. Guest can now call `POST /payment/create-order` again to retry

---

## 6. POST `/payment/dev/simulate-fail`

**Development only** — simulates a payment failure for local testing.

**Auth**: None (but only works when `NODE_ENV=development`)

**Request**:
```json
{
  "razorpay_order_id": "order_STQ3wL01PVlsiG"
}
```

---

## Payment Status Lifecycle

```
CREATED  →  CAPTURED      (success — verify or webhook)
CREATED  →  FAILED        (payment.failed webhook or /payment/fail)
CREATED  →  REFUND_NEEDED (payment captured but stock ran out — race condition edge case)

After FAILED:
  → order.payment_id set to null
  → guest can call /payment/create-order again to retry
```

---

## Race Condition Protection

The `fulfilOrder` method uses **PostgreSQL row-level locks** to prevent overselling:

```sql
SELECT product_id, available_stock FROM inventory
WHERE property_id = $1 AND product_id = ANY($2::text[])
FOR UPDATE  -- locks these rows until transaction commits
```

**Scenario**: 1 towel left, 2 guests pay simultaneously.
- Guest A's transaction locks the inventory row first → sees 1 available → decrements to 0 → commits
- Guest B's transaction waits for the lock → gets the lock → sees 0 available → marks payment as `REFUND_NEEDED` + order as `FAILED_STOCK`
- Guest B gets: `"Payment received but insufficient stock. Refund will be processed."`

No stock goes negative. No double-selling.

---

## Activity Logging

All payment events are logged in `admin_activity_log`:

| Action | When |
|---|---|
| `PAYMENT_CREATED` | Razorpay order created |
| `PAYMENT_CAPTURED` | Payment successfully captured, order fulfilled |
| `PAYMENT_FAILED` | Payment failed or dismissed |

Each log includes: `razorpay_order_id`, `amount`, `order_id`, and item details.

---

## Testing in Postman (Step by Step)

### Step 1: Login as guest
```
POST /guest/auth/login
{ "email": "arjun@vibehouse.in", "password": "Vibe@2026!" }
→ copy access_token
```

### Step 2: Add items to cart
```
POST /guest/store/cart/EZEE-BND-2026-001/add
Authorization: Bearer <token>
{ "product_id": "prod-water-bottle", "quantity": 2, "unit_code": "BED-D101-A" }
```

### Step 3: Review cart
```
POST /guest/store/cart/EZEE-BND-2026-001/checkout
Authorization: Bearer <token>
→ see items + total + next_step instructions
```

### Step 4: Create Razorpay order
```
POST /payment/create-order
Authorization: Bearer <token>
{ "ezee_reservation_id": "EZEE-BND-2026-001" }
→ get razorpay_order_id
```

### Step 5a: Simulate SUCCESS (dev only)
```
POST /payment/dev/simulate-capture
{ "razorpay_order_id": "order_STQ3wL01PVlsiG" }
→ order fulfilled, payment captured
```

### Step 5b: Or simulate FAILURE → retry (dev only)
```
POST /payment/dev/simulate-fail
{ "razorpay_order_id": "order_STQ3wL01PVlsiG" }
→ "Cart is available for retry"

POST /payment/create-order   ← creates a NEW Razorpay order
→ get new razorpay_order_id

POST /payment/dev/simulate-capture
{ "razorpay_order_id": "<new_order_id>" }
→ order fulfilled on retry
```

### Step 6: Verify order is PAID
```
GET /guest/store/EZEE-BND-2026-001/orders
Authorization: Bearer <token>
→ order status should be "PAID" with payment details
```

---

## Environment Variables

| Key | Purpose |
|---|---|
| `RAZORPAY_TEST_API_KEY` | Razorpay Key ID (starts with `rzp_test_`) |
| `RAZORPAY_TEST_API_SECRET` | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_URL` | Webhook endpoint URL (for Razorpay dashboard config) |
| `RAZORPAY_WEBHOOK_SECRET` | Shared secret for webhook signature verification |

---

## Files

| Path | Purpose |
|---|---|
| `src/payment/payment.module.ts` | Module registration |
| `src/payment/payment.controller.ts` | 4 routes (create-order, verify, webhook, dev-simulate) |
| `src/payment/payment.service.ts` | All business logic + fulfilOrder shared method |
| `src/payment/razorpay.provider.ts` | Razorpay SDK factory provider |
| `src/payment/dto/create-order.dto.ts` | DTO for create-order |
| `src/payment/dto/verify-payment.dto.ts` | DTO for verify |
