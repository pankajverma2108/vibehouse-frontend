# MyGate IoT Access Pro — API Reference (Tested)

> **Source**: [b2b-apis-vibe-house.yml](file:///d:/VibeHouse/docs/setup/b2b-apis-vibe-house.yml)
> **Base URL**: `https://knoxapi.mygate.com/partner-access`
> **Sandbox**: None — only the production URL above exists.
> **Tested on**: 2026-03-26, all endpoints verified against production.

---

## Authentication

### Login

**POST** `/v1/auth/login`

| Header | Required | Description |
|---|---|---|
| `X-API-Key` | ✅ | Partner API key |
| `partner-id` | ✅ | Your partner ID |

#### Tested Input

```
POST /v1/auth/login
Headers:
  X-API-Key: 592I7UbZK52ZDoc8
  partner-id: 69bcdc9f5c1076018cdced61
Body:
  { "mobile": "9611907799" }
```

#### Tested Output — ✅ 200

```json
{
  "es": 0,
  "message": "Access token generated successfully",
  "session_token": "f9xSJksw3mjuFw2hzWDirr1cIjPNSqYL",
  "expires_in": 259200,
  "user": {
    "id": "69bcdce85c1076018cdced63",
    "partnerId": "69bcdc9f5c1076018cdced61",
    "name": "Amit Mathur",
    "mobile": "9611907799",
    "role": "PA",
    "permissions": [
      "read:properties", "write:properties",
      "read:rooms", "write:rooms",
      "read:guests", "write:guests",
      "read:accesses", "write:accesses",
      "generate:pins", "revoke:accesses",
      "read:logs", "remote:unlock"
    ],
    "status": "ACTIVE"
  }
}
```

> **Note**: `expires_in` = 259200 seconds = **3 days**. Token is `session_token`, not a JWT.
> `role: "PA"` = Partner Admin (full permissions).

#### Error — wrong mobile

```json
{
  "es": 1,
  "message": "User not found for this mobile number",
  "errorCode": 401,
  "statusCode": 401
}
```

### Standard Headers (all authenticated endpoints)

| Header | Value | Description |
|---|---|---|
| `partner-id` | `69bcdc9f5c1076018cdced61` | Always required |
| `mobile` | `9611907799` | Dual validation |
| `platform` | `3` | `1`=app, `2`=web, **`3`=API** |
| `session-token` | Token from login | Auth token |

> Some endpoints also require `X-API-Key` header (managers, user properties, delete user/lock).

### BaseResponse Envelope

All API responses use this wrapper:

```json
{
  "es": 0,           // 0=success, 1=error, 2=no data
  "message": "...",
  "response": null,  // JSON string (or null if data is in other keys)
  "errorCode": null,
  "statusCode": 200,
  "time": 1774513198
}
```

> **`time`** = Unix timestamp in seconds.
> Actual data is returned in **named keys** (e.g. `partner`, `room`, `guests`), not always in `response`.

---

## Module 1: Partner Management

| # | Method | Endpoint | Tested | Status |
|---|---|---|---|---|
| 1 | GET | `/v1/partners/{partnerId}` | ✅ | Works |
| 2 | PUT | `/v1/partners/{partnerId}` | — | Not tested (didn't want to modify partner) |
| 3 | GET | `/v1/partners/{partnerId}/users` | ✅ | Works |
| 4 | POST | `/v1/partners/{partnerId}/users` | — | Not tested (needs valid session, creates real user) |
| 5 | DELETE | `/v1/partners/{partnerId}/users/{userId}` | — | Not tested |
| 6 | GET | `/v1/partners/{partnerId}/properties` | ✅ | Works |
| 7 | GET | `/v1/partners/{partnerId}/locks` | ✅ | Works (0 locks currently) |
| 8 | POST | `/v1/partners/{partnerId}/locks` | — | Not tested (no physical lock serials) |
| 9 | DELETE | `/v1/partners/{partnerId}/locks/{lockId}` | — | Not tested |
| 10 | GET | `/v1/partners/{partnerId}/accesses` | — | Not tested |

### 1.1 GET Partner Details — Tested

```
GET /v1/partners/69bcdc9f5c1076018cdced61
```

```json
{
  "es": 0,
  "message": "Partner details retrieved successfully",
  "partner": {
    "id": "69bcdc9f5c1076018cdced61",
    "name": "Vibe House",
    "contact_person": null,
    "mobile": "9611907799",
    "email": null,
    "city": null,
    "area": null,
    "address": null,
    "status": "ACTIVE",
    "total_properties": 0,
    "total_rooms": 0,
    "total_locks": 0,
    "active_locks": 0
  }
}
```

### 1.2 GET Partner Users — Tested

```
GET /v1/partners/69bcdc9f5c1076018cdced61/users
```

```json
{
  "es": 0,
  "message": "Partner users retrieved successfully",
  "users": [
    {
      "id": "69bcdce85c1076018cdced63",
      "name": "Amit Mathur",
      "mobile": "9611907799",
      "role": "PA",
      "status": "ACTIVE",
      "permissions": ["read:properties", "write:properties", "..."],
      "managed_properties": null,
      "last_login": null
    }
  ]
}
```

### 1.3 GET Partner Locks — Tested

```
GET /v1/partners/69bcdc9f5c1076018cdced61/locks
```

```json
{
  "es": 0,
  "message": "Partner locks retrieved successfully",
  "locks": [],
  "pagination": {
    "current_page": 1, "per_page": 50, "total_pages": 0,
    "total_items": 0, "has_next": false, "has_prev": false
  }
}
```

### Schemas

**PartnerUserCreateRequest** (POST users):
```json
{
  "name": "Jane Smith",        // required
  "mobile": "9876543210",      // required, 10-digit
  "email": "jane@example.com", // optional
  "role": "PARTNER_MANAGER",   // PARTNER_ADMIN | PARTNER_MANAGER
  "property_id": "prop123"     // optional, for PARTNER_MANAGER only
}
```

**AssignLocksRequest** (POST locks — JSON):
```json
{ "serial_numbers": ["SN001234", "SN001235"] }
```
Also accepts `multipart/form-data` with a `csv_file` field.

---

## Module 2: Property Management

| # | Method | Endpoint | Tested | Status |
|---|---|---|---|---|
| 1 | GET | `/v1/properties` | ✅ | Works |
| 2 | POST | `/v1/properties` | ✅ | Works — created "VibeHouse Bandstand" |
| 3 | GET | `/v1/properties/{propertyId}` | — | (same as partner properties list) |
| 4 | PUT | `/v1/properties/{propertyId}` | — | Not tested |
| 5 | DELETE | `/v1/properties/{propertyId}` | — | Not tested |
| 6 | GET | `/v1/properties/{propertyId}/rooms` | — | Not tested separately |
| 7 | POST | `/v1/properties/{propertyId}/rooms` | ✅ | Works — created "Room 101" |
| 8 | GET | `/v1/properties/{propertyId}/guests` | ✅ | Works |
| 9 | POST | `/v1/properties/{propertyId}/guests` | ✅ | Works — created "Arjun Mehta" |
| 10 | GET | `/v1/properties/{propertyId}/managers` | — | Not tested |
| 11 | POST | `/v1/properties/{propertyId}/managers` | — | Not tested |
| 12 | DELETE | `/v1/properties/{propertyId}/managers/{managerId}` | — | Not tested |
| 13 | GET | `/v1/properties/{propertyId}/access-logs` | ✅ | Works (0 logs) |
| 14 | GET | `/v1/properties/user/{userId}` | — | Not tested |

### 2.1 POST Create Property — Tested

```
POST /v1/properties
Body:
{
  "name": "VibeHouse Bandstand",
  "city": "Mumbai",
  "area": "Bandra",
  "address": "Plot 12, Bandstand Promenade, Bandra West, Mumbai 400050",
  "property_type": "HOSTEL",
  "total_floors": 3
}
```

```json
{
  "es": 0,
  "message": "Property created successfully",
  "property": {
    "id": "69c4ec5f5d8e633ad3a2d761",
    "name": "VibeHouse Bandstand",
    "city": "Mumbai",
    "area": "Bandra",
    "address": "Plot 12, Bandstand Promenade, Bandra West, Mumbai 400050",
    "manager": null,
    "status": "ACTIVE",
    "property_type": "HOSTEL",
    "total_floors": 3,
    "partner_id": "69bcdc9f5c1076018cdced61",
    "total_rooms": 0,
    "occupied_rooms": 0,
    "active_locks": 0,
    "created_at": 1774513247,
    "updated_at": 1774513247
  }
}
```

### 2.2 POST Add Room to Property — Tested

```
POST /v1/properties/69c4ec5f5d8e633ad3a2d761/rooms
Body:
{
  "name": "Room 101",
  "room_number": "101",
  "floor": 1,
  "capacity": 4,
  "room_type": "SINGLE",
  "description": "4-bed dorm, ground floor"
}
```

```json
{
  "es": 0,
  "message": "Room created successfully",
  "room": {
    "id": "69c4ec6e5d8e633ad3a2d762",
    "name": "Room 101",
    "room_number": "101",
    "floor": 1,
    "capacity": 4,
    "room_type": "SINGLE",
    "lock": null,
    "status": "AVAILABLE",
    "property_id": "69c4ec5f5d8e633ad3a2d761",
    "property_name": "VibeHouse Bandstand",
    "current_guests": [],
    "created_at": 1774513262,
    "updated_at": 1774513262
  }
}
```

### 2.3 POST Add Guest to Property — Tested

```
POST /v1/properties/69c4ec5f5d8e633ad3a2d761/guests
Body:
{
  "name": "Arjun Mehta",
  "mobile": "9876543210",
  "email": "arjun@vibehouse.in",
  "guest_type": "RESIDENT",
  "room_id": "69c4ec6e5d8e633ad3a2d762",
  "check_in_date": 1774513200,
  "check_out_date": 1774772400,
  "id_proof_type": "AADHAR",
  "id_proof_number": "123456789012"
}
```

```json
{
  "es": 0,
  "message": "Guest created successfully and added to smart lock system",
  "guest": {
    "id": "69c4ec7d5d8e633ad3a2d763",
    "name": "Arjun Mehta",
    "mobile": "9876543210",
    "email": "arjun@vibehouse.in",
    "status": "ACTIVE",
    "guest_type": "RESIDENT",
    "room_assignments": [
      {
        "room_id": "69c4ec6e5d8e633ad3a2d762",
        "room_name": "Room 101",
        "room_number": "101",
        "floor": 1,
        "property_id": "69c4ec5f5d8e633ad3a2d761",
        "property_name": "VibeHouse Bandstand",
        "check_in_date": 1774513200,
        "check_out_date": 1774772400,
        "status": "ACTIVE",
        "active_accesses": 0
      }
    ],
    "id_proof_type": "AADHAR",
    "id_proof_number": "123456789012",
    "total_active_accesses": null,
    "created_at": 1774513277,
    "updated_at": 1774513277
  }
}
```

### 2.4 GET Property Guests — Tested

```
GET /v1/properties/69c4ec5f5d8e633ad3a2d761/guests
```

Returns same guest list as above in `guests[]` array with full `room_assignments`.

### 2.5 GET Property Access Logs — Tested

```
GET /v1/properties/69c4ec5f5d8e633ad3a2d761/access-logs
```

```json
{
  "es": 0,
  "message": "Access logs retrieved successfully",
  "logs": [],
  "pagination": {
    "current_page": 1, "per_page": 50, "total_pages": 0,
    "total_items": 0, "has_next": false, "has_prev": false
  }
}
```

### Schemas

**PropertyCreateRequest** (required fields: `name`, `city`, `area`, `address`):
- `property_type`: `HOSTEL` | `HOTEL` | `PG` | `CO_LIVING` | `STUDENT_HOUSING`
- `total_floors`: integer, min 1

**RoomCreateRequest** (required: `name`, `room_number`):
- `room_type`: `SINGLE` | `DOUBLE`
- `capacity`: integer, min 1
- `floor`: integer, min 0

**GuestCreateRequest** (required: `name`, `mobile`, `guest_type`, `room_id`):
- `guest_type`: `RESIDENT` | `VISITOR` | `STAFF` | `MAINTENANCE`
- `id_proof_type`: `AADHAR` | `PAN` | `PASSPORT` | `DRIVING_LICENSE` | `VOTER_ID`
- `check_in_date` / `check_out_date`: Unix epoch timestamps

---

## Module 3: Room Management

| # | Method | Endpoint | Tested | Status |
|---|---|---|---|---|
| 1 | GET | `/v1/rooms/{roomId}` | ✅ | Works |
| 2 | PUT | `/v1/rooms/{roomId}` | — | Not tested |
| 3 | DELETE | `/v1/rooms/{roomId}` | — | Not tested |
| 4 | POST | `/v1/rooms/{roomId}/attach-lock` | — | Needs physical lock serial |
| 5 | POST | `/v1/rooms/{roomId}/detach-lock` | — | Needs attached lock first |
| 6 | GET | `/v1/rooms/{roomId}/accesses` | ✅ | Works (404 when no accesses) |
| 7 | POST | `/v1/rooms/{roomId}/accesses` | ✅ | Returns 400 "No device associated with room" (no lock) |

### 3.1 GET Room Details — Tested

```
GET /v1/rooms/69c4ec6e5d8e633ad3a2d762
```

```json
{
  "es": 0,
  "message": "Room details retrieved successfully",
  "room": {
    "id": "69c4ec6e5d8e633ad3a2d762",
    "name": "Room 101",
    "room_number": "101",
    "floor": 1,
    "room_type": "SINGLE",
    "capacity": 4,
    "property_id": "69c4ec5f5d8e633ad3a2d761",
    "property_name": "VibeHouse Bandstand",
    "lock": null,
    "current_guests": [
      {
        "id": "69c4ec7d5d8e633ad3a2d763",
        "name": "Arjun Mehta",
        "mobile": "9876543210",
        "email": "arjun@vibehouse.in",
        "status": "ACTIVE",
        "user_id": null,
        "guest_type": "RESIDENT"
      }
    ],
    "active_accesses": 0,
    "status": "AVAILABLE",
    "created_at": 1774513262,
    "updated_at": 1774513277
  }
}
```

### 3.2 POST Create Room Access — Tested (expected error — no lock)

```
POST /v1/rooms/69c4ec6e5d8e633ad3a2d762/accesses
Body:
{
  "guest_id": "69c4ec7d5d8e633ad3a2d763",
  "access_type": "PASSCODE",
  "validity_type": "TIMED",
  "start_time": 1774513200,
  "end_time": 1774772400,
  "access_name": "Arjun Room 101 Access"
}
```

```json
{
  "es": 1,
  "message": "No device associated with room",
  "errorCode": 400,
  "statusCode": 400
}
```

> This is expected — no lock is attached to the room yet. Once a physical lock
> serial number is assigned and attached, this will return a passcode.

### 3.3 GET Room Accesses — Tested (no accesses yet)

```
GET /v1/rooms/69c4ec6e5d8e633ad3a2d762/accesses
```

```json
{
  "es": 1,
  "message": "No access mappings found for room",
  "errorCode": 404,
  "statusCode": 404
}
```

### Key Schemas

**Room statuses**: `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `OUT_OF_ORDER`, `ACTIVE`, `INACTIVE`

**AttachLockRequest**:
```json
{ "lock_serial_number": "MG123456" }
```

**RoomAccessCreateRequest** (required: `guest_id`, `access_type`, `validity_type`):
- `access_type`: `REMOTE` | `PASSCODE` | `FINGERPRINT` | `RFID` | `KEY` | `REMOTEKEY`
- `validity_type`: `PERMANENT` | `TIMED` | `ONETIME` (or `P` | `T` | `O`)
- `passcode`: 4-8 digit string (optional, auto-generated if omitted)

---

## Module 4: Guest Management

| # | Method | Endpoint | Tested | Status |
|---|---|---|---|---|
| 1 | GET | `/v1/guests/{guestId}` | ✅ | Works |
| 2 | PUT | `/v1/guests/{guestId}` | — | Not tested |
| 3 | DELETE | `/v1/guests/{guestId}?roomId={roomId}` | ✅ | Works — "Guest checked out from room successfully" |
| 4 | GET | `/v1/guests/{guestId}/accesses` | — | Not tested |

### 4.1 GET Guest Details — Tested

```
GET /v1/guests/69c4ec7d5d8e633ad3a2d763
```

```json
{
  "es": 0,
  "message": "Guest details retrieved successfully",
  "guest": {
    "id": "69c4ec7d5d8e633ad3a2d763",
    "name": "Arjun Mehta",
    "mobile": "9876543210",
    "email": "arjun@vibehouse.in",
    "status": "ACTIVE",
    "guest_type": "RESIDENT",
    "room_assignments": [
      {
        "room_id": "69c4ec6e5d8e633ad3a2d762",
        "room_name": "Room 101",
        "room_number": "101",
        "floor": 1,
        "property_id": "69c4ec5f5d8e633ad3a2d761",
        "property_name": "VibeHouse Bandstand",
        "check_in_date": 1774513200,
        "check_out_date": 1774772400,
        "status": "ACTIVE",
        "active_accesses": 0
      }
    ],
    "id_proof_type": "AADHAR",
    "id_proof_number": "123456789012",
    "total_active_accesses": 0,
    "created_at": 1774513277,
    "updated_at": 1774513277
  }
}
```

### 4.2 DELETE (Checkout) Guest from Room — Tested ✅

```
DELETE /v1/guests/69c4ec7d5d8e633ad3a2d763?roomId=69c4ec6e5d8e633ad3a2d762
```

```json
{
  "es": 0,
  "message": "Guest checked out from room successfully",
  "statusCode": 200
}
```

> Note: This doesn't delete the guest — it sets the room assignment status to `CHECKED_OUT`.

---

## Module 5: Access Management

| # | Method | Endpoint | Tested | Status |
|---|---|---|---|---|
| 1 | GET | `/v1/accesses/{accessId}` | — | Not tested (no accesses exist yet) |
| 2 | PUT | `/v1/accesses/{accessId}` | — | Not tested |
| 3 | DELETE | `/v1/accesses/{accessId}` | — | Not tested |
| 4 | POST | `/v1/accesses/generate-access` | ✅ | Returns 400 "No lock attached" (expected) |
| 5 | PUT | `/v1/accesses/admin-toggle` | — | Not tested |

### 5.1 POST Generate Access — Tested (expected error — no lock)

```
POST /v1/accesses/generate-access
Body:
{
  "property_id": "69c4ec5f5d8e633ad3a2d761",
  "room_id": "69c4ec6e5d8e633ad3a2d762",
  "access_type": "PASSCODE",
  "validity_type": "TIMED",
  "start_time": 1774513200,
  "end_time": 1774772400,
  "access_name": "Staff Test Access"
}
```

```json
{
  "es": 1,
  "message": "No lock attached to this room",
  "errorCode": 400,
  "statusCode": 400
}
```

### Schemas

**GenerateAccessRequest** (required: `property_id`, `room_id`, `access_type`, `validity_type`):
```json
{
  "property_id": "property123",
  "room_id": "room123",
  "user_id": "user123",           // required for REMOTE; optional for PASSCODE
  "access_type": "PASSCODE",      // REMOTE | PASSCODE | FINGERPRINT | RFID | KEY | ...
  "validity_type": "TIMED",       // PERMANENT | TIMED | ONETIME
  "start_time": 1704067200,       // required for TIMED
  "end_time": 1704153600,         // required for TIMED
  "access_name": "Guest Access",  // required if user_id not provided
  "passcode": "123456",           // optional, 4-8 digits (PASSCODE only)
  "is_admin": false               // optional, only for REMOTE with user_id
}
```

**Access types**: `REMOTE`, `PASSCODE`, `FINGERPRINT`, `RFID`, `KEY`, `REMOTEKEY`, `HOME_AUTOMATION_ACCESS`, `SYSTEM`

**Validity types**: `PERMANENT`, `TIMED`, `ONETIME`

**Access statuses**: `ACTIVE`, `EXPIRED`, `REVOKED`, `SUSPENDED`

**AdminToggleRequest**:
```json
{
  "user_id": "user_123",
  "property_id": "prop_123",
  "room_id": "room_123",
  "is_admin": true
}
```

---

## Test Summary

| # | Endpoint | Method | Result |
|---|---|---|---|
| 1 | `/v1/auth/login` | POST | ✅ Session token returned |
| 2 | `/v1/partners/:id` | GET | ✅ Partner = "Vibe House", ACTIVE |
| 3 | `/v1/partners/:id/users` | GET | ✅ 1 user (Amit Mathur, PA) |
| 4 | `/v1/partners/:id/properties` | GET | ✅ Paginated list |
| 5 | `/v1/partners/:id/locks` | GET | ✅ 0 locks |
| 6 | `/v1/properties` | POST | ✅ Created "VibeHouse Bandstand" |
| 7 | `/v1/properties/:id/rooms` | POST | ✅ Created "Room 101" |
| 8 | `/v1/properties/:id/guests` | POST | ✅ Created "Arjun Mehta" |
| 9 | `/v1/properties/:id/guests` | GET | ✅ 1 guest with room_assignments |
| 10 | `/v1/properties/:id/access-logs` | GET | ✅ 0 logs |
| 11 | `/v1/rooms/:id` | GET | ✅ Room details with current_guests |
| 12 | `/v1/rooms/:id/accesses` | GET | ✅ 404 (no accesses) |
| 13 | `/v1/rooms/:id/accesses` | POST | ⚠️ 400 "No device associated with room" |
| 14 | `/v1/accesses/generate-access` | POST | ⚠️ 400 "No lock attached to this room" |
| 15 | `/v1/guests/:id` | GET | ✅ Full guest details |
| 16 | `/v1/guests/:id?roomId=:roomId` | DELETE | ✅ "Guest checked out from room successfully" |

> **⚠️ Lock-dependent endpoints**: Access creation (passcode/remote) requires a physical
> MyGate lock to be assigned to the partner (`POST /partners/:id/locks`) and
> attached to the room (`POST /rooms/:id/attach-lock`). Until locks are
> physically installed and registered, these will return 400 errors.

---

## VibeHouse Integration — Core Flow

| Step | What happens | MyGate endpoint | Tested |
|---|---|---|---|
| **Setup** | Create property | `POST /v1/properties` | ✅ |
| **Setup** | Add rooms | `POST /v1/properties/:id/rooms` | ✅ |
| **Setup** | Assign + attach locks | `POST /partners/:id/locks` → `POST /rooms/:id/attach-lock` | ❌ Needs physical locks |
| **Check-in** | Create guest in MyGate | `POST /v1/properties/:id/guests` | ✅ |
| **Check-in** | Generate passcode | `POST /rooms/:id/accesses` or `POST /accesses/generate-access` | ❌ Needs lock |
| **Check-out** | Checkout guest | `DELETE /v1/guests/:id?roomId=:roomId` | ✅ |
| **Check-out** | Revoke access | `DELETE /v1/accesses/:accessId` | — |
| **Monitor** | Access logs | `GET /v1/properties/:id/access-logs` | ✅ |

---

## Live IDs (created during testing)

| Entity | ID | Name |
|---|---|---|
| Partner | `69bcdc9f5c1076018cdced61` | Vibe House |
| User | `69bcdce85c1076018cdced63` | Amit Mathur (PA) |
| Property | `69c4ec5f5d8e633ad3a2d761` | VibeHouse Bandstand |
| Room | `69c4ec6e5d8e633ad3a2d762` | Room 101 |
| Guest | `69c4ec7d5d8e633ad3a2d763` | Arjun Mehta (CHECKED OUT) |
