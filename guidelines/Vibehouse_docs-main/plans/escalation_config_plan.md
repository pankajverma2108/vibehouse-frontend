# Escalation Config Plan

Source: `escalation_inspiration/` — adapted for VibeHouse NestJS + PostgreSQL + SQS/Redis stack.

---

## Overview

The escalation system has two independent, admin-configurable pieces:

| Piece | What it controls | Old storage | New storage |
|-------|-----------------|-------------|-------------|
| **Task Timings** (T1–T4) | How long to wait before starting escalation, based on task severity | `escalation-settings.json` → `timings` | `escalation_config` DB table |
| **Level Assignments** (L1–L4) | Which staff role is notified at each escalation level | `escalation-settings.json` → `levels` | `escalation_config` DB table |

Both are updated via admin dashboard API calls (no code deploy needed).

---

## Part 1: T1/T2/T3/T4 — Task Categories

**Kept exactly from the original.** These are the initial wait times given to the assigned staff before escalation begins.

| Category | Meaning | Initial Wait | Examples |
|----------|---------|-------------|---------|
| **T1** | Immediate Response | 5 min (default) | Water bottle, towel, wifi password, tissue, pillow, key card, hangers |
| **T2** | Standard Service | 15 min (default) | Food delivery, room cleaning, laundry, ironing, bathroom cleaning, loose tap, light bulb |
| **T3** | Technical Issues | 60 min (default) | AC failure, hot water breakdown, electrical board, major plumbing, appliance breakdown |
| **T4** | Critical Emergency | **0** — broadcast immediately to ALL levels | Water leakage, electrical hazard, fire, medical emergency, gas leak, power failure |

> **T4 rule (unchanged from original)**: T4 initial wait MUST be 0. Any T4 task immediately fires `broadcast` mode — all escalation levels notified simultaneously with no waiting.

### No AI Classification — Service-Level Hardcoding

Guests place orders from the webapp by paying — they don't describe tasks in free text. So there is nothing to classify with AI. Instead:

- Every service in the system has a **T-category hardcoded at the service level**
- Owner and Manager can change any service's T-category from the admin dashboard
- T-category is stored in the `sla_config` table as a `task_category` column (`T1` | `T2` | `T3` | `T4`)
- When a ticket is created, `task_category` is read from `sla_config` and written to `zoho_ticket_ref.task_category` — no runtime inference needed

**Hardcoded defaults (set at seed time):**

| Service | Department | Default T |
|---------|-----------|-----------|
| Towel, tissue, pillow, water bottle, key card | HOUSEKEEPING / FRONT_OFFICE | T1 |
| Room cleaning, laundry, food delivery, ironing | HOUSEKEEPING / FRONT_OFFICE | T2 |
| Loose tap, light bulb, shower head, minor plumbing | MAINTENANCE | T2 |
| AC failure, water heater, electrical panel | MAINTENANCE | T3 |
| Active leakage, fire, gas, medical emergency | MAINTENANCE | T4 |
| Borrowable items (iron, dryer, umbrella) | FRONT_OFFICE | T1 |

**Admin override flow:**
1. Dashboard → Settings → Service Catalog
2. Find service row (e.g., "AC Repair")
3. Change T-category dropdown: T1 / T2 / T3 / T4
4. Save → `PATCH /admin/sla-config` → updates `sla_config.task_category`
5. All future tickets for that service use the new T-category immediately

No deploy needed. No AI call. No latency at ticket creation time.

---

## Part 2: L1–L4 Level Assignments

**Kept exactly from the original structure.** Each level maps to a **role name** that the system uses to look up which staff/admin to notify.

Default:
```json
{
  "L1": "TEAM_LEAD",
  "L2": "Manager",
  "L3": "Owner"
}
```

How the lookup works at runtime:
- **L1**: query our `staff` table — `WHERE role = 'TEAM_LEAD' AND property_id = ? AND is_available = true`
- **L2**: query `admin_users` — `WHERE role = 'Manager' AND property_id = ?` → get phone
- **L3**: query `admin_users` — `WHERE role = 'Owner' AND property_id = ?` → get phone + PagerDuty trigger

Admin can change L1/L2/L3 role strings any time via API. The exact lookup table (staff vs admin_users) is determined by the role string:
- Roles `HOUSEKEEPING_WORKER`, `MAINTENANCE_TECHNICIAN`, `RECEPTION_AGENT`, `TEAM_LEAD` → look up in `staff`
- Roles `Manager`, `Owner` → look up in `admin_users`

---

## Part 3: DB Table — `escalation_config`

Replaces the flat JSON file. One row per property.

