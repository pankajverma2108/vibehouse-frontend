# Zoho CRM Module Design — SLA Ticketing System

## Context

VibeHouse needs Zoho CRM as the **source of truth** for SLA ticket lifecycle and staff management. Our PostgreSQL has `zoho_ticket_ref` (thin cache) and `sla_config` (timing rules). Cost constraint: minimize modules since Zoho CRM charges per module.

---

## Recommendation: 2 Modules Only

| Module | Purpose |
|--------|---------|
| **Service Requests** | Source of truth for every guest service ticket (SLA lifecycle) |
| **Staff** | Staff identity, department, contact, escalation position |

**Why not more?**
- Escalation history → Zoho's built-in **Notes** (free, append-only, timestamped)
- Feedback → fields on Service Requests (1:1 relationship, no separate module needed)
- Properties → **Picklist** on both modules (currently 1 property, will grow to 5-10 max)
- SLA Config → stays in PostgreSQL `sla_config` (admin dashboard configurable, high-frequency reads)
- Inventory/Payments/Guests → stay in PostgreSQL (high-frequency, not Zoho's domain)

---

## Module 1: Service Requests

### Fields

| # | Field | Zoho Type | Req? | Default | Reasoning |
|---|-------|-----------|------|---------|-----------|
| 1 | `Request_ID` | Auto Number (VH-{0001}) | Auto | Auto | Human-readable ref used in WhatsApp messages to staff ("New Task VH-0042"). Maps to `zoho_ticket_ref.zoho_ticket_id`. |
| 2 | `Subject` | Single Line (120) | Yes | — | Short task description shown in WhatsApp and Zoho list view. E.g. "Towel Request — Room 101". Staff need this to understand the task at a glance. |
| 3 | `Request_Type` | Picklist | Yes | — | `FREE` / `CHARGEABLE` / `BORROWABLE` / `MAINTENANCE`. Maps to `zoho_ticket_ref.ticket_type`. Determines whether payment was verified first. Needed for SLA reports segmented by type. |
| 4 | `Department` | Picklist | Yes | — | `HOUSEKEEPING` / `MAINTENANCE` / `FRONT_OFFICE`. Used by assignment query to route to correct staff. Maps to `zoho_ticket_ref.department`. |
| 5 | `Priority` | Picklist | Yes | `MEDIUM` | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`. Combined with Dept + Type to lookup SLA timing from PostgreSQL `sla_config`. Without it, Redis SLA timer can't be set correctly. |
| 6 | `Status` | Picklist | Yes | `OPEN` | `OPEN` → `PENDING` → `IN_PROGRESS` → `COMPLETED` → `CLOSED`. Also: `SLA_BREACHED`. This is the core state machine. Synced to `zoho_ticket_ref.status`. Blueprint enforces valid transitions. |
| 7 | `Property` | Picklist | Yes | — | `Vibe House Bandra` (+ future). Picklist saves a module vs Lookup. Staff are property-scoped; multi-property reports need this. |
| 8 | `Room_Number` | Single Line (20) | No | — | E.g. "101". Included in WhatsApp notifications so staff know where to go. Optional for non-room-specific maintenance. |
| 9 | `Unit_Code` | Single Line (20) | No | — | E.g. "101-A" (specific bed in dorm). More granular than room for borrowable deliveries. |
| 10 | `Reservation_ID` | Single Line (100) | No | — | eZee reservation ID. Links ticket to booking context. Optional for facility-level maintenance. |
| 11 | `Guest_Name` | Single Line (255) | No | — | Denormalized from `guests.name` at creation. Staff see this in WhatsApp ("Guest: Rahul Mehta"). Avoids extra DB lookup in notification worker. |
| 12 | `Guest_Phone` | Single Line (20) | No | — | For staff to contact guest directly if needed (e.g. guest not answering door). Not used for automated notifications. |
| 13 | `Assigned_Staff` | Lookup → Staff | No | — | Currently assigned staff member. Set by Ops Task Worker after running assignment query. Null when OPEN. Changes on reassignment/escalation. |
| 14 | `Assigned_At` | DateTime | No | — | When staff was assigned. Used to calculate acknowledgement latency (`Acknowledged_At - Assigned_At`). |
| 15 | `Acknowledged_At` | DateTime | No | — | When staff clicked "Accept" on WhatsApp (PENDING → IN_PROGRESS). Enables ack-time reporting. |
| 16 | `Completed_At` | DateTime | No | — | When staff marked done. Resolution time = `Completed_At - Created_Time`. Without this, SLA compliance % can't be calculated. |
| 17 | `SLA_Minutes` | Number | Yes | — | Copied from `sla_config.sla_minutes` at creation. Self-contained on ticket so historical tickets retain their original SLA even if config changes later. |
| 18 | `SLA_Breached` | Checkbox | Yes | `false` | Set `true` when L3 timeout fires. Enables Zoho dashboard filter "breached tickets this week". Separate from Status because a ticket can be breached AND later completed. |
| 19 | `Escalation_Active` | Checkbox | Yes | `false` | Set `true` when any escalation (L1+) occurred. For management review: "tickets that required escalation". |
| 20 | `Escalation_Level` | Number | No | `0` | Current level: 0=none, 1=L1 (team lead), 2=L2 (manager), 3=L3 (owner). Updated by Ops Task Worker on each Redis timer trigger. |
| 21 | `Addon_Order_ID` | Single Line (36) | No | — | PostgreSQL `addon_orders.id` for CHARGEABLE tickets only. Cross-references the payment record. |
| 22 | `Borrowable_Item` | Single Line (50) | No | — | For BORROWABLE only: "Iron", "Hair Dryer". Shown in WhatsApp and enables utilization reports. |
| 23 | `Feedback_Rating` | Number (1-5) | No | — | Guest rates service post-completion (via PWA). Stored here (not separate module) because it's 1:1 with ticket. Enables staff performance analytics. |
| 24 | `Feedback_Comment` | Multi Line (500) | No | — | Optional guest text feedback. Same 1:1 justification. |

**Zoho auto-fields (free):** `Created_Time`, `Modified_Time`, `Created_By`, `Modified_By`

---

## Module 2: Staff

### Fields

| # | Field | Zoho Type | Req? | Default | Reasoning |
|---|-------|-----------|------|---------|-----------|
| 1 | `Staff_ID` | Auto Number (STF-{0001}) | Auto | Auto | Stable Zoho reference. Used in `zoho_ticket_ref` cross-references and notification logs. |
| 2 | `Full_Name` | Single Line (255) | Yes | — | Display name in WhatsApp escalation messages ("Escalated to Priya Sharma"). |
| 3 | `Email` | Email | Yes | — | Unique identifier. Maps to `admin_users.email`. Fallback notification channel. |
| 4 | `Phone` | Phone | Yes | — | **Most critical field.** All Wati WhatsApp messages go here. Without valid phone, staff can't receive any task notifications. |
| 5 | `Role` | Picklist | Yes | — | `OWNER` / `MANAGER` / `RECEPTION` / `HOUSEKEEPING_LEAD` / `MAINTENANCE_LEAD`. Maps to `admin_roles.name`. Determines assignable ticket types and escalation ladder position. |
| 6 | `Department` | Picklist | Yes | — | `HOUSEKEEPING` / `MAINTENANCE` / `FRONT_OFFICE` / `MANAGEMENT`. Derived from role but stored explicitly for Zoho filtering and assignment query matching. |
| 7 | `Property` | Picklist | Yes | — | Same picklist as Service Requests. Staff are property-scoped. |
| 8 | `Is_Active` | Checkbox | Yes | `true` | Inactive staff excluded from assignment. Maps to `admin_users.is_active`. Set false when staff leaves (preserves ticket history). |
| 9 | `Is_Available` | Checkbox | Yes | `true` | Whether available for new assignments (false = on break/off-shift). **Primary lives in PostgreSQL** (see below), synced to Zoho for dashboard visibility. |
| 10 | `Current_Task_Count` | Number | Yes | `0` | Open/in-progress tickets assigned. Used by load-balancing query. **Primary lives in PostgreSQL**, synced to Zoho every 5 min. |
| 11 | `Escalation_Order` | Number | Yes | — | Position in escalation ladder. E.g.: Staff=1, Lead=2, Manager=3, Owner=4. Ops Task Worker uses this: `WHERE escalation_order > current_level ORDER BY escalation_order ASC LIMIT 1`. |
| 12 | `WhatsApp_Opted_In` | Checkbox | Yes | `true` | Wati requires opt-in. If false, fall back to SMS/email. Prevents Wati API errors on non-opted-in numbers. |

---

## Critical Design Decision: Where Do Availability & Task Count Live?

**Answer: PostgreSQL (primary) + Zoho (synced for dashboards)**

| Reason | Detail |
|--------|--------|
| **Latency** | Assignment query needs <100ms. Zoho API = 200-500ms per call. |
| **Atomicity** | PostgreSQL: `SET task_count = task_count + 1` is race-safe. Zoho API updates are not atomic. |
| **Rate limits** | Task count changes on every ticket create/close. Zoho has API rate limits (1000-5000/day). |
| **Availability** | If Zoho is down, assignments still work via PostgreSQL. |

**PostgreSQL `admin_users` needs 3 new columns:**
```sql
ALTER TABLE admin_users ADD COLUMN is_available BOOLEAN DEFAULT true;
ALTER TABLE admin_users ADD COLUMN current_task_count INTEGER DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN escalation_order INTEGER NOT NULL DEFAULT 1;
```

Synced to Zoho Staff module every 5 minutes for dashboard visibility.

---

## Escalation History: Zoho Notes (Built-in, Free)

Each escalation event creates a Note on the Service Request via API:
```
POST /crm/v2/Service_Requests/{id}/Notes
{
  "Note_Title": "L1 Escalation",
  "Note_Content": "Escalated to Rohit Nair (Reception) at 14:32. Original assignee Ravi Kumar did not acknowledge within 10 minutes."
}
```

**Why Notes, not a sub-module?** Sub-modules cost money. Escalation events are append-only log entries — exactly what Notes are for. Visible in Zoho record timeline as audit trail.

---

## What Stays in PostgreSQL Only (NOT in Zoho)

| Data | Why not Zoho |
|------|-------------|
| `sla_config` (timing rules) | Admin dashboard configures these. Composite unique keys. High-frequency reads by Ops Task Worker. |
| Redis SLA timer state | Real-time countdowns. Zoho has no equivalent. |
| Payment records | Razorpay webhook data. Zoho has no role in payments. `Addon_Order_ID` field provides cross-ref. |
| Guest profiles | KYC, ID docs, OAuth tokens. Zoho only needs `Guest_Name` + `Guest_Phone` denormalized on ticket. |
| Inventory stock | Changes on every purchase/borrow/return. Too high-frequency for Zoho API. |
| Booking details | eZee cache. Zoho tickets only need `Room_Number`, `Unit_Code`, `Reservation_ID` as context. |
| Notification logs | Write-heavy append-only log. Zoho is not a logging system. |

---

## Zoho Built-in Features to Leverage

| Feature | Usage |
|---------|-------|
| **Blueprint** | Enforce valid status transitions: OPEN→PENDING→IN_PROGRESS→COMPLETED→CLOSED. Prevents manual invalid edits. |
| **Workflow Rules** | "When Status = COMPLETED" → webhook to backend → clears Redis SLA key, updates `zoho_ticket_ref`. |
| **Custom Views** | "Unassigned Tickets" (Status=OPEN), "SLA Breached This Week", "My Open Tasks". |
| **Analytics** | SLA compliance %, avg resolution time by dept, staff performance by feedback rating. |

---

## Module Relationship

```
Service Requests ──[Lookup: Assigned_Staff]──▶ Staff
                 ──[Notes]──▶ (built-in escalation history)
```

One relationship only. Many-to-one: many tickets → one staff. Historical assignees recorded in Notes.

---

## Data Flow Summary

```
Guest PWA Request
    ↓ (Kafka: ops.task.ticket_created)
Ops Task Worker
    ├── 1. Read sla_config from PostgreSQL
    ├── 2. Assignment query on PostgreSQL (available + role match + lowest task_count)
    ├── 3. POST Zoho API: create Service Request + set Assigned_Staff
    ├── 4. INSERT zoho_ticket_ref (thin cache)
    ├── 5. SET Redis SLA timer (TTL = sla_minutes)
    ├── 6. INCREMENT current_task_count in PostgreSQL
    └── 7. Publish: notify.staff (WhatsApp via Wati)
    ↓
Staff WhatsApp (Wati webhook)
    ├── "Accept" → PATCH Zoho Status=IN_PROGRESS, set Acknowledged_At
    └── "Complete" → PATCH Zoho Status=COMPLETED, set Completed_At, DECREMENT task_count
    ↓
Zoho Workflow: Status=COMPLETED → webhook to backend
    ├── UPDATE zoho_ticket_ref SET status='CLOSED'
    ├── DEL Redis SLA key
    └── Publish: notify.guest ("Your request is complete")
```

---

## Sync Strategy

| Direction | Trigger | Data |
|-----------|---------|------|
| PG → Zoho | Ticket creation (API) | All Service Request fields |
| PG → Zoho | Escalation event (API) | Status, Escalation_Level, Assigned_Staff, Note |
| Zoho → PG | Webhook (status change) | `zoho_ticket_ref.status`, `synced_at` |
| Zoho → PG | Fallback poll (5 min) | Status of all open tickets |
| PG → Zoho | Periodic sync (5 min) | Staff `Is_Available`, `Current_Task_Count` |
