# Brand Isolation — Frontend Handoff

**Date:** 2026-05-21  
**Backend commit:** [`f83f03d`](https://github.com/Emagicor/Vibehouse_backend/commit/f83f03d) on `Vibehouse_backend@main` — deploying now  
**Companion docs:**
- [`docs/plans/brand_isolation.md`](../plans/brand_isolation.md) — the plan
- [`docs/setup/brand_isolation.md`](../setup/brand_isolation.md) — implementation log

---

## TL;DR

A guest signed up on `www.thedailysocial.co.in` previously had their TDS bookings visible on `www.buteak.in` too (and vice versa). After this rollout, **data and emails are brand-scoped** but **identity is still shared** — same email/phone = same guest, but what they see / how their emails are branded depends on the website they're currently using.

**The only thing the FE has to do for this to work: nothing for most endpoints** (brand is auto-resolved from the `Host` header) **except for Google OAuth**, where the FE must pass `?brand=TDS` or `?brand=BUTEAK` when initiating the flow.

---

## What's changing

### 1. JWTs now carry a `brand` claim

JWT payloads issued by signup/login/2FA/OAuth/password-reset now include `brand: 'TDS' | 'BUTEAK'`. **You don't need to read this** — the backend uses it server-side to scope every guest-facing query. Just a heads-up so it's not surprising if you decode a token in debug.

### 2. Brand is auto-derived from the request's `Host` header

For all non-OAuth endpoints, the backend determines brand from the request's `Host` (or `X-Forwarded-Host`) header:

| Host | Brand |
|---|---|
| `www.thedailysocial.co.in`, `thedailysocial.co.in` | TDS |
| `www.buteak.in`, `buteak.in` | BUTEAK |
| `dev.buteak.in`, `www.dev.buteak.in` | BUTEAK |
| `localhost:3000`, `localhost:8080` | TDS (dev default) |

**No new query params or request body fields needed.** Just call the existing endpoints from the right hostname.

### 3. `GET /guest/booking/mine` is now brand-scoped

A guest with bookings on both brands will only see one set per call, depending on which brand they're logged into. No FE code change. Behavior is the intended new product behavior.

### 4. OTP emails (signup / 2FA / password reset) render per brand

A guest signing up on `buteak.in` now gets:
- Sender: `noreply@buteak.in`
- Logo: Buteak gold mark
- Accent color: `#d4a437`

Signing up on `thedailysocial.co.in` keeps TDS branding. No FE change.

### 5. Signup 409 message changed

Old: `"Email already registered"` / `"Phone number already registered"`  
New: `"Account exists — sign in"` (single message, doesn't reveal which brand the account was originally created on for privacy).

**FE action:** if you display this 409 message verbatim, update your UI strings to match (or build your own copy that maps from status code).

### 6. Google OAuth — the only FE change required

When initiating Google sign-in, **append `?brand=TDS` or `?brand=BUTEAK`** to the URL so the backend knows which brand to scope the resulting JWT under and which frontend URL to redirect back to.

```html
<!-- On TDS frontend -->
<a href="https://api.thedailysocial.co.in/guest/auth/google?brand=TDS">
  Sign in with Google
</a>

<!-- On Buteak frontend (when it goes dynamic) -->
<a href="https://api.thedailysocial.co.in/guest/auth/google?brand=BUTEAK">
  Sign in with Google
</a>
```

The brand is round-tripped through Google's OAuth `state` param and read back in the callback. **If you omit the `?brand=` query param**, the backend falls back to brand-from-Host of the `/guest/auth/google` request — which usually works (you're hitting from one of the brand domains) but the explicit param is safer.

### 7. OAuth callback redirect URL is now per-brand

After Google OAuth completes, the callback redirects to:

- **TDS:** `https://www.thedailysocial.co.in/auth/google/success?token=...&name=...` (unchanged)
- **Buteak:** **For now, also `https://www.thedailysocial.co.in/auth/google/success?...`** because Buteak FE is still a static S3 site without a `/auth/google/success` handler.

This is a temporary stopgap — when Buteak FE goes dynamic and you add a `/auth/google/success` route, ping the backend team and we'll flip the override via a single SQL update (`properties.branding_config.oauth_redirect_url` for property 55402).

---

## Backward compatibility — what's preserved

| Concern | Status |
|---|---|
| Existing JWTs (no `brand` claim) | ✅ Still work. Backend strategy fills in `brand` from request Host. No forced re-login. |
| Existing API contracts | ✅ Unchanged. Same request/response shapes. |
| Existing booking_guest_access rows | ✅ Left alone. Old cross-brand links are inert because `getMyBookings` filters at read time. |
| Existing OAuth flow | ✅ Works without `?brand=` (falls back to host). Adding the param is a UX improvement, not a hard requirement. |
| TDS as the only brand to date | ✅ Default everywhere — TDS-only flows behave exactly as before. |

---

## Behavioral changes (intentional — not regressions)

| Change | Before | After |
|---|---|---|
| Same guest logged in on Buteak sees TDS bookings | Yes, in `/guest/booking/mine` | No — brand-scoped |
| OTA booking auto-link at signup | Cross-brand (TDS booking auto-linked when signing up on Buteak with same email) | Same-brand only |
| Signup OTP for Buteak guests | TDS-branded email | Buteak-branded email |
| 409 message wording | Reveals "Email/Phone already registered" | Generic "Account exists — sign in" |
| OAuth callback for Buteak | Hard-fail (no Buteak FE) — until now this was never tested | Redirects to TDS frontend as a temporary landing pad |

---

## Quick verification (for QA / FE smoke testing)

```bash
# 1. Sign up a fresh user on TDS — OTP email should arrive from noreply@thedailysocial.co.in
curl -X POST 'https://api.thedailysocial.co.in/guest/auth/signup' \
  -H 'Host: www.thedailysocial.co.in' \
  -H 'Content-Type: application/json' \
  -d '{"name":"QA TDS","email":"qa-tds-2026-05-21@vibehouse-test.dev","password":"Test@2026!"}'

# Decode the returned JWT — should include brand: 'TDS'

# 2. Sign up a fresh user on Buteak (different email since identity is shared)
curl -X POST 'https://api.thedailysocial.co.in/guest/auth/signup' \
  -H 'Host: www.buteak.in' \
  -H 'Content-Type: application/json' \
  -d '{"name":"QA Buteak","email":"qa-buteak-2026-05-21@vibehouse-test.dev","password":"Test@2026!"}'

# Decode JWT — should include brand: 'BUTEAK'

# 3. Try signing up the same email on the other brand — should return 409 with NEW message
curl -X POST 'https://api.thedailysocial.co.in/guest/auth/signup' \
  -H 'Host: www.buteak.in' \
  -H 'Content-Type: application/json' \
  -d '{"name":"QA conflict","email":"qa-tds-2026-05-21@vibehouse-test.dev","password":"Test@2026!"}'
# Expected: {"statusCode":409,"message":"Account exists — sign in"}

# 4. Log in with same creds on Buteak — issues NEW JWT with brand: 'BUTEAK'
curl -X POST 'https://api.thedailysocial.co.in/guest/auth/login' \
  -H 'Host: www.buteak.in' \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-tds-2026-05-21@vibehouse-test.dev","password":"Test@2026!"}'

# 5. Brand-scoped /mine — assuming this guest has 1 TDS booking, hitting /mine
#    from Host www.buteak.in returns empty; from Host www.thedailysocial.co.in
#    returns the booking.
curl 'https://api.thedailysocial.co.in/guest/booking/mine' \
  -H 'Host: www.buteak.in' \
  -H 'Authorization: Bearer <tds-jwt>'
# Should be empty (TDS JWT scoped to TDS, but query brand from Host=buteak → mismatch → 0 results)
```

---

## Open items / future asks for FE

1. **Buteak dynamic FE migration** — when Buteak FE rebuilds as a Next.js/dynamic app, add an `/auth/google/success` route that handles `?token=...&name=...` exactly like TDS's existing route. Then ping backend to flip the OAuth redirect override.
2. **Brand switcher UI** — if a guest signs in on both brands and wants visibility, we'll need a small "switch property" UI element. Not in this rollout.
3. **Notification preferences per brand** — if the same guest wants different opt-ins per brand (marketing, etc.), that needs a `guest_brand_preferences` table + UI. Tracked as a future ticket.
4. **Booking link sharing across brands** — if someone shares an ERI from TDS with a Buteak guest, the secondary-link claim flow still works (it's keyed on ERI directly, not subject to brand filter). But the linked TDS booking will only show up when the secondary guest is on the TDS frontend.

---

**Questions / issues:** ping the backend team. Most behavior is invisible — the FE team's checklist is: (a) update 409 message UI string, (b) add `?brand=` to Google OAuth URLs, (c) verify `/mine` shows the right bookings per hostname. Everything else just works.
