# Guest Auth — API Routes

> **Base URL**: `http://localhost:8080`
> **Auth**: Bearer token (JWT) — include as `Authorization: Bearer <token>` in headers
> **All responses**: `Content-Type: application/json`

---

## Key Concepts

| Term | Meaning |
|---|---|
| **Guest** | Any user registered on The Daily Social PWA (email + password OR Google OAuth) |
| **Customer (Cx)** | Guest who has at least one linked booking (`ezee_reservation_id`) |
| **PRIMARY** | Guest whose email/phone matches the original booker in eZee |
| **SECONDARY** | Additional guest added to a booking, approved by PRIMARY |
| **Booking linking** | Separate flow (Workflow 02) — not part of this auth module |

A guest account never expires. Booking IDs never expire — guests can always view past stays, download invoices, etc.

---

## 0. Google OAuth (Recommended)

### Step 1 — Initiate Google Login

**GET** `/guest/auth/google`

No auth, no body. The browser navigates to this URL and Passport immediately redirects to Google's consent screen.

```
// Simply open this in the browser:
http://localhost:8080/guest/auth/google
```

### Step 2 — Google Callback (handled automatically)

**GET** `/guest/auth/google/callback`

Google redirects here after the user grants consent. The backend:
1. Validates the OAuth code with Google
2. Runs the upsert logic (see below)
3. Redirects to `FRONTEND_URL/auth/google/success?token=<jwt>&name=<name>`

The **frontend** reads `?token` from the query string, stores it in localStorage, and navigates home — same JWT format as email/password login.

**Upsert logic (3 cases)**:

| Case | What Happens |
|------|-------------|
| Google ID already linked (`auth_providers` row exists) | Returning Google user — issue token immediately |
| Email exists but no Google provider | Link Google to the existing account, mark `email_verified=true` |
| Completely new user | Create `guests` row (no `password_hash`) + `auth_providers` row, `email_verified=true` |

**Environment variables needed**:
```env
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:8080/guest/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

---



## 1. Guest Signup

**POST** `/guest/auth/signup`

Creates a new guest account with email + password. Issues a JWT immediately — no email verification required to log in, but a verification banner is shown in the PWA until the guest verifies (OTP via email/WhatsApp — Phase 2). A guest must verify at least one channel before they can link a booking.

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Full name |
| `email` | string | ✅ | Must be unique |
| `password` | string | ✅ | Min 8 characters |
| `phone` | string | ❌ | With country code, e.g. `+919876543210` — must be unique if provided |

```json
{
  "name": "Arjun Mehta",
  "email": "arjun@example.com",
  "password": "MyPass@123"
}
```

### Response — 201 Created

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "guest": {
    "id": "d1e2f3a4-b5c6-...",
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "phone": null,
    "email_verified": false,
    "phone_verified": false,
    "profile_photo_url": null,
    "created_at": "2026-03-11T12:00:00.000Z"
  }
}
```

### Error Responses

| Status | Scenario | Body |
|---|---|---|
| `400` | Validation failure (short password, invalid email) | `{ "message": ["password must be longer than or equal to 8 characters"], "error": "Bad Request", "statusCode": 400 }` |
| `409` | Email already registered | `{ "message": "Email already registered", "statusCode": 409 }` |
| `409` | Phone already registered | `{ "message": "Phone number already registered", "statusCode": 409 }` |

### Postman Setup
- Method: `POST`
- URL: `{{base_url}}/guest/auth/signup`
- Body → raw → JSON: paste body above
- No Authorization header needed

---

## 2. Guest Login

**POST** `/guest/auth/login`

Authenticates an existing guest using email + password.

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | ✅ | Registered email address |
| `password` | string | ✅ | Account password |

```json
{
  "email": "arjun@thedailysocial.in",
  "password": "Vibe@2026!"
}
```

