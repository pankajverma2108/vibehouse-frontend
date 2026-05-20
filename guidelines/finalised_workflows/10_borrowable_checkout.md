# Workflow 10 — Borrowable Item Checkout & Return

## Overview
Some items are **lent to guests during their stay** and must be returned before checkout. These include Iron, Hair Dryer, and Umbrella. Availability is tracked in the `inventory` table. Return is verified by staff. Anti-hoarding logic prevents one guest from holding multiple units of the same item.

---

## 1. Item List

| Item | Availability | Return Required |
|---|---|---|
| Iron | Subject to availability | ✅ Yes |
| Hair Dryer | Subject to availability | ✅ Yes |
| Umbrella | Subject to availability | ✅ Yes |

---

## 2. Checkout Flow

```
Guest selects Borrowable item on PWA
    ↓
Anti-hoarding check:
  SELECT COUNT(*) FROM borrowable_checkouts
  WHERE guest_id = $guest_id
  AND inventory_id = $iron_inventory_id
  AND status IN ('CHECKED_OUT', 'OVERDUE')
    ↓
  count > 0 → "You already have an Iron checked out" → Stop
    ↓
Inventory check:
  SELECT available_stock FROM inventory
  WHERE product_id = $iron_product_id
  AND property_id = $property_id
    ↓
  available_stock = 0 → "Currently Unavailable" toast → Stop
    ↓
Atomic DB update:
  BEGIN;
  INSERT INTO borrowable_checkouts (
    guest_id, inventory_id, ezee_reservation_id,
    status='CHECKED_OUT', checked_out_at=NOW()
  );
  UPDATE inventory SET
    available_stock = available_stock - 1
  WHERE product_id = $product_id AND available_stock > 0;
  COMMIT;

-- If UPDATE affects 0 rows → race condition (someone grabbed last unit)
-- ROLLBACK → "Item just became unavailable, try again"
    ↓
Create Zoho ticket: "Deliver Iron to Room 101"
INSERT INTO zoho_ticket_ref (...)
    ↓
Notify guest: "Iron is on its way to Room 101"
```

---

## 3. Return Flow (Staff-Verified)

```
Guest returns item to front desk / staff collects
    ↓
Staff records return in admin panel (or Zoho):
    ↓
UPDATE borrowable_checkouts SET
  status = 'RETURNED',
  returned_at = NOW(),
  returned_verified_by_zoho_staff_id = 'ZOHO-STAFF-003'

UPDATE inventory SET
  available_stock = available_stock + 1
    ↓
Notify guest (optional): "Thanks for returning the Iron!"
```

---

## 4. Overdue Detection (Auto Checkout)

```
Scheduled Job (every hour):
  SELECT * FROM borrowable_checkouts
  JOIN ezee_booking_cache ON ...
  WHERE borrowable_checkouts.status = 'CHECKED_OUT'
  AND ezee_booking_cache.checkout_date < NOW()
    ↓
For each overdue item:
  UPDATE borrowable_checkouts SET status = 'OVERDUE'
  Create Zoho ticket: "OVERDUE: Iron not returned — Room 101, Guest ABC"
  priority: HIGH
    ↓
Front desk team follows up physically
```

---

## 5. Borrowable States

```
CHECKED_OUT → (guest returns, staff verifies) → RETURNED
CHECKED_OUT → (checkout date passes) → OVERDUE → (staff collects) → RETURNED
```

---

## 6. Business Rules

| Rule | Detail |
|---|---|
| Anti-hoarding | Max 1 of any borrowable item per guest per stay |
| No deposit required | Items are free to borrow |
| Damaged item | Staff manually creates Zoho ticket, updates inventory `damaged_count` |
| Shrinkage tracking | `inventory.damaged_count` field tracks lost/damaged units for admin dashboard |

---

## 7. DB Tables Involved

| Table | Role |
|---|---|
| `borrowable_checkouts` | One row per checkout event, tracks status |
| `inventory` | `available_stock` decremented on checkout, incremented on return |
| `zoho_ticket_ref` | Delivery ticket reference |
| `notification_log` | Guest notification |
