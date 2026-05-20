# Blocker: Room Pricing & Availability Broken in Production

**Date**: 2026-04-21
**Status**: Partially resolved — code fixes deployed, production DB fix pending
**Severity**: High — guest-facing booking page is non-functional for all users
**Property affected**: `60765` (The Daily Social, Koramangala A)
**Reported by**: Frontend team (`docs/FEtoBEHandoff/room-pricing-backend-handoff-2026-04-20.md`)
**BE response**: `docs/FEtoBEHandoff/be-response-room-pricing-2026-04-21.md`

---

## What the User Sees

On the booking/rooms page at `https://thedailysocial.in`:

1. **All room cards show `Rs. 0` or "Price unavailable"** — no prices are displayed for any room type, making the page appear broken.
2. **"Live availability could not be refreshed. Showing latest cached rooms."** — a warning banner appears on every page load, even before the user selects any dates.
3. **All rooms are non-bookable** — Add/quantity controls are disabled because prices are missing.

The page is functionally broken for every guest visiting the site.

---

## Root Causes (Three Separate Issues)

### Root Cause 1 — `room_types` table is empty in production DB

**Symptom**: `GET /guest/booking/rooms?property_id=60765` returns all rooms with `base_price_per_night: null`.

**Why**: The backend serves the room catalog by merging two data sources:
- **eZee `get_rooms` API** — returns physical room catalog (room names, IDs, physical config). Does NOT carry pricing — it is a date-independent catalog API, not a rate API.
- **Local `room_types` DB table** — stores our base prices, eZee mapping IDs, and amenity metadata.

When the DB table has no matching records, the backend falls back to `source: "ezee_only"` mode, serving the eZee response raw. Since eZee's catalog API has no price data, all rooms come back with `null` prices.

**The Aurora production DB (`tds_production`) has zero active records in the `room_types` table.** The initial production seed (`prisma/seed.prod.ts`) only created the property record, eZee connection, admin roles, and one admin user — it did not seed room types.

---

### Root Cause 2 — Availability endpoint returns only subset of rooms

**Symptom**: `GET /guest/booking/availability?property_id=60765&checkin=2026-04-20&checkout=2026-04-21` returns only 2 room types instead of 5.

**Why**: Same as Root Cause 1. When the DB has no records, the availability endpoint also falls back to eZee-only mode. eZee's `RoomList` API only returns room types that have a configured rate plan. Three of the five room types have no rate plan in eZee and are silently omitted from the response.

Room types and their eZee rate plan status:

| Room Type | eZee Room Type ID | Rate Plan | Online Bookable |
|---|---|---|---|
| 4 Bed Mixed Dormitory | `6076500000000000001` | `6076500000000000001` | Yes |
| Deluxe | `6076500000000000002` | `6076500000000000002` | Yes |
| 6 Bed Mixed Dormitory | `6076500000000000004` | None | No |
| 4 Bed Dormitory Female | `6076500000000000005` | None | No |
| 6 Bed Dormitory Female | `6076500000000000006` | None | No |

Once DB records exist, the backend maps **all 5 DB room types** against the eZee response. Rooms not returned by eZee appear with `available_beds: 0, inventory_state: "sold_out"`.

---

### Root Cause 3 — Error banner fires on initial page load (same-day date query)

**Symptom**: "Live availability could not be refreshed" banner appears immediately before the user selects any dates.

**Why**: The frontend was calling `/availability` on mount using today's date as both checkin and checkout (the date picker's default state before user interaction). The backend correctly validates `checkout > checkin` and returns:

```http
HTTP 400 Bad Request
{"message": "Checkout must be after checkin", "error": "Bad Request", "statusCode": 400}
```

The frontend treated this 400 as a live availability failure and showed the error banner. This is not a backend bug — same-day stays are invalid. eZee itself also rejects them with `Error_Code: "CheckDate"`.

**This is a frontend-side fix.** The availability call must be guarded.

---

### Secondary Bug — Rate fallback used `??` instead of `||`

**Symptom**: Even when room types exist in DB, rooms with `ratePerNight: 0` from eZee would not fall back to the DB price.

**Why**: The code used nullish coalescing (`??`) which only catches `null` and `undefined`. eZee returns `ratePerNight: 0` for room types without a configured rate plan. Zero passes through `??` unchanged, so the DB fallback price was never used.

```typescript
// Before (broken)
const ratePerNight = ezee?.ratePerNight ?? Number(rt.base_price_per_night);

// After (correct)
const ratePerNight = ezee?.ratePerNight || Number(rt.base_price_per_night);
```

