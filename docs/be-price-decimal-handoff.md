# Backend Handoff: Price Decimal Precision

**Date:** 2026-04-23  
**Raised by:** Frontend team  
**Status:** ⚠️ Action required from backend

---

## Summary

The frontend now enforces **exactly 2 decimal places** on all displayed monetary values (e.g. `₹500.00`, `₹1,299.50`). No frontend rounding is performed — the displayed value exactly mirrors the number returned by the API.

If the backend returns integers (e.g. `500`, `1299`) instead of floats (`500.00`, `1299.50`), users will see `₹500.00` (correct appearance, but underlying precision is lost from the source). If any price has a fractional component (e.g. `499.99`) the backend **must return it as a float**, not truncate it to `499`.

---

## What Was Fixed on the Frontend

| File | Change |
|---|---|
| `lib/format-price.ts` | New shared utility — always formats to 2dp via `Intl.NumberFormat` |
| `lib/cx-api.ts` → `roomTypesToHomeCards()` | Replaced `toLocaleString("en-IN")` (rounds integers) with `formatINRPlain` |
| `components/marketing/property.tsx` | All `Rs. {number}` template literals → `Rs. {formatINRPlain(number)}`; removed `Math.round()` on taxes |
| `components/marketing/property.tsx` → `calculateWidgetTaxes` | Removed `Math.round()` on `taxes` — tax total is now exact float |
| `components/booking/booking-checkout-page.tsx` → `formatCurrency` | Changed `minimumFractionDigits: 0` → `minimumFractionDigits: 2` |
| `components/booking/booking-checkout-page.tsx` → `calculatePricingBreakdown` | Removed `Math.round()` on `taxes` and `grandTotal` |

---

## Backend Action Required

### Fields that must return float with 2 decimal places

#### `GET /guest/booking/rooms` (catalog)
| Field | Current (observed) | Required |
|---|---|---|
| `base_price_per_night` | `500` (integer) | `500.00` |
| `total_price` | `500` (integer) | `500.00` |

#### `GET /guest/booking/availability`
| Field | Current (observed) | Required |
|---|---|---|
| `base_price_per_night` | `500` (integer) | `500.00` |
| `total_price` | `1500` (integer) | `1500.00` |

#### `GET /store/catalog` (add-ons)
| Field | Current (observed) | Required |
|---|---|---|
| `base_price` | Unknown — verify | Must be float with 2dp |

#### `POST /guest/booking/create` → response
| Field | Current (observed) | Required |
|---|---|---|
| `grand_total` | Unknown | Must be float with 2dp |
| `total` | Unknown | Must be float with 2dp |

---

## Implementation Guidance for Backend

### PostgreSQL column type
Prices should be stored as `NUMERIC(12, 2)` — not `INTEGER` or `FLOAT`. This prevents floating-point drift:
```sql
ALTER TABLE room_types 
  ALTER COLUMN base_price_per_night TYPE NUMERIC(12,2),
  ALTER COLUMN total_price TYPE NUMERIC(12,2);
```

### Python/FastAPI + Pydantic
```python
from decimal import Decimal

class RoomType(BaseModel):
    base_price_per_night: float   # serializes as 500.0 — OK
    total_price: float             # serializes as 1500.0 — OK

# Or with Decimal for full precision:
class RoomType(BaseModel):
    base_price_per_night: Decimal
    total_price: Decimal

    model_config = ConfigDict(
        json_encoders={Decimal: lambda v: round(float(v), 2)}
    )
```

JSON output should be `500.0` or `500.00` — both are accepted by the frontend.  
**Never** return `"500"` (string) — the frontend's `ensureNumber()` handles that but it's fragile.

---

## Why Not Round on Frontend?

Rounding on the frontend hides precision bugs. If the backend returns `499.999` due to a calculation error, `Math.round` would display `₹500.00` — masking the issue. The frontend now passes through the raw value and always displays 2dp, so discrepancies become immediately visible.

---

## Test Cases (after backend fix)

| Scenario | Expected display |
|---|---|
| Dorm room 1 night | `₹500.00 / night`, total `₹500.00`, tax `₹25.00`, grand `₹525.00` |
| Private room 1 night | `₹1,500.00 / night`, total `₹1,500.00`, tax `₹75.00`, grand `₹1,575.00` |
| Add-on ₹50 item | `₹50.00 x 1`, tax `₹9.00` (18%), grand `₹59.00` |
| Fractional price ₹499.99 | `₹499.99` — must not round to `₹500.00` |
