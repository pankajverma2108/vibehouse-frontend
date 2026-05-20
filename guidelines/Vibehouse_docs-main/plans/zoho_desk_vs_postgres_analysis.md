# Zoho Desk vs PostgreSQL — SLA Ticketing System Comparative Analysis

## Context

VibeHouse currently designs Zoho CRM (custom modules: Service Requests + Staff) as the source of truth for SLA ticketing, with PostgreSQL as a thin cache. Zoho Desk is a dedicated help-desk product with built-in ticket dashboards, SLA enforcement, agent management, and Blueprint. This doc compares three approaches for our ops-task ticketing system and makes a clear recommendation.

**Note on Express tier:** The user initially mentioned Express, but research shows Express is a dead end for our use case — see Tier Analysis below.

---

## Three Options Under Analysis

| Option | Ticket Source of Truth | Staff Records | SLA Engine | Dashboard |
|--------|----------------------|---------------|------------|-----------|
| **A — Zoho CRM (Current Plan)** | Zoho CRM custom module | Zoho CRM Staff module | Redis + Kafka Ops Task Worker | Build ourselves |
| **B — Zoho Desk Professional** | Zoho Desk tickets | Zoho Desk Agents | Zoho Desk SLA policies + Redis | Zoho Desk built-in |
| **C — Pure PostgreSQL** | PostgreSQL `tickets` table | `admin_users` table | Redis + Kafka Ops Task Worker | Build ourselves |

---

## Zoho Desk Tier Analysis — The Hard Constraints

### Pricing (India, annual billing)

| Tier | INR/agent/mo | USD/agent/mo | Agent Cap |
|------|-------------|-------------|-----------|
| Free | ₹0 | $0 | 3 max (hard) |
| Express | ₹420 | ~$7 | 5 max (hard) |
| Standard | ₹800 | $14 | Unlimited |
| Professional | ₹1,400 | $23 | Unlimited |
| Enterprise | ₹2,400 | $40 | Unlimited |

### Feature Availability — What Matters for Our Use Case

| Feature | Free | Express | Standard | Professional |
|---------|------|---------|----------|-------------|
| Custom fields on tickets | 0 | **0** | 10/module | 50/module |
| Custom ticket statuses | No | **No** | Yes | Yes |
| Custom SLA policies | No | **No** | 4 total | 10/dept |
| Webhooks (on status change) | No | **No** | 5 | 10 |
| Multiple departments | No | **No** | **No** | Yes (10) |
| Blueprint (workflow enforcement) | No | **No** | **No** | Yes |
| Round-robin auto-assignment | No | **No** | No | Yes |
| Custom reports/dashboards | No | **No** | 50 reports | Unlimited |
| Built-in SLA dashboard | No | No | Basic | Full |
| API daily credits | 5K | 25K+100/agent | 50K+250/agent | 75K+500/agent |

### Why Express is a Dead End

Express blocks everything we need:
- No custom fields → can't add `Room_Number`, `Request_Type`, `Escalation_Level`
- No webhooks → can't notify our backend on ticket status changes
- No custom SLA policies → can't configure MEDIUM/HIGH/CRITICAL timers per department
- No departments → can't route Housekeeping vs Maintenance vs Front Office separately
- Hard 5-agent cap → adding a 6th staff member at any property breaks the tier

**Standard also falls short:** No departments, no Blueprint (both require Professional).

**Minimum viable tier: Professional (₹1,400/agent/mo)**
Gives us: departments, Blueprint, 10 SLA policies/dept, webhooks, 50 custom fields, round-robin assignment.

---

## Option A — Zoho CRM Custom Modules (Current Plan)

### Architecture

```
Guest PWA Request → Kafka → Ops Task Worker
    ├── POST Zoho CRM API: create Service Request record
    ├── SET Redis SLA timer (TTL = sla_minutes from PostgreSQL sla_config)
    ├── Assignment query on PostgreSQL (available + lowest current_task_count)
    └── Publish Kafka notify.staff → Notification Worker → Wati WhatsApp
```

