# BE Response — Email / OTP: Forgot Password, 2FA & Change Password
**Date:** 2026-05-04  
**Status:** SES email delivery FIXED and live in production

> **Supersedes** `be-response-otp-forgotpassword-2fa-2026-05-02.md` — that doc noted SES as broken. It is now working.

---

## TL;DR — What changed since last handoff

| Area | Before (2026-05-02) | Now (2026-05-04) |
|---|---|---|
| SES delivery | Failing — 503 on every OTP send | **Fixed** — emails arrive at inbox |
| Forgot-password OTP | 503 in production | **200 — email delivered** |
| 2FA login OTP | 503 in production | **200 — email delivered** |
| Change password (in-session) | Not implemented | **Not implemented** — see §4 |
| OTP rate-limit trap | Locked user out for 60s on failed send | Fixed — OTP rolled back on failure |

---

## 1. Forgot Password

**Flow:** User submits email → OTP sent to inbox → User submits OTP + new password → Logged in.

### Endpoints

#### `POST /guest/auth/forgot-password`

```http
POST /guest/auth/forgot-password
Content-Type: application/json

{ "email": "guest@example.com" }
```

**200 — OTP sent:**
```json
{ "message": "Password reset OTP sent to your email", "expires_in_seconds": 600 }
```

**Error responses:**

| Status | `message` | When |
|---|---|---|
| 404 | `No account found with this email address` | Email not registered |
| 400 | `This account uses Google login. Please sign in with Google.` | OAuth-only account |
| 400 | `Please wait 60 seconds before requesting another OTP` | Rate limit hit (only triggers on successful sends now) |
| 503 | `Could not send OTP email. Please try again in a moment.` | SES outage (rare — fixed in prod) |

**FE note on 503:** Rate limit is NOT applied when SES fails, so user can retry immediately. Show "We couldn't send the email right now. Please try again."

---

#### `POST /guest/auth/reset-password`

```http
POST /guest/auth/reset-password
Content-Type: application/json

{
  "email": "guest@example.com",
  "otp": "482731",
  "newPassword": "NewPass@2026"
}
```

**200 — password changed, logged in:**
```json
{
  "access_token": "<jwt>",
  "guest": {
    "id": "uuid",
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "two_fa_enabled": false
  }
}
```

| Status | When |
|---|---|
| 400 | OTP expired or not found |
| 401 | Wrong OTP |
| 400 | `newPassword` shorter than 8 characters |

Store `access_token` and treat this as a full login — no separate login step needed after reset.

---

## 2. Two-Factor Authentication (2FA)

**Flow:** Guest enables 2FA in settings → next login returns `requires_2fa: true` → FE shows OTP screen → Guest submits OTP → Logged in.

### 2a. Enable / Disable 2FA

#### `PATCH /guest/auth/2fa`

```http
PATCH /guest/auth/2fa
Authorization: Bearer <guest-jwt>
Content-Type: application/json

{ "enabled": true }
```

**200:**
```json
{ "two_fa_enabled": true }
```

No email is sent for this action. Safe to ship and test independently of SES.

Use `GET /guest/auth/me` → `two_fa_enabled` to drive the toggle state in profile settings.

---

### 2b. Login with 2FA enabled

#### `POST /guest/auth/login`

When a guest has 2FA on, the normal login response changes:

```json
{ "requires_2fa": true }
```

An OTP is emailed to the guest (valid 10 minutes). No token is returned at this step.

**FE flow:**
1. `POST /login` → check response for `requires_2fa: true`
2. If present → show OTP input screen
3. `POST /verify-2fa` → receive JWT → complete login
4. If absent → normal login succeeded (2FA off), proceed as before

**503 on login when 2FA is on:** SES failed to send the OTP. Show "Login verification email could not be sent. Please try again." User can retry login immediately.

---

### 2c. Verify 2FA OTP

#### `POST /guest/auth/verify-2fa`

```http
POST /guest/auth/verify-2fa
Content-Type: application/json

{ "email": "guest@example.com", "otp": "391047" }
```

**200:**
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

| Status | When | FE action |
|---|---|---|
| 400 | OTP expired or not found | Redirect to login start |
| 401 | Wrong OTP | Show "Incorrect code, try again" |

---

## 3. Guest profile — `two_fa_enabled` field

`GET /guest/auth/me` now includes `two_fa_enabled`:

```json
{
  "id": "uuid",
  "name": "Arjun Mehta",
  "email": "arjun@example.com",
  "two_fa_enabled": false,
  "email_verified": true,
  ...
}
```

Use this to render the 2FA toggle in profile/security settings on load.

---

## 4. Change Password (in-session) — NOT YET IMPLEMENTED

There is **no** `POST /guest/auth/change-password` or `PATCH /guest/profile/password` endpoint. The only password update path is the forgot-password OTP flow (§1).

**What this means for FE:**
- Do not wire up an in-session "Change Password" form yet — the endpoint does not exist.
- If the design calls for it, raise with BE. Suggested flow when built: `{ currentPassword, newPassword }` + valid JWT — no OTP needed since user is already authenticated.
- For now, a logged-in user who wants to change their password must use "Forgot Password" from the logged-out screen.

---

## 5. Dev mode (local testing)

When `NODE_ENV !== production`, SES is **skipped entirely**. OTP is printed to the server console:

```
[WARN] [EmailService] [DEV] OTP email NOT sent via SES.
       to=guest@example.com purpose=password_reset otp=482731 expires=...
```

Copy the OTP from the terminal — no email needed locally.

---

## 6. Email sender details

All OTP emails are sent from `noreply@thedailysocial.co.in`.

| OTP purpose | Email subject |
|---|---|
| Forgot password | `Reset your TheDailySocial password` |
| 2FA login | `Your TheDailySocial login code` |

OTPs expire in **10 minutes**. Show a countdown or at minimum note the expiry to the user.

---

## 7. Changed files (reference)

| File | Change |
|---|---|
| `src/email/email.service.ts` | Explicit SES credentials; dev-mode bypass; 503 on failure; 2FA email template |
| `src/guest/auth/guest-auth.service.ts` | OTP rollback on email failure; 2FA login path; `verifyTwoFa`, `toggleTwoFa`, `sendTwoFaOtp` |
| `src/guest/auth/guest-auth.controller.ts` | `POST /verify-2fa`, `PATCH /2fa` added |
| `src/guest/auth/dto/otp.dto.ts` | `VerifyTwoFaDto`, `ToggleTwoFaDto` added |
| `prisma/schema.prisma` | `two_fa_enabled Boolean @default(false)` on guests model |
| `prisma/migrations/20260502000001_add_guest_two_fa/` | `ALTER TABLE guests ADD COLUMN two_fa_enabled` |
| `.github/workflows/deploy.yml` | AWS credentials injected into ECS task definition so SES works in production |
