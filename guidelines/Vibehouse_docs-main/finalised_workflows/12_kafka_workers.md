# Workflow 12 — SQS Workers (Async Event Processing)

## Overview

Vibe House uses **AWS SQS** to decouple guest-facing actions from backend operations. Two dedicated workers consume messages: the **Ops Task Worker** handles all operational side-effects (eZee sync, Zoho Desk ticket creation, MyGate PIN management, SLA escalation), and the **Notification Worker** handles all outbound messaging (WhatsApp via Wati, PagerDuty, Email). A third lightweight worker handles **eZee Cache Sync** on a schedule.

---

## 1. Architecture Diagram

```
Guest/Staff Action (PWA)
    ↓
NestJS API Server
    ↓ sends to SQS
    ├── vibehouse-ops-tasks.fifo  ──→ Ops Task Worker
    ├── vibehouse-sla-escalate    ──→ Ops Task Worker (escalation path)
    └── vibehouse-notify          ──→ Notification Worker

Cron Scheduler
    └── calls eZee Sync Worker every 30 min
```

### SQS Queues

| Queue | Type | MessageGroupId | Purpose |
|-------|------|----------------|---------|
| `vibehouse-ops-tasks.fifo` | FIFO | `task_type` | Ticket creation, checkin, payment, checkout |
| `vibehouse-sla-escalate` | Standard | — | Redis watchdog → escalation events |
| `vibehouse-notify` | Standard | — | Wati WhatsApp, PagerDuty, Email |
| `*-dlq` | Standard | — | Dead-letter queue per above (3 DLQs) |

---

## 2. Ops Task Worker

**Purpose**: Performs all external API calls and database side-effects triggered by business events.

### Messages Consumed

| Message Type | Trigger | Actions |
|---|---|---|
| `payment_success` | Razorpay webhook confirms payment | 1. Call eZee AddExtraCharge API<br>2. Update ezee_sync_log<br>3. For borrowable: deduct inventory<br>4. Send to vibehouse-notify (guest confirmation) |
| `checkin_complete` | Kiosk submit | 1. Call eZee: mark CHECKED_IN<br>2. Call MyGate: generate guest PIN<br>3. Insert smart_lock_access<br>4. Send to vibehouse-notify (room + PIN) |
| `stay_extension` | Extension payment success | 1. Call eZee: update checkout date<br>2. Call MyGate: revoke old PIN<br>3. Call MyGate: generate new PIN<br>4. Update ezee_booking_cache<br>5. Replace smart_lock_access row<br>6. Send to vibehouse-notify (new PIN) |
| `checkout_complete` | eZee checkout event / manual | 1. Call MyGate: revoke PIN<br>2. Update smart_lock_access: REVOKED<br>3. Check borrowable_checkouts for OVERDUE<br>4. Create Zoho Desk tickets for overdue returns<br>5. Send to vibehouse-notify (farewell) |
| `ticket_created` | Free/Borrowable service requested | 1. Read sla_config (timers)<br>2. POST Zoho Desk API: create ticket<br>3. Insert zoho_ticket_ref<br>4. Assign staff (load balance query)<br>5. SET Redis SLA timers (l0/l1/l2/deadline)<br>6. Send to vibehouse-notify (staff WhatsApp) |
| `sla_escalate` | Redis SLA Watchdog (from vibehouse-sla-escalate) | 1. Read escalation level from zoho_ticket_ref<br>2. PATCH Zoho Desk: escalation_level, reassign if L1<br>3. UPDATE zoho_ticket_ref<br>4. L0/L1: send to vibehouse-notify (Wati only)<br>5. L2/L3: send to vibehouse-notify (Wati + PagerDuty) |
| `lock_battery_low` | MyGate battery webhook | 1. Update mygate_devices.battery_status<br>2. Create Zoho Desk maintenance ticket<br>3. Insert smart_lock_access_log |

### Error Handling

```
External API call fails (eZee down, Zoho down, MyGate timeout)
    ↓
INSERT INTO ezee_sync_log (status='FAILED', attempts=1, next_retry_at=NOW()+5min)
    ↓
Message goes to SQS DLQ after maxReceiveCount exceeded
    ↓
Retry Worker polls DLQ:
  Up to 3 retries (exponential backoff: 5min, 15min, 30min)
  After 3 failures → status='FAILED_PERMANENT'
  → Alert admin dashboard
  → Manual resolution required
```

---

## 3. Notification Worker

**Purpose**: Single responsibility — sends outbound messages. Receives from `vibehouse-notify`. Supports Wati (WhatsApp), PagerDuty (L2/L3 only), and Email (fallback).

### Message Types Consumed

| Message Type | Trigger | Delivery |
|---|---|---|
| `notify_guest` | Any guest event | Wati WhatsApp (primary) → Email fallback |
| `notify_staff` | Task assigned | Wati WhatsApp to `staff.phone` |
| `notify_escalate_l0_l1` | SLA L0 or L1 | Wati WhatsApp to staff / team lead |
| `notify_escalate_l2` | SLA L2 | Wati WhatsApp to Manager (`admin_users.phone`) |
| `notify_escalate_l3` | SLA L3 | Wati WhatsApp + PagerDuty trigger to Owner |
| `pagerduty_resolve` | Ticket COMPLETED/CLOSED | PagerDuty resolve (dedup_key = ticket_id) |

