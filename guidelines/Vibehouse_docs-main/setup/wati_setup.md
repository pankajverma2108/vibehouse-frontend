# Wati — Setup Guide

## Overview

Vibe House uses **Wati** exclusively for **staff-facing** WhatsApp notifications. Guests interact entirely through the web app (PWA) — no WhatsApp for customers at all.

**Staff journey**: Guest orders from PWA → pays (Razorpay, if CHARGEABLE) → backend creates a Zoho Desk ticket → Ops Task Worker assigns staff → Wati sends an **interactive WhatsApp message** with two buttons (Acknowledge + Mark Done). Staff taps; backend updates Zoho Desk.

**When a ticket is completed**: backend pushes an in-app notification to the guest's PWA session. Guest submits feedback via the web app UI (`POST /guest/tickets/:id/feedback`). No WhatsApp involved.

**Lx escalation messages** are **text-only** — notify the escalation target (Team Lead / Manager / Owner) to check Zoho Desk.

**Ticket number**: Zoho auto-generates a plain integer (e.g. `103`, `104`). We store it as-is in `zoho_ticket_ref.ticket_number`. In WhatsApp messages it is shown as `#103`. In text fallback commands staff type `ACCEPT-103` / `DONE-103`.

---

## Step 1: Account & Number Setup

