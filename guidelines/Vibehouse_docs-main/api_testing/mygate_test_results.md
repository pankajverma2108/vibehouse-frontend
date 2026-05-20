# MyGate IoT Access Pro — API Test Results

> **Date**: 2026-03-26, 1:30 PM IST
> **Environment**: Production (`https://knoxapi.mygate.com/partner-access`)
> **Tester**: Automated (via PowerShell `Invoke-WebRequest`)

---

## Credentials Used

| Key | Value |
|---|---|
| `X-API-Key` | `592I7UbZK52ZDoc8` |
| `partner-id` | `69bcdc9f5c1076018cdced61` |
| `mobile` | `9611907799` |
| `platform` | `3` (API) |

---

## Test Results Summary

| # | Endpoint | Method | Status | Result |
|---|---|---|---|---|
| 1 | `/v1/auth/login` | POST | ✅ 200 | Session token returned |
| 2 | `/v1/partners/:id` | GET | ✅ 200 | Partner details returned |
| 3 | `/v1/partners/:id/users` | GET | ✅ 200 | 1 user listed |
| 4 | `/v1/partners/:id/properties` | GET | ✅ 200 | Paginated list (empty initially) |
| 5 | `/v1/partners/:id/locks` | GET | ✅ 200 | 0 locks |
| 6 | `/v1/properties` | POST | ✅ 200 | Property created |
| 7 | `/v1/properties/:id/rooms` | POST | ✅ 200 | Room created |
| 8 | `/v1/properties/:id/guests` | POST | ✅ 200 | Guest created |
| 9 | `/v1/properties/:id/guests` | GET | ✅ 200 | 1 guest with room assignments |
| 10 | `/v1/properties/:id/access-logs` | GET | ✅ 200 | 0 logs (empty) |
| 11 | `/v1/rooms/:id` | GET | ✅ 200 | Room + current_guests returned |
| 12 | `/v1/rooms/:id/accesses` | GET | ⚠️ 404 | "No access mappings found for room" |
| 13 | `/v1/rooms/:id/accesses` | POST | ⚠️ 400 | "No device associated with room" |
| 14 | `/v1/accesses/generate-access` | POST | ⚠️ 400 | "No lock attached to this room" |
| 15 | `/v1/guests/:id` | GET | ✅ 200 | Full guest details returned |
| 16 | `/v1/guests/:id?roomId=:id` | DELETE | ✅ 200 | Guest checked out successfully |

**Result: 12/16 passed, 4 expected failures (lock-dependent)**

---

## Entities Created During Testing

| Entity | ID | Name | Status |
|---|---|---|---|
| Partner | `69bcdc9f5c1076018cdced61` | Vibe House | ACTIVE |
| User | `69bcdce85c1076018cdced63` | Amit Mathur (PA) | ACTIVE |
| Property | `69c4ec5f5d8e633ad3a2d761` | VibeHouse Bandstand | ACTIVE |
| Room | `69c4ec6e5d8e633ad3a2d762` | Room 101 | AVAILABLE |
| Guest | `69c4ec7d5d8e633ad3a2d763` | Arjun Mehta | CHECKED OUT |

---

## Test 1 — Login

**POST** `/v1/auth/login`

### Request
```
Headers:
  X-API-Key: 592I7UbZK52ZDoc8
  partner-id: 69bcdc9f5c1076018cdced61
  Content-Type: application/json

Body:
  { "mobile": "9611907799" }
```

### Response — ✅ 200
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

### Error Case — wrong mobile
```json
{
  "es": 1,
  "message": "User not found for this mobile number",
  "errorCode": 401,
  "statusCode": 401
}
```

---

## Test 2 — Get Partner Details

**GET** `/v1/partners/69bcdc9f5c1076018cdced61`

### Response — ✅ 200
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

---

## Test 3 — List Partner Users

**GET** `/v1/partners/69bcdc9f5c1076018cdced61/users`

### Response — ✅ 200
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
      "permissions": ["read:properties", "write:properties", "...12 total"],
      "image_url": null,
      "last_login": null,
      "managed_properties": null
    }
  ]
}
```

---

## Test 4 — List Partner Properties

**GET** `/v1/partners/69bcdc9f5c1076018cdced61/properties`

### Response — ✅ 200
```json
{
  "es": 0,
  "message": "Properties retrieved successfully",
  "properties": [],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_pages": 0,
    "total_items": 0,
    "has_next": false,
    "has_prev": false
  }
}
```

---

## Test 5 — List Partner Locks

**GET** `/v1/partners/69bcdc9f5c1076018cdced61/locks`

### Response — ✅ 200
```json
{
  "es": 0,
  "message": "Partner locks retrieved successfully",
  "locks": [],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total_pages": 0,
    "total_items": 0,
    "has_next": false,
    "has_prev": false
  }
}
```

---

## Test 6 — Create Property

**POST** `/v1/properties`

### Request
```json
{
  "name": "VibeHouse Bandstand",
  "city": "Mumbai",
  "area": "Bandra",
  "address": "Plot 12, Bandstand Promenade, Bandra West, Mumbai 400050",
  "property_type": "HOSTEL",
  "total_floors": 3
}
```

### Response — ✅ 200
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

---

## Test 7 — Add Room to Property

**POST** `/v1/properties/69c4ec5f5d8e633ad3a2d761/rooms`

### Request
```json
{
  "name": "Room 101",
  "room_number": "101",
  "floor": 1,
  "capacity": 4,
  "room_type": "SINGLE",
  "description": "4-bed dorm, ground floor"
}
```

### Response — ✅ 200
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

---

## Test 8 — Add Guest to Property

**POST** `/v1/properties/69c4ec5f5d8e633ad3a2d761/guests`

### Request
```json
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