### Response — 200 OK

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "guest": {
    "id": "guest-arjun-001",
    "name": "Arjun Mehta",
    "email": "arjun@thedailysocial.in",
    "phone": "+919000000001",
    "email_verified": true,
    "phone_verified": false,
    "profile_photo_url": null,
    "created_at": "2026-03-11T12:00:00.000Z"
  }
}
```

### Error Responses

| Status | Scenario | Body |
|---|---|---|
| `400` | Missing/invalid fields | `{ "message": ["email must be an email"], "error": "Bad Request", "statusCode": 400 }` |
| `401` | Wrong password or email not found | `{ "message": "Invalid credentials", "statusCode": 401 }` |

### Postman Setup
- Method: `POST`
- URL: `{{base_url}}/guest/auth/login`
- Body → raw → JSON: paste body above
- Add test script to auto-save token:
```js
const res = pm.response.json();
pm.environment.set("guest_token", res.access_token);
```

---

## 3. Get My Profile

**GET** `/guest/auth/me`

Returns the authenticated guest's profile, including a summary of all linked bookings (past and current). Requires Bearer token.

### Headers

```
Authorization: Bearer <access_token>
```

### Response — 200 OK

```json
{
  "id": "guest-arjun-001",
  "name": "Arjun Mehta",
  "email": "arjun@thedailysocial.in",
  "phone": "+919000000001",
  "email_verified": true,
  "phone_verified": false,
  "profile_photo_url": null,
  "created_at": "2026-03-11T12:00:00.000Z",
  "bookings": [
    {
      "ezee_reservation_id": "EZEE-BND-2026-001",
      "role": "PRIMARY",
      "status": "APPROVED",
      "checkin_date": "2026-03-13T00:00:00.000Z",
      "checkout_date": "2026-03-17T00:00:00.000Z",
      "room_type_name": "Mixed Dorm 6-Bed",
      "property_id": "prop-bandra-001"
    },
    {
      "ezee_reservation_id": "EZEE-BND-2026-002",
      "role": "PRIMARY",
      "status": "APPROVED",
      "checkin_date": "2026-04-05T00:00:00.000Z",
      "checkout_date": "2026-04-08T00:00:00.000Z",
      "room_type_name": "Private Room",
      "property_id": "prop-bandra-001"
    }
  ]
}
```

**Note:** `bookings` is an empty array `[]` for guests with no linked bookings (e.g. Preethi). The `status` field on each booking reflects the guest's approval status on that booking — `APPROVED`, `PENDING_APPROVAL`, or `REJECTED`.

### Error Responses

| Status | Scenario |
|---|---|
| `401` | Missing or expired token |

### Postman Setup
- Method: `GET`
- URL: `{{base_url}}/guest/auth/me`
- Authorization tab → Bearer Token → `{{guest_token}}`

---

## JWT Payload

The access token encodes the following claims:

```json
{
  "sub": "guest-arjun-001",
  "guest_id": "guest-arjun-001",
  "email": "arjun@thedailysocial.in",
  "email_verified": true,
  "phone_verified": false,
  "iat": 1741694400,
  "exp": 1741695300
}
```

| Claim | Description |
|---|---|
| `guest_id` | Use this to identify the guest in all downstream routes |
| `email_verified` | If `false`, booking linking is blocked until verification |
| `phone_verified` | Required before WhatsApp OTP flows (KYC/booking notifications) |
| TTL | 15 minutes — refresh token flow coming in Phase 2 |

---

## Postman Environment Variables

| Variable | Value | Set by |
|---|---|---|
| `base_url` | `http://localhost:8080` | Manual |
| `guest_token` | _(auto-set by login test script)_ | Login request |

---

## Dev Seed Credentials

All guest accounts share password: **`Vibe@2026!`**

| Email | Name | Bookings | Notes |
|---|---|---|---|
| `arjun@thedailysocial.in` | Arjun Mehta | PRIMARY on `EZEE-BND-2026-001` and `EZEE-BND-2026-002` | `email_verified: true` |
| `neha@thedailysocial.in` | Neha Kapoor | SECONDARY on `EZEE-BND-2026-001` | Approved by Arjun |
| `preethi@thedailysocial.in` | Preethi Iyer | None | `email_verified: false` — no bookings yet |

### Seeded Booking Snapshots

| Reservation ID | Property | Room | Check-in | Check-out | Source |
|---|---|---|---|---|---|
| `EZEE-BND-2026-001` | The Daily Social Bandra | Mixed Dorm 6-Bed / D-101 | 2026-03-13 | 2026-03-17 | MakeMyTrip |
| `EZEE-BND-2026-002` | The Daily Social Bandra | Private Room / P-205 | 2026-04-05 | 2026-04-08 | Direct |