1. Sign up at [https://app.wati.io/](https://app.wati.io/)
2. **Plan**: Growth or Business (need API access — Starter plan does NOT include API)
3. **Business name**: Vibe House
4. **WhatsApp number**: Dedicated number (not personal or shared)
   - Get a new SIM dedicated to Vibe House operations
   - Wati provisions it as a WhatsApp Business Account (WABA)
5. **Business display name**: `Vibe House`
6. **Category**: `Hotel & Lodging`
7. **Profile photo**: Vibe House logo
8. **Business description**: "Vibe House — Co-living & Hospitality"
9. **Timezone**: Asia/Kolkata (IST)

> WABA approval by Meta takes 24–72 hours. API access activates after approval.

---

## Step 2: Collect API Credentials

Go to **Settings → API** in your Wati dashboard:

- **API Endpoint**: `https://live-server.wati.io` (exact URL shown in dashboard)
- **API Token**: long-lived Bearer token

Add to `backend/.env`:
```env
WATI_API_ENDPOINT=https://live-server.wati.io
WATI_API_TOKEN=<from Wati dashboard → Settings → API>
```

---

## Step 3: Webhook Configuration

Navigate to **Settings → Webhooks** in Wati dashboard.

| Environment | Webhook URL |
|-------------|-------------|
| **Development** | `https://<ngrok-id>.ngrok-free.app/webhook/wati/incoming` |
| **Production** | `https://api.vibehouse.in/webhook/wati/incoming` |

**Events**: All incoming messages.

### Development — Using ngrok

We don't have a live server at `api.vibehouse.in` during development. Use **ngrok** to tunnel your local NestJS server to a public HTTPS URL that Wati can reach.

```bash
# Install (one-time)
npm install -g ngrok        # or: choco install ngrok / brew install ngrok

# Run alongside your backend
ngrok http 8080

# Output:
# Forwarding  https://abc123.ngrok-free.app → http://localhost:8080
```

1. Copy the `https://...ngrok-free.app` URL
2. Paste into Wati → Settings → Webhooks → Webhook URL as `https://abc123.ngrok-free.app/webhook/wati/incoming`
3. Save — Wati will start sending inbound events to your local machine

**Tips:**
- Free ngrok URL **changes on every restart**. Re-paste in Wati each time, or sign up for a free ngrok account to get one **static domain** (persistent across restarts)
- Ngrok also gives a local inspector at `http://localhost:4040` — you can see every request Wati sends and replay them, which is useful for debugging the webhook receiver without needing a real phone
- For unit/integration tests that don't need a live Wati connection, POST the payload directly to `http://localhost:8080/webhook/wati/incoming` using Postman (no ngrok needed)

**Production**: Wati doesn't send a secret header. Validate inbound requests by IP-allowlisting Wati's server IP range on the API firewall.

### Inbound Payload — Button Tap

When staff taps an interactive button, Wati sends:
```json
{
  "whatsappNumber": "919876543210",
  "senderName": "Ravi Kumar",
  "type": "button",
  "button": {
    "payload": "ack",
    "text": "✅ Acknowledge"
  }
}
```

### Inbound Payload — Text Message

```json
{
  "whatsappNumber": "919876543210",
  "senderName": "Ravi Kumar",
  "type": "text",
  "text": { "body": "ON" }
}
```

---

## Step 4: Templates to Create

Navigate to **Manage → Message Templates → New Template**

All templates: **Category: UTILITY**, Language: **English**.

Submit all at once — Meta approval takes 24–48 hours.

---

### Template 1 — `task_assigned` ⬅ INTERACTIVE (Quick Reply buttons)

**Type**: Interactive — Quick Reply
**Recipient**: Assigned staff member
**Trigger**: Ops Task Worker assigns staff to a ticket

**Body**:
```
📋 New Task [#{{1}}]: {{2}}
Room: {{3}} | SLA: {{4}} min | Priority: {{5}}
Guest: {{6}}

Tap Acknowledge when you start. Tap Done when complete.
```

**Buttons**:
| Button # | Display text | Payload ID (sent to webhook on tap) |
|----------|-------------|--------------------------------------|
| 1 | ✅ Acknowledge | `ack` |
| 2 | ✔ Mark Done | `done` |

**Variables**:
| # | Value | Example |
|---|-------|---------|
| 1 | Zoho ticket number | `103` |
| 2 | Subject | `Towel Request x2` |
| 3 | Room/Bed | `101-A` |
| 4 | SLA minutes | `15` |
| 5 | Priority | `15MINS` |
| 6 | Guest name | `Rahul Mehta` |

**Sample message**:
```
📋 New Task [#103]: Towel Request x2
Room: 101-A | SLA: 15 min | Priority: 15MINS
Guest: Rahul Mehta

Tap Acknowledge when you start. Tap Done when complete.
[✅ Acknowledge]  [✔ Mark Done]
```

**How button taps are handled:**

Staff taps → Wati sends `button.payload` = `"ack"` or `"done"` + staff's `whatsappNumber` → our Wati Webhook Receiver:

```
"ack"  → look up oldest PENDING ticket for this staff phone
         → PATCH Zoho Desk: status = In Progress
         → UPDATE zoho_ticket_ref: status = In Progress
         → Reply: "Got it! Task #103 is now In Progress."

"done" → look up oldest In Progress ticket for this staff phone
         → PATCH Zoho Desk: status = Closed
         → UPDATE zoho_ticket_ref + DECREMENT staff.current_task_count
         → DEL Redis sla:{zohoTicketId}:*
         → Enqueue vibehouse-notify: guest completion message
         → Reply: "Task #103 marked complete. Good work!"
```

> Sequential task assumption: staff handle tasks one at a time (oldest first). For edge cases where a staff member has 2+ active tasks, they can type text fallback commands (see Step 5).

---

### Template 2 — `task_reminder_l0` (Text only)

**Recipient**: Assigned staff member
**Trigger**: Initial wait timer expired — staff hasn't acknowledged yet
**Body**:
```
⏰ Reminder [#{{1}}]: {{2}} | Room {{3}}
{{4}} min have passed. {{5}} min remaining.
Reply ACCEPT-{{1}} to start, or DONE-{{1}} if already complete.
```

**Variables**:
| # | Value |
|---|-------|
| 1 | Ticket number (e.g. `103`) |
| 2 | Subject |
| 3 | Room |
| 4 | Minutes elapsed |
| 5 | Minutes remaining |

---

### Template 3 — `ticket_alert` (Text only)

**Replaces**: separate L1, L2, L3, and breach templates — one template for all escalation events.
**Recipient**: Whoever is being notified at this escalation level (Team Lead, Manager, or Owner)
**Trigger**: Any Lx timer fires (L1, L2, L3) OR SLA deadline fully breached

**Body**:
```
🚨 Ticket Alert [#{{1}}]: {{2}} | Room {{3}}
{{4}}
Check Zoho Desk and take action: {{5}}
```

**Variables**:
| # | Value | Example |
|---|-------|---------|
| 1 | Ticket number | `103` |
| 2 | Subject | `Towel Request x2` |
| 3 | Room | `101-A` |
| 4 | Situation line — composed by backend | `SLA breached — 45 of 15 min elapsed. Assigned staff did not respond.` |
| 5 | Zoho Desk ticket URL | `https://desk.zoho.in/support/buteak/ShowHomePage.do#Cases/dv/254675000000369009` |

**How `{{4}}` is composed per event:**

| Event | `{{4}}` text |
|-------|-------------|
| L1 escalation | `Escalated to L1 — {{elapsed}} of {{sla}} min elapsed. Assigned staff did not respond.` |
| L1 reminder | `Reminder — L1 still unresolved after {{elapsed}} min.` |
| L2 escalation | `Escalated to L2 — {{elapsed}} min elapsed. Team Lead did not resolve.` |
| L3 / breach | `SLA BREACHED — {{elapsed}} min elapsed. SLA limit was {{sla}} min. Immediate action needed.` |

> PagerDuty still fires at L2 and L3 alongside this message (`dedup_key = zoho_ticket_ref.id`).

---

### Template 4 — `ticket_unassigned` (Text only)

**Recipient**: Manager (always — they're responsible for ensuring tickets get assigned)
**Trigger**: Ticket has been `Open` for longer than `escalationWait` minutes with no `assigned_staff_id` set — the assignment engine found no available staff

**Body**:
```
⚠️ Unassigned Ticket [#{{1}}]: {{2}} | Room {{3}}
Created {{4}} min ago. No available staff found in {{5}} department.
Please assign manually in Zoho Desk: {{6}}
```

**Variables**:
| # | Value | Example |
|---|-------|---------|
| 1 | Ticket number | `103` |
| 2 | Subject | `AC Repair` |
| 3 | Room | `101-A` |
| 4 | Minutes since ticket created | `12` |
| 5 | Department | `MAINTENANCE` |
| 6 | Zoho Desk ticket URL | `https://desk.zoho.in/...` |

---

## Step 5: Inbound Command Parsing

Our webhook receiver at `POST /webhook/wati/incoming` handles two message types.

**Phone matching**: `staff.phone` stored as `+919876543210`. Wati sends `whatsappNumber` as `919876543210` (no `+`). Strip `+` and compare.

### A. Button Reply (from `task_assigned` interactive template)

```
type = "button"  →  button.payload = "ack" | "done"
```

| Payload | Action |
|---------|--------|
| `ack` | Find oldest PENDING ticket for this staff phone → status = IN_PROGRESS |
| `done` | Find oldest IN_PROGRESS ticket for this staff phone → status = COMPLETED → notify guest |

### B. Text Commands (fallback + availability)

| Text (case-insensitive) | Action |
|------------------------|--------|
| `ACCEPT-103` | Acknowledge specific ticket by Zoho number |
| `DONE-103` | Complete specific ticket by Zoho number |
| `ON` | `UPDATE staff SET is_available = true` |
| `OFF` | `UPDATE staff SET is_available = false` |
| `PAUSE ME` | `is_available = false` for 30 min, auto-restore via `@Timeout` |
| Unknown | Reply: `Commands: tap buttons in your task message, or text: ON | OFF | PAUSE ME` |

### C. Unknown Numbers

Silently ignore. Do not auto-reply to unregistered numbers.

### Idempotency

Before every status write, check current `zoho_ticket_ref.status`. If already in target state → no-op. Prevents duplicate updates on Wati retry (Wati retries webhook on non-200 response).

---

## Step 6: API Endpoints Used by Backend

Base URL: `WATI_API_ENDPOINT`
Auth: `Authorization: Bearer <WATI_API_TOKEN>`

| Purpose | Method | Path |
|---------|--------|------|
| Send interactive template (task_assigned) | POST | `/api/v1/sendInteractiveButtonMessage?whatsappNumber={phone}` |
| Send text template (Lx notifications, guest) | POST | `/api/v1/sendTemplateMessage?whatsappNumber={phone}` |
| Send freeform reply (within 24h session) | POST | `/api/v1/sendSessionMessage/{phone}` |
| Add contact (on staff create) | POST | `/api/v1/addContact/{phone}` |

### Interactive Button Template — Full Request

```json
POST /api/v1/sendInteractiveButtonMessage?whatsappNumber=919876543210
Authorization: Bearer <WATI_API_TOKEN>
Content-Type: application/json

{
  "template_name": "task_assigned",
  "broadcast_name": "task_assigned_103",
  "parameters": [
    { "name": "1", "value": "103" },
    { "name": "2", "value": "Towel Request x2" },
    { "name": "3", "value": "101-A" },
    { "name": "4", "value": "15" },
    { "name": "5", "value": "15MINS" },
    { "name": "6", "value": "Rahul Mehta" }
  ]
}
```

### Text Template — Full Request (Lx notifications)

```json
POST /api/v1/sendTemplateMessage?whatsappNumber=919876543210
Authorization: Bearer <WATI_API_TOKEN>
Content-Type: application/json

{
  "template_name": "task_reminder_l0",
  "broadcast_name": "sla_l0_103",
  "parameters": [
    { "name": "1", "value": "103" },
    { "name": "2", "value": "Towel Request x2" },
    { "name": "3", "value": "101-A" },
    { "name": "4", "value": "8" },
    { "name": "5", "value": "7" }
  ]
}
```

### Add Contact — Called by StaffService.create() After DB Insert

```json
POST /api/v1/addContact/919876543210
{
  "name": "Ravi Kumar",
  "customParams": [
    { "name": "staff_id", "value": "<uuid>" },
    { "name": "department", "value": "HOUSEKEEPING" },
    { "name": "role", "value": "HOUSEKEEPING_WORKER" }
  ]
}
```

---

## Step 7: Notification Worker Dispatch

Notification Worker (`backend/src/workers/notification.worker.ts`) consumes `vibehouse-notify` (SQS Standard queue):

| SQS message type | Wati template | API endpoint | Recipient | PagerDuty? |
|-----------------|---------------|--------------|-----------|-----------|
| `staff_task_assigned` | `task_assigned` | interactive | assigned `staff.phone` | No |
| `sla_l0_reminder` | `task_reminder_l0` | text template | assigned `staff.phone` | No |
| `sla_l1_escalation` | `ticket_alert` | text template | `escalation_config` L1 role → `staff.phone` | No |
| `sla_l1_reminder` | `ticket_alert` | text template | same L1 contact | No |
| `sla_l2_escalation` | `ticket_alert` | text template | `escalation_config` L2 role → `admin_users.phone` | Yes — trigger |
| `sla_l3_breach` | `ticket_alert` | text template | `escalation_config` L3 role → `admin_users.phone` | Yes — trigger |
| `ticket_unassigned` | `ticket_unassigned` | text template | Manager `admin_users.phone` | No |
| `ticket_completed` | *(no Wati message)* | — | PWA in-app notification only | Yes (if L2+ active) — PagerDuty resolve |

**Retry**: 3 attempts, exponential backoff (1s / 2s / 4s) on Wati `429` or `5xx`. On final failure: `INSERT notification_log (status = 'FAILED')`.

---

## Step 8: Opt-in Management (Staff Only)

Wati is staff-facing only. Guests have no WhatsApp opt-in.

- Onboarding instruction to staff: "Send *Hi* to +91-XXXXXXXXXX to activate WhatsApp task notifications"
- First inbound message from that number → `staff.whatsapp_opted_in = true`
- Staff sends `STOP` → `staff.whatsapp_opted_in = false` → fallback to `staff.email`
- Check `staff.whatsapp_opted_in` before every `sendTemplateMessage` or `sendInteractiveButtonMessage` call

---

## Step 9: Environment Variables

```env
WATI_API_ENDPOINT=https://live-server.wati.io
WATI_API_TOKEN=<from Wati dashboard → Settings → API>
```

---

## Step 10: Template Submission Checklist

| Step | Timeline |
|------|----------|
| Submit all 4 templates (1 interactive + 3 text) | Day 0 |
| Meta review — UTILITY category | 24–48 hours |
| Rejection → fix language + resubmit | +24h per round |
| All approved → enable Wati in production | Day 2–3 |

**Tips to avoid rejection**:
- Use **UTILITY**, not MARKETING (promotional language = rejection)
- The interactive template must clearly explain button purpose in body text
- Variable content must make sense in context (not standalone `{{1}}`)
- English templates approve faster than Hindi/regional

---

## Step 11: Verify Setup Checklist

**Development (ngrok)**
- [ ] `ngrok http 8080` running, URL pasted into Wati webhook settings
- [ ] Ngrok inspector at `http://localhost:4040` shows inbound Wati requests
- [ ] POST test payload to `http://localhost:8080/webhook/wati/incoming` via Postman → handler responds correctly

**Templates**
- [ ] All 5 templates approved by Meta
- [ ] Send `task_assigned` interactive to a real phone → 2 buttons visible
- [ ] Tap "✅ Acknowledge" → `zoho_ticket_ref.status` = `In Progress`, Zoho Desk ticket updated
- [ ] Tap "✔ Mark Done" → status = `Closed`, Redis keys cleared, guest completion message fires
- [ ] Trigger `ticket_alert` → single message received with correct `{{4}}` situation line
- [ ] Trigger `ticket_unassigned` → Manager receives message with correct dept and minutes

**Commands**
- [ ] Text `ACCEPT-103` → correct ticket moves to `In Progress`
- [ ] Text `DONE-103` → correct ticket closes, guest notified
- [ ] Text `ON` / `OFF` → `staff.is_available` toggles correctly
- [ ] Text `PAUSE ME` → staff unavailable 30 min, auto-restored via `@Timeout`

**Guest flow (web app, not Wati)**
- [ ] Ticket completed → PWA receives in-app notification (WebSocket / polling)
- [ ] Guest submits feedback via web app → `POST /guest/tickets/:id/feedback` → `FEEDBACK RATING` written to Zoho ticket

**Notifications log**
- [ ] `notification_log` rows created for SENT and FAILED cases
- [ ] `STOP` from staff → `whatsapp_opted_in = false`, no further sends to that number

**Production**
- [ ] Webhook URL updated to `https://api.vibehouse.in/webhook/wati/incoming`
- [ ] Wati IP range added to API firewall allowlist
