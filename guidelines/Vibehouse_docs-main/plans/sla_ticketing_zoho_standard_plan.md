# SLA Ticketing — Zoho Desk Standard + Reception-as-Admin

## Decision

After evaluating Express → Standard → Professional:

- **Express**: dead end (no custom fields, no webhooks, no departments, hard 5-agent cap)
- **Professional**: ideal but ₹7,000/mo for 5 agents (overkill given we build all SLA logic ourselves)
- **Standard** ✅: ₹2,400/mo for 3 agents — feasible because our Ops Task Worker replaces everything Standard lacks

---

## What Zoho Desk Standard Handles

| Capability | Notes |
|-----------|-------|
| Ticket storage + history | Source of truth for ticket lifecycle |
| Ticket list UI | Managers and reception view/manage tickets |
| Custom ticket statuses | OPEN / PENDING / IN_PROGRESS / COMPLETED / CLOSED / SLA_BREACHED |
| 50 custom reports | SLA compliance %, avg resolution time, breach heatmap |
| Webhooks (5) | `ticket.statusUpdate` → our backend, `ticket.assigned` → our backend |
| Native priority field | Urgent / High / Medium / Low (no custom field needed) |

## What We Build (Standard doesn't have it)

| Capability | Our Solution |
|-----------|-------------|
| Department routing | `Department` custom field + Ops Task Worker routes by it |
| SLA timing (L0–L3) | Redis TTL timers (millisecond precision) |
| Escalation logic | Ops Task Worker consumes SQS `sla-escalate` queue |
| WhatsApp notifications | Wati via Notification Worker (all levels) |
| PagerDuty (L2/L3) | PagerDuty Events API v2, dedup_key = ticket ID |
| Staff assignment | `staff` table query (load balance by `current_task_count`) |
| Status transition enforcement | NestJS middleware validates transitions |
| Staff self-service (ON/OFF/PAUSE) | Wati webhook receiver |
| Blueprint equivalent | NestJS state machine in `TicketsService` |

---

## Staff & Admin Model

### Who Is Where

| Role | Table | Dashboard | WhatsApp Tasks | Zoho Agent |
|------|-------|-----------|----------------|-----------|
| Owner | `admin_users` | Full access | Yes (phone on record) | Seat 1 |
| Manager | `admin_users` | Full access | Yes (phone on record) | Seat 2 |
| Reception | `admin_users` | Limited (tickets + guests) | No | Seat 3 — **shared login** |
| Housekeeping Team Lead | `staff` | No | Yes (primary escalation target) | No |
| Housekeeping Worker | `staff` | No | Yes | No |
| Maintenance Technician | `staff` | No | Yes | No |

**Reception = 1 shared `admin_users` entry.** Multiple front-desk people use same credentials. Saves agent seats.

**`admin_users` unchanged** — already has email, password_hash, role_id, phone, is_active. Reception was already a role in `admin_roles`.

**`staff` table roles**: `HOUSEKEEPING_WORKER`, `MAINTENANCE_TECHNICIAN`, `TEAM_LEAD` only. `RECEPTION_AGENT` removed — reception is now an admin.

### Escalation Ladder

```
L0 (l0_timeout_min)  → WhatsApp → ASSIGNED STAFF (staff table)
L1 (l1_timeout_min)  → WhatsApp → TEAM LEAD of that dept (staff table, escalation_order=2)
L2 (l2_timeout_min)  → WhatsApp → MANAGER (admin_users.phone)
L3 (sla_minutes)     → WhatsApp + PagerDuty → OWNER (admin_users.phone)
```

Reception is NOT in the escalation ladder. They create and manage tickets via dashboard.

---

## Architecture

