# Admin Auth & User Management — API Routes

> **Base URL**: `http://localhost:8080`
> **Auth**: Bearer token (JWT) — include as `Authorization: Bearer <token>` in headers
> **All responses**: `Content-Type: application/json`

---

## 1. Admin Login

**POST** `/admin/auth/login`

Validates credentials, role, and the chosen property in one step. The selected `property_id` is the **active property** for the session — every property-scoped admin call uses it. The admin must be authorised on that property (via the `admin_user_properties` join table); otherwise login fails with 403.

### Request

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | ✅ | Admin's email address |
| `password` | string | ✅ | Admin's password |
| `role` | string | ✅ | Must match assigned role exactly: `OWNER` \| `MANAGER` \| `RECEPTION` \| `HOUSEKEEPING_LEAD` \| `MAINTENANCE_LEAD` |
| `property_id` | string | ✅ | Numeric eZee hotel code (`60765` for TDS Koramangala, `55402` for Buteak BTM). Must be in the admin's authorised property set. |

#### Body (JSON)
```json
{
  "email": "manager@vibehouse.in",
  "password": "Vibe@2026!",
  "role": "MANAGER",
  "property_id": "60765"
}
```

### Response — 200 OK
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "a1b2c3d4-e5f6-...",
    "name": "Priya Sharma",
    "email": "manager@vibehouse.in",
    "role": "MANAGER",
    "display_name": "Property Manager",
    "property_ids": ["60765"],
    "active_property_id": "60765",
    "permissions": [
      "dashboard.view",
      "inventory.view",
      "inventory.edit",
      "bookings.view",
      "events.view",
      "events.edit",
      "kyc.view",
      "kyc.delete",
      "admin.manage"
    ]
  }
}
```

The JWT payload carries both `property_id` (the active property for this session) and `property_ids` (the full set of authorised properties). The admin layer always scopes by `property_id`; switch via `POST /admin/auth/switch-property`.

### Error Responses

| Status | Scenario | Body |
|---|---|---|
| `400` | Missing/invalid fields | `{ "message": ["email must be an email"], "error": "Bad Request", "statusCode": 400 }` |
| `401` | Wrong password or user not found | `{ "message": "Invalid credentials", "statusCode": 401 }` |
| `403` | Role mismatch | `{ "message": "You are not authorised for this role", "statusCode": 403 }` |
| `403` | Picked a property the admin is not authorised on | `{ "message": "You are not authorised for this property", "statusCode": 403 }` |
| `403` | Account has zero properties assigned | `{ "message": "Your account has no properties assigned. Ask an owner to grant access.", "statusCode": 403 }` |

---

## 1b. Switch Active Property

**POST** `/admin/auth/switch-property`

Issues a new JWT whose active `property_id` is set to the requested property. Used by owner-level admins (and any admin with multiple assigned properties) to flip focus without logging out and back in. The requested `property_id` must be present in the JWT's `property_ids` set.

### Request — body
```json
{ "property_id": "55402" }
```

### Response — 200 OK
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "active_property_id": "55402"
}
```

### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing/expired token |
| `403` | Requested property not in `property_ids` |

### Postman Setup
- Method: `POST`
- URL: `{{base_url}}/admin/auth/login`
- Body → raw → JSON: paste body above
- No Authorization header needed

---

## 2. Get My Profile

**GET** `/admin/auth/me`

Returns the full profile of the currently authenticated admin. Use this after login to confirm the session.

### Request

No body. Requires Bearer token.

#### Headers
```
Authorization: Bearer <access_token>
```

### Response — 200 OK
```json
{
  "id": "a1b2c3d4-e5f6-...",
  "name": "Priya Sharma",
  "email": "manager@vibehouse.in",
  "phone": "+919876543211",
  "role": "MANAGER",
  "display_name": "Property Manager",
  "property_ids": ["60765"],
  "active_property_id": "60765",
  "permissions": ["dashboard.view", "inventory.view", "..."],
  "two_fa_enabled": false,
  "last_login_at": "2026-03-11T10:30:00.000Z",
  "created_at": "2026-03-11T09:00:00.000Z"
}
```

### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing/expired token |
| `401` | Account has been deactivated since token was issued |

### Postman Setup
- Method: `GET`
- URL: `{{base_url}}/admin/auth/me`
- Authorization tab → Bearer Token → paste `access_token` from login response

---

## 3. Create Admin User

**POST** `/admin/users`

Creates a new admin account. **Requires `admin.create` permission** (OWNER only).

### Request

#### Headers
```
Authorization: Bearer <owner_access_token>
```

