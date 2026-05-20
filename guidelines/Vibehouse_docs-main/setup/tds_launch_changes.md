# The Daily Social — Setup Changelog

> **Document purpose**: Tracks all significant backend changes made during the brand rename (VibeHouse → The Daily Social) and the Koramangala property launch.
>
> **Date**: April 2026

---

## 1. Brand Rename: VibeHouse → The Daily Social

### What changed

| Location | Old value | New value |
|---|---|---|
| `src/main.ts` | `Vibe House API running on...` | `The Daily Social API running on...` |
| `src/guest/booking/guest-booking.service.ts` | `source: 'VibeHouse'` | `source: 'The Daily Social'` |
| `src/guest/booking/guest-booking.service.ts` | ERI prefix `VH-CITY-...` | `TDS-CITY-...` |
| `src/guest/colive/colive.service.ts` | Booking ref `VH-CL-YYYYMM-...` | `TDS-CL-YYYYMM-...` |
| `src/guest/colive/colive.service.ts` | Community strings (Vibe House) | The Daily Social |
| `src/payment/payment.service.ts` | Community name, next steps strings | The Daily Social |
| `src/ezee/ezee-reconciliation.service.ts` | ERI filter `startsWith: 'VH-'` | `startsWith: 'TDS-'` |

> **Note**: SQS queue names (`vibehouse-ops.fifo`, `vibehouse-ezee-sync.fifo`, etc.) were **NOT renamed** — these are live AWS resources. Only comments and documentation references were updated.

> **Note**: Asset URLs (`assets.vibehouse.in`) and S3 bucket names were **NOT changed** — update these when the new domain is live.

### Booking reference format

Old format: `VH-BANGALORE-M5X1A-F3B2`
New format: `TDS-BANGALORE-M5X1A-F3B2`

Colive old: `VH-CL-202605-A3F7`
Colive new: `TDS-CL-202605-A3F7`

> ⚠️ Existing bookings in the DB retain their old `VH-` prefixed ERIs — this is by design. The reconciliation service filter was updated so only new `TDS-` bookings are queued for eZee sync.

---

## 2. Launch Properties: TDS Koramangala A & B

### New property IDs

| Property ID | Name | Address | City |
|---|---|---|---|
| `60765` | The Daily Social - Koramangala A | 100 Feet Road, Koramangala 4th Block | Bangalore |
| `60765` | The Daily Social - Koramangala B | Sarjapur Road, Koramangala 6th Block | Bangalore |

> **Old property `60765`** (`Vibe House Bandra`) was **kept as-is** — it holds test data used during development. It is inactive for production purposes.

### What was seeded per property

Each property (`60765` and `60765`) has:

- **1 eZee connection** (KA active, KB disabled until creds arrive)
- **4 admin users** (manager, reception, housekeeping, maintenance)
- **3 room types** (Private Queen, 4-Bed Dorm, 6-Bed Dorm)
- **9 inventory items** (water, towel, lock, kit, blanket, locker, iron, dryer, umbrella)
- **Full colive content** (hero, gallery, benefits, stories, checkout notes)
- **3 colive room options** per property
- **5 colive addons** per property (meals, laundry, coworking, airport pickup, bike rental)

### Admin credentials

| Email | Role | Property |
|---|---|---|
| `manager.ka@thedailysocial.in` | Manager | 60765 |
| `reception.ka@thedailysocial.in` | Reception | 60765 |
| `housekeeping.ka@thedailysocial.in` | Housekeeping Lead | 60765 |
| `maintenance.ka@thedailysocial.in` | Maintenance Lead | 60765 |
| `manager.kb@thedailysocial.in` | Manager | 60765 |
| `reception.kb@thedailysocial.in` | Reception | 60765 |
| `housekeeping.kb@thedailysocial.in` | Housekeeping Lead | 60765 |
| `maintenance.kb@thedailysocial.in` | Maintenance Lead | 60765 |

