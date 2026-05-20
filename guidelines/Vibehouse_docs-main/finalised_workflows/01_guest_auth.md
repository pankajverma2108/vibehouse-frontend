# Workflow 01 — Guest Authentication & Identity

## Overview
Vibe House uses a **multi-provider authentication system**. Guests can sign up via Google OAuth, email+password, or phone OTP. Identity is centralised in the `guests` table. Authentication methods are stored as separate rows in `auth_providers`, allowing one guest to have multiple login methods.

---

## 1. Signup Flows

### 1A — Google OAuth Signup

```
Guest clicks "Continue with Google"
    ↓
Frontend redirects to Google OAuth consent screen
    ↓
Google returns: { sub, name, email, profile_photo_url }
    ↓
Auth Service checks: does auth_providers row exist for (provider=google, provider_uid=sub)?
    ├── YES → Login existing account (go to 2A)
    └── NO  → Create new account:
              INSERT INTO guests (id, name, email, profile_photo_url)
              INSERT INTO auth_providers (guest_id, provider='google', provider_uid=sub)
              → Redirect to booking dashboard
              → email_verified = TRUE (Google guarantees email ownership)
```

**DB tables touched**: `guests`, `auth_providers`

---

### 1B — Email + Password Signup

```
Guest enters: name, email, password
    ↓
Auth Service:
  - Checks email not already taken in guests table
  - Hashes password (bcrypt, cost=12)
  - INSERT INTO guests (name, email, password_hash)
  - INSERT INTO auth_providers (provider='email', provider_uid=email)
    ↓
Send email OTP for verification (6-digit, 5-min expiry)
  - INSERT INTO otp_logs (recipient=email, channel='EMAIL', purpose='EMAIL_VERIFY', otp_hash)
    ↓
Guest enters OTP
  - Validate against otp_logs (not expired, not used)
  - UPDATE guests SET email_verified = TRUE
  - UPDATE otp_logs SET used_at = NOW()
```

**DB tables touched**: `guests`, `auth_providers`, `otp_logs`

---

### 1C — Phone OTP Signup

```
Guest enters phone number
    ↓
Send OTP via WhatsApp (Wati) or SMS
  - INSERT INTO otp_logs (recipient=phone, channel='WHATSAPP', purpose='PHONE_VERIFY')
    ↓
Guest enters 6-digit OTP
  - Validate against otp_logs
  - INSERT INTO guests (name, phone)
  - INSERT INTO auth_providers (provider='phone', provider_uid=phone)
  - UPDATE guests SET phone_verified = TRUE
  - UPDATE otp_logs SET used_at = NOW()
```

---

## 2. Login Flows

### 2A — Google OAuth Login
```
Google returns sub ID
  → Query: SELECT * FROM auth_providers WHERE provider='google' AND provider_uid=sub
  → Found → Issue JWT (access_token + refresh_token)
  → Not found → Signup flow (1A)
```

### 2B — Email + Password Login
```
Guest submits email + password
  → Fetch guest by email
  → bcrypt.compare(submitted_password, password_hash)
  → Pass → Issue JWT
  → Fail → Return 401
```

### 2C — Phone OTP Login
```
Guest enters phone
  → Send OTP via WhatsApp
  → Guest submits OTP
  → Validate otp_logs
  → Issue JWT
```

---

## 3. OTP Rules

| Field | Value |
|---|---|
| Length | 6 digits |
| Expiry | 5 minutes |
| Max attempts | 3 (then lock for 15 min) |
| Storage | bcrypt hash in `otp_logs` (never plaintext) |
| Channels | WHATSAPP (primary), EMAIL, SMS |

---

## 4. JWT Session Management

```
Access Token:  15 minutes TTL
Refresh Token: 7 days TTL (stored in HTTP-only cookie)
Rotation:      New refresh token issued on every use
Storage:       Access token in memory | Refresh token in cookie
```

---

## 5. Verification Gates

A guest must verify **at least one** channel before they can link a booking:
- `email_verified = TRUE` OR `phone_verified = TRUE`

If neither is verified, the PWA shows a verification banner blocking booking linking.

---

## 6. Key Rules & Edge Cases

| Scenario | Behaviour |
|---|---|
| Google email already exists as email-password account | Merge: add `auth_providers` row for Google to existing guest |
| Guest tries same phone number twice | Rejected by `UNIQUE` constraint on `guests.phone` |
| OTP expired | Re-send OTP button active after 60 seconds |
| Guest has no phone but booking requires WhatsApp | Prompt to add and verify phone before KYC |
