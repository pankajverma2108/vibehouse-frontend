# Build Our Own SLA Ticketing System — Full PostgreSQL Approach

## Context

VibeHouse is building an in-house SLA ticketing system using PostgreSQL as the source of truth — no Zoho, no Jira, no Zendesk. Three key decisions shaping this version of the plan:

1. **Staff Module** — New `staff` table (completely separate from `admin_users`) with full CRUD and ops state management (availability, task count, escalation order). Admins log into the dashboard; staff receive WhatsApp tasks. Two distinct entities.

2. **Wati + PagerDuty Hybrid** — WhatsApp (Wati) for L0/L1 escalations. WhatsApp + PagerDuty (phone call + push) for L2/L3. Only Manager and Owner are in PagerDuty (2-3 users, within the free tier's 5-user limit and 100 calls/month quota).

3. **AWS SQS** (not Kafka, not Bull/BullMQ) — Message queue backed by AWS SQS. Already in our AWS ecosystem (we use S3 + Textract). Fully managed, zero infra overhead, near-zero cost at VibeHouse scale.

---

## Conceptual Distinction: Admin vs. Staff

These are **two separate tables, two separate entities.**

| Concept | What it means | Examples | DB table |
|---------|--------------|---------|----------|
| **Admin** | Has login credentials to the dashboard. Manages the system, views analytics, creates tickets, configures SLA rules. | Owner, Manager | `admin_users` (password_hash, JWT sessions, roles) |
| **Staff** | Receives tasks via WhatsApp. Does the ground work. No dashboard login required. | Housekeeping Worker, Maintenance Technician, Reception Agent | `staff` (new table — phone, department, availability, task count) |

`admin_users` stays completely unchanged. The new `staff` table is created from scratch.

---

## What We're Scoping

### What We NEED

| # | Capability | Detail |
|---|-----------|--------|
| 1 | Ticket lifecycle management | Create, assign, status transitions, close with audit trail |
| 2 | SLA enforcement | Per-category × dept × priority timers, breach detection |
| 3 | Multi-level escalation | L0 (reminder) → L1 (lead) → L2 (manager) → L3 (breach) |
| 4 | Assignment engine | Load-balanced, department-routed, manual override |
| 5 | Staff availability management | Manager toggles on/off-shift; staff self-report via WhatsApp |
| 6 | Real-time manager dashboard | Live ticket queue, SLA countdown, breach alerts |
| 7 | Staff board | Who's available, current task count, by department |
| 8 | Analytics & reporting | SLA compliance %, resolution time, staff performance |
| 9 | WhatsApp notifications | Staff receive tasks and escalations via Wati |
| 10 | PagerDuty for L2/L3 | Phone call + push for manager/owner on critical escalations |
| 11 | Staff response handling | Accept/Complete via WhatsApp; availability commands (ON/OFF/PAUSE ME) |
| 12 | Process enforcement | Status transitions validated, can't skip steps |
| 13 | Multi-department routing | Housekeeping / Maintenance / Front Office queues |
| 14 | Full audit trail | Every status change, assignment, escalation logged with timestamp |
| 15 | SLA pause | Staff can pause timer for 10 minutes (with auto-resume) |
| 16 | Ticket notes/comments | Internal staff notes on a ticket |
| 17 | Ticket search + filters | Filter by status, dept, priority, breach status, date range |

### What We SKIP (vs. Jira/Zendesk)

| Feature | Why |
|---------|-----|
| Customer-facing ticket portal | All tickets are internal ops tasks |
| Knowledge base / FAQ | Not needed |
| Email-to-ticket parsing | Staff interact via WhatsApp |
| Business-hours SLA calendars | 24x7 operation |
| Community forums / chatbot | Not relevant |
| Multi-tenant SaaS isolation | Single-tenant to start |

---

## DB Changes Required

### Replace: `zoho_ticket_ref` → `tickets`

```sql
CREATE SEQUENCE ticket_number_seq START 1;

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL REFERENCES properties(id),
  ticket_number TEXT UNIQUE NOT NULL
    DEFAULT 'VH-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0'),
  subject TEXT NOT NULL,
  ticket_type TEXT NOT NULL,               -- FREE | CHARGEABLE | BORROWABLE | MAINTENANCE
  department TEXT NOT NULL,                -- HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | CRITICAL
  status TEXT NOT NULL DEFAULT 'OPEN',     -- OPEN | PENDING | IN_PROGRESS | COMPLETED | CLOSED | SLA_BREACHED
  room_number TEXT,
  unit_code TEXT,
  reservation_id TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  addon_order_id UUID,
  borrowable_item TEXT,
  assigned_staff_id UUID REFERENCES staff(id),
  assigned_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_minutes INTEGER NOT NULL,
  sla_deadline TIMESTAMPTZ NOT NULL,       -- created_at + sla_minutes
  sla_paused_until TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0,      -- 0=none, 1=L1, 2=L2, 3=L3
  escalation_active BOOLEAN DEFAULT false,
  -- PagerDuty: ticket.id is used as dedup_key, no extra column needed
  feedback_rating INTEGER,
  feedback_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_property_status ON tickets(property_id, status);
CREATE INDEX idx_tickets_department ON tickets(property_id, department, status);
CREATE INDEX idx_tickets_assigned_staff ON tickets(assigned_staff_id, status);
CREATE INDEX idx_tickets_sla_deadline ON tickets(sla_deadline)
  WHERE status NOT IN ('CLOSED', 'COMPLETED');
CREATE INDEX idx_tickets_analytics ON tickets(property_id, created_at, status, department);
```

### New: `ticket_timeline` (Audit Trail)

```sql
CREATE TABLE ticket_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- STATUS_CHANGE | ASSIGNED | ESCALATED | COMMENTED | PAUSED | RESUMED | PAGERDUTY_PAGED | PAGERDUTY_RESOLVED
  actor_type TEXT NOT NULL,  -- ADMIN | STAFF | SYSTEM | GUEST
  actor_id UUID,
  actor_name TEXT,
  from_value TEXT,
  to_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ticket_timeline_ticket ON ticket_timeline(ticket_id, created_at DESC);
```

### New: `ticket_notes`

```sql
CREATE TABLE ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES admin_users(id),  -- admin who added the note
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ticket_notes_ticket ON ticket_notes(ticket_id);
```

### New: `staff` (separate from `admin_users`)

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL REFERENCES properties(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,             -- WhatsApp number (international format, e.g. +919876543210)
  email TEXT,                             -- optional, for fallback notifications
  department TEXT NOT NULL,               -- HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE
  role TEXT NOT NULL,                     -- HOUSEKEEPING_WORKER | MAINTENANCE_TECHNICIAN | RECEPTION_AGENT | TEAM_LEAD
  escalation_order INTEGER NOT NULL DEFAULT 1,  -- position in escalation ladder (1=ground, 2=lead, 3=manager ref)
  is_available BOOLEAN NOT NULL DEFAULT true,   -- true = on-shift and ready to receive tasks
  is_active BOOLEAN NOT NULL DEFAULT true,      -- false = terminated/inactive (preserves ticket history)
  current_task_count INTEGER NOT NULL DEFAULT 0, -- live count of PENDING + IN_PROGRESS tickets
  whatsapp_opted_in BOOLEAN NOT NULL DEFAULT true, -- Wati requires opt-in; false = fall back to SMS/email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_property_dept ON staff(property_id, department);
CREATE INDEX idx_staff_available ON staff(property_id, department, is_available, is_active)
  WHERE is_active = true;
```

**Who goes in `staff`:** Housekeeping Workers, Maintenance Technicians, Reception Agents, Team Leads — anyone who receives tasks via WhatsApp.

**Who stays in `admin_users`:** Owner, Manager — people who log into the admin dashboard.

**`admin_users` stays completely unchanged.** No ALTER TABLE on it.

### Keep As-Is
- `sla_config` — task_category × department × priority → sla_minutes + L0/L1/L2/L3 timeouts
- `notification_log` — outbound message audit trail
- `admin_activity_log` — admin action audit trail

---

## Build Plan — 13 Phases

### Phase 1: Core Tickets Module (Backend)

**Files:**
- `backend/src/admin/tickets/admin-tickets.module.ts`
- `backend/src/admin/tickets/admin-tickets.controller.ts`
- `backend/src/admin/tickets/admin-tickets.service.ts`
- `backend/src/admin/tickets/dto/*.dto.ts`

**Endpoints:**

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/admin/tickets` | `tickets.read` | List with filters (status, dept, priority, date, breach) |
| GET | `/admin/tickets/:id` | `tickets.read` | Detail + full timeline |
| POST | `/admin/tickets` | `tickets.create` | Create manually |
| PATCH | `/admin/tickets/:id/status` | `tickets.edit` | Update status |
| PATCH | `/admin/tickets/:id/assign` | `tickets.edit` | Manually assign staff |
| POST | `/admin/tickets/:id/notes` | `tickets.edit` | Add internal note |
| POST | `/admin/tickets/:id/pause-sla` | `tickets.edit` | Pause SLA timer for 10 min |
| GET | `/admin/tickets/analytics` | `tickets.read` | SLA compliance %, resolution time, breach count |

**Status machine (no skipping steps):**
```
OPEN         → PENDING       (on assignment)
PENDING      → IN_PROGRESS   (staff WhatsApp "ACCEPT-XXXX")
IN_PROGRESS  → COMPLETED     (staff WhatsApp "DONE-XXXX")
COMPLETED    → CLOSED        (manager action or auto after 24h)
ANY          → SLA_BREACHED  (system-only on L3 deadline)
SLA_BREACHED → CLOSED        (manager resolution)
```

**Key logic:**
- `createTicket()` — copy `sla_minutes` from `sla_config`, compute `sla_deadline`, ticket number via sequence
- `updateStatus()` — validate against state machine, write `ticket_timeline` row
- `assignTicket()` — `SELECT FOR UPDATE SKIP LOCKED` on `staff` table in `prisma.$transaction()`, increment `staff.current_task_count`

---

### Phase 2: SLA Config Module (Backend)

**Files:**
- `backend/src/admin/sla-config/admin-sla-config.module.ts`
- `backend/src/admin/sla-config/admin-sla-config.controller.ts`
- `backend/src/admin/sla-config/admin-sla-config.service.ts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/sla-config` | All rules for this property |
| PUT | `/admin/sla-config` | Upsert one rule (category × dept × priority) |
| GET | `/admin/sla-config/defaults` | Lookup rule for a specific combination |

---

### Phase 3: Staff Module (Backend) — Full CRUD + Ops State

The `staff` table is a completely separate entity from `admin_users`. This module provides full CRUD for creating and managing staff records, plus runtime ops state (availability, task load).

**Files:**
- `backend/src/admin/staff/admin-staff.module.ts`
- `backend/src/admin/staff/admin-staff.controller.ts`
- `backend/src/admin/staff/admin-staff.service.ts`
- `backend/src/admin/staff/dto/create-staff.dto.ts`
- `backend/src/admin/staff/dto/update-staff.dto.ts`

**Endpoints:**

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/admin/staff` | `staff.create` | Create a new staff member |
| GET | `/admin/staff` | `staff.read` | List all staff (filters: dept, available, active) |
| GET | `/admin/staff/:id` | `staff.read` | Single staff record + currently assigned open tickets |
| PATCH | `/admin/staff/:id` | `staff.edit` | Update staff details (name, phone, dept, role, escalation order) |
| DELETE | `/admin/staff/:id` | `staff.delete` | Soft-delete: sets `is_active = false` (preserves ticket history) |
| PATCH | `/admin/staff/:id/availability` | `staff.manage` | Manager toggles available/unavailable (on-shift / off-shift) |
| GET | `/admin/staff/available` | `staff.read` | Available staff by dept (used internally by assignment engine) |

**Create staff DTO fields:**
```typescript
{
  full_name: string,         // required
  phone: string,             // required — unique WhatsApp number (+91...)
  email?: string,            // optional
  department: string,        // HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE
  role: string,              // HOUSEKEEPING_WORKER | MAINTENANCE_TECHNICIAN | RECEPTION_AGENT | TEAM_LEAD
  escalation_order: number,  // 1 = ground staff, 2 = team lead
  whatsapp_opted_in?: boolean // default true
}
```

**GET /admin/staff response shape:**
```typescript
{
  id: string,
  full_name: string,
  phone: string,
  email: string | null,
  department: string,
  role: string,
  escalation_order: number,
  is_available: boolean,
  is_active: boolean,
  current_task_count: number,
  whatsapp_opted_in: boolean,
  current_tickets: Array<{          // only on GET /admin/staff/:id
    ticket_id, ticket_number, subject, status, sla_deadline, sla_breached
  }>
}
```

**Access rules:**
- Manager/Owner → full CRUD on all departments
- TEAM_LEAD (housekeeping/maintenance) → read + availability toggle for their dept only; no create/delete

**WhatsApp self-service:** Staff send "ON", "OFF", or "PAUSE ME" to the Wati number to self-report availability. The Wati webhook receiver (Phase 8) calls `StaffService.setAvailability()` for these commands.

**Seed:** `prisma/seed.ts` must seed initial staff records for each property alongside the existing admin_users seed.

---

### Phase 4: AWS SQS Infrastructure

**Why SQS:**

| Factor | Kafka | Bull (Redis) | AWS SQS |
|--------|-------|-------------|---------|
| Infrastructure | Docker broker required | Uses existing Redis | Fully managed |
| AWS fit | External | External | Native (same as S3/Textract) |
| Cost at VibeHouse scale | ~₹0 (self-hosted) | ~₹0 | ~₹0 (1M msgs/mo free tier) |
| Dead letter queue | Complex setup | Bull DLQ | Native |
| Multi-instance safety | High | Medium | High |
| Setup effort | High | Low | Low |

**Install:**
```bash
npm install @aws-sdk/client-sqs
```
(`@aws-sdk` already installed for S3/Textract — same credentials and region.)

**Files:**
- `backend/src/aws/sqs.service.ts` — added to existing `AwsModule`
- Message type definitions in `backend/src/aws/sqs.types.ts`

**SQS Queues:**

| Queue | Type | Used For | DLQ |
|-------|------|---------|-----|
| `vibehouse-ops-tasks.fifo` | FIFO | Ticket creation + escalation jobs | `vibehouse-ops-tasks-dlq.fifo` |
| `vibehouse-notify` | Standard | WhatsApp + PagerDuty notifications | `vibehouse-notify-dlq` |
| `vibehouse-sla-escalate` | Standard | SLA escalation events from Watchdog | `vibehouse-sla-escalate-dlq` |

FIFO for ops tasks: `MessageGroupId = ticketId` ensures creation → assignment → escalation are processed in order per ticket. Standard for notifications (order doesn't matter, higher throughput).

**Message visibility timeout:** 30 seconds. If worker crashes while processing, message reappears after 30s. After 3 failed attempts → auto-moves to DLQ.

**Long polling:** `WaitTimeSeconds: 20` reduces empty poll API calls and cost.

**Worker base pattern (NestJS):**
```typescript
@Injectable()
export class BaseWorker implements OnModuleInit {
  async onModuleInit() {
    this.poll(); // fire-and-forget loop
  }
  private async poll() {
    while (true) {
      const messages = await this.sqsService.receive(this.queueUrl);
      await Promise.all(messages.map(m => this.process(m)));
    }
  }
}
```

---

### Phase 5: Ops Task Worker

**File:** `backend/src/workers/ops-task.worker.ts`

**Consumes:** `vibehouse-ops-tasks.fifo` (job types: `ticket_created`, `sla_escalate`)

**On `ticket_created`:**
1. Read `sla_config` by `(property_id, task_category, department, priority)`
2. `sla_deadline = now + sla_minutes`
3. `SELECT FOR UPDATE SKIP LOCKED` on `staff` table → lowest `current_task_count` in correct dept where `is_available = true AND is_active = true`
4. `UPDATE tickets`: `assigned_staff_id`, `assigned_at`, `status = PENDING`
5. `INCREMENT staff.current_task_count`
6. Set Redis keys: `sla:{id}:l0/l1/l2/deadline` with calculated TTLs in seconds
7. `INSERT ticket_timeline` (ASSIGNED event)
8. Send to `vibehouse-notify` queue: `{ type: 'staff_task_assigned', ticketId, staffId }`

**On `sla_escalate`:**
1. Fetch current ticket
2. Find next escalation target: `WHERE escalation_order > ticket.escalation_level ORDER BY escalation_order ASC LIMIT 1`
3. Update: `escalation_level++`, `escalation_active = true`
4. `INSERT ticket_timeline` (ESCALATED event)
5. If `escalation_level >= 2`: set `notify.pagerduty = true` in notification message
6. If `escalation_level == 3` (deadline breach): `UPDATE tickets SET sla_breached = true`
7. Send to `vibehouse-notify` queue with appropriate type + pagerduty flag

---

### Phase 6: SLA Watchdog Worker

**File:** `backend/src/workers/sla-watchdog.worker.ts`

**Primary: Redis Keyspace Notifications**
```typescript
// Requires: CONFIG SET notify-keyspace-events Ex on Redis
const sub = new Redis(REDIS_URL);
await sub.config('SET', 'notify-keyspace-events', 'Ex');
await sub.subscribe('__keyevent@0__:expired');
sub.on('message', async (channel, key) => {
  const match = key.match(/^sla:([^:]+):(l\d+|deadline)$/);
  if (!match) return;
  const [, ticketId, level] = match;
  await sqsService.send(SLA_ESCALATE_QUEUE, { ticketId, level });
});
```

**Fallback: 5-second poll** (if `CONFIG SET` not available on managed Redis):
```typescript
@Interval(5000)
async checkExpired() {
  const openTickets = await prisma.tickets.findMany({
    where: { sla_breached: false, status: { notIn: ['COMPLETED', 'CLOSED'] } },
    select: { id: true }
  });
  for (const { id } of openTickets) {
    for (const level of ['l0', 'l1', 'l2', 'deadline']) {
      const alreadyFired = await redis.exists(`sla:${id}:${level}:fired`);
      if (alreadyFired) continue;
      const ttl = await redis.ttl(`sla:${id}:${level}`);
      if (ttl === -2) { // key expired/doesn't exist
        await redis.setex(`sla:${id}:${level}:fired`, 3600, '1'); // prevent re-fire
        await sqsService.send(SLA_ESCALATE_QUEUE, { ticketId: id, level });
      }
    }
  }
}
```

**On backend restart — re-hydrate Redis keys:**
```typescript
async onModuleInit() {
  const open = await prisma.tickets.findMany({
    where: { sla_deadline: { gt: new Date() }, status: { notIn: ['COMPLETED', 'CLOSED'] } }
  });
  for (const t of open) {
    const remainSec = Math.max(1, Math.floor((t.sla_deadline.getTime() - Date.now()) / 1000));
    await redis.setex(`sla:${t.id}:deadline`, remainSec, '1');
    // Recalculate l0/l1/l2 remaining time from sla_config l-timeout values
  }
}
```

---

### Phase 7: Notification Worker + Wati + PagerDuty

**Files:**
- `backend/src/workers/notification.worker.ts`
- `backend/src/wati/wati.module.ts`
- `backend/src/wati/wati.service.ts`
- `backend/src/pagerduty/pagerduty.module.ts`
- `backend/src/pagerduty/pagerduty.service.ts`

#### Escalation Channel Routing

```
L0 (staff reminder)    → Wati WhatsApp only
L1 (team lead)         → Wati WhatsApp only
L2 (manager)           → Wati WhatsApp + PagerDuty (phone call + push)
L3 (owner / breach)    → Wati WhatsApp + PagerDuty (phone call + push)
```

PagerDuty is triggered only at L2/L3. PagerDuty handles its own internal escalation: if Manager doesn't acknowledge within 5 minutes → auto-pages Owner (no code needed from our side — configured in PagerDuty UI).

#### Wati Service

```typescript
// POST https://live-{server}.wati.io/api/v1/sendTemplateMessage?whatsappNumber={phone}
// Authorization: Bearer {WATI_API_TOKEN}
async sendTemplateMessage(phone: string, templateName: string, params: string[]) {
  // Axios POST
  // Retry: 3 attempts, 1s exponential delay, on 429/5xx
  // INSERT notification_log on success/failure
}
```

**Templates (submit all at once for Meta approval — 24-72h wait):**

| Template | Recipient | Trigger |
|----------|-----------|---------|
| `task_assigned` | Assigned staff | Ticket created + assigned |
| `task_reminder_l0` | Assigned staff | L0 timeout (SLA warning) |
| `task_escalation_l1` | Team Lead | L1 timeout |
| `task_escalation_l2` | Manager | L2 timeout + PagerDuty |
| `task_breached_l3` | Owner | L3 breach + PagerDuty |
| `task_completed_guest` | Guest | Ticket completed |

#### PagerDuty Service

```typescript
// Free tier: 5 users max, 100 SMS+calls/month
// PagerDuty users: Manager + Owner only (2 users)
// dedup_key = ticket.id (used for resolve without storing extra field)

async triggerIncident(ticket: Ticket, level: number) {
  await axios.post('https://events.pagerduty.com/v2/enqueue', {
    routing_key: process.env.PAGERDUTY_ROUTING_KEY,
    event_action: 'trigger',
    dedup_key: ticket.id,
    payload: {
      summary: `SLA L${level}: ${ticket.subject} — ${ticket.room_number ?? ''} (${ticket.ticket_number})`,
      severity: level === 3 ? 'critical' : 'error',
      source: 'vibehouse-sla',
      custom_details: {
        ticket: ticket.ticket_number,
        department: ticket.department,
        room: ticket.room_number,
        guest: ticket.guest_name,
        elapsed_min: Math.floor((Date.now() - ticket.created_at.getTime()) / 60000),
        sla_min: ticket.sla_minutes,
      }
    }
  });
  // INSERT ticket_timeline: PAGERDUTY_PAGED
}

async resolveIncident(ticketId: string) {
  await axios.post('https://events.pagerduty.com/v2/enqueue', {
    routing_key: process.env.PAGERDUTY_ROUTING_KEY,
    event_action: 'resolve',
    dedup_key: ticketId, // matches trigger dedup_key
  });
  // INSERT ticket_timeline: PAGERDUTY_RESOLVED
}
```

**Auto-resolve:** When ticket transitions to `COMPLETED` or `CLOSED` and `escalation_level >= 2`, call `resolveIncident(ticket.id)`. This closes the PagerDuty incident so the phone stops ringing.

#### Notification Worker Dispatch Logic

```typescript
switch (message.type) {
  case 'staff_task_assigned':
    await wati.send(staff.phone, 'task_assigned', [ticket.ticket_number, ticket.room_number, ticket.subject]);
    break;
  case 'sla_l0_reminder':
    await wati.send(staff.phone, 'task_reminder_l0', [ticket.ticket_number, minutesRemaining]);
    break;
  case 'sla_l1_escalation':
    await wati.send(lead.phone, 'task_escalation_l1', [ticket.ticket_number, ticket.subject, ticket.room_number]);
    break;
  case 'sla_l2_escalation':
    await wati.send(manager.phone, 'task_escalation_l2', [...]);
    await pagerDuty.triggerIncident(ticket, 2); // phone rings
    break;
  case 'sla_l3_breach':
    await wati.send(owner.phone, 'task_breached_l3', [...]);
    await pagerDuty.triggerIncident(ticket, 3); // phone rings
    break;
  case 'ticket_completed':
    await wati.send(guest.phone, 'task_completed_guest', [ticket.ticket_number]);
    if (ticket.escalation_level >= 2) {
      await pagerDuty.resolveIncident(ticket.id); // stop the ringing
    }
    break;
}
```

---

### Phase 8: Wati Webhook Receiver

**File:** `backend/src/public/wati-webhook.controller.ts` (in PublicModule — no auth)

**Handles two types of incoming messages:**

**A. Task actions (Accept / Complete):**
```typescript
const acceptMatch = text.toUpperCase().match(/^ACCEPT-(\d+)$/);
if (acceptMatch) return ticketService.staffAccept(staff, acceptMatch[1]);

const doneMatch = text.toUpperCase().match(/^DONE-(\d+)$/);
if (doneMatch) return ticketService.staffComplete(staff, doneMatch[1]);
```
- `staffAccept()` → `status = IN_PROGRESS`, `acknowledged_at = NOW()`, `INSERT ticket_timeline`
- `staffComplete()` → `status = COMPLETED`, `completed_at = NOW()`, `DECREMENT current_task_count`, `DEL Redis sla:{id}:*`, enqueue `ticket_completed` notification
- Idempotency: check current status before writing — ignore if already in target state

**B. Availability self-service:**
```
"ON"       → is_available = true
"OFF"      → is_available = false
"PAUSE ME" → is_available = false for 30 min, then auto-restore via @Timeout
```
Reply with confirmation: "Status updated: you are now unavailable until 14:45."

**Unknown numbers:** silently ignored.

---

### Phase 9: Guest Ticket Creation (Backend)

**Files:**
- `backend/src/guest/tickets/guest-tickets.module.ts`
- `backend/src/guest/tickets/guest-tickets.controller.ts`
- `backend/src/guest/tickets/guest-tickets.service.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/guest/tickets` | GuestJWT | Create service request |
| GET | `/guest/tickets` | GuestJWT | My open/recent tickets |
| POST | `/guest/tickets/:id/feedback` | GuestJWT | Submit rating + comment |

**Type routing:**
- `FREE` → enqueue to `vibehouse-ops-tasks.fifo` immediately
- `BORROWABLE` → check `borrowable_checkouts` inventory, then enqueue
- `CHARGEABLE` → only after `payments.status = CAPTURED` (Razorpay webhook must fire first)
- `MAINTENANCE` → enqueue immediately, flagged for manager awareness

---

### Phase 10: Admin Frontend — Tickets Tab

**File:** `admin_frontend/app/dashboard/tickets/page.tsx`

**Sub-tabs:** Live Queue | Staff Board | SLA Config | Analytics

**Live Queue UI:**
- Table: Ticket#, Subject, Type, Dept, Priority, Status, Assigned Staff, SLA Remaining
- **SLA Remaining:** client-side countdown — `setInterval` decrementing from `sla_deadline - Date.now()`
- Color: GREEN (>50%) → YELLOW (25-50%) → RED (<25%) → DARK RED (breached)
- Filters: status, department, priority, date range, assigned staff
- Auto-refresh: poll `GET /admin/tickets` every 10 seconds for state changes
- Row click → Ticket Detail Modal

**Ticket Detail Modal:**
- Header: ticket number, type, dept, priority, room, guest name
- Status buttons: only valid next transitions shown
- Assignee picker: staff dropdown filtered by dept, showing current task count
- Timeline: vertical list of all `ticket_timeline` events (chronological)
- Notes section: list + add new textarea

---

### Phase 11: Admin Frontend — Staff Board Tab

**Operational staffing dashboard within the Tickets section.**

```
┌─────────────────────────────────────────────────────────────┐
│  HOUSEKEEPING            MAINTENANCE         FRONT OFFICE    │
│  ─────────────────────   ─────────────────   ─────────────  │
│  ● Ravi Kumar            ● Amit Sharma        ● Priya Nair  │
│    Available ✓             On Break ✗           Available ✓  │
│    2 open tasks            0 tasks              1 open task  │
│    Escalation order: 2     Order: 2             Order: 2    │
│  [Mark Unavailable]      [Mark Available]     [Mark Unavail]│
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click staff card → expand to show currently assigned tickets (subject, status, SLA deadline)
- Manager toggles availability → `PATCH /admin/staff/:id/availability`
- Escalation order input → `PATCH /admin/staff/:id/escalation-order`
- Color coding: green = available, amber = busy (task_count > 0), red = unavailable/off-shift
- Auto-refresh: 30-second poll (availability changes are less time-sensitive)

**Access:**
- Manager/Owner → all departments, can toggle
- HK Lead → Housekeeping only, read-only
- Maintenance Lead → Maintenance only, read-only

---

### Phase 12: SLA Config UI + Analytics Dashboard

**SLA Config UI:**
- Grid: rows = dept × category, columns = priority (LOW/MEDIUM/HIGH/CRITICAL)
- Inline edit: click cell → input fields for `sla_minutes`, `l0/l1/l2` timeouts
- Save per row: `PUT /admin/sla-config`

**Analytics (SQL queries → Recharts charts):**

```sql
-- SLA Compliance %
SELECT department, DATE_TRUNC('day', created_at) AS day,
  ROUND(COUNT(*) FILTER (WHERE completed_at <= sla_deadline) * 100.0 / NULLIF(COUNT(*), 0), 1) AS pct
FROM tickets WHERE created_at BETWEEN $1 AND $2 AND property_id = $3
  AND status IN ('COMPLETED', 'CLOSED')
GROUP BY department, day ORDER BY day;

-- Average resolution time by dept
SELECT department,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60)::numeric, 1) AS avg_min
FROM tickets WHERE completed_at IS NOT NULL AND property_id = $1 GROUP BY department;

-- Staff performance
SELECT s.full_name, COUNT(t.id) AS closed,
  ROUND(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.assigned_at)) / 60)::numeric, 1) AS avg_min,
  ROUND(AVG(t.feedback_rating)::numeric, 2) AS avg_rating,
  COUNT(*) FILTER (WHERE t.sla_breached) AS breaches
FROM tickets t JOIN staff s ON t.assigned_staff_id = s.id
WHERE t.completed_at BETWEEN $1 AND $2 GROUP BY s.id, s.full_name;

-- Volume
SELECT DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS opened,
  COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'CLOSED')) AS closed
FROM tickets WHERE property_id = $1 GROUP BY day ORDER BY day;
```

**Charts (Recharts):**
- Line chart: SLA compliance % over time per department
- Bar chart: daily opened vs closed
- Sortable table: staff performance (breach count, avg resolution, avg rating)
- KPI cards: open now, breaches this week, avg resolution time

---

### Phase 13: Prisma Sync + Seed Update

1. `npx prisma db pull --force`
2. `npx prisma generate`
3. Update `prisma/seed.ts`:
   - Seed default `sla_config` rows (3 depts × N categories × 4 priorities)
   - Seed initial `staff` records for each property and department
4. `npx tsc --noEmit` — verify types compile

---

## Challenge Register

### Challenge 1: SLA Watchdog Precision
**Problem:** Redis TTL expiry is silent. 30-second polling → escalation fires up to 30s late.

**Mitigations:**
1. **Redis keyspace notifications** — instant, no polling. Requires `CONFIG SET` access on Redis.
2. **5-second poll with `:fired` marker** — prevents double-firing, acceptable DB load at VibeHouse scale.
→ Try keyspace notifications first; fall back to 5s poll.

---

### Challenge 2: Redis Restart Recovery
**Problem:** Restart → Redis SLA keys near expiry may be gone → silent SLA breach.

**Mitigation:** `onModuleInit()` in watchdog re-hydrates all open ticket keys. TTL = `max(1, sla_deadline - NOW())` in seconds.

---

### Challenge 3: Concurrent Assignment Race
**Problem:** Two simultaneous creations pick the same staff (lowest task_count).

**Mitigation:** `SELECT FOR UPDATE SKIP LOCKED` inside `prisma.$transaction()`. Second concurrent request gets next-lowest staff automatically.

---

### Challenge 4: SQS FIFO Deduplication
**Problem:** FIFO queues deduplicate messages with the same `MessageDeduplicationId` within a 5-minute window. Retrying the same job (on failure) with the same ID drops the retry.

**Mitigation:** Generate a fresh UUID as `MessageDeduplicationId` per send attempt. Use `MessageGroupId = ticketId` for ordering only. Workers are idempotent (check current ticket state before processing).

---

### Challenge 5: PagerDuty Free Tier Quota
**Problem:** 100 SMS + phone calls/month combined. Heavy L2/L3 volume can exhaust it mid-month.

**Mitigations:**
- PagerDuty fires only at L2/L3 — rare if SLA is well-tuned
- When quota exhausted, PagerDuty falls back to app push + email (unlimited) — only phone/SMS stops
- Monitor quota in PagerDuty dashboard; if consistently hitting 100, it's a signal to re-tune SLA timers or upgrade PagerDuty

---

### Challenge 6: Wati Template Approval Delay
**Problem:** Meta takes 24-72h. Interactive button templates are scrutinized.

**Mitigation:** Submit all 6 templates simultaneously early in development. Test webhook receiver with mocked Wati payloads while waiting for approval.

---

### Challenge 7: Wati Button → Ticket Matching
**Problem:** Staff may have multiple open tickets. Webhook gives phone + text only.

**Mitigations:**
1. Embed ticket number in reply convention: `ACCEPT-0042`, `DONE-0042`
2. Parse 4-digit number from reply, lookup `ticket_number` in DB
3. If staff types ambiguous text, reply: "Please reply DONE-{ticket number}. Your open tasks: VH-0042, VH-0043."

---

### Challenge 8: Department-Scoped Access
**Problem:** Housekeeping Lead should only see HK tickets. `PermissionsGuard` is permission-based only.

**Mitigation:** Service-layer filter: `HOUSEKEEPING_LEAD` / `MAINTENANCE_LEAD` / `RECEPTION` roles get `AND department = actor.department` appended to all ticket and staff queries. Manager/Owner see all.

---

### Challenge 9: Staff Self-Availability Abuse via WhatsApp
**Problem:** Unknown numbers, mistyped commands, or spam could hit the webhook.

**Mitigation:** Always look up sender phone in `staff` table first. Unknown numbers → silently ignored. "PAUSE ME" creates a `@Timeout(30 * 60 * 1000)` auto-restore — can't be stacked.

---

### Challenge 10: PagerDuty Auto-Resolve Failure
**Problem:** If `resolveIncident()` API call fails, manager's phone keeps ringing after ticket is done.

**Mitigation:** Enqueue resolve as a `vibehouse-notify` SQS job (`type: pagerduty_resolve`) with standard retry handling (3 attempts, DLQ fallback). Log `PAGERDUTY_RESOLVED` to `ticket_timeline` only on confirmed API success.

---

## Full System Flow

```
Guest PWA → POST /guest/tickets
    ↓ GuestTicketService
    ├── [CHARGEABLE] — verify Razorpay payment captured
    ├── INSERT tickets (status: OPEN, sla_deadline computed)
    └── SQS FIFO → vibehouse-ops-tasks.fifo / ticket_created

OpsTaskWorker (SQS consumer)
    ├── SELECT FOR UPDATE SKIP LOCKED → lowest task_count staff in dept
    ├── UPDATE tickets: assigned, status = PENDING
    ├── INCREMENT staff.current_task_count
    ├── SET Redis: sla:{id}:l0/l1/l2/deadline with TTLs
    ├── INSERT ticket_timeline (ASSIGNED)
    └── SQS → vibehouse-notify / staff_task_assigned

NotificationWorker (SQS consumer)
    ├── Wati: task_assigned template → staff WhatsApp
    └── INSERT notification_log

Staff WhatsApp
    ├── "ACCEPT-0042" → POST /public/wati/webhook
    │   └── UPDATE status = IN_PROGRESS, acknowledged_at = NOW()
    └── "DONE-0042" → POST /public/wati/webhook
        ├── UPDATE status = COMPLETED, completed_at = NOW()
        ├── DECREMENT current_task_count
        ├── DEL Redis sla:{id}:*
        └── SQS → vibehouse-notify / ticket_completed
              ├── Wati → guest (task_completed_guest)
              └── if escalation_level >= 2: PagerDuty.resolve()

Staff WhatsApp (availability)
    ├── "ON" → is_available = true
    ├── "OFF" → is_available = false
    └── "PAUSE ME" → is_available = false for 30 min, then auto-restore

SLA Watchdog (keyspace notification or 5s poll)
    ├── sla:{id}:l0 expires → SQS sla_escalate / L0 → Wati reminder to staff
    ├── sla:{id}:l1 expires → SQS sla_escalate / L1 → Wati to team lead
    ├── sla:{id}:l2 expires → SQS sla_escalate / L2 → Wati + PagerDuty (phone call)
    └── sla:{id}:deadline   → SQS sla_escalate / L3
        ├── UPDATE tickets: sla_breached = true
        ├── Wati → owner
        └── PagerDuty.trigger() → phone call (auto-escalates to owner if manager doesn't ack in 5 min)

Admin Dashboard (manager)
    ├── Live Queue: 10s poll + client-side SLA countdown timers
    ├── Staff Board: 30s poll → availability, task count, dept columns
    ├── Ticket Detail Modal: timeline, reassign, status change, add note
    └── Analytics: SLA compliance chart, resolution time, staff scorecard
```

---

## Effort Breakdown

| Phase | What | Effort |
|-------|------|--------|
| 1. DB Migration | `staff` table (new), tickets, ticket_timeline, ticket_notes | 0.5 day |
| 2. Prisma Sync | db pull, generate, seed defaults | 0.5 day |
| 3. Core Tickets Module | CRUD, assignment, status machine, audit trail | 3 days |
| 4. SLA Config Module | CRUD endpoints | 1 day |
| 5. Staff Management Module | availability, task count, escalation order API | 1.5 days |
| 6. AWS SQS Infrastructure | SqsService in AwsModule, queue setup, worker base | 1 day |
| 7. Ops Task Worker | SQS consumer, assignment, Redis timer setup | 2 days |
| 8. SLA Watchdog Worker | Keyspace notifications or poll, restart recovery | 2 days |
| 9. Notification Worker + Wati | HTTP client, template dispatch, retry, logs | 2 days |
| 10. PagerDuty Integration | triggerIncident, resolveIncident, L2/L3 routing | 0.5 day |
| 11. Wati Webhook Receiver | Accept/Done parsing, availability commands, idempotency | 1.5 days |
| 12. Guest Ticket Endpoint | Service request, type routing | 1.5 days |
| 13. Admin Tickets Tab — Live Queue | Queue, countdown timers, filters, detail modal | 4 days |
| 14. Admin Tickets Tab — Staff Board | Availability cards, task count, toggle | 2 days |
| 15. SLA Config UI | Inline-edit grid | 1 day |
| 16. Analytics Dashboard | SQL + Recharts + KPI cards | 2.5 days |
| 17. Process Enforcement | Status machine guards | 0.5 day |
| 18. Testing + Bug Fixes | End-to-end flow, webhook mocking, escalation tests | 3 days |
| **Total** | | **~30 days** |
