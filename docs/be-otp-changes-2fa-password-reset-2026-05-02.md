# BE Handoff — OTP Changes: Password Reset & 2FA
**Date:** 2026-05-02  
**Scope:** Guest auth — two changes shipped together

---

## 1. Password Reset OTP (Bug Fix)

Previously, if AWS SES failed to send the email, the API returned HTTP 500 **and** the guest was blocked by a 60-second rate limit, so they couldn't retry. Both issues are fixed.

### What changed

| File | Change |
|---|---|
| `src/email/email.service.ts` | Dev-mode bypass (logs OTP to console instead of SES); SES errors are now caught, logged, and re-thrown with a user-friendly message |
| `src/guest/auth/guest-auth.service.ts` | OTP DB row is rolled back if email send fails, so the guest can retry immediately |

### Endpoints (unchanged)

#### `POST /guest/auth/forgot-password`
No auth required.

**Request:**
```json
{ "email": "guest@example.com" }
```

**Response 200:**
```json
{ "message": "Password reset OTP sent to your email", "expires_in_seconds": 600 }
```

**Errors:**
| Status | Reason |
|---|---|
| 404 | Email not found |
| 400 | Google OAuth account (no password to reset) |
| 400 | OTP requested within last 60 seconds — wait and retry |
| 500 | SES delivery failed (rare; guest can retry immediately now) |

---

#### `POST /guest/auth/reset-password`
No auth required.

**Request:**
```json
{
  "email": "guest@example.com",
  "otp": "482731",
  "newPassword": "MyNewPass@2026"
}
```

**Response 200:**
```json
{
  "access_token": "<jwt>",
  "guest": { "id": "...", "name": "...", "email": "..." }
}
```

**Errors:**
| Status | Reason |
|---|---|
| 400 | OTP expired or not found |
| 401 | OTP is wrong |
| 400 | `newPassword` shorter than 8 chars |

---

## 2. Two-Factor Authentication (New)

Email-based OTP 2FA, opt-in per guest. When enabled, a successful password login does **not** return a JWT — it sends an OTP to the guest's email and returns `{ requires_2fa: true }`. The frontend must then prompt for the OTP and call `/verify-2fa` to get the token.

### Flow

```
POST /guest/auth/login
  ├── 2FA disabled → { access_token, guest }   (same as before)
  └── 2FA enabled  → { requires_2fa: true }     (OTP sent to email)
        ↓
POST /guest/auth/verify-2fa
  └── { access_token, guest }
```

### Enabling / disabling 2FA

```
PATCH /guest/auth/2fa   (requires guest JWT)
```

---

### New Endpoints

#### `POST /guest/auth/login` — updated response when 2FA is on

When the guest has `two_fa_enabled: true`, the response changes:

```json
{ "requires_2fa": true }
```

An OTP email is sent automatically. The OTP is valid for **10 minutes**. The same 60-second rate limit applies — if the guest logs in twice quickly, the second call skips sending a new OTP (the first one is still valid).

**Frontend action:** Show the OTP input screen. Do not show any error — the credentials were correct.

---

#### `POST /guest/auth/verify-2fa`
No auth required.

**Request:**
```json
{
  "email": "guest@example.com",
  "otp": "391047"
}
```

**Response 200:**
```json
{
  "access_token": "<jwt>",
  "guest": {
    "id": "uuid",
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "two_fa_enabled": true
  }
}
```

**Errors:**
| Status | Reason |
|---|---|
| 400 | OTP expired or not found — guest must log in again from the start |
| 401 | OTP is wrong |

---

#### `PATCH /guest/auth/2fa`
**Auth:** Guest JWT required (`Authorization: Bearer <token>`)

**Request:**
```json
{ "enabled": true }
```
or
```json
{ "enabled": false }
```

**Response 200:**
```json
{ "two_fa_enabled": true }
```

No errors beyond standard 401 for missing/invalid JWT.

---

### `GET /guest/auth/me` — updated shape

`two_fa_enabled` is now present on the guest object wherever the guest profile is returned:

```json
{
  "id": "uuid",
  "name": "Arjun Mehta",
  "email": "arjun@example.com",
  "phone": null,
  "email_verified": true,
  "phone_verified": false,
  "two_fa_enabled": false,
  "profile_photo_url": null,
  "bookings": [...]
}
```

Use this field to show/hide the 2FA toggle in profile settings.

---

## 3. OTP Email — Dev Mode

In local development (`NODE_ENV !== 'production'`), **no email is sent**. The OTP is printed to the server console:

```
[WARN] [EmailService] [DEV] OTP email NOT sent via SES.
       to=guest@example.com purpose=password_reset otp=482731 expires=02 May 2026, 03:45 PM
```

Copy the OTP from the terminal and use it in the API call. This applies to all three OTP purposes: `email_verification`, `password_reset`, and `two_fa`.

---

## 4. Reference — Files Changed

| File | What changed |
|---|---|
| [`src/email/email.service.ts`](../../backend/src/email/email.service.ts) | Dev bypass, SES error handling, added `two_fa` purpose |
| [`src/guest/auth/guest-auth.service.ts`](../../backend/src/guest/auth/guest-auth.service.ts) | OTP rollback on send failure; `login()` updated for 2FA; `verifyTwoFa()`, `toggleTwoFa()`, `sendTwoFaOtp()` added |
| [`src/guest/auth/guest-auth.controller.ts`](../../backend/src/guest/auth/guest-auth.controller.ts) | Added `POST /verify-2fa`, `PATCH /2fa` |
| [`src/guest/auth/dto/otp.dto.ts`](../../backend/src/guest/auth/dto/otp.dto.ts) | Added `VerifyTwoFaDto`, `ToggleTwoFaDto` |
| [`prisma/schema.prisma`](../../backend/prisma/schema.prisma) | Added `two_fa_enabled Boolean @default(false)` to `guests` model |
| [`prisma/migrations/20260502000001_add_guest_two_fa/migration.sql`](../../backend/prisma/migrations/20260502000001_add_guest_two_fa/migration.sql) | `ALTER TABLE guests ADD COLUMN two_fa_enabled` |
