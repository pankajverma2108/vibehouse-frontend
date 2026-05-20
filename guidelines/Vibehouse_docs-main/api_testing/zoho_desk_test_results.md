# Zoho Desk API — Test Results

**Tested**: 2026-03-27 / 2026-03-28
**Org**: Buteak (`portalName: buteak`, `orgId: 60068117302`)
**Department**: VibeHouseOps (`id: 254675000000010772`)
**Layout**: VibeHouseOps (`id: 254675000000011350`)
**Final scopes**: `Desk.tickets.CREATE Desk.tickets.UPDATE Desk.tickets.READ Desk.contacts.CREATE Desk.contacts.READ Desk.basic.READ`

---

## Summary

| Operation | Status | Notes |
|-----------|--------|-------|
| Refresh access token | ✅ Works | Refresh token in `.env` — get fresh access token each request cycle |
| Create contact | ✅ Works | Needs `Desk.contacts.CREATE` scope |
| Search contact by email/phone | ❌ No native filter | Must store `zoho_contact_id` in our DB — see Finding #3 |
| List tickets | ✅ Works | Custom fields not included by default |
| Fetch single ticket | ✅ Works | Returns `cf{}` with all custom fields |
| Create ticket | ✅ Works | Requires `contactId` — email alone rejected |
| Update status | ✅ Works | Case-sensitive; invalid values silently ignored |
| Update custom fields `cf{}` | ✅ Works | Can be sent alone or alongside status in same PATCH |
| Add internal comment | ✅ Works | `isPublic: false` |

---

## Critical Findings

### 1. Invalid Status Values Are Silently Ignored

Sending a wrong status name returns HTTP 200 with no error — but the status does not change. **Always verify `response.status` after every PATCH.**

Valid status names (tested, working):

| Status | API value | statusType |
|--------|-----------|-----------|
| Open | `Open` | Open |
| Assigned to staff | `Pending` | On Hold |
| Staff acknowledged | `In Progress` | Open |
| Done | `Closed` | Closed |

> **Decision**: `Completed` and `SLA_BREACHED` custom statuses dropped. Too much overhead for ops to manually close every ticket. `IS_ESCALATED` + `CURRENT ESCALATION LEVEL` fields track escalation state. All done tickets go straight to `Closed`.

### 2. Status Names Are Title Case With Spaces

Our plan used `IN_PROGRESS`, `SLA_BREACHED` etc. The actual API values must be exactly as above — title case with spaces.

### 3. Contacts Are NOT Deduplicated by Zoho

Calling `POST /contacts` twice with the same email + phone creates two separate contacts — no error, no merge. There is no usable search filter (`email=`, `phone=`, `term=` all return `UNPROCESSABLE_ENTITY`).

**Architecture rule**: On guest registration in our PWA, call `POST /contacts` once → store returned `id` as `guests.zoho_contact_id`. Use that stored ID for all subsequent ticket creation. Never call `POST /contacts` again for the same guest.

### 4. Ticket Creation Requires `contactId`

Passing `email` in the body is rejected with:
```json
{"errorCode": "INVALID_DATA", "errors": [{"fieldName": "/contactId", "errorType": "missing"}]}
```

### 5. Custom Fields: Use `cf{}` for All Writes

Two objects appear in GET response. Only `cf{}` works for CREATE and PATCH:
```
"customFields": { "Room /Bed": "101-A" }  ← display only — do NOT write with this
"cf": { "cf_room_bed": "101-A" }           ← use this for all writes
```

Status and `cf{}` can be combined in one PATCH:
```json
{ "status": "Closed", "cf": { "cf_feedback_rating": "5", "cf_is_escalated": "false" } }
```

### 6. `cf_severity` Is an Unexpected Field

An extra `cf_severity` field appears in all ticket responses. It was not in our plan. Check in Zoho → Setup → Ticket Fields and delete it if it was created by mistake.

---

## Confirmed Custom Field API Names

| Display Name (Zoho) | API Name | Type | Values |
|--------------------|----------|------|--------|
| `BOOKING ID` | `cf_booking_id` | Text | eZee reservation ID |
| `Request Type` | `cf_request_type` | Picklist | `FREE`, `CHARGEABLE`, `BORROWABLE`, `MAINTENANCE` |
| `ASSIGNED STAFF ID` | `cf_assigned_staff_id` | Text | UUID from our `staff` table |
| `FEEDBACK RATING` | `cf_feedback_rating` | Text | `"1"`–`"5"` (string) |
| `Room /Bed` | `cf_room_bed` | Text | e.g. `101-A` |
| `IS_ESCALATED` | `cf_is_escalated` | Checkbox | `"true"` / `"false"` (string) |
| `CURRENT ESCALATION LEVEL` | `cf_current_escalation_level` | Picklist | `NA`, `L0`, `L1`, `L2`, `L3` |
| `Severity` | `cf_severity` | Unknown | ⚠️ Delete if not needed |

---

## Full Ticket Cycle — TKT-104 (2026-03-28)

**Test case**: FREE request, escalated to L1, then closed with feedback rating 5.
**Contact**: Priya Kumar — `id: 254675000000379001` (created fresh in this session)

### Contact Create ✅
```bash
POST /api/v1/contacts
Body: { "firstName": "Priya", "lastName": "Kumar", "email": "...", "phone": "+91..." }
Response: { "id": "254675000000379001", ... }
```

