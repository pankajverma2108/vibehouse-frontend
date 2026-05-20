# Guest APIs — Catalog, Services, Borrowables

**Generated:** May 5, 2026

This document lists all API endpoints the app hits for guest add-ons, services, borrowables and related flows, maps them to the fields used in `docs/add-ons_services_&_upsells_findings.md`, and compares what's available vs what's required by the product spec.

---

## 1) Endpoints hit during exploration

We called the following public endpoints for `property_id=60765`:

- GET /guest/store/catalog?property_id=60765
  - Response payload (example):
    - `value`: array of catalog items. Each item includes:
      - `id` (string)
      - `name` (string)
      - `description` (string|null)
      - `category` ("COMMODITY" | "SERVICE" | "BORROWABLE" | "RETURNABLE")
      - `base_price` (number)
      - `in_stock` (boolean)
      - `available_stock` (number|null)
    - `Count` (number)

- GET /guest/store/services?property_id=60765
  - Response payload: `value` array (empty in our checks) and `Count`.

- GET /guest/store/borrowables?property_id=60765
  - Response payload: `value` array (contained Hair Dryer with available=0, total=0 in our check) and `Count`.

Example actual fetched combined result (summarized):
- Catalog: Water Bottle (COMMODITY), Locker (RETURNABLE), Laundry Service (SERVICE)
- Services: [] (empty)
- Borrowables: Hair Dryer (available: 0, total: 0)

---

## 2) APIs used by the frontend code (search results)

The codebase references the following guest-store endpoints via `lib/guest-experience-api.ts` and `lib/booking-api.ts`:

- GET /guest/store/catalog
- GET /guest/store/services
- GET /guest/store/borrowables
- GET /guest/store/cart/:eri
- POST /guest/store/cart/:eri/add
- PATCH /guest/store/cart/:eri/item/:itemId
- DELETE /guest/store/cart/:eri/item/:itemId
- POST /guest/store/:eri/borrowable/request
- GET /guest/store/:eri/borrowable/mine
- POST /guest/store/:eri/service/request
- POST /guest/store/cart/:eri/checkout

Payment-related endpoints:
- POST /payment/create-order
- POST /payment/verify
- POST /payment/fail
- POST /payment/create-colive-order (colive)
- POST /payment/verify-colive