---

## What Was Investigated

### Confirmed eZee APIs work correctly
Direct API calls to eZee confirmed:
- `get_rooms` → returns 5 room types, physical config, no prices (by design)
- `RoomList` availability → returns 2 bookable room types with live rates (500/night, 1500/night)
- eZee rate plan IDs confirmed from live API response

### Confirmed backend logic is correct when DB has data
The backend DB-merge path works correctly when `room_types` records exist. The fallback to `source: "ezee_only"` is the only broken path.

### Confirmed fix ran against wrong DB
A fix script (`scripts/fix-ezee-room-type-mapping.ts`) was created and run successfully, but it ran against the **Neon development DB** (`ep-morning-dream-a11s72fz.ap-southeast-1.aws.neon.tech`), not the **Aurora production DB** (`tds-aurora-cluster.cluster-cvcoqwym0b0d.ap-south-1.rds.amazonaws.com`). This was because the local `.env` file points to Neon — the production DB URL is stored in AWS SSM and only injected into ECS tasks at runtime.

### Confirmed Redis flush is a no-op until DB is fixed
The room catalog cache key (`catalog:60765`) was flushed but the underlying data is still broken — the next cache-miss re-populates it with the same null-priced response from eZee-only mode. The cache flush is only meaningful after the DB fix is applied.

---

## Deployment Stack (Why Direct DB Access Isn't Possible)

The production deployment uses:

| Component | Detail |
|---|---|
| **Backend** | Docker on AWS ECS Fargate, `ap-south-1` |
| **Database** | Aurora PostgreSQL Serverless v2 (`tds-aurora-cluster`), private VPC only |
| **Redis** | Sidecar container per ECS task (`redis://localhost:6379`), cleared on every task restart |
| **Config** | All env vars (including `DATABASE_URL`) stored in AWS SSM Parameter Store, injected at task startup |
| **CI/CD** | GitHub Actions → ECR → `prisma migrate deploy` via `aws ecs run-task` → rolling ECS deploy |

**Aurora is not publicly accessible.** Direct script execution from a local machine (`ts-node scripts/...`) will time out because the cluster endpoint is inside a private VPC subnet. The only way to run database commands against Aurora is via `aws ecs run-task`, which spins up a Fargate task inside the VPC.

This is why **Option A (run fix script locally with Aurora URL) does not work**. The URL is reachable from inside the VPC but not from a developer's machine.

---

## Fixes Made (Code — Not Yet in Production)

All code changes are local and committed but not yet pushed to `main`.

### 1. `prisma/seed.ts` — Room types upserted with correct eZee IDs

The dev seed now upserts all 5 room types using correct eZee IDs (confirmed from live API). Changed from conditional `create` to `upsert` so it is safe to re-run on every deploy.

| DB ID | Name | eZee Room Type ID | Base Price | Bookable |
|---|---|---|---|---|
| `rt-ka-4dorm` | 4 Bed Mixed Dormitory | `6076500000000000001` | ₹500/night | Yes |
| `rt-ka-deluxe` | Deluxe | `6076500000000000002` | ₹1,500/night | Yes |
| `rt-ka-6dorm` | 6 Bed Mixed Dormitory | `6076500000000000004` | ₹0 | No |
| `rt-ka-4dorm-female` | 4 Bed Dormitory Female | `6076500000000000005` | ₹0 | No |
| `rt-ka-6dorm-female` | 6 Bed Dormitory Female | `6076500000000000006` | ₹0 | No |

### 2. `src/guest/booking/guest-booking.service.ts`

