# Workflow 14 — Admin Panel Authentication (Role-Based Access)

## Overview
Vibe House has a **separate admin auth system** for property staff and management. Admin users **do not share** the guest auth tables. Each admin has an assigned **role** (Owner, Manager, Reception, etc.) and can **only log in under that role**. Even if ABC (a Manager) enters valid credentials, selecting "Owner" as their role will fail — the system validates both credentials AND role match.

---

## 1. Architecture Decisions

| Decision | Chosen |
|---|---|
| Admin auth separate from guest auth | ✅ Yes — different DB tables (`admin_users` vs `guests`) |
| Role-based access | ✅ Yes — `admin_roles` table with JSONB permissions |
| Login validates role | ✅ Yes — credentials only work for the user's assigned role |
| Future 2FA OTP | ✅ Ready — `two_fa_enabled` + `two_fa_secret` columns exist |
| Property scoping | ✅ Yes — `property_id` on admin_users limits data visibility |
| Separate JWT | ✅ Yes — admin JWT carries `{ admin_id, role, property_id }` |

---

## 2. Roles

Stored in `admin_roles` table. Seeded once at setup:

| Role Name | Display Name | Example Permissions |
|---|---|---|
| `OWNER` | Owner / Director | Full access — all properties, all configs, financial data |
| `MANAGER` | Property Manager | Dashboard, inventory, SLA config, staff override, reports |
| `RECEPTION` | Front Desk / Receptionist | Check-in override, borrowable management, guest lookup |
| `HOUSEKEEPING_LEAD` | Housekeeping Supervisor | Borrowable returns, inventory counts, task reassignment |
| `MAINTENANCE_LEAD` | Maintenance Supervisor | Device health, lock management, maintenance tickets |

### Permissions stored as JSONB array

```json
{
  "OWNER": [
    "dashboard.view", "dashboard.analytics",
    "inventory.view", "inventory.edit",
    "sla.config", "sla.override",
    "staff.manage", "staff.create", "staff.deactivate",
    "orders.view", "orders.refund",
    "devices.view", "devices.manage",
    "admin.manage", "admin.create",
    "financial.view", "financial.export"
  ],
  "MANAGER": [
    "dashboard.view", "dashboard.analytics",
    "inventory.view", "inventory.edit",
    "sla.config",
    "staff.manage",
    "orders.view", "orders.refund",
    "devices.view", "devices.manage"
  ],
  "RECEPTION": [
    "dashboard.view",
    "inventory.view",
    "orders.view",
    "checkin.override",
    "borrowable.manage"
  ],
  "HOUSEKEEPING_LEAD": [
    "dashboard.view",
    "inventory.view", "inventory.edit",
    "borrowable.manage",
    "borrowable.return_verify"
  ],
  "MAINTENANCE_LEAD": [
    "dashboard.view",
    "devices.view", "devices.manage",
    "maintenance.tickets"
  ]
}
```

---

## 3. Admin Login Flow

```
Admin opens: https://vibehouse.in/admin/login
    ↓
Enters:
  - Email: abc@gmail.com
  - Password: abc123
  - Selects Role: "Manager" (from dropdown)
    ↓
Backend:
  SELECT admin_users.*, admin_roles.name AS role_name
  FROM admin_users
  JOIN admin_roles ON admin_users.role_id = admin_roles.id
  WHERE admin_users.email = 'abc@gmail.com'
  AND admin_users.is_active = TRUE
  AND admin_roles.is_active = TRUE
    ↓
  User NOT found → 401 "Invalid credentials"
    ↓
  User found → Check:
    admin_roles.name == selected_role ("Manager")?
    ├── NO  → 403 "You are not authorised for this role"
    │         (ABC is a Manager but selected Owner → REJECTED)
    └── YES → bcrypt.compare(password, password_hash)
              ├── FAIL → 401 "Invalid credentials"
              └── PASS → Login success!
                         ↓
                         Issue admin JWT:
                         {
                           admin_id: "uuid",
                           role: "MANAGER",
                           role_id: "uuid",
                           property_id: "prop-001",
                           permissions: ["dashboard.view", ...]
                         }
                         ↓
                         UPDATE admin_users SET last_login_at = NOW()
                         ↓
                         INSERT INTO admin_activity_log (
                           actor_type='ADMIN', actor_id=admin_id,
                           action='LOGIN', entity_type='SESSION', entity_id=session_id
                         )
```

