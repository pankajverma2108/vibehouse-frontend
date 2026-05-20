# Room Availability E2E Debug Report (2026-04-24)

## Bottom line (no fluff)

1. Frontend is **not** filtering your 5 rooms down to 2.
2. The missing rooms issue is upstream data/API behavior, not UI list slicing.
3. "Transparency" in room cards is intentional CSS for sold-out rows:
   - `components/marketing/property.tsx` applies `opacity-70 grayscale-[0.25]` when `inventory_state === "sold_out"`.
4. Live API checks from this environment currently return **HTTP 500** on all room endpoints, so backend is unstable right now.

---

## E2E flow (actual code path)

### 1) SSR entry
- `app/property/page.tsx`
  - If valid date window (`checkin`, `checkout`, and `checkout > checkin`): calls `getRoomAvailabilitySnapshot(...)`
  - Else: calls `getRoomCatalogSnapshot(...)`

### 2) Server-side data assembly
- `lib/cx-api.ts`
  - `getRoomCatalogSnapshot()` -> backend `GET /guest/booking/rooms`
  - `getRoomAvailabilitySnapshot()` -> backend `GET /guest/booking/availability`
  - Merges catalog + availability:
    - Catalog rooms missing in availability are explicitly kept and marked sold out.
    - Live-only rooms are appended.
  - This merge logic is designed to preserve full room list, not shrink it.

### 3) Client refresh path
- `components/marketing/property.tsx`
  - Calls internal route `GET /api/cx/rooms` (catalog or availability mode)
  - `readCategories(payload)` directly uses returned `categories`
  - No `slice`, no hard cap, no hidden filter by room count.

### 4) Internal route
- `app/api/cx/rooms/route.ts`
  - Validates params
  - Calls `getRoomAvailabilitySnapshot(...)`
  - Returns `room_types` and `categories`

---

## Related API calls and live responses (captured now)

Base: `https://api.thedailysocial.co.in`

### Call 1
`GET /guest/booking/rooms`

Result now:
- HTTP 500 Internal Server Error

### Call 2
`GET /guest/booking/rooms?property_id=60765`

Result now:
- HTTP 500 Internal Server Error

### Call 3
`GET /guest/booking/availability?checkin=2026-04-27&checkout=2026-04-29`

Result now:
- HTTP 500 Internal Server Error

### Call 4
`GET /guest/booking/availability?property_id=60765&checkin=2026-04-27&checkout=2026-04-29`

Result now:
- HTTP 500 Internal Server Error

### Call 5
`GET /guest/booking/availability?property_id=60765&checkin=2026-04-24&checkout=2026-04-25`

Result now:
- HTTP 500 Internal Server Error

---

## Last known backend payloads in repo docs (for reference)

From `docs/be-response-booking-engine-2026-04-23.md` and `docs/be-response-room-pricing-2026-04-21.md`:

### Expected catalog shape
`GET /guest/booking/rooms?property_id=60765`
```json
{
  "property_id": "60765",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "base_price_per_night": 500,
      "source": "db"
    },
    {
      "id": "rt-ka-deluxe",
      "name": "Deluxe",
      "base_price_per_night": 1500,
      "source": "db"
    }
  ]
}
```

### Expected availability shape
`GET /guest/booking/availability?property_id=60765&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`
```json
{
  "property_id": "60765",
  "availability_source": "ezee_live",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "available_beds": 12,
      "inventory_state": "available",
      "base_price_per_night": 799,
      "total_price": 1598,
      "source": "db"
    },
    {
      "id": "rt-ka-deluxe",
      "available_beds": 3,
      "inventory_state": "available",
      "base_price_per_night": 1500,
      "total_price": 3000,
      "source": "db"
    }
  ]
}
```

Note: Repo docs show inconsistent historical states (at points 5 rooms expected, at points only 2 seeded/bookable). That inconsistency itself indicates backend data/source drift over time.

---

## Why you see only 2 cards in frontend

Given current evidence, the likely sequence is:

1. Upstream API returns only 2 effective room types (or errors).
2. Frontend receives only those categories.
3. UI renders exactly what it got.
4. Sold-out visual treatment adds opacity/grayscale, which looks like "transparency".

This is not caused by a frontend cap/slice.

---

## Exact "transparency" source

In `components/marketing/property.tsx`, room card wrapper uses:

```tsx
className={`overflow-hidden rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.03)] ${isSoldOut ? "opacity-70 grayscale-[0.25]" : ""}`}
```

So sold-out cards are intentionally dimmed.

---

## What must be fixed (real owner)

### Backend (required)
1. Stabilize room APIs (fix current HTTP 500s).
2. Ensure `GET /guest/booking/rooms?property_id=60765` returns the full intended room catalog with valid DB mapping.
3. Ensure availability merge returns complete room set or clear sold-out entries (not silent drops).
4. Ensure eZee room-type/rate-plan mapping for all intended room types is correct.

### Frontend (optional visual adjustment)
1. Remove or reduce sold-out opacity if it is being interpreted as hidden data.

---

## Commands used for live verification

```powershell
# all returned HTTP 500 at time of check
Invoke-RestMethod "https://api.thedailysocial.co.in/guest/booking/rooms"
Invoke-RestMethod "https://api.thedailysocial.co.in/guest/booking/rooms?property_id=60765"
Invoke-RestMethod "https://api.thedailysocial.co.in/guest/booking/availability?checkin=2026-04-27&checkout=2026-04-29"
Invoke-RestMethod "https://api.thedailysocial.co.in/guest/booking/availability?property_id=60765&checkin=2026-04-27&checkout=2026-04-29"
Invoke-RestMethod "https://api.thedailysocial.co.in/guest/booking/availability?property_id=60765&checkin=2026-04-24&checkout=2026-04-25"
```