#### Body (JSON)
```json
{
  "name": "Anjali Singh",
  "email": "anjali@vibehouse.in",
  "phone": "+919876543220",
  "password": "SecurePass@123",
  "role_id": "role-reception",
  "property_ids": ["60765"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Full name |
| `email` | string | ✅ | Must be unique |
| `phone` | string | ❌ | With country code |
| `password` | string | ✅ | Min 8 characters |
| `role_id` | string | ✅ | UUID from `admin_roles` table (see route 5) |
| `property_ids` | string[] | ✅ | One or more numeric eZee hotel codes the account is authorised on. Owners can pass all properties; managers/staff are typically scoped to one. |

### Response — 201 Created
```json
{
  "id": "f9e8d7c6-b5a4-...",
  "name": "Anjali Singh",
  "email": "anjali@vibehouse.in",
  "phone": "+919876543220",
  "role": "RECEPTION",
  "display_name": "Front Desk / Receptionist",
  "property_ids": ["60765"],
  "is_active": true,
  "created_at": "2026-03-11T11:00:00.000Z"
}
```

---

## 4b. Replace Admin's Property Assignments

**PATCH** `/admin/users/:id/properties`

Replaces the set of properties an admin can access. Old assignments are dropped and the new set is written in a single transaction. Requires `admin.manage`. The caller can only assign properties they themselves have access to (unless they are OWNER).

#### Body (JSON)
```json
{ "property_ids": ["60765", "55402"] }
```

### Response — 200 OK
The updated admin profile, including the new `property_ids`.

### Error Responses

| Status | Scenario |
|---|---|
| `400` | Empty array, or unknown property IDs |
| `403` | Caller is trying to grant access to a property they don't have |
| `404` | Admin not found |

### Error Responses

| Status | Scenario |
|---|---|
| `400` | Validation failure (short password, invalid email) |
| `401` | Missing/invalid token |
| `403` | Caller lacks `admin.create` permission |
| `404` | `role_id` doesn't exist or is inactive |
| `409` | Email already in use |

---

## 4. List All Admin Users

**GET** `/admin/users`

Returns all admin users. **Requires `admin.manage` permission.**
Property-scoped admins (MANAGER, RECEPTION, etc.) only see users in their own property. OWNER sees all.

### Request

#### Headers
```
Authorization: Bearer <access_token>
```

No query parameters. No body.

### Response — 200 OK
```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Priya Sharma",
    "email": "manager@vibehouse.in",
    "phone": "+919876543211",
    "role": "MANAGER",
    "display_name": "Property Manager",
    "property_ids": ["60765"],
    "is_active": true,
    "last_login_at": "2026-03-11T10:30:00.000Z",
    "created_at": "2026-03-01T09:00:00.000Z"
  }
]
```

### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing/invalid token |
| `403` | Caller lacks `admin.manage` permission |

---

## 5. List Admin Roles

**GET** `/admin/users/roles`

Returns all active roles with their permissions. Use this to get valid `role_id` values when creating a new admin user. **Requires `admin.manage` permission.**

### Request

#### Headers
```
Authorization: Bearer <access_token>
```

### Response — 200 OK
```json
[
  {
    "id": "role-owner",
    "name": "OWNER",
    "display_name": "Owner / Director",
    "permissions": ["dashboard.view", "admin.create", "financial.view", "..."]
  },
  {
    "id": "role-manager",
    "name": "MANAGER",
    "display_name": "Property Manager",
    "permissions": ["dashboard.view", "inventory.edit", "..."]
  },
  {
    "id": "role-reception",
    "name": "RECEPTION",
    "display_name": "Front Desk / Receptionist",
    "permissions": ["dashboard.view", "checkin.override", "borrowable.manage"]
  },
  {
    "id": "role-housekeeping-lead",
    "name": "HOUSEKEEPING_LEAD",
    "display_name": "Housekeeping Supervisor",
    "permissions": ["dashboard.view", "inventory.edit", "borrowable.return_verify"]
  },
  {
    "id": "role-maintenance-lead",
    "name": "MAINTENANCE_LEAD",
    "display_name": "Maintenance Supervisor",
    "permissions": ["dashboard.view", "devices.manage", "maintenance.tickets"]
  }
]
```

---

## 6. Get Single Admin User

**GET** `/admin/users/:id`

Returns full details for one admin user. **Requires `admin.manage` permission.**

### Request

#### Headers
```
Authorization: Bearer <access_token>
```

#### Path Parameter
| Param | Description |
|---|---|
| `id` | UUID of the admin user |

Example: `GET /admin/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Response — 200 OK
```json
{
  "id": "a1b2c3d4-...",
  "name": "Priya Sharma",
  "email": "manager@vibehouse.in",
  "phone": "+919876543211",
  "role": "MANAGER",
  "display_name": "Property Manager",
  "property_id": "60765",
  "is_active": true,
  "two_fa_enabled": false,
  "last_login_at": "2026-03-11T10:30:00.000Z",
  "created_at": "2026-03-01T09:00:00.000Z",
  "updated_at": "2026-03-11T10:30:00.000Z"
}
```

### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing/invalid token |
| `403` | Lacks `admin.manage` permission |
| `404` | User not found |

---

## 7. Deactivate Admin User

**PATCH** `/admin/users/:id/deactivate`

Soft-deactivates an admin account (`is_active = false`). The user's existing JWT remains valid until it expires — for immediate revocation, a Redis blacklist would be used (Phase 2). **Requires `admin.manage` permission.**

### Request

#### Headers
```
Authorization: Bearer <owner_access_token>
```

#### Path Parameter
| Param | Description |
|---|---|
| `id` | UUID of the admin user to deactivate |

No body required.

### Response — 200 OK
```json
{
  "message": "Admin user deactivated successfully"
}
```

### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing/invalid token |
| `403` | Lacks `admin.manage` permission |
| `404` | User not found |

---

## 8. Update Admin Profile

**PATCH** `/admin/users/:id/profile`

Updates a user's profile fields. **Any authenticated admin can call this on their own ID.** To update another user's profile, the caller must outrank the target in the role hierarchy (same rules as creating staff). No `admin.manage` permission required when editing own profile.

### Request

#### Headers
```
Authorization: Bearer <access_token>
```

#### Path Parameter
| Param | Description |
|---|---|
| `id` | UUID of the admin user to update |

#### Body (JSON) — all fields optional

| Field | Type | Description |
|---|---|---|
| `name` | string | New full name |
| `email` | string | New email — must be unique across admin_users |
| `phone` | string | New phone. Pass empty string `""` to clear it |
| `new_password` | string (min 8) | New password |
| `current_password` | string | Required when `new_password` is set **and** caller is editing themselves. Higher-ups can reset without it. |

```json
{
  "name": "Priya S. Sharma",
  "phone": "+919876540000"
}
```

```json
{
  "new_password": "NewPass@2026",
  "current_password": "Vibe@2026!"
}
```

### Response — 200 OK
```json
{
  "id": "a1b2c3d4-...",
  "name": "Priya S. Sharma",
  "email": "manager@vibehouse.in",
  "phone": "+919876540000",
  "role": "MANAGER",
  "display_name": "Property Manager",
  "property_id": "60765",
  "is_active": true,
  "updated_at": "2026-03-13T08:00:00.000Z"
}
```

### Error Responses

| Status | Scenario |
|---|---|
| `400` | `new_password` set but `current_password` missing (self-edit only) |
| `401` | Missing/expired token, or wrong `current_password` |
| `403` | Trying to edit a peer or higher-ranked account |
| `404` | User not found |
| `409` | New email already in use |

### Who can edit whom

| Caller role | Can edit own profile | Can edit others |
|---|---|---|
| OWNER | Yes | MANAGER, RECEPTION, HK Lead, Maint Lead |
| MANAGER | Yes | RECEPTION, HK Lead, Maint Lead |
| RECEPTION | Yes (own only) | No |
| HOUSEKEEPING_LEAD | Yes (own only) | No |
| MAINTENANCE_LEAD | Yes (own only) | No |

---

## 9. Delete Admin User

**DELETE** `/admin/users/:id`

Permanently hard-deletes an admin account from the database. **Requires `admin.manage` permission.** Cannot delete yourself. Hierarchy rules apply — you can only delete someone below you.

> Use **Deactivate** for reversible suspension. Use **Delete** for permanent removal.

### Request

#### Headers
```
Authorization: Bearer <access_token>
```

#### Path Parameter
| Param | Description |
|---|---|
| `id` | UUID of the admin user to delete |

No body required.

### Response — 200 OK
```json
{
  "message": "Admin user deleted successfully"
}
```

### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing/invalid token |
| `403` | Lacks `admin.manage` permission, attempting to delete self, or target outranks caller |
| `404` | User not found |

---

## Postman Environment Setup

Create a Postman environment with these variables:

| Variable | Initial Value | Description |
|---|---|---|
| `base_url` | `http://localhost:8080` | API base URL |
| `access_token` | _(empty)_ | Paste from login response |

**Pro tip**: Add a Postman test script on the Login request to auto-set the token:
```js
const res = pm.response.json();
pm.environment.set("access_token", res.access_token);
```

---

## Dev Seed Credentials

All seeded users share the same password: **`Vibe@2026!`**

| Email | Role | Property Scope |
|---|---|---|
| `owner@vibehouse.in` | OWNER | All properties |
| `manager@vibehouse.in` | MANAGER | Vibe House Bandra |
| `reception@vibehouse.in` | RECEPTION | Vibe House Bandra |
| `housekeeping@vibehouse.in` | HOUSEKEEPING_LEAD | Vibe House Bandra |
| `maintenance@vibehouse.in` | MAINTENANCE_LEAD | Vibe House Bandra |