### PagerDuty (L2/L3 only)

```
POST https://events.pagerduty.com/v2/enqueue
{
  routing_key: PAGERDUTY_ROUTING_KEY,
  event_action: "trigger",
  dedup_key: ticket.zoho_ticket_id,      // auto-resolves without extra DB column
  payload: {
    summary: "SLA L3: Towel → Room 101 | TKT-0042",
    severity: "critical",
    source: "vibehouse-sla-engine"
  }
}
```

Resolve on ticket closure:
```
event_action: "resolve", dedup_key: ticket.zoho_ticket_id
```

### Notification Log

```
Every outbound message:
  INSERT INTO notification_log (
    recipient_guest_id,       -- for guest messages
    recipient_staff_id,       -- for staff WhatsApp (references staff table)
    channel,                  -- WHATSAPP | EMAIL | PAGERDUTY
    template_name,
    status = 'SENT',
    provider_message_id,
    sent_at
  )

Failed deliveries:
  status = 'FAILED'
  → Retry once via fallback (WhatsApp fail → Email)
  → PagerDuty has its own retry — no action needed from us
```

---

## 4. Redis SLA Watchdog

**Purpose**: Monitors SLA timers. When a Redis key expires (TTL hits 0), fires an escalation message to `vibehouse-sla-escalate`.

```
Redis keyspace notification: __keyevent@0__:expired
  Key matches pattern: sla:{ticketId}:(l0|l1|l2|deadline)
    ↓
Watchdog extracts ticketId + level from key name
  → SendMessage to vibehouse-sla-escalate:
    { ticketId, escalationLevel: "L0" | "L1" | "L2" | "L3" }
    ↓
Ops Task Worker processes escalation
```

Fallback: If keyspace notifications unavailable, Watchdog polls `zoho_ticket_ref` every 5 seconds for tickets where `sla_deadline < NOW()` and `status NOT IN ('COMPLETED', 'CLOSED')`.

---

## 5. eZee Cache Sync Worker (Scheduled)

**Purpose**: Keeps `ezee_booking_cache` fresh so the PWA is resilient to eZee API downtime.

```
Runs every 30 minutes (cron):
  SELECT * FROM ezee_booking_cache
  WHERE is_active = TRUE AND fetched_at < NOW() - interval '30 minutes'
    ↓
For each stale row:
  Call eZee API: get_reservation(ezee_reservation_id)
    ↓
  Success → UPDATE ezee_booking_cache SET status, room_number, unit_code, fetched_at = NOW()
  Failure → INSERT ezee_sync_log (FAILED); cache row stays stale; alert if >3 consecutive failures
```

---

## 6. SQS Message Summary

| Queue | Message Type | Producer | Consumer |
|-------|-------------|---------|---------|
| `vibehouse-ops-tasks.fifo` | `payment_success` | Payment Webhook | Ops Task Worker |
| `vibehouse-ops-tasks.fifo` | `checkin_complete` | Kiosk API | Ops Task Worker |
| `vibehouse-ops-tasks.fifo` | `stay_extension` | Extension API | Ops Task Worker |
| `vibehouse-ops-tasks.fifo` | `checkout_complete` | Checkout API / eZee Webhook | Ops Task Worker |
| `vibehouse-ops-tasks.fifo` | `ticket_created` | Service Request API | Ops Task Worker |
| `vibehouse-ops-tasks.fifo` | `lock_battery_low` | MyGate Webhook | Ops Task Worker |
| `vibehouse-sla-escalate` | `sla_escalate` | Redis SLA Watchdog | Ops Task Worker |
| `vibehouse-notify` | `notify_guest` | Ops Task Worker / API | Notification Worker |
| `vibehouse-notify` | `notify_staff` | Ops Task Worker | Notification Worker |
| `vibehouse-notify` | `notify_escalate_*` | Ops Task Worker | Notification Worker |
| `vibehouse-notify` | `pagerduty_resolve` | Ops Task Worker | Notification Worker |

---

## 7. Key Design Decisions

| Decision | Reasoning |
|---|---|
| SQS over Kafka | Fully managed, zero ops overhead, already in AWS ecosystem (S3 + Textract already used). Near-zero cost at our scale. |
| FIFO for ops-tasks | Ordering matters per ticket (create → assign → notify must be sequential). `MessageGroupId = task_type` ensures order within a task type. |
| Standard for notify | Notifications are idempotent — slight reordering acceptable. Standard queues have higher throughput. |
| Separate sla-escalate queue | Isolates high-priority SLA events from general ops tasks. Avoids SLA escalation being delayed behind a slow eZee sync. |
| PagerDuty only at L2/L3 | Manager + Owner only (2 users). PagerDuty free tier: 5 users, 100 calls/month. L0/L1 are WhatsApp-only (staff/team lead). |
| dedup_key = ticket_id | PagerDuty auto-resolves with same dedup_key — no extra DB column needed. |
