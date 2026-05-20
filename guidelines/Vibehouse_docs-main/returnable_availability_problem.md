# Returnable Item Availability Problem

## The Problem

A guest books 2 towels on **March 27** for a stay starting **April 13**.
Under the current RETURNABLE design, we **don't reserve inventory at booking time** (correct — we shouldn't lock a towel for 16 days).

But on April 13, when the guest checks in and staff tries to issue the towels:
- 8 towels are issued to current guests
- 4 are in laundry
- 2 are damaged
- **0 available** — the guest paid for towels but can't get them

This is the **demand-supply mismatch** problem. It gets worse with:
- Rainy season (laundry takes 2-3 days instead of same-day)
- Peak occupancy (more guests = more towels in circulation)
- Bulk check-ins on the same day
- Unpredictable damage/loss rates

---

## What Hotels Actually Do (Industry Context)

Hotels don't reserve a *specific* towel for a future guest. Towels, linens, and amenities are **pooled commodities** — any clean towel serves any guest. The industry manages this through:

1. **PAR levels** (Periodic Automatic Replacement) — maintain stock at 3× daily usage
2. **Linen cycle planning** — laundry schedules aligned to check-in/check-out waves
3. **Buffer stock** — extra inventory beyond max expected demand
4. **Demand forecasting** — predict needs from upcoming bookings

The question is: **which of these should we build into the system, and which stay manual?**

---

## Proposed Solutions (Ranked by Complexity)

### Solution 1: Buffer Stock + Low Stock Alerts (Recommended for Now)

**How it works:**
- We already have `low_stock_threshold` on inventory rows
- Set it intelligently: not "alert when stock is low" but "alert when stock can't cover upcoming demand"
- Staff maintains a buffer (e.g., if max occupancy needs 20 towels/day, keep 40-50 in total stock to account for laundry cycle)

**What to build:**
- Nothing new. Already built. `is_low_stock` already flags when `available_stock <= low_stock_threshold`.
- Staff sets threshold based on their knowledge of laundry cycles and occupancy.

**Pros:**
- Zero additional complexity
- Works today
- Staff already knows their laundry situation better than any system