### PostgreSQL Layer
- `zoho_ticket_ref` — thin cache: zoho_ticket_id, status, type, dept, synced_at
- `sla_config` — admin-configurable rules: task_category × dept × priority → sla_minutes + L0/L1/L2/L3 timeouts
- `admin_users` — extended with `is_available`, `current_task_count`, `escalation_order`
- `notification_log` — outbound message audit trail

### What We Must Build
- Admin dashboard: ticket list, status/dept/priority filters, SLA timer display
- Analytics: SLA compliance %, avg resolution time by dept, staff performance
- Escalation audit trail (via Zoho CRM Notes or custom table)

### Pros

| # | Pro | Detail |
|---|-----|--------|
| 1 | **Already budgeted** | Zoho CRM Standard ₹4,000/mo for 5 users — already in cost model |
| 2 | **No forced contact association** | CRM custom module records have no mandatory customer link — clean for internal ops tasks |
| 3 | **500+ custom fields** | CRM custom modules allow far more metadata than Desk |
| 4 | **Staff already in CRM** | Staff live in the Staff module — no duplicate accounts across products |
| 5 | **Sub-second SLA precision** | Redis timers have millisecond TTL precision. Zoho Desk SLA works in minutes only |
| 6 | **Full escalation control** | L0→L3 + PAUSE command + Redis watchdog — exactly as designed |
| 7 | **One Zoho product** | No CRM↔Desk sync risk, no two-product licensing confusion |
| 8 | **Zoho Blueprint available** | CRM Standard includes Blueprint for status transition enforcement |

### Cons

| # | Con | Detail |
|---|-----|--------|
| 1 | **No built-in SLA dashboard** | Must build in admin frontend (React components for SLA timer, breach tracking) |
| 2 | **No built-in agent scorecard** | Staff performance analytics must be built with SQL + chart components |
| 3 | **CRM UI is sales-oriented** | Housekeeping leads may find the CRM interface unintuitive — designed for salespeople |
| 4 | **Sync overhead** | `is_available` + `current_task_count` must sync to CRM every 5 min for dashboard visibility |
| 5 | **Full Ops Task Worker custom code** | Assignment, escalation, SLA timer management all custom-built |

### Monthly Cost (5 users)
**₹4,000/mo** (₹800 × 5 users, Zoho CRM Standard)

---

## Option B — Zoho Desk Professional

### Architecture

```
Guest PWA Request → Kafka → Ops Task Worker
    ├── POST Zoho Desk API: create ticket (POST /api/v1/tickets)
    ├── SET Redis SLA timer (still needed — see note below)
    ├── Zoho Desk auto-enforces SLA deadlines + multi-level email escalation
    ├── Zoho Desk webhook → our backend → Kafka notify.staff → Wati WhatsApp
    └── Zoho Desk Blueprint enforces status transitions
```

### Important: Redis Still Required
Zoho Desk SLA timers trigger email escalations to agents — they are not Kafka-compatible. Our architecture still needs Redis for:
- Sub-minute SLA precision (Desk works in whole minutes)
- PAUSE command (10-min auto-resume)
- Kafka-driven Wati notifications (Desk → webhook → backend → Wati)

Zoho Desk SLA + our Redis timers run in parallel. Desk provides the audit trail and dashboard; Redis drives our WhatsApp notification pipeline.

### What Zoho Desk Professional Gives Natively (No Build Required)

| Feature | Detail |
|---------|--------|
| SLA policies per dept × priority | 10 policies/dept — one per Dept × Priority combination |
| Multi-level SLA escalation | Email agent X min before breach → notify manager at breach → escalate to senior N hours after |
| Departments | Housekeeping, Maintenance, Front Office as separate ticket queues |
| Blueprint | Enforce OPEN → PENDING → IN_PROGRESS → COMPLETED → CLOSED with mandatory steps |
| Round-robin auto-assignment | Auto-assigns within dept/team without custom code |
| Agent scorecards | Response time, resolution time, CSAT, ticket volume per agent |
| SLA compliance dashboard | % meeting response SLA, % meeting resolution SLA, breach heatmap |
| Headquarters view | Real-time manager view: live open tickets, team activity, today vs yesterday |
| Webhooks (10 active) | `ticket.statusUpdate` → our backend → Kafka |
| 50 custom fields/module | Room_Number, Request_Type, Unit_Code, Guest_Name, Borrowable_Item, Escalation_Level, etc. |
| Custom ticket statuses | OPEN, PENDING, IN_PROGRESS, COMPLETED, CLOSED, SLA_BREACHED |