```
Guest/Staff Action
    ↓
NestJS API → AWS SQS: vibehouse-ops-tasks.fifo (MessageGroupId = ticket_type)
                                ↓
                     Ops Task Worker
                      ├── POST Zoho Desk API → create ticket
                      │   └── Response: { id: "DESK-12345", ticketNumber: "TKT-42" }
                      ├── INSERT zoho_ticket_ref (thin cache)
                      ├── SET Redis keys:
                      │   sla:{ticketId}:l0  TTL = l0_timeout_min * 60
                      │   sla:{ticketId}:l1  TTL = l1_timeout_min * 60
                      │   sla:{ticketId}:l2  TTL = l2_timeout_min * 60
                      │   sla:{ticketId}:deadline TTL = sla_minutes * 60
                      ├── SELECT staff WHERE dept = ? AND is_available = true
                      │   ORDER BY current_task_count ASC LIMIT 1
                      ├── PATCH Zoho Desk ticket: assigned_staff_id
                      ├── UPDATE staff SET current_task_count = current_task_count + 1
                      └── SQS → vibehouse-notify: WhatsApp to assigned staff

Redis Keyspace Notification (key expired)
    → SLA Watchdog → SQS vibehouse-sla-escalate
                                ↓
                     Ops Task Worker (escalation path)
                      ├── Read escalation level from zoho_ticket_ref
                      ├── L0/L1: PATCH Zoho Desk (escalation_level field)
                      │         → SQS notify → Wati WhatsApp only
                      └── L2/L3: PATCH Zoho Desk
                                 → SQS notify → Wati + PagerDuty trigger

Zoho Desk Webhook → POST /webhook/zoho-desk/status
    → UPDATE zoho_ticket_ref SET status, synced_at
    → If CLOSED/COMPLETED: DEL Redis sla:{ticketId}:*
    → UPDATE staff SET current_task_count = current_task_count - 1
    → SQS notify → "Your request is complete" to guest

Staff WhatsApp — button tap (Wati interactive template webhook)
    Button "✅ Acknowledge" → find oldest PENDING ticket for this staff phone
                              → PATCH Zoho status = IN_PROGRESS, set acknowledged_at
    Button "✔ Mark Done"   → find oldest IN_PROGRESS ticket for this staff phone
                              → PATCH Zoho status = COMPLETED, decrement task count
                              → DEL Redis sla:{id}:*, enqueue guest notify
    Text "ACCEPT-XX"       → same as Acknowledge (typed fallback if staff has multiple tasks)
    Text "DONE-XX"         → same as Mark Done (typed fallback)
    Text "ON" / "OFF"      → UPDATE staff.is_available
    Text "PAUSE ME"        → is_available = false for 30 min, auto-restore via @Timeout

Lx escalation messages (L0/L1/L2/L3) are text-only notifications (no buttons).
Staff and managers come to Zoho Desk to view/manage the escalated ticket.
```

---

## Zoho Desk Standard Setup

### Custom Fields (actually created — as of Mar 2026)

| # | Field name in Zoho | Type | Purpose |
|---|-------------------|------|---------|
| 1 | `BOOKING ID` | Text | eZee ReservationNo (e.g. EZE-1234) |
| 2 | `Request Type` | Picklist | FREE / CHARGEABLE / BORROWABLE / MAINTENANCE |
| 3 | `ASSIGNED STAFF ID` | Text | UUID from our `staff` table (set by Ops Task Worker) |
| 4 | `FEEDBACK RATING` | Text | 1–5, submitted by guest after completion |
| 5 | `Room /Bed` | Text | "101-A" (required) |
| 6 | `IS_ESCALATED` | Checkbox | Ticked when any Lx escalation fires |
| 7 | `CURRENT ESCALATION LEVEL` | Picklist | NA / L0 / L1 / L2 / L3 / L4 |

**Priority field** (native Zoho field, custom values): `15MINS` / `60MINS` / `12HRS` / `SOS`

Guest name/phone go in Subject + Description. Department routing is handled by our `sla_config` table and Ops Task Worker (no separate Zoho department field needed).

> L4 picklist value is available in Zoho for future use. Our current logic goes to L3 (full breach).

### 4 SLA Policies (cosmetic — Redis controls real timing)

| Policy | Priority (Zoho value) | Meaning | Response | Resolution |
|--------|-----------------------|---------|----------|------------|
| 1 | SOS | Critical / emergency | 5 min | 30 min |
| 2 | 15MINS | High urgency | 15 min | 1 hour |
| 3 | 60MINS | Standard | 30 min | 2 hours |
| 4 | 12HRS | Low / scheduled | 1 hour | 12 hours |

### Webhooks (2 of 5 used)

| Event | Endpoint | Action |
|-------|----------|--------|
| `ticket.statusUpdate` | `/webhook/zoho-desk/status` | Update cache, clear Redis if closed |
| `ticket.assigned` | `/webhook/zoho-desk/assigned` | Update `staff.current_task_count` |

### Agents (3 seats × ₹800 = ₹2,400/mo)

| Seat | Role | Login |
|------|------|-------|
| 1 | Owner | Individual |
| 2 | Manager | Individual |
| 3 | Reception | Shared — multiple staff, one account |

---

## Database

### `zoho_ticket_ref` — 3 columns added

Field names mirror the Zoho custom fields for consistency.

```sql
ALTER TABLE zoho_ticket_ref
  ADD COLUMN is_escalated       BOOLEAN   NOT NULL DEFAULT false,   -- mirrors Zoho IS_ESCALATED
  ADD COLUMN escalation_level   TEXT      NOT NULL DEFAULT 'NA',    -- NA | L0 | L1 | L2 | L3 | L4
  ADD COLUMN assigned_staff_id  UUID      REFERENCES staff(id);

CREATE INDEX idx_zoho_ticket_escalated ON zoho_ticket_ref(status, is_escalated)
  WHERE status NOT IN ('CLOSED', 'COMPLETED');
```

### `staff` — new table (RECEPTION_AGENT role removed)

