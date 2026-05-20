# Backend Status Reply — Booking UX & Pricing (2026-04-21)

Owner: Frontend
Audience: Backend + Product + QA
Related:
- docs/be-response-room-pricing-2026-04-21.md
- docs/agent_handoff_booking_ux.md
- docs/room-pricing-backend-handoff-2026-04-20.md

---

## 1. Direct Answer: Is It Resolved?

Short answer: **Partially resolved**.

- **Resolved on FE UX side**: date guard, availability flow, URL state sync, late-auth checkpoint, and price-unavailable safety handling are implemented and working.
- **Not fully closed cross-team yet**: final closure still depends on backend live verification that catalog/availability are consistently enriched from DB (`source: "db"`) in production-facing checks.

So: **FE blocker is resolved; full FE+BE closure is pending final live backend confirmation.**

---

## 2. Why We Did This

We made these changes to stop booking breakage and align with expected hostel-booking UX patterns:

1. Prevent invalid same-day availability requests (`checkout <= checkin`) that trigger 400 errors.
2. Prevent stale/zombie cart behavior from persistent storage.
3. Ensure `/property` launches in a useful state (valid default date window) without forcing early auth.
4. Prevent users from selecting rooms with broken rates (`null` or non-positive prices).
5. Preserve frictionless exploration and gate auth only at checkout intent.

---

## 3. What We Did

1. Added strict FE date guard before calling availability.
2. Kept catalog-first loading and promoted to live availability only with valid date windows.
3. Added URL synchronization for checkin/checkout/property context so refresh/deep-links rehydrate correctly.
4. Added unavailable-price guard (`Price unavailable`) and blocked selection/checkout for those rooms.
5. Moved booking draft persistence to `sessionStorage` for ephemeral cart behavior.
6. Preserved late-auth flow in `continueToCheckout`.
7. Re-ran lint and browser E2E checks on `/property`.

---

## 4. Implementation Details

### Files and behavior

| File | Implementation |
|---|---|
| `components/marketing/property.tsx` | Valid date-window gating, auto-trigger of availability on valid defaults, URL query sync, retry logic, and unavailable-price selection blocking. |
| `app/property/page.tsx` | Safe date parsing for query params and conditional initial snapshot behavior for catalog vs availability preload. |
| `lib/cx-api.ts` | Normalization guard for missing/non-positive prices and propagation of `isPriceUnavailable` into UI mapping. |
| `lib/booking-session.ts` | Booking draft storage switched to `sessionStorage` for ephemeral cart lifecycle. |

### Verified runtime behavior (latest FE checks)

1. Naked `/property` launches with a valid default date window and upgrades to URL-backed state.
2. Live-priced rooms remain bookable; no `Rs. 0` rendering for unavailable rates.
3. Disabled states remain correctly enforced for sold-out/unavailable rooms.
4. Hard refresh preserves selected date URL state and availability behavior.

---

## 5. Current Conclusion

### What is done

- FE booking UX stabilization is complete for the identified blocker scope.
- FE no longer sends invalid same-day availability requests.
- FE no longer allows broken-price rooms into booking.

### What is pending

- Backend must confirm live environment enrichment consistency (`source: "db"`) for both endpoints:
  - `/guest/booking/rooms?property_id=60765`
  - `/guest/booking/availability?property_id=60765&checkin=...&checkout=...`
- If stale data appears, backend should run cache flush and confirm post-flush output.

### Closure criteria for full FE+BE resolution

All conditions below must be true:

1. Catalog and availability responses consistently return DB-enriched data on live checks.
2. Expected room coverage is returned for availability merge behavior (not ezee-only subset behavior).
3. FE can safely retire temporary mitigation policy only after backend confirmation is stable.

---

## 6. Summary

**Backend asked: "Is this resolved?"**

- **Frontend answer**: Yes, FE blocker and UX hardening are resolved.
- **Program answer**: Not fully closed until backend live data enrichment is consistently verifiable.

This is the final state today: **FE fixed and stable, BE final live confirmation pending for complete closure.**
