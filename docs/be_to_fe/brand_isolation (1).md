# Brand Isolation — Implementation Status

**Status:** Code deployed (revision 29 rolling out as of 2026-05-21). Migration applied. Verification in progress.  
**Companion plan:** [`docs/plans/brand_isolation.md`](../plans/brand_isolation.md)  
**FE handoff:** [`docs/FEtoBEHandoff/be-response-brand-isolation-2026-05-21.md`](../FEtoBEHandoff/be-response-brand-isolation-2026-05-21.md)

---

## What's live

Cross-brand data leakage is closed off. Identity stays shared (one `guests` row per email/phone), but every guest-scoped read filters by the brand the request originated from, and emails render per brand.

| Brand | Properties | Domain | Backend behavior |
|---|---|---|---|
| TDS | 60765 (Daily Social Koramangala) | www.thedailysocial.co.in | Default brand for unknown hosts; matches existing behavior |
| BUTEAK | 55402 (Buteak Suites) | www.buteak.in (currently S3 static) | New brand-scoped data + OTP branding |

---

## Changes deployed

### Schema (migration `20260521000001_properties_add_brand`)

```sql
ALTER TABLE "properties" ADD COLUMN "brand" VARCHAR(20) NOT NULL DEFAULT 'TDS';
UPDATE "properties" SET "brand" = 'BUTEAK' WHERE "id" = '55402';
ALTER TABLE "properties" ADD CONSTRAINT "properties_brand_check"
  CHECK ("brand" IN ('TDS', 'BUTEAK'));
CREATE INDEX "idx_properties_brand" ON "properties" ("brand");

-- Buteak OAuth redirect override (TDS frontend as temporary landing pad
-- until Buteak FE goes dynamic). Flip via SQL when ready.
UPDATE "properties"
SET "branding_config" = COALESCE("branding_config", '{}'::jsonb) || '{
  "oauth_redirect_url": "https://www.thedailysocial.co.in"
}'::jsonb
WHERE "id" = '55402';
```

### Backend code

**Brand resolver** ([`src/common/property-resolver.ts`](../../backend/src/common/property-resolver.ts)):
- New `Brand` type, `ALL_BRANDS`, `BRAND_TO_DEFAULT_PROPERTY` map, `HOST_TO_BRAND` map
- New `resolveBrandFromHost()` + `resolveBrandFromRequest()`
- Sibling to existing `resolvePropertyFromHost/Request` — same Host → brand mapping

**JWT carries brand** ([`src/common/guards/guest-jwt.strategy.ts`](../../backend/src/common/guards/guest-jwt.strategy.ts)):
- `GuestJwtPayload` extended with optional `brand?: Brand`
- Strategy now `passReqToCallback: true`; `validate(req, payload)` fills in `brand` from Host header if the JWT claim is missing
- Old JWTs (issued before today) keep working — brand resolved from Host on every request

**Auth callsites** ([`src/guest/auth/guest-auth.service.ts`](../../backend/src/guest/auth/guest-auth.service.ts) + [`guest-auth.controller.ts`](../../backend/src/guest/auth/guest-auth.controller.ts)):
- `signup`, `login`, `verifyTwoFa`, `sendOtp`, `verifyOtp`, `forgotPassword`, `resetPassword`, `googleLogin` all accept `Brand` parameter
- `issueToken(guest, brand)` stamps `brand` on JWT payload
- All `sendOtpEmail` callsites pass `propertyId: BRAND_TO_DEFAULT_PROPERTY[brand]` so `EmailService` renders the right branding (logo, from-address, accent color)
- `autoLinkBookings(guest, brand)` filters `ezee_booking_cache` by `properties.brand = brand` — no cross-brand contamination on signup
- 409 signup conflict message changed: `"Email already registered"` / `"Phone number already registered"` → `"Account exists — sign in"` (generic, privacy-preserving)

**Booking reads** ([`src/guest/booking/guest-booking.service.ts`](../../backend/src/guest/booking/guest-booking.service.ts) + [`guest-booking.controller.ts`](../../backend/src/guest/booking/guest-booking.controller.ts)):
- `getMyBookings(guestId, brand)` filters via `booking_guest_access.ezee_booking_cache.properties.brand`
- Controller reads `brand` from JWT (with Host fallback)

**Google OAuth** ([`src/guest/auth/guest-auth.controller.ts`](../../backend/src/guest/auth/guest-auth.controller.ts)):
- `GET /guest/auth/google` accepts `?brand=TDS|BUTEAK`, round-trips via Passport's `state` param through Google
- `/google/callback` reads `state`, stamps brand on issued JWT
- Redirect URL resolved from `properties.branding_config.oauth_redirect_url` for the brand, falls back to `process.env.FRONTEND_URL`, then `http://localhost:3000`

### Docs updated

- [`docs/api_routes/02_guest_auth.md`](../api_routes/02_guest_auth.md) — Brand scoping section in Key Concepts, OAuth `?brand=` param, OAuth state callback, signup 409 wording change
- [`docs/api_routes/07_guest_booking.md`](../api_routes/07_guest_booking.md) — `/guest/booking/mine` brand-scoped note
- [`docs/api_routes/13_multi_property.md`](../api_routes/13_multi_property.md) — added `properties.brand` column note

---

## Backward compatibility — checks performed