### What Still Needs Building

- Wati WhatsApp: Desk webhook → our backend → Wati API (same as current design — Desk has no Wati integration)
- Redis SLA timer for PAUSE command + Kafka notification precision
- `zoho_ticket_ref` thin cache (now caches Desk ticket IDs)
- `sla_config` table (still needed for Redis timer TTL config)

### The Contact Association Problem
Zoho Desk is built around customer-facing tickets. Every ticket should link to a customer contact. Our tickets are internal ops tasks (housekeeping, maintenance) — there's no external customer raising them.

**Workaround A:** Create one `ops@vibehouse.in` internal contact and link all ops task tickets to it. Minor cosmetic compromise.

**Workaround B (cleaner):** Link the ticket to the guest's record when a guest triggered the request. Zoho Desk can hold a contacts list for guests. This is actually better for audit — the ops ticket is traceable to a specific stay.

### Zoho Desk Agents vs. Zoho CRM Staff Module
Desk Agents = Zoho user accounts with a Desk license. Different from Zoho CRM's Staff custom module records.

If using both CRM + Desk: staff need accounts in both products → two user management systems → data drift risk (phone number updated in one, not the other) → double-billing.

**Solution:** Zoho One covers all Zoho products under one per-user license. At ₹1,440/user/mo × 5 = ₹7,200/mo total for CRM + Desk + everything else. Cheaper than ₹4,000 (CRM) + ₹7,000 (Desk) = ₹11,000/mo separately.

### Pros

| # | Pro | Detail |
|---|-----|--------|
| 1 | **Built-in SLA dashboard** | Compliance %, breach heatmap, per-dept tracking — saves weeks of frontend work |
| 2 | **Built-in agent scorecard** | Response time, resolution time, CSAT — no custom analytics to build |
| 3 | **Native departments** | Separate queues, SLA policies, and assignment for HK/Maintenance/Front Office |
| 4 | **Blueprint enforcement** | Mandatory workflow steps per status transition — housekeeping can't close without checklist |
| 5 | **Native SLA escalation** | Reduces Ops Task Worker code — email escalations happen automatically |
| 6 | **Round-robin assignment** | Auto-assign within team/dept — no custom load-balancing code needed |
| 7 | **Help-desk optimized UI** | Staff work tickets in a purpose-built interface, not a sales CRM |
| 8 | **10 active webhooks** | Ticket status changes push to our backend — sufficient for Kafka integration |
| 9 | **50 custom fields** | Enough for all our metadata needs |
| 10 | **Zoho ecosystem native** | Natively connects to Zoho CRM — no custom ETL needed |

### Cons

| # | Con | Detail |
|---|-----|--------|
| 1 | **Professional tier required** | Express and Standard are dead ends. Professional = ₹1,400/agent/mo minimum |
| 2 | **Higher cost** | Professional × 5 = ₹7,000/mo. ₹3,000/mo more than CRM. ₹36,000/year more. |
| 3 | **Contact association workaround** | Tickets need a contact — dummy `ops@vibehouse.in` or guest record linkage |
| 4 | **Wati still custom** | Desk has no Wati integration — same webhook → backend → Wati pattern as current design |
| 5 | **Duplicate accounts risk** | CRM + Desk = two Zoho products, two user sets. Mitigated by Zoho One. |
| 6 | **Redis still required** | Desk SLA timers are not sub-minute, not Kafka-compatible |
| 7 | **Fewer custom fields** | 50/module (Pro) vs. 500+ in CRM custom module |
| 8 | **New product to configure** | Departments, blueprints, SLA policies, webhooks — setup effort before first ticket |

