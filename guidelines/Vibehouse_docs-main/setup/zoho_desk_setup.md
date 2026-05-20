# Zoho Desk Standard — Setup Guide

## Overview

Vibe House uses Zoho Desk Standard as the ticket management UI and storage layer for the SLA ticketing system. All SLA enforcement logic (timers, escalation, assignment) runs in our own infrastructure (Redis + AWS SQS). Zoho Desk provides the ticket list, status tracking, custom reports, and a webhook channel back to our backend.

**Tier**: Standard — ₹800/agent/month
**Agents**: 3 (Owner, Manager, Reception shared)
**Monthly cost**: ₹2,400

---

## Step 1: Account & Org Setup

1. Sign up at [https://www.zoho.com/desk/](https://www.zoho.com/desk/)
2. Choose **Standard** plan (not Express, not Professional)
3. **Org name**: Vibe House
4. **Subdomain**: `vibehouse` → URL will be `vibehouse.zohodesk.in`
5. **Timezone**: Asia/Kolkata (IST, UTC+5:30)
6. **Language**: English
7. **Business hours**: 24×7 (property never closes)

---

## Step 2: Create Agent Accounts

Navigate to **Setup → Agents → Invite Agent**

| Agent | Email | Role in Zoho | Shared? |
|-------|-------|-------------|---------|
| Owner (Upamanyu) | owner@vibehouse.in | Administrator | No |
| Manager | manager@vibehouse.in | Agent | No |
| Reception | reception@vibehouse.in | Agent | **Yes — shared by all front-desk staff** |

> Reception is a shared login. Every physical front-desk person uses the same credentials. This saves agent seats. All reception activity in the audit log will appear under one account.

---

## Step 3: Custom Ticket Fields

Navigate to **Setup → Ticket Fields → Add Field**

Create all 10 fields exactly as specified below. Field API names (used in our backend code) are in the `cf_` column.

| # | Display Name | API Field Name | Type | Required? | Values / Notes |
|---|-------------|---------------|------|-----------|----------------|
| 1 | Request Type | `cf_request_type` | Picklist | Yes | `FREE`, `CHARGEABLE`, `BORROWABLE`, `MAINTENANCE` |
| 2 | Department | `cf_department` | Picklist | Yes | `HOUSEKEEPING`, `MAINTENANCE`, `FRONT_OFFICE` |
| 3 | Room Number | `cf_room_number` | Single Line Text | No | E.g. `101` or `101-A` (unit code embedded) |
| 4 | SLA Minutes | `cf_sla_minutes` | Number | Yes | Copied from `sla_config` table at ticket creation |
| 5 | SLA Breached | `cf_sla_breached` | Checkbox | No | Set `true` by L3 escalation handler |
| 6 | Escalation Level | `cf_escalation_level` | Number | No | `0`=none, `1`=L0 reminder, `2`=L1 lead, `3`=L2 manager, `4`=L3 breach |
| 7 | Reservation ID | `cf_reservation_id` | Single Line Text | No | eZee `ReservationNo` (e.g. `RES-12345`) |
| 8 | Borrowable Item | `cf_borrowable_item` | Single Line Text | No | `Iron`, `Hair Dryer`, `Umbrella` — BORROWABLE type only |
| 9 | Feedback Rating | `cf_feedback_rating` | Number | No | `1`–`5`, submitted by guest after completion |
| 10 | Assigned Staff Phone | `cf_assigned_staff_phone` | Single Line Text | No | WhatsApp number (e.g. `+919876543210`) — used by Notification Worker |

> **Note**: `Priority` uses Zoho's **native** field (Urgent / High / Medium / Low). Do NOT create a custom field for it. This saves one of the 10 slots.

> **Guest info** (name, phone) goes in the ticket **Description** body — no custom field needed.

---

## Step 4: Custom Ticket Statuses

Navigate to **Setup → Ticket Statuses → Add Status**

Create these statuses in this order:

| Status | Color | Terminal? | Notes |
|--------|-------|-----------|-------|
| `OPEN` | Blue | No | **Default** — ticket created |
| `PENDING` | Yellow | No | Awaiting staff acknowledgement |
| `IN_PROGRESS` | Orange | No | Staff accepted task |
| `COMPLETED` | Green | No | Staff marked done |
| `CLOSED` | Grey | Yes | Admin confirmed close |
| `SLA_BREACHED` | Red | Yes | L3 timeout fired — SLA fully breached |

> `SLA_BREACHED` is a terminal state alongside `CLOSED`. A ticket can be breached AND then completed — the `cf_sla_breached` checkbox captures the breach fact permanently even if status moves to COMPLETED.

---

## Step 5: SLA Policies (Cosmetic Only)

Navigate to **Setup → SLA Policies → Add Policy**

> **Important**: These policies are for Zoho's built-in dashboard display only. Our Redis timers (L0/L1/L2/deadline) enforce the **actual** SLA timing. Create these 4 policies so Zoho's reports show approximate compliance data.

| Policy Name | Priority | First Response Time | Resolution Time |
|-------------|----------|--------------------|-----------------|
| Critical Tasks | Urgent | 5 minutes | 30 minutes |
| High Priority | High | 15 minutes | 1 hour |
| Medium Priority | Medium | 30 minutes | 2 hours |
| Low Priority | Low | 1 hour | 4 hours |

Apply each policy to **all ticket types** (no department filter — Standard doesn't support per-dept policies).

---

## Step 6: Webhooks

Navigate to **Setup → Developer Space → Webhooks → New Webhook**

Create exactly 2 webhooks:

### Webhook 1 — Status Updates
| Field | Value |
|-------|-------|
| Name | `VH Status Sync` |
| URL | `https://api.vibehouse.in/webhook/zoho-desk/status` |
| Method | POST |
| Authentication | Custom Header → `X-Zoho-Webhook-Token: <generate a random 32-char secret>` |
| Events | `Ticket → Status Update` |
| Payload format | JSON |

### Webhook 2 — Assignment Changes
| Field | Value |
|-------|-------|
| Name | `VH Assignment Sync` |
| URL | `https://api.vibehouse.in/webhook/zoho-desk/assigned` |
| Method | POST |
| Authentication | Custom Header → `X-Zoho-Webhook-Token: <same secret as above>` |
| Events | `Ticket → Assignee Update` |
| Payload format | JSON |

> Save the webhook token in `.env` as `ZOHO_DESK_WEBHOOK_SECRET`. Our backend validates this header on every incoming webhook call.

> Zoho retries webhooks on 4xx/5xx — our endpoint should respond `200 OK` quickly and process async.

---

## Step 7: OAuth2 API Credentials

Our backend calls Zoho Desk API using OAuth2 (server-to-server, no user interaction after initial setup).

### 7.1 Use Your Existing Self Client (no new client needed)

You already have a **Self Client** in Zoho API Console from the CRM setup. Use the same one — a Self Client is tied to your Zoho account, not to a product. The same Client ID + Client Secret works for both CRM and Desk scopes.

1. Go to [https://api-console.zoho.in/](https://api-console.zoho.in/)
2. Click your existing **Self Client** (created 28 June 2025)
3. Note down your **Client ID** and **Client Secret** from the **Client Secret** tab (same values you already have)

> If you don't have them saved: Client Secret tab → **Show Secret**.

### 7.2 Generate a Grant Code for Desk Scopes

Inside the Self Client:

1. Click the **Generate Code** tab
2. In the **Scope** field, enter exactly:
```
Desk.tickets.CREATE,Desk.tickets.UPDATE,Desk.tickets.READ,Desk.contacts.READ,Desk.basic.READ
```
3. **Time Duration**: select `10 minutes` (just needs to be long enough to run the next curl)
4. **Scope Description**: `Vibe House Desk backend`
5. Click **Create** → Zoho shows you a one-time authorization code (looks like `1000.xxxx...`)
6. **Copy it immediately** — it expires after the duration you selected

### 7.3 Exchange Grant Code for Refresh Token (one-time curl)

Paste and run this in terminal — replace the three placeholders:

```bash
curl -X POST https://accounts.zoho.in/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=<YOUR_CLIENT_ID>" \
  -d "client_secret=<YOUR_CLIENT_SECRET>" \
  -d "redirect_uri=https://zoom.us/integrations/zoho" \
  -d "code=<CODE_FROM_STEP_7.2>"
```

> The `redirect_uri` here must match what's registered on the Self Client. Self Clients default to `https://zoom.us/integrations/zoho` — use that exactly unless your Self Client shows a different one under **Authorized Redirect URIs**.

**Response:**
```json
{
  "access_token": "1000.xxxx...",
  "refresh_token": "1000.yyyy...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Save **both** to `.env`:
```env
ZOHO_DESK_CLIENT_ID=<YOUR_CLIENT_ID>
ZOHO_DESK_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
ZOHO_DESK_REFRESH_TOKEN=1000.yyyy...
```

The `refresh_token` is permanent (until you revoke it). Our backend exchanges it for a fresh `access_token` every ~55 minutes.

### 7.4 Get Your Org ID

```bash
curl -H "Authorization: Zoho-oauthtoken <ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     https://desk.zoho.in/api/v1/myProfile
```

Look for `"org"` → `"id"` in the response. Save it:
```env
ZOHO_DESK_ORG_ID=<the id value>
```

This goes in every API request header as `orgId: <ZOHO_DESK_ORG_ID>`.

---

## Step 8: API Endpoints Used by Our Backend

Base URL: `https://desk.zoho.in/api/v1`
Auth header: `Authorization: Zoho-oauthtoken <access_token>`
Org header: `orgId: <ZOHO_DESK_ORG_ID>`

| Purpose | Method | Path | When Called |
|---------|--------|------|-------------|
| Create ticket | POST | `/tickets` | Ops Task Worker: `ticket_created` message |
| Update ticket fields/status | PATCH | `/tickets/{id}` | Escalation, staff acceptance, closure |
| Get single ticket | GET | `/tickets/{id}` | Dashboard sync, status check |
| Add internal note | POST | `/tickets/{id}/comments` | Each escalation event — creates audit trail |
| List tickets (filtered) | GET | `/tickets?cf_department=HOUSEKEEPING&status=OPEN` | Admin dashboard polling |
| Refresh access token | POST | `https://accounts.zoho.in/oauth/v2/token` | Every ~55 min (before expiry) |

### Create Ticket — Full Request Body

```json
POST /api/v1/tickets
{
  "subject": "Towel Request — Room 101-A",
  "description": "Guest: Rahul Mehta (+919876543210) | Reservation: RES-12345\nService requested via PWA at 2026-04-01 14:30",
  "priority": "Medium",
  "status": "OPEN",
  "cf": {
    "cf_request_type": "CHARGEABLE",
    "cf_department": "HOUSEKEEPING",
    "cf_room_number": "101-A",
    "cf_sla_minutes": 15,
    "cf_sla_breached": false,
    "cf_escalation_level": 0,
    "cf_reservation_id": "RES-12345",
    "cf_borrowable_item": "",
    "cf_feedback_rating": null,
    "cf_assigned_staff_phone": "+919876543210"
  }
}
```

Response contains `id` (Zoho internal ID) and `ticketNumber` (e.g. `TKT-42`) — both stored in `zoho_ticket_ref`.

### Update Ticket — Escalation Example

```json
PATCH /api/v1/tickets/{id}
{
  "cf": {
    "cf_escalation_level": 2,
    "cf_assigned_staff_phone": "+919876543211"
  },
  "assignee": { "id": "<zoho_agent_id>" }
}
```

### Add Escalation Note

```json
POST /api/v1/tickets/{id}/comments
{
  "content": "L1 escalation at 14:43. Reassigned to Team Lead Priya Sharma. Original assignee Ravi Kumar did not acknowledge within 13 minutes.",
  "isPublic": false
}
```

---

## Step 9: Environment Variables

Add these to `backend/.env`:

```env
ZOHO_DESK_ORG_ID=<from Step 7.4>
ZOHO_DESK_CLIENT_ID=<from Step 7.1>
ZOHO_DESK_CLIENT_SECRET=<from Step 7.1>
ZOHO_DESK_REFRESH_TOKEN=<from Step 7.3>
ZOHO_DESK_API_BASE=https://desk.zoho.in/api/v1
ZOHO_DESK_WEBHOOK_SECRET=<random 32-char string from Step 6>
```

---

## Step 10: Rate Limits

| Limit | Value |
|-------|-------|
| API calls/day | 50,000 base + 250/agent |
| With 3 agents | **50,750 calls/day** |
| Our expected volume | ~100–500 calls/day |
| Burst limit | ~60 req/min |

Well within limits. No throttling expected.

---

## Step 11: Verify Setup Checklist

Before going live, confirm:

- [ ] 3 agent accounts created and active
- [ ] All 10 custom fields created with correct API names (`cf_*`)
- [ ] 6 custom ticket statuses created (OPEN as default)
- [ ] 4 SLA policies created
- [ ] 2 webhooks configured and returning 200 on test ping from Zoho
- [ ] OAuth client created, refresh token saved in `.env`
- [ ] `ZOHO_DESK_ORG_ID` confirmed
- [ ] Test ticket created via API → appears in Zoho Desk UI with all custom fields populated
- [ ] Test webhook received by our backend on ticket status change