### Response — ✅ 200
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

---

## Test 9 — List Property Guests

**GET** `/v1/properties/69c4ec5f5d8e633ad3a2d761/guests`

### Response — ✅ 200
```json
{
  "es": 0,
  "message": "Guests retrieved successfully",
  "guests": [
    {
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
  ],
  "pagination": null
}
```

---

## Test 10 — Property Access Logs

**GET** `/v1/properties/69c4ec5f5d8e633ad3a2d761/access-logs`

### Response — ✅ 200
```json
{
  "es": 0,
  "message": "Access logs retrieved successfully",
  "logs": [],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total_pages": 0,
    "total_items": 0,
    "has_next": false,
    "has_prev": false
  }
}
```

---

## Test 11 — Get Room Details

**GET** `/v1/rooms/69c4ec6e5d8e633ad3a2d762`

### Response — ✅ 200
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

---

## Test 12 — List Room Accesses

**GET** `/v1/rooms/69c4ec6e5d8e633ad3a2d762/accesses`

### Response — ⚠️ 404
```json
{
  "es": 1,
  "message": "No access mappings found for room",
  "errorCode": 404,
  "statusCode": 404
}
```

> Expected — no lock attached, so no accesses could have been created.

---

## Test 13 — Create Room Access (PASSCODE)

**POST** `/v1/rooms/69c4ec6e5d8e633ad3a2d762/accesses`

### Request
```json
{
  "guest_id": "69c4ec7d5d8e633ad3a2d763",
  "access_type": "PASSCODE",
  "validity_type": "TIMED",
  "start_time": 1774513200,
  "end_time": 1774772400,
  "access_name": "Arjun Room 101 Access"
}
```

### Response — ⚠️ 400
```json
{
  "es": 1,
  "message": "No device associated with room",
  "errorCode": 400,
  "statusCode": 400
}
```

> Expected — no physical lock attached to room.

---

## Test 14 — Generate Staff Access

**POST** `/v1/accesses/generate-access`

### Request
```json
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

### Response — ⚠️ 400
```json
{
  "es": 1,
  "message": "No lock attached to this room",
  "errorCode": 400,
  "statusCode": 400
}
```

> Expected — no physical lock attached to room.

---

## Test 15 — Get Guest Details

**GET** `/v1/guests/69c4ec7d5d8e633ad3a2d763`

### Response — ✅ 200
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

---

## Test 16 — Checkout Guest from Room

**DELETE** `/v1/guests/69c4ec7d5d8e633ad3a2d763?roomId=69c4ec6e5d8e633ad3a2d762`

### Response — ✅ 200
```json
{
  "es": 0,
  "message": "Guest checked out from room successfully",
  "response": null,
  "errorCode": 200,
  "statusCode": 200
}
```

---

## Observations

1. **No sandbox** — all tests ran against production. MyGate did not provide a staging URL.
2. **Session token TTL** — 3 days (`expires_in: 259200`). We'll need to re-login periodically.
3. **Lock-dependent features** — Passcode generation, room access creation, and remote unlock all require a physical MyGate lock to be assigned to the partner and attached to the room. Until locks arrive, these will return 400 errors.
4. **Guest checkout** — `DELETE /guests/:id` doesn't delete the guest; it sets the room assignment status to `CHECKED_OUT`. The guest record persists.
5. **Response format** — Data is returned in named keys (`partner`, `room`, `guests`), NOT in the `response` field. The `response` field is always `null`.
6. **Pagination** — List endpoints (properties, locks, access-logs, guests) return consistent pagination: `current_page`, `per_page`, `total_pages`, `total_items`, `has_next`, `has_prev`.
7. **Guest creation auto-links to lock system** — The response message says "Guest created successfully and added to smart lock system", even when no lock exists. The guest is created regardless.
8. **Role abbreviation** — `PA` = Partner Admin (the spec says `PARTNER_ADMIN` but the API returns `PA`).

---

## Not Tested (no test data available)

| Endpoint | Reason |
|---|---|
| `PUT /v1/partners/:id` | Didn't want to modify partner record |
| `POST /v1/partners/:id/users` | Would create real users in production |
| `DELETE /v1/partners/:id/users/:userId` | Only 1 admin user exists |
| `POST /v1/partners/:id/locks` | No physical lock serial numbers |
| `DELETE /v1/partners/:id/locks/:lockId` | No locks to delete |
| `PUT /v1/properties/:id` | Avoided mutation |
| `DELETE /v1/properties/:id` | Avoided deletion |
| `PUT /v1/rooms/:id` | Avoided mutation |
| `DELETE /v1/rooms/:id` | Avoided deletion |
| `POST /v1/rooms/:id/attach-lock` | No lock serial numbers |
| `POST /v1/rooms/:id/detach-lock` | No lock attached |
| `PUT /v1/guests/:id` | Avoided mutation |
| `GET /v1/guests/:id/accesses` | No accesses exist |
| `GET /v1/accesses/:accessId` | No accesses exist |
| `PUT /v1/accesses/:accessId` | No accesses exist |
| `DELETE /v1/accesses/:accessId` | No accesses exist |
| `PUT /v1/accesses/admin-toggle` | No app-based users |
| `GET /v1/properties/user/:userId` | Not tested |
| `GET/POST /v1/properties/:id/managers` | Not tested |
| `DELETE /v1/properties/:id/managers/:managerId` | Not tested |
