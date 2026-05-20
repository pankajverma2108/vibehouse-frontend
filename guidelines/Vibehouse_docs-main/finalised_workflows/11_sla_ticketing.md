# Workflow 11 — SLA, Ticketing & Escalation Engine

## Overview

Vibe House uses **Zoho Desk Standard** as the ticket management UI and storage layer. All SLA logic (timers, escalation, assignment) runs in our own infrastructure — **Redis** for countdown timers, **AWS SQS** for the ops task and notification queues. Staff interact exclusively via **WhatsApp (Wati)** — no separate staff app. Ticket SLA timers are admin-configurable in the `sla_config` table.

---

## 1. Architecture Decisions

| Decision | Chosen |
|---|---|
| Ticket UI + storage | Zoho Desk Standard (3 agents — Owner, Manager, Reception shared) |
| SLA engine | Redis TTL timers (our code, not Zoho's SLA policies) |
| Staff interface | WhatsApp via Wati (staff table — no dashboard login) |
| Local cache | `zoho_ticket_ref` table (thin reference — avoids Zoho API on every dashboard load) |
| SLA config | Database-driven (`sla_config` table — admin changes without code deploy) |
| Queue | AWS SQS: `vibehouse-ops-tasks.fifo`, `vibehouse-sla-escalate`, `vibehouse-notify` |
| Escalation | L2/L3 → Wati WhatsApp + PagerDuty phone call (Manager + Owner only) |

---

## 2. Staff vs Admin

| Entity | Table | Access | Task Delivery |
|--------|-------|--------|--------------|
| Owner, Manager | `admin_users` | Full dashboard + Zoho Desk | WhatsApp (phone on record) for L2/L3 alerts |
| Reception | `admin_users` | Ticket list + guest lookup (shared login) | Creates/views tickets in dashboard |
| Team Lead (HK/Maintenance) | `staff` | No dashboard | WhatsApp — L1 escalation target |
| Housekeeping Worker | `staff` | No dashboard | WhatsApp — primary task assignee |
| Maintenance Technician | `staff` | No dashboard | WhatsApp — primary task assignee |

---

## 3. Ticket Creation

```
Any service request (Free, Chargeable post-payment, Borrowable, Maintenance)
    ↓
SQS: vibehouse-ops-tasks.fifo
    ↓
Ops Task Worker:
  1. Read sla_config for (task_type × dept × priority) → get l0/l1/l2/sla_minutes
  2. POST Zoho Desk API: create ticket
     {
       subject: "Towel Request — Room 101",
       priority: "Medium",
       description: "Guest: Rahul Mehta | Phone: +91-9876... | Reservation: RES-12345",
       cf_request_type: "CHARGEABLE",
       cf_department: "HOUSEKEEPING",
       cf_room_number: "101-A",
       cf_sla_minutes: 15,
       cf_reservation_id: "RES-12345",
       cf_escalation_level: 0
     }
     ← Response: { id: "DESK-9247", ticketNumber: "TKT-0042" }
  3. SELECT staff WHERE property_id = ? AND department = 'HOUSEKEEPING'
                    AND is_available = true AND is_active = true
     ORDER BY current_task_count ASC LIMIT 1
  4. PATCH Zoho Desk ticket: assignee = { cf_assigned_staff_phone: "+91-9876..." }
  5. UPDATE staff SET current_task_count = current_task_count + 1
  6. INSERT zoho_ticket_ref (zoho_ticket_id, status, dept, ticket_type, assigned_staff_id, ...)
  7. SET Redis:
       sla:{ticketId}:l0       TTL = l0_timeout_min × 60  (seconds)
       sla:{ticketId}:l1       TTL = l1_timeout_min × 60
       sla:{ticketId}:l2       TTL = l2_timeout_min × 60
       sla:{ticketId}:deadline TTL = sla_minutes × 60
  8. SQS notify → Wati WhatsApp to assigned staff:
       "📋 New Task: Towel → Room 101-A
        SLA: 15 min | Priority: MEDIUM | TKT-0042
        Guest: Rahul Mehta | Res: RES-12345
        Reply: Accept TKT-0042 | Done TKT-0042"
```

---

## 4. SLA Configuration (`sla_config` Table)

Admins set timers per task_type × department × priority. All values in minutes:

| Task Type | Department | Priority | SLA | L0 | L1 | L2 | L3 |
|-----------|-----------|---------|-----|----|----|----|----|
| CHARGEABLE | HOUSEKEEPING | MEDIUM | 15 | 10 | 13 | 14 | 15 |
| FREE | HOUSEKEEPING | LOW | 20 | 15 | 18 | 19 | 20 |
| MAINTENANCE | MAINTENANCE | MEDIUM | 30 | 20 | 25 | 28 | 30 |
| MAINTENANCE | MAINTENANCE | HIGH | 10 | 5 | 7 | 9 | 10 |
| FREE | FRONT_OFFICE | HIGH | 5 | 2 | 3 | 4 | 5 |

L3 = `sla_minutes` (full breach). L0/L1/L2 are early warnings.

---

## 5. Escalation Ladder (L0 → L3)

```
Redis key expires → keyspace notification → SLA Watchdog → SQS: vibehouse-sla-escalate
    ↓
Ops Task Worker (escalation path):
  Reads current escalation_level from zoho_ticket_ref
  If ticket already COMPLETED/CLOSED → skip, delete remaining Redis keys

L0 — l0_timeout fires:
  No resolution yet?
  → Wati WhatsApp to ASSIGNED STAFF:
    "⏰ Reminder: Towel → Room 101 | 5 min remaining | TKT-0042"
  → PATCH Zoho cf_escalation_level = 1

L1 — l1_timeout fires:
  → Wati WhatsApp to TEAM LEAD (dept match, escalation_order = 2 in staff table):
    "🔴 Unresolved: Towel → Room 101 (13/15 min) | TKT-0042
     Reassigning to you."
  → PATCH Zoho: reassign to Team Lead, cf_escalation_level = 2
  → UPDATE zoho_ticket_ref SET escalation_level = 2, assigned_staff_id = <lead_id>

L2 — l2_timeout fires:
  → Wati WhatsApp to MANAGER (admin_users.phone):
    "🚨 SLA Warning: Towel — Room 101 (14/15 min) | TKT-0042"
  → PATCH Zoho cf_escalation_level = 3
  → No reassignment at L2

L3 — deadline fires:
  → Wati WhatsApp + PagerDuty to OWNER:
    WhatsApp: "🔥 SLA BREACHED: Towel — Room 101 (15 min) | TKT-0042"
    PagerDuty: trigger incident (dedup_key = ticket_id)
  → PATCH Zoho: cf_sla_breached = true, cf_escalation_level = 4, status = SLA_BREACHED
  → UPDATE zoho_ticket_ref SET sla_breached = true, escalation_level = 4
```

---

## 6. Ticket Closure

```
Staff sends WhatsApp: "Done TKT-0042"
    ↓
Wati webhook → our backend:
  PATCH Zoho Desk status = COMPLETED
    ↓
Zoho webhook: ticket.statusUpdate (COMPLETED)
  → UPDATE zoho_ticket_ref SET status='COMPLETED', synced_at=NOW()
  → UPDATE staff SET current_task_count = current_task_count - 1
  → DEL Redis keys: sla:{ticketId}:l0, :l1, :l2, :deadline
  → If PagerDuty was paged: POST resolve (dedup_key = ticket_id)
  → SQS notify → "✅ Your Towel request is complete — Room 101"
```

---

## 7. SLA Pause

```
Staff sends WhatsApp: "PAUSE TKT-0042"
    ↓
Wati webhook → our backend:
  Persist remaining TTL for each Redis key
  SET sla:{ticketId}:paused = "1"  (no TTL — manual resume or 10-min auto)
  SET sla:{ticketId}:pause_ttl = remaining_seconds_at_pause
  PATCH Zoho: add note "SLA paused by staff at HH:MM"
  → Notify Manager WhatsApp: "⏸ SLA paused on TKT-0042 by [staff name]. Auto-resumes in 10 min."
    ↓
Auto-resume at 10 min (SLA Watchdog polls paused keys):
  Restore TTLs from saved pause_ttl values
  DEL sla:{ticketId}:paused
```

---

## 8. Staff WhatsApp Self-Service

| Command | Action |
|---------|--------|
| `Accept TKT-0042` | PATCH Zoho status = IN_PROGRESS; log acknowledged_at |
| `Done TKT-0042` | PATCH Zoho status = COMPLETED; trigger closure flow |
| `ON` | UPDATE staff SET is_available = true |
| `OFF` | UPDATE staff SET is_available = false |
| `PAUSE TKT-0042` | Pause SLA timer for 10 min |

---

## 9. Admin Dashboard Metrics

Sourced from `zoho_ticket_ref` (local cache) + Zoho Desk's 50 built-in report templates:

- SLA compliance % by department (from `zoho_ticket_ref.sla_breached`)
- Average resolution time per department
- Top breach reasons by task type
- Staff task load (from `staff.current_task_count`)
- Peak request hours (from `zoho_ticket_ref.created_at`)
- Escalation frequency by dept and priority

---

## 10. DB Tables Involved

| Table | Role |
|---|---|
| `zoho_ticket_ref` | Thin cache: ticket status, dept, sla_breached, escalation_level, assigned_staff_id |
| `staff` | Ground-level staff: availability, task count, escalation order |
| `admin_users` | Manager/Owner/Reception: dashboard login, L2/L3 escalation phone |
| `sla_config` | Admin-configurable SLA timers per task_type × dept × priority |
| `notification_log` | All WhatsApp and PagerDuty notifications sent |
| `admin_activity_log` | SLA config changes and manual overrides |