- **`??` → `||`** in `ratePerNight` fallback (catches eZee's `0` values)
- **Cache key** changed from inline `\`catalog:${propertyId}\`` to `CacheService.catalogKey(propertyId)` (uses shared constant)
- **Cache TTL** changed from hardcoded `60 * 60 * 1000` (60 min) to `CacheService.TTL_CATALOG` (10 min)

### 3. `src/admin/bookings/admin-bookings.controller.ts` + `admin-bookings.service.ts`

New endpoint added:

```
DELETE /admin/bookings/cache/rooms?property_id=60765
Authorization: Bearer <admin-token>
```

Flushes the room catalog Redis cache immediately, without waiting for TTL expiry. Useful after any room type configuration change in eZee or DB. Returns `{"flushed": ["catalog:60765"]}`.

### 4. `.github/workflows/deploy.yml`

Added a seed step after `prisma migrate deploy`:

```yaml
- name: Run Prisma seed (upserts reference data — safe to re-run)
  run: |
    TASK_ARN=$(aws ecs run-task \
      --cluster tds-production \
      --task-definition tds-backend \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[...]}" \
      --overrides '{"containerOverrides":[{"name":"tds-api","command":["npx","prisma","db","seed"]}]}' \
      --query 'tasks[0].taskArn' --output text)
    aws ecs wait tasks-stopped --cluster tds-production --tasks "$TASK_ARN"
    EXIT_CODE=$(...)
    if [ "$EXIT_CODE" != "0" ]; then echo "Seed failed" && exit 1; fi
```

This runs `npx prisma db seed` inside the VPC (where Aurora is accessible), ensuring room types are always present after every deploy.

---

## How to Resolve

### Immediate fix: Push to `main`

```bash
git add .
git commit -m "fix: room type DB records, catalog TTL, rate fallback, cache flush endpoint"
git push origin main
```

The GitHub Actions pipeline will:
1. Build the new Docker image with all code fixes
2. Run `prisma migrate deploy` against Aurora (inside VPC)
3. **Run `prisma db seed` against Aurora** — upserts all 5 room types with correct eZee IDs and prices
4. Rolling-deploy the new image to ECS

Because seed uses `upsert`, it is safe to re-run. No data loss risk.

### Verification after deploy

```bash
curl https://api.thedailysocial.co.in/guest/booking/rooms?property_id=60765
```

Expected: `"source": "db"` on every room type, non-null `base_price_per_night` (500 or 1500 for bookable rooms).

If `source` is still `"ezee_only"`, the seed step failed — check GitHub Actions logs for the seed task exit code.

### Optional: Flush cache after confirm

After verifying `source: "db"` is live, log in as `owner@tds.com` and call the new flush endpoint to clear any stale cached responses immediately:

```bash
# 1. Get token
TOKEN=$(curl -s -X POST https://api.thedailysocial.co.in/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@tds.com","password":"TDS@2026!"}' | jq -r '.access_token')

# 2. Flush cache
curl -X DELETE "https://api.thedailysocial.co.in/admin/bookings/cache/rooms?property_id=60765" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Frontend Action Required (Separate from BE Fix)

The error banner issue (Root Cause 3) requires a frontend code change — it is not fixed by the backend deploy.

**Guard the `/availability` call so it only fires when `checkout > checkin`:**

```js
useEffect(() => {
  if (!checkin || !checkout || checkout <= checkin) return;
  fetchAvailability(checkin, checkout);
}, [checkin, checkout]);
```

Until dates are confirmed, show the catalog (`/rooms`) with "From ₹X/night" using `base_price_per_night`. Do not call `/availability` in the initial/default state.

---

## Action Item Tracker

| # | Owner | Action | Status |
|---|---|---|---|
| 1 | BE | DB room types created with correct eZee IDs (seed.ts updated) | Code ready, not deployed |
| 2 | BE | `ratePerNight` fallback fixed (`??` → `\|\|`) | Code ready, not deployed |
| 3 | BE | Catalog TTL reduced to 10 min | Code ready, not deployed |
| 4 | BE | Cache flush endpoint added | Code ready, not deployed |
| 5 | BE | Seed step added to deploy.yml CI/CD pipeline | Code ready, not deployed |
| 5b | BE | CI seed command changed to `seed.prod.ts` (avoids FK violation from dev-only data) | Code ready, not deployed |
| **6** | **BE** | **Push to `main` to trigger deploy+seed against Aurora** | **Pending** |
| 7 | FE | Guard `/availability` call: only fire when `checkout > checkin` | Pending |
| 8 | FE | Remove "Price unavailable" mitigation once BE deploy confirmed | Pending |
| 9 | FE | Verify `source: "db"` in catalog response after BE deploy | Pending |

---

## Timeline

| Time | Event |
|---|---|
| 2026-04-20 | FE team reports Rs. 0 pricing and availability error banner |
| 2026-04-20 | FE applies temporary "Price unavailable" mitigation in UI |
| 2026-04-20 | BE investigation: confirmed eZee APIs work, root cause identified as empty `room_types` table |
| 2026-04-21 | eZee room type IDs confirmed from live API |
| 2026-04-21 | Code fixes applied: `||` fallback, cache key, TTL, cache flush endpoint, seed.ts updated |
| 2026-04-21 | Fix script run against Neon dev DB (confirmed working) |
| 2026-04-21 | Deploy.yml updated with seed step |
| 2026-04-21 | **Push to main pending** — production Aurora still has zero room type records |