**Cons:**
- Reactive, not proactive — you find out *at check-in* that you're short
- Doesn't account for future bookings
- Threshold is static (doesn't adjust for seasonal demand)

**Verdict:** Good enough for launch. Most hostels with 20-50 beds operate fine this way.

---

### Solution 2: Demand Calendar with Projected Availability (Recommended Phase 2)

**How it works:**
- For each RETURNABLE product, build a **date-level demand projection**:
  - Look at all bookings with check-in dates in the next N days
  - For each date, sum up how many towels are expected to be needed (from `addon_order_items` where the booking's check-in falls on that date)
  - Compare against current total stock minus damaged/lost
  - Show a dashboard: "April 13: 15 needed, 20 in circulation → OK" or "April 15: 25 needed, 20 in circulation → SHORTAGE"

**What the dashboard shows:**

```
┌──────────────────────────────────────────────────────────┐
│  TOWEL DEMAND FORECAST (Next 7 Days)                     │
├────────────┬──────────┬─────────┬────────────────────────┤
│ Date       │ Checking │ Already │ Projected              │
│            │ In       │ Issued  │ Availability           │
├────────────┼──────────┼─────────┼────────────────────────┤
│ Apr 13     │ +6       │ 8       │ 20 - 8 - 6 = 6  ✅    │
│ Apr 14     │ +2       │ 12*     │ 20 - 12 - 2 = 6 ✅    │
│ Apr 15     │ +8       │ 10*     │ 20 - 10 - 8 = 2 ⚠️    │
│ Apr 16     │ +4       │ 14*     │ 20 - 14 - 4 = 2 ⚠️    │
│ Apr 17     │ +0       │ 16*     │ 20 - 16 - 0 = 4 ✅    │
└────────────┴──────────┴─────────┴────────────────────────┘
  * "Already Issued" is projected based on check-out dates
  ⚠️ = demand may exceed supply (accounts for checkouts too)
```

**The key insight:** We don't need to know *which* towel — we just need to know *if we'll have enough*. This is a **counting problem**, not a tracking problem.

**What to build:**
- New API: `GET /admin/inventory/returnables/:productId/forecast?days=7`
- Query: For each day in range, count:
  - `currently_issued`: checkouts with status=ISSUED whose booking hasn't checked out yet
  - `expected_new_demand`: addon_order_items for RETURNABLE products on bookings checking in that day
  - `expected_returns`: addon_order_items for guests checking out that day (they'll return towels)
  - `projected_available = total_stock - damaged - currently_issued - expected_new_demand + expected_returns`
- Dashboard widget on the Returnables tab

**Pros:**
- Proactive — staff sees shortages **days in advance**
- Actionable — staff can: rush laundry, buy more stock, contact guests to adjust
- Uses data we already have (booking dates + addon orders)
- No unit-level tracking needed

**Cons:**
- Projections assume guests return on time (they might extend)
- Doesn't account for laundry cycle time (we don't track it)
- Assumes all returns are GOOD (some will be damaged)

**Verdict:** Best balance of value vs. complexity. Build this as Phase 2.

---

### Solution 3: Unit-Level Lifecycle Tracking

**How it works:**
- Every physical towel gets a unique code: `TOWEL-001`, `TOWEL-002`, ..., `TOWEL-050`
- Each unit has a lifecycle state machine:

```
AVAILABLE → ISSUED → RETURNED → IN_LAUNDRY → AVAILABLE
                  ↘ DAMAGED → RETIRED
                  ↘ LOST → RETIRED
```

- We track WHERE each unit is at any moment
- We track laundry cycles: sent_to_laundry_at, expected_back_at, actual_back_at
- We can predict: "TOWEL-023 went to laundry at 10am, usually takes 4 hours, so available by 2pm"

**New database tables:**

```sql
-- Each physical unit
CREATE TABLE returnable_units (
    id              VARCHAR(36) PRIMARY KEY,
    inventory_id    VARCHAR(36) NOT NULL REFERENCES inventory(id),
    unit_code       VARCHAR(20) NOT NULL UNIQUE,  -- TOWEL-001
    status          VARCHAR(15) NOT NULL DEFAULT 'AVAILABLE',
                    -- AVAILABLE, ISSUED, IN_LAUNDRY, DAMAGED, RETIRED
    created_at      TIMESTAMP DEFAULT NOW(),
    retired_at      TIMESTAMP
);

-- Laundry cycle tracking
CREATE TABLE laundry_cycles (
    id              VARCHAR(36) PRIMARY KEY,
    unit_id         VARCHAR(36) NOT NULL REFERENCES returnable_units(id),
    sent_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_back   TIMESTAMP,  -- estimated based on historical avg
    actual_back     TIMESTAMP,
    sent_by_admin   VARCHAR(36) REFERENCES admin_users(id)
);
```

**What staff does differently:**
1. Guest returns towel → staff scans/enters unit code → marks RETURNED
2. Staff sends towel to laundry → marks IN_LAUNDRY
3. Towel comes back from laundry → marks AVAILABLE
4. System learns average laundry turnaround time per item type

**Pros:**
- Complete visibility: "Where is every towel right now?"
- Accurate predictions: "12 towels coming back from laundry by 3pm"
- Loss detection: "TOWEL-017 has been in laundry for 5 days — investigate"
- Quality tracking: "TOWEL-003 has been damaged 3 times — retire it"
- Can answer: "Will we have enough towels on April 15 at 2pm?" with confidence

**Cons:**
- **Significant operational overhead**: Staff must scan/enter codes at every transition
- Requires physical labeling of every unit (QR codes, tags, etc.)
- Laundry partners may not cooperate with unit-level tracking
- Over-engineered for a hostel with 30 towels
- Adds 2 new tables, 4+ new API endpoints, new UI screens
- Staff adoption risk — if they skip steps, data becomes unreliable

**Verdict:** Overkill for current scale. Consider only if Vibe House scales to 200+ beds or if towel/blanket loss becomes a significant cost problem.

---

### Solution 4: Soft Reservation with Auto-Release

**How it works:**
- When a guest books a towel, we create a "soft reservation" — not a hard inventory lock, but a **claim**
- The claim becomes active T-2 days before check-in (configurable)
- If the claim can't be fulfilled, alert the staff
- On check-in, the soft reservation converts to a real issuance
- If the guest cancels, the claim auto-releases

**New concept: `returnable_claims`**

```sql
CREATE TABLE returnable_claims (
    id                  VARCHAR(36) PRIMARY KEY,
    inventory_id        VARCHAR(36) NOT NULL,
    addon_order_item_id VARCHAR(36) NOT NULL,
    guest_id            VARCHAR(36) NOT NULL,
    quantity            INTEGER NOT NULL,
    expected_checkin    DATE NOT NULL,
    expected_checkout   DATE NOT NULL,
    status              VARCHAR(15) DEFAULT 'PENDING',
                        -- PENDING, ACTIVE, FULFILLED, CANCELLED
    activated_at        TIMESTAMP,  -- when soft-reserve kicked in
    created_at          TIMESTAMP DEFAULT NOW()
);
```

**Lifecycle:**
1. Guest books towel → `PENDING` claim created (no stock touched)
2. T-2 days before check-in → cron job sets `ACTIVE`, decrements `available_stock`
3. Guest checks in → staff issues → `FULFILLED`
4. Guest cancels → `CANCELLED`, stock restored if was ACTIVE

**Pros:**
- Guarantees availability (items are reserved close to check-in)
- Short lock window (2 days vs. 16 days)
- Automated — no staff intervention needed for reservation
- Graceful degradation — if stock is short, alert before check-in

**Cons:**
- Still locks inventory (just for fewer days)
- Requires a cron job / scheduled task
- Adds complexity: new table, new status transitions, new failure modes
- "2 days before" is arbitrary — what if laundry is slow?
- Doesn't solve the fundamental problem (just narrows the window)

**Verdict:** Interesting idea but adds complexity without solving the root cause. The root cause is *total stock vs. total demand*, not *when we reserve*.

---

### Solution 5: Overbooking Model (Revenue-Optimal)

**How it works:**
- Like airlines oversell seats, we accept more towel orders than we have stock
- We track a configurable **overbooking ratio** (e.g., 1.2x — accept 24 bookings for 20 towels)
- This works because:
  - Not all guests check in (no-show rate ~10-15%)
  - Not all guests who booked towels actually need them on day 1
  - Laundry turnover means towels cycle back
- If we ever can't fulfill, we offer alternatives (different towel, refund, etc.)

**Pros:**
- Maximizes revenue
- Simple to implement (just adjust the "available for booking" count)
- Works well at scale

**Cons:**
- Risk of guest dissatisfaction when you can't fulfill
- Requires historical data to calibrate the ratio
- Not great for a brand-new hostel with no data
- Feels wrong for a hospitality brand (we're not an airline)

**Verdict:** Not recommended for Vibe House's brand positioning. Consider only if data shows consistently high no-show rates.

---

## Recommendation: Phased Approach

### Phase 1 (Current — Already Built)
**Buffer Stock + Smart Thresholds**

- Staff sets `low_stock_threshold` based on operational knowledge
- Rule of thumb: threshold = `max_daily_checkins × items_per_guest × 1.5` (1.5x for laundry buffer)
- Example: 10 check-ins/day × 1 towel × 1.5 = threshold at 15
- Total stock should be ~3× daily usage to cover 2-day laundry cycle
- **No code changes needed. Already works.**

### Phase 2 (Next Sprint)
**Demand Forecast Dashboard**

Build a simple demand projection on the Returnables tab:
- For each returnable product, show a 7-day forecast
- Pull check-in dates from `ezee_booking_cache` + `addon_order_items`
- Show: date | new demand | expected returns | projected available
- Color-code: green (>50% headroom), amber (<30%), red (shortage)
- **Estimated effort: 1 API endpoint + 1 dashboard widget**

### Phase 3 (Only if Needed)
**Unit-Level Tracking**

Only pursue if:
- Vibe House scales to 100+ beds
- Towel/blanket loss exceeds ₹X/month
- Laundry cycle becomes a documented bottleneck
- Staff is willing to scan/enter unit codes at every handoff

---

## The Laundry Timing Problem (Specifically)

> "What if it's rainy and towels take longer to dry?"

This is an **operational** problem, not a **software** problem. Here's why:

1. **We can't predict weather's impact on laundry** — even with a weather API, the relationship between rainfall and laundry time depends on: indoor vs outdoor drying, dryer availability, laundry partner's capacity, etc.

2. **The right solution is operational buffers:**
   - Monsoon season → increase total stock by 30-50%
   - Or switch to a laundry service with guaranteed SLA (machine dryers, not sun-drying)
   - Or set `low_stock_threshold` higher during monsoon months

3. **What software CAN do:**
   - Show the demand forecast (Solution 2) so staff can see shortages coming
   - Allow seasonal threshold adjustment (e.g., "monsoon mode" toggle that bumps thresholds)
   - Track historical laundry turnaround to provide better estimates over time

**Bottom line:** Don't try to solve laundry logistics in code. Give staff the *visibility* (demand forecast) and let them make operational decisions.

---

## Summary Table

| Solution | Complexity | Accuracy | Staff Overhead | When to Build |
|----------|-----------|----------|----------------|---------------|
| 1. Buffer + Alerts | None (done) | Low | None | Now (done) |
| 2. Demand Forecast | Low | Medium | None | Phase 2 |
| 3. Unit Tracking | High | High | High | If 100+ beds |
| 4. Soft Reservation | Medium | Medium | Low | Not recommended |
| 5. Overbooking | Low | Low | None | Not recommended |

## TL;DR

**Don't track individual towels. Track demand vs. supply.**

The problem isn't "which towel goes to which guest" — it's "will we have enough towels on April 15?"

Build the **demand forecast dashboard** (Solution 2) as the next step. It gives staff a 7-day lookahead using data we already have (booking dates + addon orders), requires no unit-level tracking, no laundry integration, and no operational changes. Combined with smart buffer stock (already built), this covers 95% of real-world scenarios.