### Ticket Create ✅ → `TKT-104`
```bash
POST /api/v1/tickets
{
  "subject": "TEST2 - Extra Pillow",
  "departmentId": "254675000000010772",
  "contactId": "254675000000379001",
  "description": "Guest Priya Kumar (+919123456789) | Extra pillow for Room 202-B",
  "priority": "60MINS",
  "status": "Open",
  "cf": {
    "cf_request_type": "FREE",
    "cf_booking_id": "EZE-5678",
    "cf_room_bed": "202-B",
    "cf_assigned_staff_id": "staff-uuid-002",
    "cf_is_escalated": "false",
    "cf_current_escalation_level": "NA"
  }
}
Response: { "id": "254675000000368021", "ticketNumber": "104", "status": "Open" }
```

### Open → Pending ✅
```bash
PATCH /api/v1/tickets/254675000000368021
Body: { "status": "Pending" }
Response: status = "Pending", statusType = "On Hold"
```

### Pending → In Progress ✅ (staff taps Acknowledge)
```bash
PATCH body: { "status": "In Progress" }
Response: status = "In Progress"
```

### Escalate to L1 (fields + comment) ✅
```bash
PATCH body: { "cf": { "cf_is_escalated": "true", "cf_current_escalation_level": "L1" } }
Response: cf_is_escalated = "true", cf_current_escalation_level = "L1"

POST /tickets/254675000000368021/comments
Body: { "content": "[SYSTEM] L1 escalation — Team Lead notified via WhatsApp.", "isPublic": false }
Response: { "id": "254675000000375037" }
```

### Close with Feedback + Reset Escalation Fields ✅
```bash
PATCH body:
{
  "status": "Closed",
  "cf": {
    "cf_feedback_rating": "5",
    "cf_is_escalated": "false",
    "cf_current_escalation_level": "NA"
  }
}
Response:
  status = "Closed"
  closedTime = "2026-03-28T05:50:48.000Z"
  cf_feedback_rating = "5"
  cf_is_escalated = "false"
  cf_current_escalation_level = "NA"
```

**Full cycle confirmed: Open → Pending → In Progress → [Escalation fields updated] → Closed** ✅

---

## Endpoint Reference (Postman-Ready)

Base URL: `https://desk.zoho.in/api/v1`
Headers on every request:
```
Authorization: Zoho-oauthtoken <access_token>
orgId: 60068117302
Content-Type: application/json
```

### Token Refresh
```bash
POST https://accounts.zoho.in/oauth/v2/token
Body (form-encoded):
  grant_type=refresh_token
  client_id=<ZOHO_DESK_CLIENT_ID>
  client_secret=<ZOHO_DESK_CLIENT_SECRET>
  refresh_token=<ZOHO_DESK_REFRESH_TOKEN>

Response: { "access_token": "...", "expires_in": 3600 }
```

### Create Contact (on guest register)
```bash
POST /contacts
{
  "firstName": "Priya",
  "lastName": "Kumar",
  "email": "guest@email.com",
  "phone": "+919123456789"
}
Response: { "id": "<zoho_contact_id>" }  ← store in guests.zoho_contact_id
```

### Create Ticket
```bash
POST /tickets
{
  "subject": "<service name>",
  "departmentId": "254675000000010772",
  "contactId": "<guests.zoho_contact_id>",
  "description": "Guest: <name> (<phone>) | <detail>",
  "priority": "15MINS" | "60MINS" | "12HRS" | "SOS",
  "status": "Open",
  "cf": {
    "cf_request_type": "FREE" | "CHARGEABLE" | "BORROWABLE" | "MAINTENANCE",
    "cf_booking_id": "<reservation_id>",
    "cf_room_bed": "101-A",
    "cf_assigned_staff_id": "<staff.id>",
    "cf_is_escalated": "false",
    "cf_current_escalation_level": "NA"
  }
}
Response: { "id": "<zoho_ticket_id>", "ticketNumber": "104" }
← store both in zoho_ticket_ref
```

### Update Status
```bash
PATCH /tickets/:id
{ "status": "Pending" | "In Progress" | "Closed" }
```

### Update Custom Fields
```bash
PATCH /tickets/:id
{ "cf": { "cf_is_escalated": "true", "cf_current_escalation_level": "L1" } }
```

### Close + Feedback (combined)
```bash
PATCH /tickets/:id
{
  "status": "Closed",
  "cf": { "cf_feedback_rating": "5", "cf_is_escalated": "false", "cf_current_escalation_level": "NA" }
}
```

### Add Internal Comment
```bash
POST /tickets/:id/comments
{ "content": "[SYSTEM] <message>", "isPublic": false }
```

### Get Ticket (with custom fields)
```bash
GET /tickets/:id
Response includes both "customFields" (display) and "cf" (api names). Use "cf".
```

---

## Backend Integration Notes

### Token Management
Access tokens expire in 1 hour. Backend should:
- Cache the access token in Redis with TTL = 3500s (10s buffer)
- On cache miss → call token refresh → cache new token

### zoho_ticket_ref Columns Needed
```
zoho_ticket_id    TEXT  -- Zoho's id (e.g. "254675000000368021")
ticket_number     TEXT  -- Zoho's ticketNumber (e.g. "104")
zoho_contact_id   TEXT  -- for reference (already stored in guests.zoho_contact_id)
status            TEXT  -- mirror of Zoho status for fast local reads
```

### guests Table Column Needed
```
zoho_contact_id   TEXT  -- set on first registration, reused for all tickets
```

### One Action to Take in Zoho Before Building
- Delete `Severity` field (Setup → Ticket Fields) if it was created by mistake