### Monthly Cost (5 agents)
- Desk Professional only: **₹7,000/mo**
- Desk Professional + CRM Standard: **₹11,000/mo**
- Zoho One (CRM + Desk + everything): **₹7,200/mo** — best value if keeping both

---

## Option C — Pure PostgreSQL (No Zoho for Ticketing)

### Architecture

```
Guest PWA Request → Kafka → Ops Task Worker
    ├── INSERT into PostgreSQL `tickets` table (full record — no thin cache)
    ├── SET Redis SLA timer
    ├── Assignment query on PostgreSQL (same logic)
    └── Publish Kafka notify.staff → Notification Worker → Wati WhatsApp
```

### Pros

| # | Pro | Detail |
|---|-----|--------|
| 1 | **Zero SaaS cost for tickets** | No Zoho subscription for ticketing at all |
| 2 | **Unlimited schema** | JSONB for metadata, composite indexes, sub-queries — no field count limits |
| 3 | **No API rate limits** | No 75K credits/day ceiling |
| 4 | **Single source of truth** | PostgreSQL authoritative for everything — no sync, no cache invalidation |
| 5 | **Full SQL analytics** | CTEs, window functions — SLA compliance % in pure SQL |
| 6 | **No vendor outage risk** | Zoho down = our tickets still work |
| 7 | **Scale to multi-property as SaaS** | No per-seat Zoho cost when onboarding new properties |

### Cons

| # | Con | Detail |
|---|-----|--------|
| 1 | **Build everything** | Dashboard, SLA timer UI, escalation history, scorecards, breach reports — all custom |
| 2 | **Significant frontend effort** | React: ticket list, status filtering, SLA countdown, assignment panel, charts |
| 3 | **No status enforcement by default** | Must write validation middleware (Zoho Blueprint equivalent) |
| 4 | **No off-the-shelf staff interface** | Staff interact only via WhatsApp or our admin portal — no help-desk queue view |

### Monthly Cost
- PostgreSQL: already paying ₹1,000/mo (RDS db.t3.micro)
- Save ₹4,000/mo vs. Option A (eliminate Zoho CRM)

---

## Head-to-Head Feature Comparison

| Capability | A — Zoho CRM | B — Zoho Desk Pro | C — PostgreSQL |
|-----------|-------------|------------------|---------------|
| Built-in ticket dashboard | No — build | **Yes** | No — build |
| Built-in SLA compliance % | No — build | **Yes** | No — build |
| Built-in agent scorecard | No — build | **Yes** | No — build |
| Multi-department routing | Simulated via Dept field | **Native departments** | Custom logic |
| Blueprint/process enforcement | Yes (CRM Blueprint) | **Yes** | Build ourselves |
| SLA timer precision | Redis sub-second | Zoho minutes + Redis | Redis sub-second |
| Custom fields | 500+ | 50 (Professional) | Unlimited |
| Webhook on status change | Yes (CRM webhook) | **Yes (10 active)** | N/A (own DB) |
| Wati WhatsApp | CRM webhook → backend → Wati | Desk webhook → backend → Wati | PG trigger → backend → Wati |
| Internal task (no customer) | **Native** | Workaround needed | **Native** |
| Staff/agent management | CRM Staff module | Desk Agents (separate) | `admin_users` table |
| Duplicate accounts risk | No | Yes (CRM + Desk) | No |
| Vendor outage impact | CRM down = no new tickets | Desk down = no new tickets | **None** |
| Monthly cost (5 users) | **₹4,000** | ₹7,000–₹11,000 (₹7,200 Zoho One) | **₹0 incremental** |
| Dashboard build effort | High | **Low** | High |
| SLA logic build effort | High | Medium | High |
| API rate limits | CRM ~5,000/day | Desk 77,500/day | None |

---

## Cost Comparison (5 staff, annual billing, monthly)

