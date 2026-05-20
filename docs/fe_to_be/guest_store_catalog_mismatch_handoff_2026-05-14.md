# Guest Store Catalog Mismatch Handoff

Date: 2026-05-14
Owner: Frontend team
Audience: Backend API team
Scope: `GET /guest/store/catalog` used by booking review / add-ons selection

## 1) Problem Summary

The booking review page is rendering the add-ons sections, but the catalog data is not loading reliably. The frontend is requesting the catalog successfully, but the backend is returning the wrong response shape for the route that is supposed to provide purchasable store items.

Observed response from the browser session:

```json
{
  "property_id": "60765",
  "room_types": [
    /* room availability payload */
  ]
}
```

That response shape belongs to the room catalog / availability domain, not the store catalog domain. As a result, the add-ons code filters the payload down to an empty list and the UI shows the fallback empty state.

## 2) What The Frontend Expects

The frontend contract for `GET /guest/store/catalog` is documented in `guidelines/Vibehouse_docs-main/api_routes/04_guest_store.md` and implemented in `lib/booking-api.ts`.

### Expected response shape

The route should return an array of purchasable items directly:

```json
[
  {
    "id": "prod-water-bottle",
    "name": "Water Bottle",
    "category": "COMMODITY",
    "base_price": 100,
    "in_stock": true,
    "available_stock": 50
  },
  {
    "id": "prod-early-checkin",
    "name": "Early Check-in",
    "category": "SERVICE",
    "base_price": 250,
    "in_stock": true,
    "available_stock": null
  }
]
```

### Required item fields

Each item must have:

- `id` as a stable product identifier
- `name` as the display label
- `category` as one of `COMMODITY`, `SERVICE`, `BORROWABLE`, `RETURNABLE`
- `base_price` as a number
- `in_stock` as a boolean
- `available_stock` as a number or `null`

## 3) Important Contract Boundaries

Do not confuse these endpoints:

- `GET /guest/store/catalog` is the paid store catalog for add-ons, essentials, and services that can be added to the cart.
- `GET /guest/store/services` is for free in-house services requested after check-in. Those are not cart items.
- `GET /guest/store/borrowables` is for borrowable inventory, not cart items.
- `GET /guest/booking/rooms` is the room catalog / availability domain and must not be returned from the store catalog route.
- `GET /guest/colive/properties/:property_id/addons` is a separate long-stay add-ons endpoint and returns `{ property_id, addons }`. That shape is acceptable for the colive flow only.

## 4) What The Frontend Is Doing Right Now

The frontend has been updated to be resilient, but it is intentionally conservative so it does not guess incorrectly when the backend shape is wrong.

### Current frontend behavior

- Requests the catalog using the active property ID.
- Accepts these response envelopes if the backend returns them:
  - direct array
  - `{ items: [...] }`
  - `{ data: [...] }`
  - `{ catalog: [...] }`
  - `{ addons: [...] }`
- Filters the final list down to valid store catalog items only.
- Ignores items with `category === "BORROWABLE"` in the booking review cart path.
- Saves the filtered catalog into booking draft state so the add-ons UI can map the selected quantities.

### What happens when the backend returns the wrong shape

If the backend returns room availability data such as `{ property_id, room_types }`, the frontend cannot safely convert that into store items. The result is:

- empty catalog after filtering
- no purchasable add-ons shown
- fallback empty state displayed to the guest

The frontend is not going to invent add-ons from room data, because that would create incorrect cart behavior and incorrect payment totals.

## 5) Desired Backend Behavior

Please make `GET /guest/store/catalog` return the store catalog items for the given property, not room availability.

### Recommended success contract

Return HTTP 200 with either of these options:

#### Option A: direct array, preferred

```json
[
  {
    "id": "prod-toilet-kit",
    "name": "Toilet Kit",
    "category": "COMMODITY",
    "base_price": 180,
    "in_stock": true,
    "available_stock": 32
  }
]
```

#### Option B: stable envelope, acceptable if consistent

```json
{
  "property_id": "60765",
  "items": [
    {
      "id": "prod-toilet-kit",
      "name": "Toilet Kit",
      "category": "COMMODITY",
      "base_price": 180,
      "in_stock": true,
      "available_stock": 32
    }
  ]
}
```

If you choose an envelope, keep it stable across the API. The frontend already tolerates `items`, `data`, `catalog`, and `addons`, but it still requires the inner array to be composed of store catalog items.

## 6) Suggested Backend Fix Areas

Please check the implementation for the `/guest/store/catalog` route and verify:

1. The controller is not calling the room catalog / availability service by mistake.
2. The route does not share a handler or DTO with `/guest/booking/rooms`.
3. The serializer is not converting room records into the catalog response.
4. The endpoint is not returning a fallback response from a different domain when store data is missing.
5. Property scoping uses the query param `property_id` only, and the value is preserved in the returned catalog if you choose an envelope.

## 7) Payload Validation Rules

Please keep the following behaviors stable:

- `property_id` should be read from the query string.
- Catalog items must only include purchasable products.
- Free services must not be mixed into the cart catalog if they are not purchasable.
- Borrowables must remain separate unless they are explicitly add-to-cart eligible.
- Room availability data must never appear in this route.

## 8) Frontend Handling Requirements After Backend Fix

Once the backend returns the correct shape, the frontend will:

- render add-ons normally
- keep the current section order: Add Essentials, Add Services, Events
- keep the red `StickerTag` treatment on the Add Services card
- preserve selected room state across navigation using `vh_property_selection_v1`
- save the booking draft in session storage for review-page continuity

## 9) Current Frontend Files Involved

- `components/booking/booking-checkout-page.tsx`
- `lib/booking-api.ts`
- `components/marketing/property.tsx`
- `lib/property-selection-session.ts`

## 10) Test Cases The Backend Should Verify

Please confirm these cases server-side:

1. `GET /guest/store/catalog?property_id=60765` returns a purchasable catalog array.
2. The response contains only store items and not room availability records.
3. A property with no catalog items returns a valid empty array, not a room response.
4. The response is stable enough for the frontend to parse without domain-specific heuristics.
5. The endpoint returns the same shape in local, staging, and production environments.

## 11) Example of the Incorrect Response We Observed

This is the exact mismatch the frontend saw in the browser session:

```json
{
  "property_id": "60765",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory"
    }
  ]
}
```

This payload is not usable for add-ons/cart selection.

## 12) Backend Decision Needed

Please confirm one of these paths:

1. Fix `GET /guest/store/catalog` to return store items only.
2. If the route was renamed, provide the new canonical route and deprecate the old one with a clear migration note.
3. If an envelope is required, standardize it and document the exact payload.

The frontend is already coded to tolerate a few envelope shapes, but it needs the actual store catalog domain, not room availability.