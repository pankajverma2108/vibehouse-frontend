# API vs Frontend Comparison (Cx Scope)

Date: 2026-03-25

Backend base: https://vibehousebackend-production.up.railway.app
Source of truth: Database/API payloads

## Scope Covered

Current Cx pages reviewed:
- Home
- Property
- Events

API route docs reviewed:
- 01_admin_auth.md
- 02_guest_auth.md
- 03_admin_inventory.md
- 04_guest_store.md
- 05_booking_linking_and_kyc.md
- 06_payment.md
- 07_guest_booking.md
- 08_admin_bookings.md
- 09_admin_events.md
- 10_public_events.md

## 1) What API/DB Has But Frontend Does Not Yet Surface

### A. Events (Public + Admin Events)
- API fields not fully surfaced in current Cx cards:
  - id
  - description
  - contact_link
  - is_upcoming
  - capacity as number (UI currently expects text)
  - poster_url can be null
- API provides active/inactive control and upcoming/past filtering; current Cx pages are static content-driven.
- Public event poster proxy endpoint exists (`/public/events/poster?key=...`) but current Cx UI does not use it.

### B. Property Availability/Pricing (Guest Booking)
- API provides dynamic room inventory and pricing:
  - available_beds
  - total_beds
  - base_price_per_night
  - total_price
  - floor_range
  - amenities
  - room type metadata (`id`, `slug`, `type`, `beds_per_room`)
- Current Property availability cards are static text values (`inventoryText`, `basePrice`) from local content.
- Room availability endpoint is query-driven by date; current UI calculates totals locally from static base prices.

### C. Home Pricing Sync
- Home room cards currently read static prices from content.
- API can supply live room pricing/inventory per selected date range, but home cards are not connected.
- Home event cards are static; API-backed events are not used.

### D. Commerce Metadata
- Store/catalog endpoint provides live product prices and stock signals.
- Home upsell section is currently design content only and does not bind to product IDs/prices.

### E. Operational Workflows Already Available in Backend (UI not built yet)
- Guest auth/profile
- Booking link + KYC slot workflows
- Cart/checkout/payment
- Booking create + booking payment flow
- Borrowables/services requests

## 2) What Frontend Has But API/DB Does Not Guarantee

### A. Hardcoded Content/Taxonomy
- Static room categories currently include labels that may not match API room types exactly.
- Static event weekly lineup and past memories are marketing-only content, not API-backed.
- Static badge labels/colors may differ from API responses or be null.

### B. Frontend Shape Assumptions
- Event card expects non-null strings for date/time/location/price/image.
- Room cards assume `price` and `occupancy` are preformatted strings.
- Current components assume arrays exist and are in expected shape.

### C. Value Formatting Differences
- API dates are ISO timestamps; frontend displays handcrafted date strings.
- API time is typically 24-hour string (e.g., `21:00`); frontend may display custom formats.

## 3) Contract Risks (Must Handle in Adapter)

- Empty arrays (`[]`) for events or room types.
- Partial objects (missing `time`, `location`, `poster_url`, `price_text`, `amenities`).
- Null values in event and catalog fields.
- Unknown or changing category enums (`COMMODITY`, `SERVICE`, `BORROWABLE`, observed `RETURNABLE`).
- Mixed response shapes (array/object/string), especially under error or proxy changes.

## 4) Live Mock Snapshot (Railway, 2026-03-25)

### Room prices
- rt-6dorm: 449/night
- rt-4dorm: 599/night
- rt-queen: 1999/night

### Catalog samples
- Water Bottle: 100
- Safe Lock: 150
- Toilet Kit: 150
- Locker: 150
- Early Check-in: 250
- Late Checkout: 250
- Laundry: 150

### Event samples
- Neon DJ Night: Free for Guests
- Old City Pub Crawl: Rs. 599
- Live Local Music: Free for Guests

## 5) Immediate Implementation Decision

Planned order per product direction:
1. Property availability/pricing dynamic integration.
2. Home pricing/event sync dynamic integration (show max 3 events).
3. Events page dynamic integration for multiple events.

## 6) Fallback Content Rules (Approved)

- Generic fallback label for missing operational details: "Details on arrival".
- If no events, still render card shells with CTA-oriented placeholders.
- 12-hour time + dd/mm/yyyy date rendering for all API dates/times.
- Database/API remains source of truth; frontend displays normalized values from adapters.
