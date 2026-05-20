# Workflow 07 — Pre-Arrival Upsell (Add-on Cart)

## Overview
After signing up and linking their booking, guests can browse and purchase **add-ons before they arrive** at the property via the "Enhance Your Stay" section in the PWA dashboard. All payments are prepaid via Razorpay. Physical items (towels, kits) are queued for delivery when the guest checks in. Services (early check-in) are queued appropriately.

---

## 1. Product Catalog

All items are managed in `product_catalog`. Prices and availability are admin-editable.

### Commodities (Physical Items)

| Item | Base Price | Category |
|---|---|---|
| Water Bottle | ₹100 | CHARGEABLE |
| Bath Towel | ₹200 | CHARGEABLE |
| Safe Lock | ₹150 | CHARGEABLE |
| Toilet Kit | ₹150 | CHARGEABLE |

### Services (Time-Based)

| Service | Pre-booked Price | Same-Day Price | Notes |
|---|---|---|---|
| Early Check-in | ₹250 | ₹250+ | Fixed pre-arrival |
| Laundry | ₹150 | ₹150 | During or pre-arrival |
| Late Checkout | ₹250 | Higher (dynamic) | Pre-booked rate is discounted |

---

## 2. Flow

### Step 1 — Browse Catalog
```
Guest clicks "Enhance Your Stay"
    ↓
Fetch from product_catalog WHERE is_active = TRUE
  - Display items with real-time inventory check
  - Items with inventory.available_stock = 0 → shown as "Unavailable"
  - Late Checkout: check remaining slot cap (admin-configured max)
```

### Step 2 — Add to Cart
```
Guest adds items:
  - Late Checkout selected → Apply pre-booked rate (₹250)
    (System must note this is pre-booked for pricing logic)
  - Commodities: check inventory stock before allowing add
    → Soft reserve (Redis lock) for 15 minutes
```

### Step 3 — Checkout & Payment
```
Guest clicks "Proceed to Pay"
    ↓
Backend:
  1. Final inventory validation (prevent race condition)
  2. CREATE addon_order with status='PENDING_PAYMENT'
  3. INSERT addon_order_items (unit_price locked at current catalog price)
  4. INSERT payments (status='PENDING', expires_at=+15min)
  5. Call Razorpay: create order
  6. Return order_id to frontend
    ↓
Frontend: Razorpay checkout modal
Guest completes payment
```

### Step 4 — Payment Confirmed (Razorpay Webhook)
```
Razorpay: "payment.captured"
    ↓
UPDATE payments SET status='SUCCESS', paid_at=NOW()
UPDATE addon_orders SET status='CONFIRMED'
    ↓
Release Redis inventory hold → Deduct from DB:
  UPDATE inventory SET
    sold_count = sold_count + qty,
    available_stock = available_stock - qty
    ↓
Publish Kafka events:
  → ops.task.payment_success     (→ Ops Task Worker: eZee folio sync)
  → notify.guest                 (→ Notification Worker: receipt)
```

### Step 5 — Task Scheduling for Physical Items
```
Ops Task Worker:
  For commodities (towel, kit, safe lock):
    → If guest NOT yet checked in:
      Store task as SCHEDULED (for check-in day)
      → On check-in trigger: create Zoho ticket
    → If guest already checked in:
      → Create Zoho ticket immediately with SLA timer
```

---

## 3. Late Checkout Slot Cap Logic

```
Admin sets: max_late_checkout_slots per day = 5

At checkout selection:
  SELECT COUNT(*) FROM addon_orders
  JOIN addon_order_items ON ...
  JOIN product_catalog ON product_catalog.name = 'Late Checkout'
  WHERE checkin_records.checkout_date = TODAY
  AND addon_orders.status = 'CONFIRMED'
  → count < 5 → show slot (₹250 pre-booked)
  → count >= 5 → show "Sold Out" on late checkout
```

---

## 4. DB Tables Involved

| Table | Role |
|---|---|
| `product_catalog` | Item master with pricing and inventory linkage |
| `addon_orders` | Order header |
| `addon_order_items` | Line items with locked unit_price |
| `inventory` | Stock tracking with available_stock decrement |
| `payments` | Payment lifecycle |
| `ezee_sync_log` | eZee folio sync result |
| `notification_log` | WhatsApp receipt |
