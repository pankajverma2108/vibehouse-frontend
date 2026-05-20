# Multi-Property Migration — Frontend Handoff

**Date:** 2026-05-19  
**Backend commit:** [`092d9d9`](https://github.com/Emagicor/Vibehouse_backend/commit/092d9d9) on `Vibehouse_backend@main` — **already live in prod**  
**Companion docs:**
- [`docs/setup/multi_property_rollout.md`](../setup/multi_property_rollout.md) — full implementation log
- [`docs/plans/multi_property_rollout.md`](../plans/multi_property_rollout.md) — original plan
- [`docs/plans/ses_buteak_setup.md`](../plans/ses_buteak_setup.md) — SES verification for buteak.in

---

## TL;DR for frontend devs

The backend now supports **two live properties**:

| Property | `property_id` | Brand | Domain (current) |
|---|---|---|---|
| The Daily Social — Koramangala | `"60765"` | TDS | www.thedailysocial.co.in |
| Buteak Suites — BTM Layout | `"55402"` | Buteak | www.buteak.in (still S3 static for now) |

**The big change:** the backend used to silently default to property `60765` whenever `property_id` was missing. **That fallback is gone.** Any admin or public endpoint that needs a property will now return **HTTP 400** if it can't resolve one. You have to pass it explicitly.

There are **3 ways** the backend resolves the property, in priority order:

1. **Explicit `property_id` in the request** (query param or body field)
2. **Admin's JWT `property_id`** (for endpoints called by logged-in staff)
3. **`Host` / `X-Forwarded-Host` header** (only for public endpoints) — `www.thedailysocial.co.in` → `60765`, `www.buteak.in` → `55402`

If none of these resolve, you get a `400`.

---

## 1. Second property details — Buteak Suites

```json
{
  "id": "55402",
  "name": "Buteak Suites",
  "address": "BTM Layout, Bangalore, Karnataka",
  "city": "Bangalore",
  "branding_config": {
    "brand": "buteak",
    "brand_name": "Buteak Suites",
    "domain": "www.buteak.in",
    "primary_color_hex": "#d4a437",
    "secondary_color_hex": "#0b3c49",
    "accent_color_hex": "#ffffff",
    "logo_url": "/brands/buteak/logo.svg",
    "support_email": "noreply@buteak.in",
    "features": {
      "events": false,
      "amenities": false,
      "colive": false,
      "smart_lock": false
    }
  }
}
```

**What Buteak does NOT have for v1:**
- ❌ Events (no event listings)
- ❌ Amenities pages (the property page should hide amenities section for Buteak)
- ❌ Colive long-stay (the long-stay search/quote flow should be hidden)
- ❌ Smart locks (no MyGate PIN provisioning — check-in flow falls back to manual)

**What Buteak DOES have:**
- ✅ Short-stay bookings via eZee
- ✅ Guest signup / OTP / sign-in
- ✅ Booking confirmation + OTA auto-link emails (now branded with `noreply@buteak.in` + gold accent)
- ✅ Room availability + booking flow (room data comes from eZee live since `room_types` isn't seeded yet — response has `source: "ezee_only"`)
- ✅ Property listing on `GET /admin/properties` and other property-aware endpoints

Both properties read `branding_config` from the database — the FE should fetch this when rendering a property page and use it to drive theming + feature visibility.

---

## 2. Critical endpoint changes

### 2.1 `GET /public/events` — property_id now required

**Before:** silently used `DEFAULT_PROPERTY_ID=60765` if `property_id` was missing.  
**After:** returns `400 Bad Request` if neither `?property_id=` query nor a recognized `Host` header is present.

**Example:**
```http
GET /public/events?property_id=60765           ✅ 200 OK
GET /public/events?property_id=55402           ✅ 200 OK (empty list — events flag off)
GET /public/events                             ❌ 400 if Host doesn't match
GET /public/events  (Host: www.buteak.in)      ✅ 200 OK — resolves to 55402
```

**FE action:** always include `?property_id=...` in this call. If the FE knows its property from URL/session, pass it explicitly — don't rely on Host.

### 2.2 `POST /admin/events` — property_id auto-resolved from admin JWT, optional override in body

**Before:** if admin had no `property_id`, fell back to default 60765.  
**After:** if admin has no `property_id`, the request body must include `property_id`. Otherwise `400`.

**New optional body field:**
```json
{
  "title": "Saturday DJ Night",
  "date": "2026-06-01",
  "property_id": "55402"        // NEW — required only if admin has no property assigned
}
```

`property_id` must match `^[0-9]+$` (numeric eZee hotel code).

### 2.3 `GET /admin/events` — same

The admin's JWT `property_id` must be set. Owner-role admins (without a property assigned) will now need to specify property — currently this means hitting the endpoint from a property-assigned admin account. If the FE supports multi-property admins, a `?property_id=` filter param should be added (the backend already filters internally).

### 2.4 Admin Inventory endpoints — property_id required

Affected endpoints (all 3 dropped `DEFAULT_PROPERTY_ID` fallback — now throw 400 if admin has no property assigned):
- `GET /admin/inventory/returnable` — list returnable inventory
- `GET /admin/inventory/returnable/:productId/forecast` — daily forecast
- `POST /admin/inventory/returnable/:productId/issue` — issue an item

**Backend behaviour:** uses `actor.property_id` from JWT. No body change needed. **But:** if a multi-property admin tries to call these without a property assigned, returns `400`. For now: keep one admin = one property.

---

## 3. ERI format changed for new bookings

**Old format** (still valid for existing rows — backend handles both):
- Locally-created: `TDS-{CITY}-{ts}-{rand}` e.g. `TDS-KORMANGALA-LZ4F1R-A8B2`
- Externally ingested: `EZEE-{CITY}-{resNo}` e.g. `EZEE-BAN-12345`

**New format** (used for any booking created after the deploy):
- Locally-created: `{HOTEL_CODE}-LCL-{ts}-{rand}` e.g. `60765-LCL-LZ4F1R-A8B2` or `55402-LCL-...`
- Externally ingested: `{HOTEL_CODE}-EZEE-{resNo}` e.g. `60765-EZEE-12345` or `55402-EZEE-67890`

**FE impact:**
- ✅ **No change needed** if your code treats `ezee_reservation_id` as an opaque string and just uses it as a lookup key.
- ⚠️ **Action needed** if your code parses the ERI to extract the source (e.g. "starts with TDS-" or "contains EZEE-"). Use the new conventions:
  - `eri.includes('-EZEE-')` → externally ingested (OTA / staff in eZee)
  - `eri.includes('-LCL-')` → created via our platform
- ⚠️ **Action needed** if your UI displays the ERI to users and expects a specific format (e.g. "TDS-..." badge). The leading segment is now the eZee hotel code (`60765` / `55402`) — fine to display, just less brandy.

Existing bookings in the DB still have the old format and continue to work.

---

## 4. CORS allowlist

CORS is no longer `*`. Allowed origins:

| Origin | Purpose |
|---|---|
| `https://www.thedailysocial.co.in` | TDS prod |
| `https://thedailysocial.co.in` | TDS apex |
| `https://www.buteak.in` | Buteak prod (once FE is dynamic) |
| `https://buteak.in` | Buteak apex |
| `https://dev.buteak.in` | Buteak dev |
| `https://www.dev.buteak.in` | Buteak dev www |
| `http://localhost:3000` | Local dev |
| `http://localhost:3001` | Local dev (alt port) |
| `http://127.0.0.1:3000` | Local dev (alt host) |

Requests from any other origin will fail CORS preflight. Server-to-server calls (no Origin header — curl, webhooks, ECS-internal) still pass through.

**Credentials:** `credentials: true` is set, so if you ever use `fetch(..., { credentials: 'include' })`, cookies/auth headers will be forwarded. JWT is still in `Authorization` header — no change.

**If you need a new origin added** (e.g., Storybook on a custom port, a partner integration): update [`backend/src/main.ts`](../../backend/src/main.ts) `allowedOrigins` and redeploy.

---

## 5. Per-property branding in emails

Backend now sends all transactional emails with per-property branding driven by `properties.branding_config`. **No FE change needed** — informational only:

| Email type | Sender | Branding |
|---|---|---|
| Booking confirmation (Buteak) | `Buteak Suites <noreply@buteak.in>` | Gold (`#d4a437`) accents, Buteak logo |
| Booking confirmation (TDS) | `The Daily Social <noreply@thedailysocial.co.in>` | Red (`#C62828`) accents, TDS logo |
| Check-in PIN (Buteak) | `Buteak Suites <noreply@buteak.in>` | Buteak branding | _but Buteak has no smart locks, so this won't trigger_ |
| OTA booking auto-link | matches the booking's property | matches the booking's property |
| **Signup OTP** | currently always `The Daily Social <noreply@thedailysocial.co.in>` regardless of brand | TDS branding |

**Known limitation:** Signup OTP doesn't pick up the Buteak brand yet. To fix this, the signup endpoints need to accept a `property_id` field (FE→BE handoff for a future ticket). For now, even a guest signing up from Buteak's site will get a TDS-branded verification email. Functional but not ideal.

If you want to be proactive: when you wire up the new Buteak FE, send `property_id: "55402"` in the body of:
- `POST /guest/auth/signup`
- `POST /guest/auth/2fa/request`
- `POST /guest/auth/password-reset/request`

The backend will reject this field today (DTO whitelist is strict) — wait for the backend to accept it before pushing FE changes here.

---

## 6. Recommendations for FE code

### 6.1 Always pass `property_id`

If your codebase has a `getDefaultPropertyId()` helper or a `DEFAULT_PROPERTY_ID = "60765"` constant — that's now a latent bug for any future multi-property FE work. Best practice going forward:

```ts
// Bad — backend may reject this
fetch(`/api/public/events`)

// Good — explicit
fetch(`/api/public/events?property_id=${propertyId}`)
```

Get `propertyId` from one of:
- URL search param: `searchParams.get('property_id')`
- Brand-aware route: `/property/[id]/...`
- Hostname when SSR: `headers().get('host')` → mapped
- Guest's selected property in session

### 6.2 Handle `property_not_found` / `400` gracefully

If your code calls these endpoints and `property_id` is missing or invalid, expect:
```json
{
  "statusCode": 400,
  "message": "property_id is required (or call from a known host)"
}
```

Show a friendly error: "Please select a property to continue" or redirect to a property picker.

### 6.3 Respect feature flags

When rendering a Buteak property page, hide:
- Events section / route
- Amenities listing
- Colive long-stay search
- Smart lock / check-in PIN info

Read these from `branding_config.features` on the property record (fetched via `GET /admin/properties` or a future `GET /public/properties/:id`).

Pseudo-code:
```tsx
const { features } = useBranding(propertyId);
{features.events && <EventsLink />}
{features.amenities && <AmenitiesSection />}
{features.colive && <ColiveCTA />}
```

### 6.4 Lock UI to property-specific branding (when migrating Buteak FE)

When you re-implement the Buteak FE as a dynamic app:
- Read `branding_config` for the active property at render time
- Apply `primary_color_hex` / `secondary_color_hex` / `accent_color_hex` as CSS custom properties
- Use `logo_url` for the brand mark
- Use `brand_name` in titles, copy, footer
- Use `support_email` in "contact us" links
- Set `<title>` and OG metadata from `brand_name`

---

## 7. What's NOT changing on the backend right now

For clarity on what FE does NOT need to worry about:

- **OAuth callback URLs** — both properties currently share TDS's OAuth callback. When Buteak FE goes dynamic, we'll either (a) carry `property_id` via OAuth `state` param, or (b) add per-property `FRONTEND_URL` in `branding_config.domain`. Either is a backend-side change.
- **Razorpay webhook URL** — single URL for both properties. Backend resolves property from booking context.
- **Razorpay key/secret** — single account for both properties for v1.
- **MyGate** — not used by Buteak. TDS-only.
- **Zoho Desk** — not yet wired up; will follow same per-property pattern when added.
- **Auto-linking OTA bookings to guests by email** — already works across both properties. When a guest signs up with their email/phone, the backend's `autoLinkBookings()` matches any `ezee_booking_cache` row where `booker_email` or `booker_phone` matches, regardless of which property the booking is from. The 15-min reconciliation worker keeps the cache populated from eZee.

---

## 8. Smoke tests for FE

After integrating, verify with these calls (replace tokens):

```bash
# 1. TDS list events (should return real events)
curl 'https://api.thedailysocial.co.in/public/events?property_id=60765&filter=upcoming'

# 2. Buteak list events (should return empty array — features.events=false but endpoint still responds)
curl 'https://api.thedailysocial.co.in/public/events?property_id=55402'

# 3. Missing property_id (should 400 unless Host matches a known domain)
curl 'https://api.thedailysocial.co.in/public/events'

# 4. Room catalog for Buteak (eZee fallback active)
curl 'https://api.thedailysocial.co.in/guest/booking/rooms?property_id=55402'
# Expect: { "source": "ezee_only", "property_id": "55402", "room_types": [...] }

# 5. CORS preflight from Buteak origin
curl -X OPTIONS 'https://api.thedailysocial.co.in/public/events' \
  -H 'Origin: https://www.buteak.in' \
  -H 'Access-Control-Request-Method: GET' -i | grep -i access-control
# Expect: Access-Control-Allow-Origin: https://www.buteak.in
```

---

## 9. Open questions for FE team

When you start the Buteak FE rebuild, please confirm so we can prep the backend:

1. **Where will Buteak FE be hosted?** ECS (same pattern as TDS) or EC2?
2. **Will `buteak.in` DNS point at our infra (CloudFront → ALB), or stay external?** This affects whether we need to spin up the CloudFront distribution that's currently inert.
3. **Per-property signup OTP** — do you want this implemented when you wire up signup on Buteak FE? (Requires adding `property_id` to 3 signup DTOs on backend.)
4. **OAuth redirect** — should Buteak signins redirect back to `www.buteak.in/auth/google/success` or stay on TDS for now?
5. **Direct-from-eZee booking lookup** — currently OTA bookings show up in our cache within 15 min of the reconciliation worker run. Want an "instant" lookup endpoint that queries eZee live by email at signup time, for new OTA guests? (Backend doesn't have this yet; it's a possible new feature.)

---

## 10. Backend stubs you can use today

```typescript
// Property IDs
const PROPERTIES = {
  TDS:    "60765",
  BUTEAK: "55402",
} as const;

// Brand colors (fetched from properties.branding_config at runtime, but for quick reference)
const BRANDS = {
  "60765": { name: "The Daily Social", primary: "#C62828", logo: "https://www.thedailysocial.co.in/brands/tds/logo.png" },
  "55402": { name: "Buteak Suites",    primary: "#d4a437", logo: "https://www.thedailysocial.co.in/brands/buteak/logo.svg" },
} as const;

// Hostname mapping (must match backend's property-resolver.ts)
const HOST_TO_PROPERTY: Record<string, string> = {
  "www.thedailysocial.co.in": "60765",
  "thedailysocial.co.in":     "60765",
  "www.buteak.in":            "55402",
  "buteak.in":                "55402",
};
```

---

**Questions / issues:** ping the backend team. Backend log group `/ecs/tds-backend` in CloudWatch shows the per-property reconciliation logs (search for `brand=Buteak Suites` to see Buteak-only emails being sent).
