# BE Response — Room Availability Handoff

Date: 2026-04-13
Responding to: `docs/FEtoBEHandoff/backend-handoff-room-availability-2026-04-13.md`
Owner: Backend

---

## TL;DR

Two separate bugs were confirmed and fixed. One is on the frontend (wrong property_id string), one is in the backend DB state (duplicate room types). Both are resolved.

---

## Root Causes

### Bug 1 — Wrong `property_id` string (FE-side)

The frontend was calling `property_id=tds-koramangala-a`. That ID does not exist in our database. Our canonical property IDs are **eZee hotel codes** (e.g. `60765`). The `tds-*` format was never valid on the backend.

With an unknown property_id the service returns 404. This accounts for the "8-room mixed namespace" response — it was coming from a different environment or an older cached response before the 404 was wired up.

**FE action**: Replace `tds-koramangala-a` with `60765` in all API calls.

### Bug 2 — Duplicate room types in DB (BE-side, now fixed)

After the property ID rename migration (`20260413000000`), property `60765` ended up with **two overlapping sets** of active room types:

| ID | Slug | Source | eZee IDs |
|---|---|---|---|
| `rt-queen` | `queen-size-room` | base seed (legacy) | **null** |
| `rt-4dorm` | `4-bed-mixed-dorm` | base seed (legacy) | **null** |
| `rt-6dorm` | `6-bed-mixed-dorm` | base seed (legacy) | **null** |
| `rt-ka-queen` | `queen-size-room` | seed-tds (current) | to be filled |
| `rt-ka-4dorm` | `4-bed-mixed-dorm` | seed-tds (current) | to be filled |
| `rt-ka-6dorm` | `6-bed-mixed-dorm` | seed-tds (current) | to be filled |

Same slugs, same property → duplicate cards and React key warnings.

Additionally, the legacy `rt-*` types have `null` for all eZee IDs (`ezee_room_type_id`, `ezee_rate_plan_id`, `ezee_rate_type_id`), meaning any booking attempt against them would fail at the eZee sync step. They were never bookable.

**Fix applied** (`migration 20260413000001_deactivate_legacy_room_type_ids`):

```sql
UPDATE "room_types"
   SET "is_active" = false
 WHERE "id" IN ('rt-queen', 'rt-4dorm', 'rt-6dorm');
```

After this migration, `GET /guest/booking/rooms?property_id=60765` returns exactly **3 room types**:
- `rt-ka-queen` / `queen-size-room`
- `rt-ka-4dorm` / `4-bed-mixed-dorm`
- `rt-ka-6dorm` / `6-bed-mixed-dorm`

No duplicate slugs. No cross-namespace mixing.

---

## Canonical Property IDs

| Property | `property_id` to use |
|---|---|
| The Daily Social — Koramangala A | `60765` |

Koramangala B has no eZee hotel code yet — it will be added as a separate property when the eZee account is configured. Do not construct a KB property_id on the frontend yet.

---

## Answers to Open Questions

### Q1 — Is slug guaranteed unique per property?

Not by DB constraint today, but **guaranteed unique in practice** after the fix migration above. We are adding a DB-level unique constraint on `(property_id, slug)` in the next migration.

Until then: use `id` as your canonical unique key, not `slug`.

### Q2 — Which field is canonical: `id` or `slug`?

**`id` is canonical.** Always.

| Field | Use for |
|---|---|
| `id` | React key, deduplication, `room_type_id` in `create-order` |
| `slug` | URL segments and display labels only — never as a key |

### Q3 — Should `tds-koramangala-a` return one namespace?

`tds-koramangala-a` is not a valid property_id. The backend returns `404 Not Found` for it.

Use `60765`. With the fix migration applied, `60765` returns exactly 3 room types, all in the `rt-ka-*` namespace.

### Q4 — Final `inventory_state` enum values?

Exactly three values. This is a closed enum — no others will ever be returned.

| Value | Condition | `available_beds` |
|---|---|---|
| `"available"` | Normal, bookable | ≥ 3 |
| `"limited"` | Urgency signal | 1 or 2 |
| `"sold_out"` | Fully booked | 0 |

Safe to exhaustive-switch on these three.

### Q5 — `create-order` contract: does FE need to send `ezee_*` IDs?

**No.** Frontend sends only `room_type_id` (the internal DB `id`). The backend resolves all `ezee_*` IDs itself from the DB.

Minimal valid request body:

```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-20",
  "checkout_date": "2026-04-21",
  "rooms": [
    { "room_type_id": "rt-ka-4dorm", "quantity": 1 }
  ],
  "addons": []
}
```

The `ezee_room_type_id`, `ezee_rate_plan_id`, `ezee_rate_type_id` fields that appear in `/availability` responses are informational only — ignore them on the frontend.

### Q6 — Canonical `property_id` format long-term?

**eZee hotel codes** — numeric strings like `60765`. The old `prop-*` format is retired.

Do not hardcode property IDs on the frontend. Once we add `GET /properties`, read the `id` field from that response. Until then, `60765` is the only active property.

### Q7 — Degraded fallback flag?

**Already implemented.** The `/availability` response includes `availability_source`:

```json
{
  "property_id": "60765",
  "availability_source": "ezee_live",
  "room_types": [...]
}
```

| `availability_source` | Meaning | FE action |
|---|---|---|
| `"ezee_live"` | Counts + rates from eZee in real time | Normal checkout flow |
| `"local_db_estimate"` | eZee unreachable — DB estimate used | Show warning, **block checkout** |

Suggested banner when `local_db_estimate`:
> *"Live availability is temporarily unavailable. Please retry before completing your booking."*

Disable the Book / Checkout CTA. Do not cache a degraded response locally.

The `/rooms` catalog endpoint does **not** carry `availability_source` — it is date-independent so eZee degradation does not apply.

---

## Latency — Expected Ranges

| Response time | Cause |
|---|---|
| ~100–200 ms | Redis cache hit |
| ~1–6 s | Cache miss → eZee API round-trip |

This is by design. Catalog (`/rooms`) TTL is 60 min, availability (`/availability`) is 30 min per `(property_id, checkin, checkout)` tuple.

**Recommended FE pattern**: Call `/rooms` on page mount — catalog warms once and stays fast. Call `/availability` only after the user confirms dates, with a loading state on the availability overlay (not on the room cards themselves).

---

## Summary Action Items

| # | Owner | Action | Status |
|---|---|---|---|
| 1 | **FE** | Replace `tds-koramangala-a` → `60765` in all API calls | Pending FE |
| 2 | **FE** | Use `id` (not `slug`) as React key and for `room_type_id` in `create-order` | Pending FE |
| 3 | **FE** | Read `availability_source` from `/availability`; block checkout on `local_db_estimate` | Pending FE |
| 4 | **FE** | Call `/rooms` on mount, overlay `/availability` only after date selection | Pending FE |
| 5 | **BE** | Deactivate legacy `rt-queen/rt-4dorm/rt-6dorm` room types (duplicate slugs) | ✅ Done — migration `20260413000001` |
| 6 | **BE** | Add `(property_id, slug)` unique constraint to `room_types` | Pending — next migration window |
| 7 | **BE** | Add `GET /properties` endpoint for canonical ID discovery | Pending — backlog |
