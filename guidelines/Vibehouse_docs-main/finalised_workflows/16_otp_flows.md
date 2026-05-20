# 16 — OTP Flows: Email Verification & Password Reset

**Status:** Live  
**Affects:** Guest PWA — signup, login, forgot password screens  
**Backend:** `backend/src/guest/auth/guest-auth.service.ts`  
**API docs:** `docs/api_routes/02_guest_auth.md` (sections 0b, 0c)

---

## Overview

Two independent OTP flows using the same underlying mechanism:
- **Flow A — Email Verification:** Triggered automatically on signup. Guest enters a 6-digit code to prove they own the email. Required before booking linking.
- **Flow B — Password Reset (Forgot Password):** Guest-initiated. Sends OTP → guest submits OTP + new password in one call.

**Shared mechanics:**
- 6-digit numeric OTP generated server-side (`Math.random`, not predictable)
- Stored as `bcrypt` hash in `otp_logs` table — plaintext never touches the DB
- Valid for **10 minutes**, single-use (`used_at` timestamp set on consumption)
- Rate-limited: 1 OTP per 60 seconds per email + purpose
- Delivered via AWS SES from `noreply@thedailysocial.co.in`

---

## Flow A — Email Verification

### When It Triggers

Automatically at the end of `POST /guest/auth/signup`. The guest does NOT need to separately call `/send-otp` — the backend sends it as part of the signup response.

Google OAuth accounts skip this flow entirely — Google guarantees email ownership, so `email_verified` is set to `true` on OAuth signup/login.

### State Diagram

```
[Guest submits signup form]
         │
         ▼
POST /guest/auth/signup
         │
         ├── ✅ Success
         │         │
         │         ├─ Guest row created (email_verified: false)
         │         ├─ OTP generated, hashed, stored in otp_logs
         │         ├─ SES email sent: "Your verification code is 482917"
         │         └─ Response: { access_token, guest, otp_sent: true }
         │                                │
         │                  ┌────────────┘
         │                  ▼
         │         [FE stores token, shows OTP entry screen]
         │         "We sent a 6-digit code to arjun@example.com"
         │                  │
         │         [Guest types code and submits]
         │                  │
         │                  ▼
         │         POST /guest/auth/verify-otp
         │                  │
         │         ┌────────┴─────────────────────────────┐
         │         │                                       │
         │    ✅ Valid OTP                           ❌ Invalid/expired
         │         │                                       │
         │    otp_logs.used_at = now()               400 Bad Request
         │    guests.email_verified = true           FE: show error + Resend button
         │    Fresh JWT issued                            │
         │    Response: { access_token,              [Guest clicks Resend]
         │      guest: { email_verified: true } }         │
         │         │                                       ▼
         │    [FE replaces token]               POST /guest/auth/send-otp
         │    [Navigate to home]               (manual resend — 60s rate limit)
         │
         └── ❌ Conflict (email taken)
                   │
             409 Conflict
             FE: "Email already registered" → show login link
```

### Handling the Dismissed/Expired Case

If the guest closes the app before verifying, the next time they open it:
- Their JWT has `email_verified: false`
- FE shows a persistent banner: "Please verify your email to link bookings"
- Banner has a "Resend code" button → calls `POST /guest/auth/send-otp`
- If their earlier OTP (from signup) hasn't expired, they can still use it — the system always validates against the most recent unused, non-expired OTP for that guest

### Endpoints

| Step | Method | Path | Auth |
|---|---|---|---|
| 1. Signup (auto-sends OTP) | POST | `/guest/auth/signup` | None |
| 2a. Verify OTP | POST | `/guest/auth/verify-otp` | None |
| 2b. Resend OTP (if dismissed) | POST | `/guest/auth/send-otp` | None |

---

## Flow B — Forgot Password

### When It Triggers

Guest clicks "Forgot password?" on the login screen and enters their email. Only works for email/password accounts — Google OAuth accounts don't have a password to reset.

### State Diagram