```sql
CREATE TABLE escalation_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   TEXT NOT NULL UNIQUE REFERENCES properties(id),

  -- T-timings (in minutes, matching original T1/T2/T3/T4 concept)
  t1_minutes    INTEGER NOT NULL DEFAULT 5,    -- Immediate Response
  t2_minutes    INTEGER NOT NULL DEFAULT 15,   -- Standard Service
  t3_minutes    INTEGER NOT NULL DEFAULT 60,   -- Technical Issues
  t4_minutes    INTEGER NOT NULL DEFAULT 0,    -- Critical Emergency — MUST be 0

  -- Inter-level escalation wait (same as escalationWait in original)
  -- Time between: initial notify → reminder → move to next level
  escalation_wait_minutes INTEGER NOT NULL DEFAULT 5,

  -- Level → role name assignments (matches original levels object)
  l1_role       TEXT NOT NULL DEFAULT 'TEAM_LEAD',
  l2_role       TEXT NOT NULL DEFAULT 'Manager',
  l3_role       TEXT NOT NULL DEFAULT 'Owner',

  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_by    UUID REFERENCES admin_users(id)
);
```

**Validation rules (same as original):**
- `t4_minutes` must always be `0`
- All minute values must be `>= 0`
- Role names must be non-empty strings

---

## Part 4: Escalation Flow (ported from `runEscalation`)

This runs inside the **SLA Watchdog Worker** when a Redis timer fires, via a message to `vibehouse-sla-escalate` SQS queue.

### T1/T2/T3 Escalation (Sequential)

```
Ticket created
    │
    ├─ Task classified (T1/T2/T3)
    │
    ├─ Redis keys set:
    │    sla:{ticketId}:initial     TTL = t{N}_minutes × 60
    │    sla:{ticketId}:escalation  TTL = initial + escalation_wait_minutes × 60
    │    sla:{ticketId}:reminder    TTL = initial + (escalation_wait_minutes × 2) × 60
    │    sla:{ticketId}:l2          TTL = initial + (escalation_wait_minutes × 3) × 60
    │    sla:{ticketId}:l2_reminder TTL = ...
    │    sla:{ticketId}:l3          TTL = ...
    │    sla:{ticketId}:deadline    TTL = sla_minutes × 60
    │
    ├─ Assigned staff WhatsApp sent (task_assigned interactive template)
    │
    [REDIS: sla:{ticketId}:initial expires]
    │
    ├─ SQS message: { ticketId, event: "initial_expired" }
    ├─ OpsTaskWorker: fetch ticket from zoho_ticket_ref
    ├─ IF status = "In Progress" or "Closed" → STOP (staff responded)
    ├─ ELSE → send task_reminder_l0 to assigned staff
    │
    [REDIS: sla:{ticketId}:escalation expires]
    │
    ├─ IF status still "Pending" or "Open" → escalate to L1
    │    → lookup staff WHERE role = config.l1_role
    │    → send task_escalation_l1 to L1 staff (all matching)
    │    → PATCH Zoho Desk: cf_is_escalated = "true", cf_current_escalation_level = "L1"
    │    → INSERT ticket_timeline: ESCALATED_L1
    │
    [REDIS: sla:{ticketId}:reminder expires]
    │
    ├─ IF still unresolved → send reminder to L1 (same template, same staff)
    │
    [REDIS: sla:{ticketId}:l2 expires]
    │
    ├─ IF still unresolved → escalate to L2
    │    → lookup admin_users WHERE role = config.l2_role
    │    → send task_escalation_l2 (WhatsApp)
    │    → trigger PagerDuty (dedup_key = zoho_ticket_ref.id)
    │    → PATCH Zoho Desk: cf_current_escalation_level = "L2"
    │
    [REDIS: sla:{ticketId}:deadline expires]
    │
    └─ L3 breach → lookup config.l3_role (Owner)
         → send task_breached_l3 (WhatsApp)
         → trigger PagerDuty (L3 severity = critical)
         → PATCH Zoho Desk: cf_current_escalation_level = "L3"
         → INSERT ticket_timeline: SLA_BREACHED
```

**Stop condition (same as original):** At every level check — if `zoho_ticket_ref.status` is `In Progress` or `Closed` → delete all remaining Redis keys → stop escalation chain.

### T4 Broadcast (Parallel)

```
Ticket classified as T4
    │
    ├─ NO initial wait
    ├─ Collect all staff for ALL levels (L1 + L2 + L3) simultaneously
    ├─ Send task_escalation messages to all of them in parallel (Promise.all)
    ├─ PATCH Zoho Desk: cf_is_escalated = "true", cf_current_escalation_level = "L1"
    └─ Trigger PagerDuty immediately (critical severity)
```

---

## Part 5: Admin API Endpoints

**Adapted from original `/api/config/escalation` routes.** Ported to NestJS, DB-backed instead of file-backed.

