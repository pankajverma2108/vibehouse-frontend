# Workflow 06 — Payment Flow (Razorpay)

## Overview
All Vibe House payments go through **Razorpay** and are processed as a strict **prepaid flow** — no service or commodity is fulfilled until payment is 100% confirmed via webhook. After payment, charges are synced to the eZee PMS folio via the Ops Task Worker.

---

## 1. Core Payment Rules

| Rule | Detail |
|---|---|
| All transactions prepaid | No pay-at-checkout for any item |
| Gateway | Razorpay |
| Supported methods | UPI, Credit/Debit Card, Netbanking, Wallets |
| Order expiry | 15 minutes (payment window) |
| eZee sync | Background job via Ops Task Worker after payment success |
| No task before payment | Staff task NEVER created until Razorpay webhook confirms SUCCESS |

---

## 2. Payment Order Lifecycle

```
Guest clicks "Proceed to Pay"
    ↓
Backend: Create Razorpay order
  razorpay.orders.create({
    amount: total_paise,         ← Razorpay uses 100th of rupees
    currency: "INR",
    receipt: order_id
  })
    ↓
INSERT INTO payments (
  id=order_id,
  ezee_reservation_id,
  guest_id,
  amount,
  currency='INR',
  gateway='RAZORPAY',
  razorpay_order_id,
  status='PENDING',
  expires_at = NOW() + 15 min
)
    ↓
Frontend: Opens Razorpay checkout modal
Guest selects UPI/Card → completes transaction
    ↓
Razorpay sends webhook to: POST /api/webhooks/razorpay
  {
    event: "payment.captured",
    payload.payment.entity: {
      id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount: 25000
    }
  }
    ↓
Backend webhook handler:
  1. Verify webhook signature (Razorpay secret)
  2. UPDATE payments SET
       razorpay_payment_id = '...',
       status = 'SUCCESS',
       paid_at = NOW()
  3. Publish Kafka event: ops.task.payment_success
     { order_type, order_id, reservation_id, items }
```

---

## 3. Payment Failure Handling

```
Webhook: "payment.failed"
    ↓
UPDATE payments SET status = 'FAILED'
  → Release any inventory hold
  → Notify guest: "Payment failed, please try again"
  → Order remains in DB for audit trail

Guest retries:
  → New Razorpay order created
  → New payments row created
  → Previous FAILED row stays (audit trail intact)
```

---

## 4. Payment Expiry

```
Scheduled job (every 5 minutes):
  SELECT * FROM payments
  WHERE status = 'PENDING'
  AND expires_at < NOW()
    ↓
For each expired payment:
  UPDATE payments SET status = 'EXPIRED'
  → Release inventory hold (if borrowable/addon)
  → Log in ezee_sync_log (no eZee sync needed for expired)
```

---

## 5. eZee Folio Sync (Background — After SUCCESS)

```
Ops Task Worker receives: ops.task.payment_success
    ↓
For each paid item:
  Call eZee API: AddExtraCharge
  {
    reservation_id: ezee_reservation_id,
    item_name: product_name,
    amount: price,
    status: "Paid",
    payment_ref: razorpay_payment_id
  }
    ↓
On success:
  INSERT INTO ezee_sync_log (entity_type='ADDON_ORDER', status='SUCCESS')

On failure (eZee API down):
  INSERT INTO ezee_sync_log (status='FAILED', next_retry_at = NOW() + 5 min)
  → Retry worker picks up and retries up to 3 times
  → After 3 failures → status = 'FAILED_PERMANENT'
  → Admin dashboard shows sync failure for manual resolution
```

---

## 6. Double-Payment Protection

```
Unique constraint on payments:
  UNIQUE(razorpay_order_id)
  → If Razorpay sends duplicate webhook → INSERT fails silently → no duplicate
```

---

## 7. DB Tables Involved

| Table | Role |
|---|---|
| `payments` | Order lifecycle (PENDING → SUCCESS/FAILED/EXPIRED) |
| `addon_orders` | The "what was ordered" record |
| `addon_order_items` | Line items with unit price locked at purchase time |
| `ezee_sync_log` | eZee folio sync outcome + retry tracking |
