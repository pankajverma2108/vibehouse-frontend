# Workflow 09 — Stay Extension

## Overview
An in-house guest can extend their stay via the PWA without visiting the front desk. The system fetches live availability and dynamic rates from **eZee PMS**, handles the "same bed" preference logic, processes payment via Razorpay, and updates both eZee and issues a new smart lock PIN.

---

## 1. Trigger

Guest clicks "Extend Stay" in PWA dashboard → must have `CHECKED_IN` status.

---

## 2. Step-by-Step Flow

### Step 1 — Guest Selects New Checkout Date
```
Guest picks new checkout date (e.g., +2 days)
    ↓
Backend calls eZee API:
  GET /rooms/availability?
    room_type=guest.current_room_type
    dates=current_checkout to new_checkout
  Response: { available: true/false, beds_available: [...] }
    ↓
  If NOT available: "Sorry, sold out for those dates" → Stop
  If available: Proceed to rate lookup
```

### Step 2 — Same Bed Check
```
Backend checks: Is guest's EXACT current bed available for extension dates?
  Query eZee: availability for specific bed/unit_code
    ↓
  Same bed available:
    → Show: "You'll stay in the same bed ✅"
    → Total cost = daily_rate × extension_days

  Same bed NOT available (but room type is):
    → Show disclaimer:
      "Extension available! Note: You may need to move to a different
       bed for the extended dates. Please check with front desk."
    → Guest accepts → Proceed
```

### Step 3 — Rate Display
```
Rate fetched directly from eZee API (includes any PMS-calculated surge):
  - Weekend premium
  - High-occupancy surge (if >80% occupied)
  - These are handled inside eZee — we just display what they return

Total = rate × number of extension days
Display: itemized breakdown + total
```

### Step 4 — Payment
```
Guest clicks "Confirm & Pay"
    ↓
INSERT INTO stay_extensions (
  ezee_reservation_id, guest_id, new_checkout_date,
  num_extra_days, extension_rate_per_day, total_amount,
  payment_status='PENDING'
)
    ↓
Razorpay checkout flow (same as Workflow 06)
```

### Step 5 — Post-Payment (Razorpay webhook SUCCESS)
```
UPDATE stay_extensions SET payment_status='PAID'
UPDATE payments SET status='SUCCESS'
    ↓
Publish Kafka events:
  ops.task.stay_extension
    ↓
Ops Task Worker:
  1. Call eZee API: Update reservation checkout date
       PATCH /reservation/RES-12345 { checkout_date: new_date }
  2. Update ezee_booking_cache SET checkout_date = new_date
  3. Revoke current PIN (MyGate DELETE /pins/{pin_id})
  4. Generate new PIN with valid_until = new_checkout + 30min
     (INSERT new smart_lock_access row, old row SET revoked)
  5. Call eZee AddExtraCharge for extension amount
     → INSERT ezee_sync_log
    ↓
Publish: notify.guest
  → WhatsApp: "Stay extended until [new_date]! 
               Your room PIN has been updated: [new_PIN]"
```

---

## 3. Extension Business Rules

| Rule | Detail |
|---|---|
| Rate source | Always fetched live from eZee. The Daily Social never sets rate. |
| PIN strategy | Always revoke old PIN → Generate new PIN. Never extend active PIN. |
| eZee update | eZee reservation checkout date updated via API |
| Partial group extension | Each guest extends individually (separate `stay_extensions` rows) |
| Sold out | If category fully booked, extension not offered |

---

## 4. DB Tables Involved

| Table | Role |
|---|---|
| `stay_extensions` | Extension record with new dates and rate |
| `payments` | Razorpay payment lifecycle |
| `ezee_booking_cache` | Updated checkout date after extension |
| `smart_lock_access` | Old PIN revoked, new PIN inserted |
| `ezee_sync_log` | eZee date change and charge sync outcome |
| `notification_log` | New PIN + confirmation WhatsApp |