```
Module: backend/src/admin/escalation-config/
Files:
  admin-escalation-config.module.ts
  admin-escalation-config.controller.ts
  admin-escalation-config.service.ts
  dto/update-escalation-config.dto.ts
  dto/update-timings.dto.ts
  dto/update-levels.dto.ts
```

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/admin/escalation-config` | `settings.read` | Get current config for this property |
| PUT | `/admin/escalation-config` | `settings.edit` | Update full config (timings + levels) |
| PATCH | `/admin/escalation-config/timings` | `settings.edit` | Update T-timings only |
| PATCH | `/admin/escalation-config/levels` | `settings.edit` | Update L-level role assignments only |

### GET response shape (matches original JSON structure):
```json
{
  "timings": {
    "T1": 5,
    "T2": 15,
    "T3": 60,
    "T4": 0,
    "escalationWait": 5
  },
  "levels": {
    "L1": "TEAM_LEAD",
    "L2": "Manager",
    "L3": "Owner"
  }
}
```

> Units changed from **milliseconds** (original) to **minutes** (production). Frontend shows minutes; backend stores minutes; Redis TTLs computed as `minutes × 60`.

### PATCH /timings body (same keys as original, now minutes):
```json
{
  "T1": 5,
  "T2": 15,
  "T3": 60,
  "T4": 0,
  "escalationWait": 5
}
```

### PATCH /levels body (exact same structure as original):
```json
{
  "L1": "TEAM_LEAD",
  "L2": "Manager",
  "L3": "Owner"
}
```

Validation (same rules as original):
- Level keys must match `/^L\d+$/`
- Values must be non-empty strings
- `T4` must be `0`
- All values `>= 0`

---

## Part 6: Dashboard UI — Escalation Config Tab

Simple settings panel inside the admin dashboard.

```
┌────────────────────────────────────────────────────────┐
│  Escalation Settings                                    │
│                                                        │
│  Task Response Windows                                 │
│  ┌──────┬────────────────────────┬──────────────────┐  │
│  │ T1   │ Immediate Response     │ [  5  ] min      │  │
│  │ T2   │ Standard Service       │ [ 15  ] min      │  │
│  │ T3   │ Technical Issues       │ [ 60  ] min      │  │
│  │ T4   │ Critical Emergency     │ [  0  ] (fixed)  │  │
│  │ Wait │ Between escalation msgs│ [  5  ] min      │  │
│  └──────┴────────────────────────┴──────────────────┘  │
│                                                        │
│  Escalation Level Roles                               │
│  ┌──────┬──────────────────────────────────────────┐   │
│  │ L1   │ [TEAM_LEAD ▼]                            │   │
│  │ L2   │ [Manager   ▼]                            │   │
│  │ L3   │ [Owner     ▼]                            │   │
│  └──────┴──────────────────────────────────────────┘   │
│                                                        │
│  [Save Timings]              [Save Levels]             │
└────────────────────────────────────────────────────────┘
```

Role dropdowns populate from:
- All `staff.role` values (HOUSEKEEPING_WORKER, TEAM_LEAD, etc.)
- All `admin_users` role names (Manager, Owner)

---

## Part 7: `zoho_ticket_ref` Column Additions

Two columns needed to support the escalation flow:

```sql
ALTER TABLE zoho_ticket_ref ADD COLUMN task_category  TEXT DEFAULT 'T2'; -- T1|T2|T3|T4
ALTER TABLE zoho_ticket_ref ADD COLUMN guest_phone    TEXT;               -- for guest completion WhatsApp
```

`task_category` is set at ticket creation time after Claude Haiku classification. Used by SLA Watchdog to set correct Redis TTLs.

---

## Summary: What's Kept vs What Changed

| Concept | Original | VibeHouse |
|---------|----------|-----------|
| T1/T2/T3/T4 categories | ✅ Identical (semantics + examples) | ✅ |
| T4 = broadcast, wait = 0 | ✅ Enforced | ✅ |
| L1/L2/L3 role assignment | ✅ Identical JSON structure | ✅ |
| `escalationWait` between levels | ✅ Identical concept | ✅ |
| Initial wait → status check → escalate | ✅ Identical flow | ✅ |
| Reminder at each level before advancing | ✅ Identical (send → wait → remind → wait → next) | ✅ |
| Stop on status change | ✅ Identical | ✅ |
| Admin API (GET/PUT/PATCH timings/PATCH levels) | ✅ Same endpoints | ✅ |
| Config storage | JSON file | PostgreSQL `escalation_config` |
| Task classification | GPT-4o-mini (AI) | **No AI** — T-category set per service in `sla_config`, admin-editable |
| Timer mechanism | `setTimeout` chains | Redis TTL + SQS Watchdog |
| Staff lookup | Zoho CRM `Staffs` module | PostgreSQL `staff` + `admin_users` |
| Ticket system | Zoho CRM `Service_Requests` | Zoho Desk + `zoho_ticket_ref` |
