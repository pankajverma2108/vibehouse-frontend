# Workflow 11 — SLA, Ticketing & Escalation Engine

## Overview
The Daily Social uses **Zoho CRM as the staff operations platform**. All service tickets are created in Zoho via API. Once a ticket is created, a **4-level escalation ladder** (L0→L3) automatically triggers via the Ops Task Worker if SLA timers are breached. Staff interact via **WhatsApp (Wati)** — there is no separate staff app. Ticket SLA timers are admin-configurable in the `sla_config` table.

---

## 1. Architecture Decisions

| Decision | Chosen |
|---|---|
| Ticketing system | Zoho CRM (source of truth) |
| Staff interface | WhatsApp via Wati |
| Local cache | `zoho_ticket_ref` table (thin reference) |
| SLA config | Database-driven (`sla_config` table) — admin can change without code deploy |
| Escalation source | Ops Task Worker monitors SLA via Kafka scheduled events or polling |

---

## 2. Ticket Creation

```
Any service request (Free, Chargeable post-payment, Borrowable)
    ↓
Ops Task Worker calls Zoho CRM API:
  POST /tickets
  {
    subject: "Towel Request — Room 101",
    department: "HOUSEKEEPING",
    priority: "MEDIUM",
    custom_fields: {
      room_number: "101",
      unit_code: "101-A",
      reservation_id: "RES-12345",
      request_type: "CHARGEABLE"
    }
  }
  Response: { ticket_id: "ZOHO-TKT-4892" }
    ↓
INSERT INTO zoho_ticket_ref (
  zoho_ticket_id='ZOHO-TKT-4892',
  ezee_reservation_id, guest_id, addon_order_id,
  ticket_type, department, room_number, unit_code,
  status='OPEN', synced_at=NOW()
)
    ↓
Start SLA countdown in Redis:
  Key: sla:{zoho_ticket_id}
  Value: { created_at, sla_minutes, l0_timeout, l1_timeout, l2_timeout, l3_timeout }
  TTL: sla_minutes (total SLA window)
    ↓
Notify assigned staff via WhatsApp:
  "📋 New Task: Towel → Room 101
   SLA: 15 minutes | Priority: MEDIUM
   Guest: ABC | Reservation: RES-12345"
```

---

## 3. SLA Configuration (`sla_config` Table)

Admins set SLA timers per task_category × department × priority. Example defaults:

| Task Category | Department | Priority | SLA (min) | L0 | L1 | L2 | L3 |
|---|---|---|---|---|---|---|---|
| CHARGEABLE | HOUSEKEEPING | MEDIUM | 15 | 10 | 13 | 14 | 15 |
| FREE | HOUSEKEEPING | LOW | 20 | 15 | 18 | 19 | 20 |
| MAINTENANCE | MAINTENANCE | MEDIUM | 30 | 20 | 25 | 28 | 30 |
| MAINTENANCE | MAINTENANCE | HIGH | 10 | 5 | 7 | 9 | 10 |
| FREE | FRONT_OFFICE | HIGH | 5 | 2 | 3 | 4 | 5 |

---

## 4. Escalation Ladder (L0 → L3)

```
Ticket created → SLA timer starts
    ↓
L0 — At l0_timeout_min:
  No action taken yet?
  → WhatsApp reminder to ASSIGNED STAFF:
    "⏰ Reminder: Towel → Room 101 | 5 min remaining"

L1 — At l1_timeout_min:
  Still no resolution?
  → WhatsApp to RECEPTION / TEAM LEAD:
    "🔴 SLA Warning: Towel request unresolved — Room 101 (13/15 min)"
  → Zoho ticket re-assigned to Reception

L2 — At l2_timeout_min:
  → WhatsApp to PROPERTY MANAGER:
    "🚨 SLA Breach Imminent: Towel — Room 101 (14/15 min)"

L3 — At sla_minutes:
  SLA fully breached
  → WhatsApp to DIRECTOR / OWNER:
    "🔥 SLA BREACHED: Towel — Room 101 (15 min elapsed)"
  → Added to SLA performance report in admin dashboard
  → Zoho ticket marked as SLA_BREACHED
  → UPDATE zoho_ticket_ref SET status='SLA_BREACHED'
```

---

## 5. Ticket Closure

```
Staff resolves request
  → Marks Zoho ticket CLOSED (in Zoho or WhatsApp bot)
    ↓
Zoho webhook: "ticket.closed"
  → UPDATE zoho_ticket_ref SET status='CLOSED', synced_at=NOW()
  → Clear Redis SLA key
  → Publish: notify.guest
    → "✅ Your Towel request has been completed — Room 101"
```

---

## 6. SLA Pause (Manual Request)

Staff can pause SLA for legitimate reasons (e.g., "guest is in shower, will deliver in a few minutes"):
```
Staff sends WhatsApp command: "PAUSE TKT-4892"
  → Wati bot triggers API: POST /sla/pause
  → Redis SLA timer paused
  → INSERT INTO zoho_ticket_ref: (no dedicated table — handled in Zoho)
  → Publish notification to manager: "SLA paused by staff X for TKT-4892"
  → SLA auto-resumes in 10 minutes if not manually resumed
```

---

## 7. Admin Dashboard Metrics

Data queryable from our DB + Zoho reporting:
- Average resolution time per department
- SLA compliance % by department
- Top breach reasons by task category
- Staff performance ranking (Zoho analytics)
- Peak request hours (by `zoho_ticket_ref.created_at` time distribution)

---

## 8. DB Tables Involved

| Table | Role |
|---|---|
| `zoho_ticket_ref` | Thin local reference to Zoho ticket (status sync) |
| `sla_config` | Admin-configurable SLA timers per task category |
| `notification_log` | All WhatsApp notifications sent for tickets |
| `admin_activity_log` | SLA config changes by admin |