```sql
CREATE TABLE staff (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        TEXT        NOT NULL REFERENCES properties(id),
  full_name          TEXT        NOT NULL,
  phone              TEXT        NOT NULL UNIQUE,
  email              TEXT,
  department         TEXT        NOT NULL,  -- HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE
  role               TEXT        NOT NULL,  -- HOUSEKEEPING_WORKER | MAINTENANCE_TECHNICIAN | TEAM_LEAD
  escalation_order   INTEGER     NOT NULL DEFAULT 1,
  is_available       BOOLEAN     NOT NULL DEFAULT true,
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  current_task_count INTEGER     NOT NULL DEFAULT 0,
  whatsapp_opted_in  BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_property_dept ON staff(property_id, department);
CREATE INDEX idx_staff_available ON staff(property_id, department, is_available, is_active)
  WHERE is_active = true;
```

### `escalation_matrix` — new table (Lx levels → staff / admin contacts)

This is the key table the user requested: **Lx levels are defined here and connected to staff IDs.**
The Ops Task Worker reads this table to know who to notify at each escalation level, per department.

```sql
CREATE TABLE escalation_matrix (
  id           UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  TEXT   NOT NULL REFERENCES properties(id),
  department   TEXT   NOT NULL,   -- HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE | ALL
  level        TEXT   NOT NULL,   -- L0 | L1 | L2 | L3 | L4
  contact_type TEXT   NOT NULL,   -- STAFF (staff.id) | ADMIN (admin_users.id)
  contact_id   UUID   NOT NULL,   -- FK to staff.id OR admin_users.id depending on contact_type
  notify_via   TEXT[] NOT NULL DEFAULT ARRAY['WHATSAPP'],
  -- notify_via values: 'WHATSAPP' | 'PAGERDUTY' (combine for L2/L3)
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (property_id, department, level)
);

CREATE INDEX idx_escalation_matrix_lookup ON escalation_matrix(property_id, department, level);
```

**Example seed data (Bandra property):**

| department | level | contact_type | contact_id | notify_via |
|-----------|-------|-------------|-----------|-----------|
| HOUSEKEEPING | L1 | STAFF | `<hk_team_lead_uuid>` | ['WHATSAPP'] |
| MAINTENANCE | L1 | STAFF | `<mt_team_lead_uuid>` | ['WHATSAPP'] |
| HOUSEKEEPING | L2 | ADMIN | `<manager_uuid>` | ['WHATSAPP', 'PAGERDUTY'] |
| MAINTENANCE | L2 | ADMIN | `<manager_uuid>` | ['WHATSAPP', 'PAGERDUTY'] |
| ALL | L3 | ADMIN | `<owner_uuid>` | ['WHATSAPP', 'PAGERDUTY'] |

> L0 always targets the currently `assigned_staff_id` on the ticket — no matrix row needed.
> L4 is available in Zoho's picklist for future use (e.g., external escalation, regulatory).

### `sla_config` — no change (already in schema)

### `admin_users` — no change (already has phone, role_id for reception)

---

## AWS SQS Queues

| Queue | Type | Purpose |
|-------|------|---------|
| `vibehouse-ops-tasks.fifo` | FIFO | Ticket creation + escalation (ordered per ticket via MessageGroupId) |
| `vibehouse-notify` | Standard | WhatsApp via Wati + PagerDuty triggers |
| `vibehouse-sla-escalate` | Standard | Redis watchdog → escalation events |
| `*-dlq` | Standard | Dead-letter queue for each (3 DLQs total) |

---

## Build Phases

| Phase | Deliverable |
|-------|------------|
| 1 | Zoho Desk setup: 3 agents, 7 custom fields, 4 SLA policies (✅ done), 2 webhooks |
| 2 | DB migration: `staff` table + `escalation_matrix` table + 3 cols on `zoho_ticket_ref` |
| 3 | Staff Module API (NestJS): CRUD + availability toggle + escalation matrix CRUD |
| 4 | SQS infrastructure: 3 queues + 3 DLQs in AWS |
| 5 | Ops Task Worker: create Zoho ticket, assign staff, set Redis timers, read escalation_matrix |
| 6 | Redis SLA Watchdog: keyspace notifications → fires to `vibehouse-sla-escalate` |
| 7 | Notification Worker: Wati interactive buttons (L0 assign) + text-only (L1/L2/L3) + PagerDuty (L2/L3) |
| 8 | Zoho Desk Webhook Receiver: status sync → cache + Redis clear |
| 9 | Wati Webhook Receiver: button_reply (ACK/DONE) + text commands (ON/OFF/PAUSE ME) |
| 10 | Admin frontend — Tickets tab: read from `zoho_ticket_ref`, deep-link to Zoho |
| 11 | Escalation Matrix UI: admin configures who gets notified at each Lx per dept |
| 12 | SLA Config UI: admin sets L0/L1/L2/SLA timeouts per dept × priority × type |

---

## Cost

| Item | Monthly |
|------|---------|
| Zoho Desk Standard (3 agents) | ₹2,400 |
| PagerDuty Free tier | ₹0 |
| AWS SQS (3 queues + DLQs, ~1M msgs/mo) | ~₹50 |
| **Total new cost** | **~₹2,450/mo** |

Compared to Zoho Desk Professional (5 agents) = ₹7,000/mo → saves ₹4,550/mo (₹54,600/yr).
