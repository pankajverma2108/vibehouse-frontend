# Workflow 05 — Smart Lock Access (MyGate PIN Management)

## Overview
The Daily Social uses **MyGate digital keypad locks** on all room doors. Access is **PIN-code only** — no Bluetooth/NFC app unlock (decided as overkill). Each guest gets a unique PIN tied to their stay dates. Staff have permanent master PINs. The system tracks every unlock event via MyGate webhooks for security auditing and ghost check-in detection.

---

## 1. Architecture Decisions

| Decision | Chosen |
|---|---|
| Access method | Keypad PIN only (no BT/NFC) |
| Group sharing | Same room → individual unique PINs per guest |
| PIN generation | MyGate generates (AUTO type) |
| PIN validity | TIMED — expires at checkout datetime |
| Staff master | PERMANENT PIN, per room, auto-rotates monthly |
| Battery alerts | MyGate webhook → auto Zoho maintenance ticket |
| Fallback | Physical master key held by front desk |

---

## 2. PIN Generation Flow (Post Check-in)

```
ops.task.checkin_complete event consumed by Ops Task Worker
    ↓
Lookup device for guest's room:
  SELECT * FROM mygate_devices
  WHERE room_number = ezee_booking_cache.room_number
  AND is_active = TRUE
    ↓
Call MyGate API: Create PIN
  POST /pins
  {
    property_id: mygate_connection.mygate_property_id,
    room_id: mygate_devices.mygate_room_id,
    pin_type: "AUTO",
    validity: "TIMED",
    valid_from: checkin_datetime,
    valid_until: checkout_datetime + grace_30_min
  }
  Response: { pin: "7823", pin_id: "MG-PIN-XYZ" }
    ↓
INSERT INTO smart_lock_access (
  ezee_reservation_id, guest_id, device_id,
  room_number, mygate_pin='7823',
  pin_type='AUTO', pin_validity='TIMED',
  is_master_pin=FALSE, pin_status='ACTIVE',
  valid_from, valid_until
)
    ↓
Publish: notify.guest
  → WhatsApp: "Your door PIN: 7823 | Room 101"
```

---

## 3. PIN Revocation Flow (Checkout)

```
Guest checks out (manual or auto at checkout time)
    ↓
Ops Task Worker:
  Call MyGate API: DELETE /pins/{mygate_pin_id}
    ↓
UPDATE smart_lock_access SET
  pin_status = 'REVOKED',
  revoked_at = NOW()
    ↓
Also: eZee marks reservation CHECKED_OUT
Also: MyGate auto-expires TIMED PINs at valid_until (failsafe)
```

---

## 4. Early Checkout / Late Checkout PIN Handling

```
Decision: We do NOT extend an existing PIN.
Instead: Revoke old PIN → Generate new PIN with updated validity.
```

```
Late Checkout confirmed (payment success):
  1. Revoke current PIN via MyGate API
  2. Generate new PIN with valid_until = new_checkout_time
  3. UPDATE smart_lock_access row:
     - old row: pin_status = 'REVOKED', revoked_at = NOW()
     - new row: INSERT with new pin + validity
  4. Notify guest with new PIN via WhatsApp
```

---

## 5. Staff Master PIN Management

```
Admin creates master PIN via admin panel:
  Call MyGate API: Create PIN
  {
    pin_type: "CUSTOM",
    validity: "PERMANENT",
    pin: "STAFF-DEFINED-CODE"
  }
    ↓
INSERT INTO smart_lock_access (
  is_master_pin = TRUE,
  pin_validity = 'PERMANENT',
  valid_until = NULL    ← no expiry
)
    ↓
Monthly rotation (scheduled cron job):
  1. Generate new PERMANENT staff PIN via MyGate
  2. Revoke old staff PIN
  3. Update smart_lock_access
  4. Notify all active staff via WhatsApp with new PIN
```

---

## 6. Battery & Device Health Monitoring

```
MyGate sends webhook on battery events:
  POST /webhooks/mygate
  { event: "BATTERY_LOW", device_id: "MG-LOCK-101", battery_pct: 15 }
    ↓
Backend:
  UPDATE mygate_devices SET
    battery_pct = 15,
    battery_status = 'LOW',
    last_health_at = NOW()
  WHERE mygate_room_id = 'MG-LOCK-101'
    ↓
Insert into smart_lock_access_log:
  (device_id, event_type='BATTERY_LOW', event_source='PIN', raw_payload={...})
    ↓
Auto-create Zoho ticket:
  department: MAINTENANCE
  description: "Lock battery LOW (15%) — Room 101. Replace before it dies."
  priority: HIGH
```

---

## 7. Access Event Logging (Every Unlock)

```
MyGate sends webhook on every door event:
  POST /webhooks/mygate
  { event: "UNLOCK", device_id: "MG-LOCK-101", pin_used: "7823", timestamp }
    ↓
INSERT INTO smart_lock_access_log (
  device_id, pin_id, event_type='UNLOCK',
  event_source='PIN', event_at=timestamp, raw_payload
)
```

**Use case**: Detect "ghost check-ins" — guest who completed digital check-in but never physically entered their room. Ops team monitors `smart_lock_access_log` for first UNLOCK events.

---

## 8. Device Registry

Each physical lock has a `mygate_devices` row with:
- `mygate_room_id` — ID used in all MyGate API calls
- `lock_type` — WIFI or BLUETOOTH
- `battery_pct` — updated via webhook or polling
- `has_manual_key` — TRUE on all rooms (physical key backup at front desk)

---

## 9. DB Tables Involved

| Table | Role |
|---|---|
| `mygate_connection` | Per-property MyGate API credentials |
| `mygate_devices` | Lock device registry with health status |
| `smart_lock_access` | Per-guest PIN records |
| `smart_lock_access_log` | Every UNLOCK/LOCK/TAMPER/BATTERY event |
