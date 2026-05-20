# Workflow 08 — During Stay Services (In-House Guest Portal)

## Overview
Once a guest is checked in, they access the **service dashboard** in the PWA to request room services, maintenance, or purchase items. Requests branch into 3 types: **Free** (no payment, direct ticket), **Borrowable** (inventory check, deposit), and **Chargeable** (payment first, always). All generate Zoho CRM tickets with SLA timers.

---

## 1. Service Catalog

### FREE Services (No payment — Direct Zoho Ticket)
| Service | Department | SLA |
|---|---|---|
| Room Cleaning | Housekeeping | 20 min |
| Washroom Cleaning | Housekeeping | 15 min |
| Garbage Clearance | Housekeeping | 10 min |
| Linen Change | Housekeeping | 20 min |
| WiFi Issues | Maintenance | 30 min |
| Hot Water Issues | Maintenance | 30 min |
| AC Issues | Maintenance | 30 min |
| Other Maintenance | Maintenance | 45 min |
| First Aid | Front Office | 5 min (HIGH) |
| Staff Assistance | Front Office | 10 min |
| Lost & Found | Front Office | 20 min |

### BORROWABLE Items (Inventory check required)
| Item | Deposit? | Return Required |
|---|---|---|
| Iron | No — subject to availability | Yes |
| Hair Dryer | No — subject to availability | Yes |
| Umbrella | No — subject to availability | Yes |

### CHARGEABLE Items & Services (Payment mandatory first)
| Item | Price |
|---|---|
| Towel | ₹200 |
| Blanket | Market price |
| Toiletries | ₹150 |
| Locker | ₹150 |
| Laundry Pickup | ₹150 |
| Luggage Storage | 3rd-party (TuckIt) — redirect |

---

## 2. Request Flow

### Branch A — FREE Request
```
Guest selects a Free service (e.g., Room Cleaning)
    ↓
Backend:
  1. Validate guest has CHECKED_IN status
  2. Create Zoho ticket via Zoho CRM API:
     { type: 'FREE', room_number, service, department, priority }
  3. INSERT INTO zoho_ticket_ref (zoho_ticket_id, ezee_reservation_id, ticket_type='FREE', status='OPEN')
  4. Publish: ops.task.ticket_created → Notification Worker
     → WhatsApp to guest: "Your request for Room Cleaning has been received.
        Expected in ~20 minutes."
```

### Branch B — BORROWABLE Request
```
Guest selects a Borrowable item (e.g., Iron)
    ↓
Backend:
  SELECT available_stock FROM inventory
  WHERE product_id = iron_product.id AND property_id = current
    ↓
  available_stock > 0:
    → Show "Available" → Guest confirms request
    → UPDATE inventory SET available_stock = available_stock - 1
    → INSERT INTO borrowable_checkouts (
        guest_id, inventory_id, ezee_reservation_id,
        status='CHECKED_OUT', checked_out_at=NOW()
      )
    → Create Zoho ticket: "Deliver Iron to Room 101"
    → Insert zoho_ticket_ref row
    → Notify guest: "Iron is on its way"

  available_stock = 0:
    → Show "Currently Unavailable" toast
    → No ticket created, no DB write
```

### Branch C — CHARGEABLE Request
```
Guest selects a Chargeable item (e.g., Towel ₹200)
    ↓
Payment flow (same as Workflow 06):
  → Create addon_order
  → Razorpay checkout
  → Wait for webhook "payment.captured"
    ↓
On SUCCESS:
  → Deduct inventory
  → Publish: ops.task.payment_success
  → Ops Task Worker creates Zoho ticket:
     "Deliver Towel to Room 101 — PAID ✅"
     SLA: 15 minutes
  → Publish: notify.guest
     → "Payment confirmed! Your towel is on the way."

CRITICAL: Zoho ticket is NEVER created before payment webhook.
If payment fails → no ticket → no delivery → guest retries.
```

---

## 3. Atomic SQL Transaction for Chargeable + Inventory

```sql
BEGIN;
  INSERT INTO addon_orders (...);
  INSERT INTO addon_order_items (...);
  INSERT INTO payments (...);
  UPDATE inventory SET
    sold_count = sold_count + 1,
    available_stock = available_stock - 1
  WHERE product_id = $product_id
  AND available_stock > 0;   -- prevents oversell
COMMIT;

-- If UPDATE affects 0 rows (out of stock race condition):
-- ROLLBACK → return "item just went out of stock" error
```

---

## 4. Service Delivery Confirmation

```
Staff delivers item / completes service
  → Marks Zoho ticket as CLOSED
    ↓
Zoho webhook (if configured) OR polling job:
  UPDATE zoho_ticket_ref SET status='CLOSED', synced_at=NOW()
    ↓
Publish: notify.guest
  → "✅ Your towel has been delivered to Room 101"
```

---

## 5. Key Business Rules

| Rule | Detail |
|---|---|
| Luggage storage | NOT automated — redirect to TuckIt external |
| Bunk upgrade | NOT automated — handled onsite by staff |
| Room upgrade | NOT automated — handled via eZee/front desk |
| Iron/Dryer/Umbrella anti-hoarding | Max 1 per guest per active stay (enforced by `borrowable_checkouts` UNIQUE check) |
| Chargeable item payment | Guest pays our Razorpay → we sync to eZee folio → no dual payment |

---

## 6. DB Tables Involved

| Table | Role |
|---|---|
| `addon_orders` + `addon_order_items` | Chargeable order record |
| `payments` | Payment lifecycle |
| `inventory` | Stock management |
| `borrowable_checkouts` | Borrowable item state tracking |
| `zoho_ticket_ref` | Reference to live Zoho CRM ticket |
| `notification_log` | All guest notifications |
