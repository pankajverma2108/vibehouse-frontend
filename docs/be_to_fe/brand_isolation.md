# Brand Isolation — Same Identity, Brand-Scoped Data + Emails

## Context

Two brands (TDS, Buteak) share a single backend at `api.thedailysocial.co.in`. After the multi-property rollout (see [`multi_property_rollout.md`](multi_property_rollout.md)), property routing works via `Host` header (`www.thedailysocial.co.in → 60765`, `www.buteak.in → 55402`), but **guest data is not yet scoped by brand**. Concrete leaks identified in code:

1. **`getMyBookings`** ([`backend/src/guest/booking/guest-booking.service.ts:139`](../../backend/src/guest/booking/guest-booking.service.ts#L139)) — returns ALL bookings for `guest_id`, no brand filter. A logged-in user on buteak.in sees their TDS bookings (and vice versa).
2. **`autoLinkBookings`** ([`backend/src/guest/auth/guest-auth.service.ts:627`](../../backend/src/guest/auth/guest-auth.service.ts#L627)) — silently auto-attaches `ezee_booking_cache` rows matching email/phone across both brands at signup time. Buteak signups can inherit TDS OTA bookings.
3. **Signup / 2FA / password-reset OTP emails** — always render TDS-branded because `sendOtpEmail` callsites don't pass `propertyId`. EmailService refactor (multi-property rollout) wired the per-property branding pipe but auth callsites haven't been migrated.
4. **OAuth callback** ([`backend/src/guest/auth/guest-auth.controller.ts:116`](../../backend/src/guest/auth/guest-auth.controller.ts#L116)) — always redirects to single `FRONTEND_URL`. A Buteak Google sign-in redirects to TDS frontend.
5. **`booking_guest_access`** for SECONDARY (co-guest) flows — same leak as #1 once a guest is added to a booking.

**User requirement (clarified):**
- **One identity per email/phone** — same credentials work on either brand. `guests` table stays globally unique on email/phone. No duplicate accounts.
- **Brand-scoped data view** — when a guest is on `www.buteak.in`, they only see Buteak bookings/orders/notifications. When on `www.thedailysocial.co.in`, only TDS data.
- **Brand-scoped emails** — OTP/booking-confirmation/etc. from `noreply@buteak.in` with Buteak logo + gold when triggered from buteak.in. From `noreply@thedailysocial.co.in` with TDS logo + red when from TDS.
- A guest can legitimately have bookings on both brands tied to one identity. They're invisible to each other on the respective frontends, but joining the dots is a backend admin question, not a guest-facing one.

Intended outcome: **every guest-scoped read filters by brand; every emailed message renders in the brand of the website the request came from; no schema changes to the identity layer.**

---

## Decisions made

| Decision | Choice | Notes |
|---|---|---|
| Identity model | **Single guest row per email/phone** | `guests.email @unique`, `guests.phone @unique` stay as-is. No duplicate-per-brand accounts. |
| Brand source of truth | **`properties.brand` column** (new) | Promote the existing `branding_config.brand` JSON field to a top-level VARCHAR(20) column. Indexed for fast filter joins. Multiple properties can share a brand (future TDS locations all → `TDS`). |
| Brand carried by | **JWT claim + request context** | At login/signup the request `Host` (or `X-Forwarded-Host`) determines the brand, written to JWT. Existing requests on already-issued JWTs fall back to `Host` resolution — graceful migration. |
| Cross-brand auto-link | **Disabled** — `autoLinkBookings` only matches within current brand | A guest who signed up on buteak.in won't pull in TDS OTA bookings. If they then log in on TDS, that bonus surface area kicks in there. |
| Email branding for signup/2FA/reset | **Resolve from request host** | Auth callsites read `req.brand` → map brand → "default property for brand" → pass to `EmailService.sendOtpEmail(propertyId)`. The existing per-property branding pipe (`branding_config`) does the rest. |
| OAuth state | **Carry brand in Passport state param** | When FE initiates `/guest/auth/google?brand=BUTEAK`, the state is round-tripped through Google and read in the callback to pick the redirect URL + brand for the JWT. |
| Pre-existing data | **Default `brand='TDS'`** for backfill | All current properties/JWTs/sessions assume TDS. The 55402 property row gets `brand='BUTEAK'`. |
| Existing in-flight JWTs | **Fallback to host-resolved brand** | JWTs issued before this change won't have `brand` claim. Middleware reads request Host → resolves brand → uses that. So existing sessions don't break. |

---

## Schema changes

**Single migration:** `backend/prisma/migrations/<TS>_properties_add_brand/migration.sql`

```sql
-- Promote brand from branding_config JSON to a top-level column.
-- Indexed so queries like "all TDS bookings" don't pay a JSON-scan cost.
ALTER TABLE "properties" ADD COLUMN "brand" VARCHAR(20) NOT NULL DEFAULT 'TDS';

-- Backfill: 60765 → TDS (covered by default), 55402 → BUTEAK
UPDATE "properties" SET "brand" = 'BUTEAK' WHERE "id" = '55402';

-- Constraint: brand must be a known value. Enum-like via CHECK (small set,
-- easy to extend with another migration if/when a 3rd brand arrives).
ALTER TABLE "properties"
  ADD CONSTRAINT "properties_brand_check"
  CHECK ("brand" IN ('TDS', 'BUTEAK'));

CREATE INDEX "idx_properties_brand" ON "properties" ("brand");
```

**Schema.prisma:** add `brand String @default("TDS") @db.VarChar(20)` to the `properties` model.

No changes to `guests`, `auth_providers`, `ezee_booking_cache`, `payments`, or any other table — brand is always resolved via the `properties` row.

---

## Backend changes

### 1. Brand resolver (extend the existing property-resolver)

**File:** [`backend/src/common/property-resolver.ts`](../../backend/src/common/property-resolver.ts) — already maps Host → property_id. Extend to also expose `Host → brand`.

```typescript
const HOST_TO_BRAND: Record<string, 'TDS' | 'BUTEAK'> = {
  'www.thedailysocial.co.in': 'TDS',
  'thedailysocial.co.in':     'TDS',
  'www.buteak.in':            'BUTEAK',
  'buteak.in':                'BUTEAK',
  'dev.buteak.in':            'BUTEAK',
  'www.dev.buteak.in':        'BUTEAK',
  'localhost:3000':           'TDS', // dev default
  'localhost:3001':           'TDS',
};

export function resolveBrandFromRequest(req: Request): 'TDS' | 'BUTEAK' {
  const xfh = req.headers['x-forwarded-host'];
  const host = (Array.isArray(xfh) ? xfh[0] : xfh) ?? req.headers.host ?? '';
  return HOST_TO_BRAND[host.toLowerCase().split(',')[0].trim()] ?? 'TDS';
}
```

### 2. JWT claim

**File:** [`backend/src/common/guards/guest-jwt.strategy.ts`](../../backend/src/common/guards/guest-jwt.strategy.ts) — extend `GuestJwtPayload`:

```typescript
export interface GuestJwtPayload {
  guest_id: string;
  email: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  brand?: 'TDS' | 'BUTEAK';  // NEW — optional for back-compat with in-flight JWTs
}
```

**Brand resolution at request time** (auth guard or middleware): if `payload.brand` exists use it; else fall back to `resolveBrandFromRequest(req)` and stick on `req.brand`. This way old JWTs keep working — they pick up the brand from Host instead.

### 3. Auth callsites — write `brand` into JWT on issue

**Files:**
- `backend/src/guest/auth/guest-auth.service.ts` — `signup()`, `login()`, `verifyOtp()`, `googleLogin()`, `resetPassword()` — each issues a JWT. Read `brand` from `req` (passed through controller) and include in payload.
- `backend/src/guest/auth/guest-auth.controller.ts` — pass `req` through to service methods (or extract brand at controller layer and pass).

### 4. Email service — resolve brand from request at OTP send time

**Files:**
- `backend/src/guest/auth/guest-auth.service.ts` — 4 `sendOtpEmail` callsites (lines 96, 216, 309, 422). Each takes a `brand` (passed from controller via `req`). Map `brand → default property for that brand` and pass as `propertyId`:

```typescript
private static BRAND_TO_DEFAULT_PROPERTY: Record<'TDS' | 'BUTEAK', string> = {
  TDS: '60765',
  BUTEAK: '55402',
};

await this.emailService.sendOtpEmail({
  toEmail: dto.email,
  toName: dto.name,
  otp,
  expiresAt,
  propertyId: GuestAuthService.BRAND_TO_DEFAULT_PROPERTY[brand],
});
```

The existing `EmailService.getBranding(propertyId)` (built in the multi-property rollout) already reads `branding_config` and produces brand-specific from-address, logo, colors. No EmailService change needed.

### 5. `getMyBookings` — filter by brand

**File:** `backend/src/guest/booking/guest-booking.service.ts:139`

```typescript
async getMyBookings(guestId: string, brand: 'TDS' | 'BUTEAK') {
  const accesses = await this.prisma.booking_guest_access.findMany({
    where: {
      guest_id: guestId,
      status: 'APPROVED',
      ezee_booking_cache: {
        properties: { brand },  // ← brand filter via relation
      },
    },
    include: { ezee_booking_cache: { include: { properties: true } } },
    orderBy: { created_at: 'desc' },
  });
  // ... rest unchanged
}
```

Controller pulls `brand` from the JWT (or fall back to req.brand).

### 6. `autoLinkBookings` — scope by brand

**File:** `backend/src/guest/auth/guest-auth.service.ts:627`

```typescript
private async autoLinkBookings(
  guest: { id: string; name: string | null; email: string | null; phone: string | null },
  brand: 'TDS' | 'BUTEAK',
): Promise<void> {
  // ... existing match logic, but extend where clause:
  const matchingBookings = await this.prisma.ezee_booking_cache.findMany({
    where: {
      OR: conditions,
      is_active: true,
      properties: { brand },   // ← brand filter
    },
    // ...
  });
}
```

Note: if the same guest signs up on TDS first, then later visits Buteak frontend with no Buteak bookings, autoLinkBookings will run again at next login from buteak.in and pick up any Buteak OTA bookings.

### 7. OAuth — carry brand via Passport state

**Files:**
- `backend/src/guest/auth/google.strategy.ts` — enable `state: true` (Passport will round-trip arbitrary state through Google). At init time, set state to encoded `{ brand }`.
- `backend/src/guest/auth/guest-auth.controller.ts` — at `/google/callback`, read `req.query.state`, decode brand, use it to (a) include in issued JWT, (b) pick the right `frontendUrl` (look up via `properties.branding_config.domain` for the matching brand).

Backward-compat: if state is missing (old session), default to TDS as before.

### 8. Cross-cutting Prisma guard (belt & suspenders)

Optional but recommended: wrap brand-scoped reads in a small service that ALWAYS injects the brand filter so future endpoints can't forget. Could be a small mixin or a Prisma extension. Lower priority — start with explicit filters in known endpoints, add the wrapper later if we see drift.

---

## Frontend changes (handoff to FE team)

Most of the change is invisible to FE because brand is resolved server-side from Host. Concrete asks:

1. **Google OAuth init URL** — when initiating Google sign-in, append `?brand=BUTEAK` or `?brand=TDS` query param so backend can stash it in state.
   ```
   <a href="https://api.thedailysocial.co.in/guest/auth/google?brand=BUTEAK">Sign in with Google</a>
   ```

2. **JWT semantics changed** — JWTs are now brand-scoped. A token issued on TDS cannot see Buteak data and vice versa. The FE doesn't need to change anything, but is worth knowing for support / debug.

3. **Same-email-conflict UX** — currently signup returns 409 `"Email already registered"`. After this change, since identity is shared across brands, a user signing up on buteak.in with an email that already exists in TDS will still get 409. Recommended copy: "An account with this email already exists. Sign in to access your bookings."

4. **`GET /guest/booking/my-bookings`** — now brand-scoped. A user with both TDS and Buteak bookings will see only one set per request, depending on which brand they're logged into. No FE code change needed.

5. **No new query params** — FE does NOT need to pass `brand` on every API call. The backend reads it from the JWT and/or Host header.

---

## Backward-compatibility checklist

| Concern | Impact | Mitigation |
|---|---|---|
| In-flight JWTs (no `brand` claim) | Existing sessions on prod | Middleware falls back to `resolveBrandFromRequest(req)` when JWT has no brand. No re-login forced. |
| Existing `getMyBookings` callers | FE expecting all-brands list | The shift is INTENTIONAL — FE on buteak.in seeing only Buteak bookings is the goal. Doc the change for FE team. |
| `autoLinkBookings` for existing guests | A user who has both TDS + Buteak OTA bookings would have had both auto-linked previously | After change, they only see the brand they're currently logged into. Acceptable; matches product intent. |
| OAuth callback URL | Was hardcoded to TDS frontend | After change, redirects to brand's frontend. Buteak frontend doesn't exist yet (still static S3) — for now, if `brand=BUTEAK` and no buteak.in dynamic FE, fall back to `?frontend=` query override or default to TDS with a warning log. |
| Existing emails | Currently all TDS branded | After change, signup OTP from buteak.in goes via `noreply@buteak.in` + Buteak gold. Backward-compatible: TDS signups still get TDS branding. |
| Properties without `brand` column | DB migration must run first | Migration is `ADD COLUMN ... DEFAULT 'TDS'` — safe additive change. |
| Razorpay webhooks in flight | Webhook handler doesn't reference brand directly | No change — webhook still flips PENDING_PAYMENT → CONFIRMED, fires SQS. Brand context flows through the property_id chain. |
| `payments.property_id` (just added) | Already brand-aware via JOIN to properties | No change. |

**Two non-backward-compatible behaviors (intentional):**

- A guest logged in on Buteak who previously could see TDS bookings on the same frontend → will no longer see them. They have to log in on TDS to see TDS bookings.
- `autoLinkBookings` is now brand-scoped. An OTA booking made under TDS won't auto-attach to a Buteak guest with the same email.

These are the desired product behaviors. The FE handoff doc should call them out.

---

## Verification plan

1. **Migration applied** — confirm `properties.brand` column exists and `55402 → BUTEAK`, `60765 → TDS`.
2. **Brand resolver** — local test: `curl -H 'Host: www.buteak.in' http://localhost:8080/guest/booking/lookup?booking_id=...` returns Buteak-only result.
3. **JWT carries brand** — sign up via curl with `Host: www.buteak.in`, decode the returned JWT, verify `brand: 'BUTEAK'`.
4. **`getMyBookings` brand-scoped** — create a guest with one TDS booking and one Buteak booking. Hit `/guest/booking/my-bookings` from each brand's host header — only the matching brand's booking appears.
5. **OTP email brand** — trigger signup OTP from buteak.in (real or curl with Host header). Inspect resulting email: from `noreply@buteak.in`, Buteak logo, gold accent.
6. **`autoLinkBookings` isolation** — manually create a TDS `ezee_booking_cache` row with `booker_email='test@buteak.dev'`. Sign up that email on buteak.in. Verify the TDS booking is NOT linked to the new guest.
7. **OAuth state round-trip** — initiate `/guest/auth/google?brand=BUTEAK`, complete the flow with a test Google account, verify callback redirects to `https://www.buteak.in/auth/google/success?token=...` and the issued JWT has `brand: 'BUTEAK'`.
8. **Back-compat for existing JWTs** — take an existing TDS guest JWT (issued before this change), call `/guest/booking/my-bookings` with `Host: www.thedailysocial.co.in` — should still work, brand resolved from host.
9. **No regression on TDS bookings** — re-run the previous Buteak E2E flow against `Host: www.thedailysocial.co.in` to confirm TDS path unchanged.

---

## Files modified summary (~7 files + 1 migration)

**New:**
- `backend/prisma/migrations/<TS>_properties_add_brand/migration.sql`

**Modified:**
- `backend/prisma/schema.prisma` — add `brand` to `properties`
- `backend/src/common/property-resolver.ts` — add `resolveBrandFromRequest()`
- `backend/src/common/guards/guest-jwt.strategy.ts` — add `brand` to `GuestJwtPayload`; fallback to host
- `backend/src/guest/auth/guest-auth.service.ts` — issue JWTs with brand; scope `autoLinkBookings` by brand; pass propertyId on OTP sends
- `backend/src/guest/auth/guest-auth.controller.ts` — thread brand from request to service methods; OAuth state handling
- `backend/src/guest/auth/google.strategy.ts` — enable `state: true` for OAuth state param
- `backend/src/guest/booking/guest-booking.service.ts` — `getMyBookings` filter by brand

**Docs:**
- `docs/setup/brand_isolation.md` — implementation log after deploy
- `docs/FEtoBEHandoff/be-response-brand-isolation-<date>.md` — FE handoff (JWT semantics, OAuth, signup UX)
- `docs/api_routes/*` — update any docs where brand-scoping changes behavior (mainly `02_guest_auth.md`, `07_guest_booking.md`)

---

## Out of scope (defer)

- **Per-brand notification preferences** — opt-ins, marketing consent, etc. Would need `guest_brand_preferences` table.
- **Admin UI for cross-brand guest** — admins might want to see "all bookings for this guest" across brands. Add an admin endpoint with elevated scope later.
- **Email opt-outs per brand** — same person opts out of marketing on TDS but not Buteak. Future work.
- **Brand-specific phone validation rules** — currently global. Probably fine indefinitely.
- **Stay extension flow** — already brand-scoped via the booking it extends. No new work.

---

## Resolved decisions (from user 2026-05-21)

1. **Buteak OAuth callback target** — Buteak FE is still static S3 with no `/auth/google/success` handler. **Decision:** redirect to TDS frontend (`https://www.thedailysocial.co.in/auth/google/success?...`) as the prod fallback until Buteak FE migrates to a dynamic stack. For local dev, the developer can override via the existing `FRONTEND_URL` env var (e.g., `http://localhost:3000` or `http://localhost:8080`). Implementation: read `branding_config.oauth_redirect_url` if present, else fall back to TDS prod URL. Update the Buteak `branding_config` migration to set this explicitly so the override is data-driven and we can flip it without a code change when Buteak FE is ready.

2. **Same-email-different-brand 409 message** — Decision: generic "Account exists — sign in." Do NOT reveal which brand they originally signed up on. The existing 409 from `Email already registered` stays; just wording tweak.

3. **Backfill of historical `booking_guest_access` rows** — Decision: **leave existing data alone.** The leak is contained at the read layer (`getMyBookings` filters by brand via the `properties` join); old rows in the DB are inert because they never surface on the wrong brand's frontend.