| Scenario | Zoho CRM | Zoho Desk | RDS PG | Monthly Total | vs. Option A |
|----------|---------|-----------|--------|--------------|-------------|
| **A — CRM only** | ₹4,000 | — | ₹1,000 | **₹5,000** | Baseline |
| **B — Desk Pro only** | — | ₹7,000 | ₹1,000 | **₹8,000** | +₹3,000 |
| **B — Desk Pro + CRM** | ₹4,000 | ₹7,000 | ₹1,000 | **₹12,000** | +₹7,000 |
| **B — Zoho One** | included | included | ₹1,000 | **₹8,200** | +₹3,200 |
| **C — Pure PostgreSQL** | — | — | ₹1,000 | **₹1,000** | -₹4,000 |

---

## Recommendation

### Decision Framework

**Choose Option B (Zoho Desk Professional / Zoho One) if:**
- Built-in SLA dashboard + agent scorecard saves 3–5 weeks of frontend build time and that time is more valuable than ₹36,000/year
- Ops staff (housekeeping leads) will actively use the Zoho Desk web interface to manage their ticket queue
- You want Blueprint process enforcement without custom middleware
- You're open to Zoho One (₹7,200/mo) to avoid double-billing and duplicate account management

**Choose Option A (Zoho CRM) if:**
- Budget: ₹4,000/mo ceiling, the extra ₹3,000+ for Desk is not justified
- Staff interact via WhatsApp only — the dashboard is for managers only and can be a simple React table
- You're already comfortable building the admin frontend (which we are — the admin portal is in progress)
- You want one fewer Zoho product to configure and maintain

**Choose Option C (Pure PostgreSQL) if:**
- Eliminating all Zoho subscription costs is a priority
- You're building this as a multi-property SaaS product to resell — Zoho per-seat pricing doesn't scale
- You want full data ownership and zero vendor dependency
- The admin dashboard will have comprehensive ticket management UI regardless (which it likely will)

### The Core Insight

**Zoho Desk's main value is the management UI — not the SLA logic.** Our Redis + Kafka + Ops Task Worker design already handles:
- SLA timer precision → Redis TTL
- Escalation routing → Kafka consumer + PostgreSQL query
- Staff assignment → `current_task_count` load balancing
- WhatsApp notifications → Wati via Notification Worker

What Zoho Desk adds is the **manager dashboard** (SLA compliance %, breach heatmap, agent scorecard) and the **staff-facing ticket queue** (a place for housekeeping leads to see their open tasks). These are valuable, but also achievable with a few React components and SQL queries in our own admin frontend.

The question is purely: **is ₹3,000–7,000/mo worth 3-5 weeks of saved dashboard build time?** That's a business decision, not a technical one.

---

## If Choosing Zoho Desk — Setup Checklist

1. **Tier:** Professional (₹1,400/agent/mo) — not Express, not Standard
2. **Licensing:** Evaluate Zoho One (₹1,440/user/mo) vs. CRM + Desk separately; Zoho One is cheaper if keeping both
3. **Departments to create:** Housekeeping, Maintenance, Front Office
4. **SLA policies:** One per Dept × Priority (MEDIUM, HIGH, CRITICAL) = 9 policies minimum
5. **Custom fields on Tickets module:** `Request_Type`, `Room_Number`, `Unit_Code`, `Reservation_ID`, `Guest_Name`, `Addon_Order_ID`, `Borrowable_Item`, `Escalation_Level`, `SLA_Breached`
6. **Blueprint:** One per department enforcing OPEN → PENDING → IN_PROGRESS → COMPLETED → CLOSED
7. **Webhook:** Subscribe `ticket.statusUpdate` → `POST https://api.vibehouse.com/zoho-desk/webhook`
8. **PostgreSQL:** `zoho_ticket_ref.zoho_ticket_id` unchanged — just now stores Desk ticket IDs instead of CRM record IDs
9. **Contact workaround:** Create `ops@vibehouse.in` as default internal contact for ops tickets, OR link to guest record when available
10. **Staff setup:** Create Desk Agent accounts for all 5 staff roles; use Zoho One to avoid separate CRM user accounts
