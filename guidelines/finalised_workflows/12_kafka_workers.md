# Workflow 12 — Kafka Workers (Async Event Processing)

## Overview
The Daily Social uses **Kafka** to decouple guest-facing actions from backend operations. Two dedicated workers consume events: the **Ops Task Worker** handles all operational side-effects (eZee sync, Zoho ticket creation, MyGate PIN management), and the **Notification Worker** handles all outbound messaging (WhatsApp/Email/SMS). A third lighter worker handles **eZee Cache Sync** on a schedule.

---

## 1. Architecture Diagram

```
Guest/Staff Action (PWA or Kiosk)
    ↓
Backend Service (API Server)
    ↓ publishes to Kafka topic
    ├── ops.task.*  ──────────→ Ops Task Worker
    └── notify.*   ──────────→ Notification Worker

Scheduler (Cron jobs)
    └── ezee.sync.refresh ──→ eZee Sync Worker
```

---

## 2. Ops Task Worker

**Purpose**: Performs all external API calls and database side-effects triggered by business events. Acts as the "orchestrator" for post-payment, post-checkin, and post-extension flows.

### Consumed Topics

| Topic | Trigger | Actions |
|---|---|---|
| `ops.task.payment_success` | Razorpay webhook confirms payment | 1. Call eZee AddExtraCharge API<br>2. Update ezee_sync_log<br>3. For borrowable: deduct inventory<br>4. Publish notify.guest |
| `ops.task.checkin_complete` | Kiosk submit clicked | 1. Call eZee: mark CHECKED_IN<br>2. Call MyGate: generate guest PIN<br>3. Insert smart_lock_access<br>4. Publish notify.guest (room + PIN) |
| `ops.task.stay_extension` | Stay extension payment success | 1. Call eZee: update checkout date<br>2. Call MyGate: revoke old PIN<br>3. Call MyGate: generate new PIN<br>4. Update ezee_booking_cache checkout_date<br>5. Replace smart_lock_access row<br>6. Publish notify.guest (new PIN) |
| `ops.task.checkout_complete` | eZee checkout event / manual | 1. Call MyGate: revoke PIN<br>2. Update smart_lock_access: REVOKED<br>3. Check borrowable_checkouts for OVERDUE<br>4. Create Zoho tickets for overdue returns<br>5. Publish notify.guest (farewell) |
| `ops.task.ticket_created` | Free/Borrowable service requested | 1. Call Zoho CRM API: create ticket<br>2. Insert zoho_ticket_ref<br>3. Start Redis SLA countdown<br>4. Publish notify.staff (assigned staff) |
| `ops.task.sla_breach` | Redis SLA timer fires | 1. Call Zoho: reassign ticket<br>2. Escalate to next level<br>3. Publish notify.manager |
| `ops.task.lock_battery_low` | MyGate battery webhook | 1. Update mygate_devices.battery_status<br>2. Create Zoho maintenance ticket<br>3. Insert smart_lock_access_log |

### Error Handling

```
API call fails (eZee down, Zoho down, MyGate timeout)
    ↓
INSERT INTO ezee_sync_log (status='FAILED', attempts=1, next_retry_at=NOW()+5min)
    ↓
Retry Worker (independent process):
  SELECT * FROM ezee_sync_log
  WHERE status='FAILED' AND next_retry_at < NOW()
    ↓
  Retry up to 3 times (exponential backoff: 5min, 15min, 30min)
  After 3 failures → status='FAILED_PERMANENT'
  → Alert admin dashboard
  → Manual resolution required
```

---

## 3. Notification Worker

**Purpose**: Single responsibility — sends outbound messages. Receives events from Ops Task Worker or API directly. Supports WhatsApp (Wati), Email, and SMS.

### Consumed Topics

| Topic | Trigger | Message Sent |
|---|---|---|
| `notify.guest` | Any guest-facing event | WhatsApp via Wati (primary)<br>Email (fallback if no phone) |
| `notify.staff` | Task assigned to staff | WhatsApp to Zoho staff phone |
| `notify.manager` | SLA escalation | WhatsApp to manager |

### Message Payload Structure

```json
{
  "topic": "notify.guest",
  "recipient": {
    "type": "guest",
    "guest_id": "uuid",
    "phone": "+91-9876543210",
    "email": "abc@gmail.com"
  },
  "channel": "WHATSAPP",  // WHATSAPP | EMAIL | SMS
  "template": "checkin_confirmation",
  "variables": {
    "name": "ABC",
    "room": "101",
    "bed": "101-A",
    "pin": "7823",
    "checkout_date": "Mar 18"
  }
}
```

### Notification Log

```
Every sent message:
  INSERT INTO notification_log (
    recipient_guest_id, recipient_zoho_staff_id,
    channel, template_name,
    status='SENT',
    provider_message_id,
    sent_at
  )

Failed deliveries:
  status = 'FAILED'
  → Retry once via fallback channel (WhatsApp fail → Email)
```

---

## 4. eZee Cache Sync Worker (Scheduled)

**Purpose**: Keeps `ezee_booking_cache` fresh so the PWA is resilient to eZee API downtime.

```
Runs every 30 minutes (cron job):
  SELECT * FROM ezee_booking_cache
  WHERE is_active = TRUE
  AND fetched_at < NOW() - interval '30 minutes'
    ↓
For each stale row:
  Call eZee API: GET /reservation/{ezee_reservation_id}
    ↓
  Success:
    UPDATE ezee_booking_cache SET
      status = response.status,
      room_number = response.room_number,
      unit_code = response.unit_code,
      fetched_at = NOW()

  Failure (eZee down):
    INSERT INTO ezee_sync_log (status='FAILED')
    → Cache row remains with old data
    → PWA continues serving from stale cache
    → Alert if > 3 consecutive sync failures
```

---

## 5. Kafka Topic Summary

| Topic | Producer | Consumer |
|---|---|---|
| `ops.task.payment_success` | Payment Webhook Handler | Ops Task Worker |
| `ops.task.checkin_complete` | Kiosk API | Ops Task Worker |
| `ops.task.stay_extension` | Extension API | Ops Task Worker |
| `ops.task.checkout_complete` | Checkout API / eZee Webhook | Ops Task Worker |
| `ops.task.ticket_created` | Service Request API | Ops Task Worker |
| `ops.task.sla_breach` | Redis TTL Expiry Handler | Ops Task Worker |
| `ops.task.lock_battery_low` | MyGate Webhook Handler | Ops Task Worker |
| `notify.guest` | Ops Task Worker / API | Notification Worker |
| `notify.staff` | Ops Task Worker | Notification Worker |
| `notify.manager` | Ops Task Worker | Notification Worker |
| `ezee.sync.refresh` | Cron Scheduler | eZee Sync Worker |

---

## 6. Key Design Decisions

| Decision | Reasoning |
|---|---|
| Why Kafka and not direct API calls? | Decouples guest-facing latency from external API latency. If Zoho is slow, guest still gets immediate response. |
| Why separate Notification Worker? | Single entry point for all messaging — easy to swap WhatsApp provider, add email templates, throttle sends |
| Why eZee Sync Worker needed? | eZee API has rate limits. Batch refresh is more efficient than per-request calls |
| Kafka for notifications overhead? | Acceptable — Notification Worker is lightweight. Eliminates direct coupling between ops logic and comms logic |