Booking-related endpoints (booking-api.ts):
- GET /guest/booking/mine
- POST /guest/booking/link
- POST /guest/booking/create-order
- POST /guest/colive/quote
- POST /guest/colive/draft-booking
- /guest/kyc/* endpoints

---

## 3) Fields required by `docs/add-ons_services_&_upsells_findings.md`

From reading `docs/add-ons_services_&_upsells_findings.md`, the product expects the following data (not exhaustive but key fields):

- For commodities (non-returnable):
  - id, name, description, category, base_price, in_stock, available_stock, margin, cost, branding, shelf_life, delivery_sla, return_policy

- For returnables/borrowables:
  - id, name, available (current), total (stock), category, delivery_sla, return_process, anti_hoarding_rules, damage_policy

- For services:
  - id, name, description, category (SERVICE), base_price, sla, turnaround_time, availability_rules, slot_cap, dynamic_pricing params

- For cart/checkout flows:
  - cart items: id, product_id, name, unit_price, quantity, total_price
  - checkout response: order_id, payment_id, total, items_count
  - payment create/verify responses: razorpay_order_id, amount, currency, payment_id, order_id

- Operational and meta fields (used in doc): supplier, expected_annual_units, seasonality, bundle definitions — these are product/business data not returned by the API but stored in CMS/ops configs

---

## 4) Comparison: Available fields vs Required fields

- `GET /guest/store/catalog` provides most inventory fields needed for frontend: id, name, description, category, base_price, in_stock, available_stock.
  - Missing: margin, cost, supplier, branding, shelf_life, delivery_sla, return_policy, seasonality, bundle tags.
  - Recommendation: extend catalog API or separate CMS to include business metadata (cost, margin, supplier, shelf life) or keep a local mapping in ops CSV.

- `GET /guest/store/services` returned empty in current property. The catalog contained `Laundry Service` as a `SERVICE` category item, but `/guest/store/services` is empty — indicates the backend may populate services either in catalog or services endpoint variably.
  - Recommendation: standardize source of truth. Either move all SERVICE items to `/guest/store/services` or ensure catalog items with category SERVICE are surfaced in `getServices` wrapper.

- `GET /guest/store/borrowables` returned a `Hair Dryer` with available=0, total=0. The borrowables endpoint supports `available` and `total` fields which match doc needs.
  - Missing borrowable metadata: delivery_sla, anti_hoarding_rules, damage_policy; recommendation: add optional metadata in borrowables API.

- Cart & Borrow flows: APIs exist (`addToCart`, `getCart`, `updateCartItem`, `requestBorrow`, `getBorrowMine`) and match the UI usage.

- Payment & Checkout: Endpoints exist and are used by `modules/guest/checkout.tsx`.

---

## 5) app/guest folder vs APIs used on guest pages

The `app/guest/*` pages primarily redirect legacy routes to the guest hub; real interactive components are in `modules/guest/*` and `components/guest/*` which call the APIs.

Key modules & APIs they call:

- `modules/guest/addons.tsx`
  - Calls `useGuestCatalog` which uses: GET /guest/store/catalog, GET /guest/store/services, GET /guest/store/borrowables
  - Calls cart APIs: GET /guest/store/cart/:eri, POST /guest/store/cart/:eri/add, PATCH/DELETE cart item

- `modules/guest/borrow.tsx`
  - Calls `useGuestCatalog` and GET /guest/store/:eri/borrowable/mine and POST /guest/store/:eri/borrowable/request

- `modules/guest/services.tsx` (not expanded here but imports `requestService`)
  - Calls POST /guest/store/:eri/service/request

- `modules/guest/checkout.tsx`
  - Calls GET /guest/store/cart/:eri, getBorrowMine, POST /guest/store/cart/:eri/checkout, POST /payment/create-order, POST /payment/verify

So yes—the same endpoints we called manually are the ones used on guest pages. The discrepancy noted: `GET /guest/store/services` is empty while `Laundry Service` exists in the `GET /guest/store/catalog` response; the UI expects services to be available either via catalog or services API.

---

## 6) Gaps & Recommendations (summary)

1. Missing business metadata for catalog items (cost, margin, supplier, seasonality, delivery SLA, branding) — add optional fields to `/guest/store/catalog` or maintain a separate ops CMS.
2. Standardize where SERVICE items are published (catalog vs services endpoint). Ensure `getServices` and `getCatalog` are aligned or `useGuestCatalog` merges SERVICE-category catalog items into services when `getServices` is empty.
3. Add optional metadata to borrowables: delivery_sla, anti_hoarding_rules, damage_policy, return_instructions.
4. Provide endpoints or CSV import for bulk seeding of add-ons (for ops). A `POST /admin/store/catalog/bulk` can be useful (protected).
5. Document dynamic pricing fields (slot caps, next-day occupancy thresholds) either in service item payload or separate pricing API.

---

## 7) Files inspected (high level)

- `lib/guest-experience-api.ts` — high-level guest store APIs
- `lib/booking-api.ts` — booking & store catalog helpers
- `modules/guest/addons.tsx`, `modules/guest/borrow.tsx`, `modules/guest/checkout.tsx` — UI modules driving flows
- `hooks/use-guest-catalog.ts` — orchestrates parallel fetch of catalog, services, borrowables
- `app/guest/*` — route redirects to hub
- `docs/add-ons_services_&_upsells_findings.md` — product spec

---

## 8) Next steps I can take (pick any)

- Create a small CSV from `docs/add-ons_services_&_upsells_findings.md` format to seed backend.
- Implement a small middleware in `useGuestCatalog` to merge `SERVICE` items from catalog into services when `getServices` is empty.
- Propose API schema extensions for business metadata and prepare a draft API contract.


---

End of `guest_apis.md`.
