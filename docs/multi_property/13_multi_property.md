# Multi-Property Model — API Cross-Cutting Concerns

> **Base URL (prod)**: `https://api.thedailysocial.co.in`  
> **Base URL (dev)**: `http://localhost:8080`

> This document is **cross-cutting**. It applies to every property-scoped API in the platform. Each endpoint doc references this for the resolution rules.

---

## The two properties

| `property_id` | Name | Brand | Domain (current FE host) | Has smart locks | Has events / amenities / colive |
|---|---|---|---|---|---|
| `60765` | The Daily Social — Koramangala | TDS | www.thedailysocial.co.in | ✅ | ✅ |
| `55402` | Buteak Suites — BTM Layout | Buteak | www.buteak.in (static SPA for now) | ❌ | ❌ |

The string `"60765"` / `"55402"` is the property's primary key in the `properties` table. There is a CHECK constraint enforcing the convention that `properties.id ~ '^[0-9]+$'` — IDs are always the numeric eZee hotel code, never slugs.

---

## How the backend resolves `property_id`

For property-scoped endpoints, the backend resolves the active property in this priority order:

1. **Explicit `property_id` in the request** — `?property_id=` query param OR `property_id` field in the JSON body, depending on the endpoint.
2. **Admin JWT `property_id`** — for endpoints behind `AdminJwtGuard`, the admin's assigned property (if any) is used.
3. **`Host` / `X-Forwarded-Host` header** — only for public endpoints (`/public/*`), via [`src/common/property-resolver.ts`](../../backend/src/common/property-resolver.ts):
   - `www.thedailysocial.co.in` → `60765`
   - `thedailysocial.co.in` → `60765`
   - `www.buteak.in` → `55402`
   - `buteak.in` → `55402`
   - `localhost:3000` → `60765` (dev default)
   - `localhost:8080` → `60765` (dev default — backend self-call)

If none of these resolve, the endpoint returns **400 Bad Request**. There is no longer a global `DEFAULT_PROPERTY_ID` fallback.

---

## Per-property feature flags

Every property has a `branding_config.features` block in the DB:

```json
{
  "features": {
    "events":     true | false,
    "amenities":  true | false,
    "colive":     true | false,
    "smart_lock": true | false
  }
}
```

| Feature | TDS (60765) | Buteak (55402) | Effect when `false` |
|---|---|---|---|
| `events` | ✅ | ❌ | Backend still responds to `/public/events` and `/admin/events` for the property, but returns empty arrays. The FE should hide the events UI entirely. |
| `amenities` | ✅ | ❌ | No backend impact today (informational); the FE should hide amenities sections on property pages. |
| `colive` | ✅ | ❌ | Colive long-stay endpoints aren't blocked at the backend, but the FE should hide colive routes/CTAs. |
| `smart_lock` | ✅ | ❌ | No MyGate device records are seeded for the property — check-in flow won't provision PINs, falls back to manual key handoff. |

The frontend should fetch `branding_config.features` (currently available on `properties` records) and gate UI accordingly.

---

## ERI format (eZee Reservation IDs)

Every booking row in `ezee_booking_cache` has an `ezee_reservation_id` (ERI). The ERI is opaque from the FE's perspective, but its prefix encodes provenance + property:

| Format | When | Example |
|---|---|---|
| `{HOTEL_CODE}-LCL-{ts}-{rand}` | Created via our platform (guest portal) — booking is pending eZee sync via SQS | `60765-LCL-LZ4F1R-A8B2`, `55402-LCL-MA8K2C-D31F` |
| `{HOTEL_CODE}-EZEE-{reservationNo}` | Ingested from eZee (OTA, walk-in, staff entry) by the reconciliation worker every 15 min | `60765-EZEE-12345`, `55402-EZEE-67890` |
| `TDS-{CITY}-{ts}-{rand}` (legacy) | Pre-2026-05-19 platform bookings | `TDS-KORMANGALA-LZ4F1R-A8B2` |
| `EZEE-{CITY}-{reservationNo}` (legacy) | Pre-2026-05-19 OTA ingestions | `EZEE-BAN-12345` |

The backend reads and writes both formats. New bookings always use the new format. **If your code needs to detect source:**
- Externally ingested → `eri.includes('-EZEE-')`
- Locally created → `eri.includes('-LCL-')`

Do NOT pattern-match on `'TDS-'` or `EZEE-CITY-` going forward — they only match legacy rows.

---

## CORS

The API accepts requests from the following Origins:

| Origin | Purpose |
|---|---|
| `https://www.thedailysocial.co.in` | TDS prod FE |
| `https://thedailysocial.co.in` | TDS apex |
| `https://www.buteak.in` | Buteak prod FE (once dynamic) |
| `https://buteak.in` | Buteak apex |
| `https://dev.buteak.in`, `https://www.dev.buteak.in` | Buteak dev |
| `http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:3000` | Local dev |

Any other origin will be rejected by CORS preflight. Server-to-server calls (no Origin header) pass through (used by Razorpay webhooks, ECS-internal calls, curl).

`credentials: true` is set — JWT in `Authorization` header continues to work; cookies forwarded if you use `credentials: 'include'`.

---

## Transactional emails — per-brand sender + branding

Emails sent by the backend (OTP, booking confirmation, check-in PIN, OTA auto-link) are branded per-property based on `properties.branding_config`:

| Property | From address | Brand mark in header | Primary accent color |
|---|---|---|---|
| `60765` (TDS) | `The Daily Social <noreply@thedailysocial.co.in>` | TDS logo (red) | `#C62828` |
| `55402` (Buteak) | `Buteak Suites <noreply@buteak.in>` | Buteak logo (gold/teal) | `#d4a437` |

**Known gap:** signup OTP doesn't currently pass `property_id` (DTOs don't accept it yet), so signup OTPs always render with TDS branding. Add `property_id` to the 3 signup DTOs and the FE→BE call to fix. Until then, Buteak signup OTPs go out from `noreply@thedailysocial.co.in` — functional but not on-brand.

SES domain identity for `buteak.in` is verified (DKIM + SPF + DMARC published). See [`docs/plans/ses_buteak_setup.md`](../plans/ses_buteak_setup.md) for the full setup.

---

## What to do as a FE engineer

1. **Always pass `property_id`** explicitly on every call. Drop any `DEFAULT_PROPERTY_ID` fallback constants.
2. **Handle 400 gracefully** — if a property-scoped endpoint returns 400, show a property picker or redirect.
3. **Read `branding_config.features`** before rendering events / amenities / colive UI for a property.
4. **Treat ERIs as opaque** unless you specifically need source detection — then use `.includes('-EZEE-')` / `.includes('-LCL-')`.
5. **Use property branding** from `branding_config` (logo, colors, brand name, support email) when rendering brand-aware UI. Don't hardcode TDS colors.

---

## Related docs

- [`docs/setup/multi_property_rollout.md`](../setup/multi_property_rollout.md) — implementation status
- [`docs/plans/multi_property_rollout.md`](../plans/multi_property_rollout.md) — original plan
- [`docs/plans/ses_buteak_setup.md`](../plans/ses_buteak_setup.md) — SES verification for buteak.in
- [`docs/FEtoBEHandoff/be-response-multi-property-2026-05-19.md`](../FEtoBEHandoff/be-response-multi-property-2026-05-19.md) — frontend migration handoff