| Surface | Pre-rollout behavior | Post-rollout behavior | Compatible? |
|---|---|---|---|
| Existing JWTs without `brand` claim | Worked, returned all bookings cross-brand | Strategy fills in `brand` from request Host; brand-scoped reads now apply | ✅ Yes — sessions don't break, but the data they see is now correctly brand-scoped |
| API request/response shapes | n/a | Unchanged. Only the 409 message wording is different. | ✅ Yes |
| Existing `booking_guest_access` rows that link cross-brand | Returned in `getMyBookings` for both brands | Inert (filtered out at read time) | ✅ Yes — no DB cleanup needed |
| Single-brand TDS-only callers | Always returned TDS data | Still returns TDS data (default brand) | ✅ Yes |
| Google OAuth without `?brand=` param | Worked (single FRONTEND_URL) | Falls back to `resolveBrandFromRequest(req)` — usually correct | ✅ Yes — but FE should add `?brand=` for explicitness |
| Razorpay webhooks | Brand-agnostic | Unchanged — webhook still flips PENDING_PAYMENT → CONFIRMED. Brand context flows via property_id. | ✅ Yes |
| eZee reconciliation worker | Loops per-property | Unchanged — already per-property; brand is downstream | ✅ Yes |
| Admin endpoints | Use admin JWT `property_id` | Unchanged — admin layer not affected | ✅ Yes |

**Two intentional behavior changes (not "breaking" in the API sense, but visible to users):**

1. `getMyBookings` on `www.buteak.in` no longer returns TDS bookings (and vice versa). This is the goal.
2. `autoLinkBookings` no longer cross-pollinates. A guest signing up on Buteak with an email that has a TDS OTA booking won't auto-link to that TDS booking. They'll see it only if they log in on TDS.

---

## Verification (post-deploy)

**Status as of writing: deploy in progress, verification deferred until rollout completes.**

To execute once deploy is live:

```bash
# 1. Migration applied + properties.brand correctly set
psql "$AURORA_URL" -c "SELECT id, brand FROM properties ORDER BY id;"
# Expected: 60765 | TDS,  55402 | BUTEAK

# 2. Buteak signup → branded OTP from noreply@buteak.in
curl -X POST 'https://api.thedailysocial.co.in/guest/auth/signup' \
  -H 'Host: www.buteak.in' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Buteak","email":"<verified-test-email>","password":"Test@2026!"}'
# Check the test email inbox — should arrive from noreply@buteak.in with gold accent

# 3. Same email signup on TDS → 409 with new wording
curl -X POST 'https://api.thedailysocial.co.in/guest/auth/signup' \
  -H 'Host: www.thedailysocial.co.in' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"<same-email>","password":"Test@2026!"}'
# Expected: 409 {"statusCode":409,"message":"Account exists — sign in"}

# 4. JWT carries brand claim (decode base64 the middle segment)
# Sign in on Buteak, decode JWT — payload.brand should be "BUTEAK"

# 5. getMyBookings brand-scoped
# Create a Buteak booking (we already have 55402-LCL-MPDPIIW7-A8E2 in the DB).
# Sign in as that booking's guest on Buteak host → /guest/booking/mine returns it.
# Sign in same creds on TDS host → /guest/booking/mine returns only TDS bookings (empty in this case).

# 6. Google OAuth state round-trip
# Visit https://api.thedailysocial.co.in/guest/auth/google?brand=BUTEAK in a browser.
# Complete Google consent with a test Google account.
# Verify the redirect URL contains brand-correct token (decode → brand: 'BUTEAK').
# Redirect base is currently https://www.thedailysocial.co.in (Buteak's oauth_redirect_url override).
```

---

## Files modified summary

**Backend (8 files):**
- `prisma/migrations/20260521000001_properties_add_brand/migration.sql` (new)
- `prisma/schema.prisma` — added `brand` to `properties` model + `@@index([brand])`
- `src/common/property-resolver.ts` — added `Brand` type, `HOST_TO_BRAND`, `resolveBrandFromHost/Request`, `BRAND_TO_DEFAULT_PROPERTY`
- `src/common/guards/guest-jwt.strategy.ts` — added `brand` to `GuestJwtPayload`, `passReqToCallback`, host fallback in `validate`
- `src/guest/auth/guest-auth.service.ts` — brand param on 8 methods + `issueToken` + `autoLinkBookings`; 4× `sendOtpEmail` callsites pass `propertyId`; 409 wording updated
- `src/guest/auth/guest-auth.controller.ts` — all 7 auth endpoints extract brand from request; OAuth state param handling; per-brand redirect URL resolver
- `src/guest/booking/guest-booking.controller.ts` — `/mine` passes brand from JWT
- `src/guest/booking/guest-booking.service.ts` — `getMyBookings` filters by `properties.brand`

**Docs (4 files):**
- `docs/plans/brand_isolation.md` (new)
- `docs/setup/brand_isolation.md` (this file)
- `docs/FEtoBEHandoff/be-response-brand-isolation-2026-05-21.md` (new)
- `docs/api_routes/02_guest_auth.md`, `07_guest_booking.md`, `13_multi_property.md` (updated)

**No DB data cleanup needed** — pre-existing booking_guest_access rows that link cross-brand are inert because reads are now brand-filtered.

---

## Pending / follow-ups

- **Buteak dynamic FE migration** — when Buteak FE rebuilds, add `/auth/google/success` route, then flip `properties.branding_config.oauth_redirect_url` for property 55402 to `https://www.buteak.in` via a single SQL statement.
- **Paused: Razorpay test webhook E2E** (from [`docs/plans/payment_logging_enrichment.md`](../plans/payment_logging_enrichment.md)). Can resume now that brand isolation is in place.
- **Per-brand notification preferences** — `guest_brand_preferences` table for opt-ins, marketing, etc. Not in this rollout.
- **Admin cross-brand view** — owners may want "all bookings for this guest across both brands". Add a future admin endpoint with elevated scope.
- **Secondary co-guest linking across brands** — currently a guest can claim a TDS booking via ERI from any frontend; the claim succeeds but the booking is only visible when they're on TDS. Behavior intentional but worth a UX review.