---

## 4. Why validate email + role together?

**Security**: If a Receptionist steals the Manager's credentials, they still need to select the correct role. The dropdown acts as an additional barrier — wrong role = instant rejection, no password check even attempted.

**Audit trail**: Every login attempt is logged with the attempted role, making it easy to detect unauthorized access attempts.

---

## 5. Future: 2FA OTP (Phase 2)

The `two_fa_enabled` and `two_fa_secret` columns are already in the schema. When enabled:

```
Password validated + Role matched → ✅
    ↓
Is two_fa_enabled = TRUE?
    ├── NO  → Issue JWT immediately
    └── YES → Send OTP to admin's phone (WhatsApp or SMS)
              ↓
              Admin enters OTP
              ↓
              Validate against otp_logs (same table as guest OTPs,
              but with guest_id=NULL, purpose='ADMIN_2FA')
              ↓
              OTP valid → Issue JWT
              OTP invalid → 401 "Invalid OTP"
```

### TOTP (Authenticator App) — Future Option
```
two_fa_secret stores a TOTP secret key
Admin uses Google Authenticator / Authy
    ↓
Admin enters 6-digit code from the app
Backend verifies using TOTP algorithm against two_fa_secret
    ↓
No SMS cost. Works offline. More secure.
```

---

## 6. Route-Level Permission Guard (Middleware)

```
Admin JWT attached to every API request
    ↓
Middleware extracts JWT:
  { admin_id, role, permissions, property_id }
    ↓
For each route, check required permission:
  @RequirePermission("inventory.edit")
    ↓
  permissions.includes("inventory.edit")?
    ├── YES → Proceed
    └── NO  → 403 Forbidden

Property scoping:
  If property_id is set on admin_users:
    → All queries automatically scoped:
      WHERE property_id = admin.property_id
  If property_id is NULL:
    → Super admin — sees all properties
```

---

## 7. Admin Management (OWNER Only)

Only users with `admin.manage` + `admin.create` permissions can:

```
Create new admin:
  POST /admin/users
  {
    name, email, phone,
    password (hashed before storage),
    role_id (validated against admin_roles),
    property_id (optional)
  }
    ↓
  INSERT INTO admin_users (...)
  INSERT INTO admin_activity_log (action='ADMIN_CREATE')
```

```
Deactivate admin:
  PATCH /admin/users/:id { is_active: false }
    ↓
  UPDATE admin_users SET is_active = FALSE, updated_at = NOW()
  INSERT INTO admin_activity_log (action='ADMIN_DEACTIVATE')
    ↓
  Deactivated admin's active JWT is still valid until it expires
  → For immediate revocation: maintain a Redis blacklist of revoked admin JWTs
```

---

## 8. Edge Cases

| Scenario | Behaviour |
|---|---|
| Admin selects wrong role | 403 "Not authorised for this role" — no password check |
| Admin account deactivated | 401 on next login. Active JWT works until expiry. |
| Admin tries guest login URL | Different auth system — admin email won't exist in `guests` table |
| Guest tries admin login URL | Guest email won't exist in `admin_users` — 401 |
| Property scoped admin views other property | All queries scoped by `property_id` — sees nothing |
| Owner has no property_id | NULL = super admin — all properties visible |

---

## 9. DB Tables Involved

| Table | Role |
|---|---|
| `admin_roles` | Role definitions with JSONB permission arrays |
| `admin_users` | Admin accounts with role FK and property scope |
| `admin_activity_log` | Login/create/deactivate audit trail |
| `otp_logs` | Future: 2FA OTP verification (shared with guest OTPs) |