**Default password**: `TDS@2026!`
Change these before going live.

---

## 3. eZee Connection Cleanup

### Problem
The existing eZee credentials (`HOTEL_CODE` / `AUTH_CODE` in `.env`) belong to **Koramangala A**, not to the old Bandra test property. Three eZee connections were incorrectly sharing those credentials:
- `ezee-conn-001` (ghost connection)
- `ezee-conn-bandra-001` (Bandra test property)
- `ezee-conn-tds-ka-001` (Koramangala A — **correct owner**)

### Fix applied
`ezee-conn-001` and `ezee-conn-bandra-001` were **deactivated** and their `hotel_code` / `api_key` were **cleared** (set to `PLACEHOLDER_NOT_ACTIVE`).

### Current state

| Connection ID | Property | Hotel Code | Active? |
|---|---|---|---|
| `ezee-conn-tds-ka-001` | 60765 | `60765` (real KA creds) | ✅ Yes |
| `ezee-conn-tds-kb-001` | 60765 | `TDS_KB_PLACEHOLDER` | ❌ No |
| `ezee-conn-bandra-001` | 60765 (test) | `PLACEHOLDER_NOT_ACTIVE` | ❌ No |
| `ezee-conn-001` | 60765 (ghost) | `PLACEHOLDER_NOT_ACTIVE` | ❌ No |

---

## 4. New Colive Module

A new **Colive microservice** was built from scratch for long-stay (monthly) bookings. Key details:

- Module path: `src/guest/colive/`
- 6 guest-facing endpoints + 2 payment endpoints (see `12_colive_long_stay.md`)
- **eZee is the source of truth** — confirmed bookings are synced via SQS `INSERT_COLIVE_BOOKING`
- Pricing: live from eZee `RoomList` API, cached in Redis (30 min)
- GST: 5% flat (SGST 2.5% + CGST 2.5%)
- Quote TTL: 30 minutes
- No security deposit

See full API documentation: `docs/api_routes/12_colive_long_stay.md`

---

## 5. Code Default Fallbacks Updated

Several admin services had a hardcoded fallback to `60765` when the logged-in admin has no `property_id` set (i.e. super-admin). These were updated to `60765`:

| File | What changed |
|---|---|
| `src/admin/inventory/admin-inventory.service.ts` | 3 `property_id` fallbacks |
| `src/admin/events/admin-events.service.ts` | 2 `property_id` fallbacks |
| `src/public/public-events.controller.ts` | 1 `property_id` fallback |

---

## 6. Pending Actions Before KB Goes Live

- [ ] Receive eZee hotel code + API key for Koramangala B
- [ ] Add to `.env`: `TDS_KB_HOTEL_CODE=...` and `TDS_KB_AUTH_CODE=...`
- [ ] Set `ezee-conn-tds-kb-001.is_active = true` in DB
- [ ] Populate `ezee_room_type_id`, `ezee_rate_plan_id`, `ezee_rate_type_id` for all 6 room types (3 per property) from the eZee PMS dashboard
- [ ] Update admin user names + phone numbers in DB to match real staff
- [ ] Update `onboarding_json.whatsapp_url` in colive payment service to production number
- [ ] Update asset URLs from `assets.vibehouse.in` → `assets.thedailysocial.in` once DNS is live

---

## 7. Seed Scripts Reference

| Script | Purpose | Safe to re-run? |
|---|---|---|
| `prisma/seed.ts` | Original test data (Bandra, dev guests, test bookings) | ✅ Yes |
| `prisma/seed-colive.ts` | Colive seed for Mumbai/Bandra (dev test data) | ✅ Yes |
| `prisma/seed-tds.ts` | **Main launch seed** — TDS KA + KB properties | ✅ Yes |
| `prisma/fix-ezee-connections.ts` | One-time fix — deactivated stale eZee connections | ✅ Safe (idempotent update) |
