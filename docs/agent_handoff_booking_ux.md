# Agent Handoff: VibeHouse Booking UX Stabilization & Architecture

**Project:** VibeHouse (The Daily Social)
**Focus:** Frontend Booking UX, State Persistence, and Competitor (Zostel/The Hosteller) Design Standardization.

This document serves as your definitive architectural truth for the core booking components inside The Daily Social. It defines strict rules on how we handle date states, local caching, user login gates, and room-availability API queries.

---

## 1. Context & UX Design Philosophy
We recently overhauled the VibeHouse booking path (flowing through `app/property/page.tsx` and the core `Property` module) to mimic industry leaders like Zostel and The Hosteller. This means:
*   **Frictionless Exploration:** Users can browse rooms, fiddle with dates, and assemble a cart without ever seeing a login screen.
*   **Ephemeral Carts:** Carts are strictly bound to the immediate session.
*   **URL as the Source of Truth:** Direct links containing check-in dates must perfectly rehydrate the UI.

---

## 2. Storage Discipline (Critical Domain Rules)

You **must** respect these storage mechanisms. Deviating from them will revert standard UX bugfixes.

### A. Session Storage (`window.sessionStorage`) — *Ephemeral State*
*   **`BOOKING_DRAFT_KEY` ("vh_booking_draft")**: This stores the user's active checkout intent (dates, selected room instances, base prices, total prices).
*   **Why `sessionStorage`?**: We rigorously moved this out of `localStorage`. If a user selects rooms with specific date-based pricing, then abandons the site, we *want* that cart to die when the tab closes. Rehydrating expired prices via `localStorage` weeks later breaks checkout constraints.
*   **Location:** Handled locally inside `lib/booking-session.ts`.

### B. Local Storage (`window.localStorage`) — *Persistent State*
*   **Auth Tokens & Overrides (`vh_guest_access_token`, `PROFILE_OVERRIDES_KEY`)**: Ensures returning guests remain loosely authenticated.
*   **Receipts (`CONFIRMED_BOOKING_PREFIX`)**: Immutable snapshots of successful checkouts/receipts.
*   **Location:** Mostly interfaced via `components/auth/guest-auth-provider.tsx` and `lib/guest-auth-api.ts`.

---

## 3. Date Selection & API Pipeline Mechanics

### The "Sameday" 400 Error Avoidance
Our backend (and the third-party upstream provider *eZee*) will violently reject availability queries that request same-day bounds (e.g. `checkin: "2026-04-20", checkout: "2026-04-20"`).
*   **The Component Shield:** Our front-end natively clamps the checkout date to be `checkin + 1 day` via `addDays(from, 1)`. 
*   **Fallback Dates:** If a user navigates to a naked URL like `http://localhost:3000/property`, the `property.tsx` component automatically generates `getLocalDate(0)` (Today) and `getLocalDate(1)` (Tomorrow).

### Auto-Triggering Availability (The Zostel Pivot)
When a user visits a naked `/property` URL with no query parameters:
1.  The UI sets internal dates to Today $\rightarrow$ Tomorrow.
2.  A specialized `useEffect` inside `components/marketing/property.tsx` detects this valid default configuration:
    ```javascript
    useEffect(() => {
      // Automatically elevate to a live availability check if the page loaded with valid default dates
      // mimicking Zostel's auto-fill UX pattern.
      if (!availabilityRequestedByUser && hasValidDateRange) {
        setAvailabilityRequestedByUser(true);
      }
    }, [availabilityRequestedByUser, hasValidDateRange]);
    ```
3.  This bypasses the disabled "Catalog-Only" empty state and immediately generates real prices and bookable UI components.

---

## 4. API Endpoints & Display Mitigation State

### The Endpoints (Refer to `docs/be-response-room-pricing-2026-04-21.md`)
1.  **Catalog Fetch:** `/guest/booking/rooms?property_id=...` (Static fallback, uses DB rates, no live inventory count).
2.  **Live Availability Fetch:** `/guest/booking/availability?property_id=...&checkin=...&checkout=...` (Forces live eZee pipeline enriched with DB data).

### UI Guards for Broken Room Pricing (`cx-api.ts`)
The upstream `eZee` API strictly blocks unmapped rates. When this happens, our backend pipeline outputs `base_price_per_night: 0` or `null`.
*   **The Mitigation:** We run `hasUnavailableRoomPrice()` checks mapped securely across the UI.
*   **Behavior:** Instead of saying a room is `Rs. 0`, the UI safely renders `"Price unavailable"`, disables the "Add" button, and shields the user from navigating to checkout with a corrupted cart payload. **Do not remove this guard until backend fully confirms database enrichment on production.**

---

## 5. Late-Auth Workflow

The user only hits the authentication wall precisely at the climax of their intent.
*   In `property.tsx`, when the user clicks **Review Booking** (`continueToCheckout` function), the following occurs:
    1.  Validates the integrity of the cart (nobody selected a disabled `isPriceUnavailable` room).
    2.  Assembles the `BookingDraftRoom[]` into the `BOOKING_DRAFT_KEY` (via `sessionStorage`).
    3.  Evaluates `isAuthenticated`. If false $\rightarrow$ caches standard intent, fires `openAuthModal("signin")`, and breaks.
    4.  If true $\rightarrow$ triggers `router.push("/bookingreview")`.
*   **Your imperative protocol here:** Preserve this exact placement for authentication. Do not move authentication into earlier exploration phases layout walls.

---

## Next Steps For Further Agent Builds
If you are modifying anything around the Cart Review, Checkout, or Payment architecture:
1.  Read payloads from `getStoredBookingState()` located in `lib/booking-session.ts`.
2.  Be keenly aware that cart state is physically volatile (refreshing the page survives, closing the tab destroys).
3.  Build robust redirect handling in `/bookingreview` to safely bounce users back to `/property` if `sessionStorage` fails to rehydrate an active draft (for example, if they bookmarked the review URL directly).