```
[Guest clicks "Forgot password?"]
         │
         ▼
[FE shows email input screen]
         │
         ▼
POST /guest/auth/forgot-password { email }
         │
         ├── ✅ Email/password account found
         │         │
         │         ├─ OTP generated, hashed, stored in otp_logs (purpose: "password_reset")
         │         ├─ SES email sent: "Reset your password — code: 739201"
         │         └─ Response: { message, expires_in_seconds: 600 }
         │                  │
         │         [FE shows combined screen: OTP + new password fields]
         │         "Enter the code from your email and your new password"
         │                  │
         │         [Guest fills both fields and submits]
         │                  │
         │                  ▼
         │         POST /guest/auth/reset-password { email, otp, newPassword }
         │                  │
         │         ┌────────┴──────────────────────────────┐
         │         │                                        │
         │    ✅ Valid OTP + password ≥8 chars         ❌ Invalid/expired OTP
         │         │                                        │
         │    otp_logs.used_at = now()               400 "Invalid OTP"
         │    guests.password_hash = bcrypt(new)     FE: show error
         │    Fresh JWT issued (logged in)                  │
         │    Response: { access_token, guest }       or 400 "OTP expired"
         │         │                                   FE: show Resend button
         │    [FE stores token]
         │    [Navigate to home — user is logged in]
         │
         ├── ❌ Google OAuth account (no password_hash)
         │         │
         │    400 "This account uses Google login"
         │    FE: hide password reset form
         │        show "Sign in with Google" button
         │
         └── ❌ Email not found
                   │
             404 Not Found
             FE: "No account with this email" (do not reveal user existence in prod)
```

### Endpoints

| Step | Method | Path | Auth |
|---|---|---|---|
| 1. Request OTP | POST | `/guest/auth/forgot-password` | None |
| 2. Submit OTP + new password | POST | `/guest/auth/reset-password` | None |

---

## FE Integration — Decision Tree

Every auth response that returns `{ access_token, guest }` should run through this logic:

```typescript
function handleAuthResponse(response: AuthResponse) {
  // Store the token
  localStorage.setItem('guest_token', response.access_token);

  if (!response.guest.email_verified) {
    if (response.otp_sent === true) {
      // Signup path — OTP was auto-sent, show OTP entry screen immediately
      navigateTo('/verify-email', { email: response.guest.email, autoSent: true });
    } else {
      // Login path — email still unverified, show banner
      navigateTo('/home');
      showBanner('Please verify your email to link bookings', {
        action: 'Resend code',
        onClick: () => resendOtp(response.guest.email),
      });
    }
  } else {
    // Fully verified — go straight home
    navigateTo('/home');
  }
}
```

### OTP Screen UX Requirements

| State | FE should show |
|---|---|
| OTP screen initial state | "We sent a 6-digit code to {email}" + 6-digit input |
| Countdown timer | "Resend in 00:60" — decrement each second |
| Resend available | "Didn't receive it? Resend" button (after 60s) |
| Wrong OTP submitted | "Invalid code. Please try again." (inline error) |
| OTP expired | "This code has expired." + Resend button |
| Already verified | (send-otp returns 400) — guard against this: don't show send-otp button if `email_verified: true` |

### Token Replacement

Both `verify-otp` and `reset-password` return a **new** `access_token` with updated claims (`email_verified: true`). The FE must **replace** the stored token, not append:

```typescript
// On verify-otp or reset-password success:
localStorage.setItem('guest_token', response.access_token); // replaces old token
```

---

## Security Notes

| Property | Value | Rationale |
|---|---|---|
| OTP length | 6 digits (100,000–999,999) | 900,000 possible values. With 10-min window + bcrypt compare, brute force is impractical. |
| Storage | `bcrypt` hash (cost 10) | Plaintext never persists. DB breach cannot reveal valid OTPs. |
| Single-use | `used_at` set on first valid use | Replay attacks blocked even within validity window. |
| Expiry | 10 minutes | Long enough for email delivery; short enough to limit exposure. |
| Rate limit | 60 seconds between sends | Prevents OTP flooding and SES cost abuse. |
| Purpose isolation | `otp_logs.purpose` field | Email verification OTP cannot be used to reset a password and vice versa. |

---

## DB Schema Reference

```sql
otp_logs (
  id          VARCHAR(36) PRIMARY KEY,
  guest_id    VARCHAR(36) REFERENCES guests(id),
  recipient   VARCHAR(255),          -- email address
  channel     VARCHAR(20),           -- 'email'
  purpose     VARCHAR(50),           -- 'email_verification' | 'password_reset'
  otp_hash    VARCHAR(255),          -- bcrypt hash
  expires_at  TIMESTAMP,
  used_at     TIMESTAMP,             -- NULL = unused; set on first valid use
  created_at  TIMESTAMP DEFAULT now()
)
```
