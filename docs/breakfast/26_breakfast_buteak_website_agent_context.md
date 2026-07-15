# Buteak Website Breakfast Ordering Agent Context

**Date:** 2026-07-14

**Source implementation:** `C:\Space\Vibehouse_frontend`

**Target implementation:** `C:\Space\buteak_website`

**Purpose:** give the `buteak_website` agent enough current context to rebuild the production breakfast guest screens from The Daily Social in the Buteak website app, using Buteak's own identity and repo patterns.

## 1. Task for the Buteak agent

Implement the guest breakfast ordering flow in `C:\Space\buteak_website`.

The Buteak version must preserve the same product behavior, backend contract, preview contract, validations, confirmation flow, and error handling that now work in `Vibehouse_frontend`, but it must look and feel like Buteak:

- bright Buteak red-and-white identity;
- Manrope typography from the Buteak repo;
- Buteak logo and visual language;
- no The Daily Social dark theme;
- no nested cards-inside-cards;
- no customer-facing backend/internal copy;
- no hardcoded menu, slots, rooms, or guest count for real tokens.

The implementation should be functional and production-safe first. Visual polish comes after the route, API calls, validation, review receipt, confirm mutation, and recovery states are correct.

## 2. Current production behavior to port

The source implementation in `Vibehouse_frontend` has this flow:

```text
Guest opens /breakfast/{token}
  -> frontend checks exact preview-token allowlist
  -> preview token: render fake fixture, never call breakfast API
  -> real token: GET /public/breakfast/:token
  -> render terminal, frozen, saved, or editable state
  -> guest completes or skips every room
  -> Review Order opens receipt, no API call
  -> Edit Order returns to draft
  -> Confirm Order sends one POST
  -> response canonical rooms become saved receipt
  -> saved receipt shows Edit Order only
```

The real guest route is:

```text
/breakfast/:token
```

Expected live Buteak URL:

```text
https://buteak.in/breakfast/:token
```

The link is sent from WhatsApp/WATI. The token is the only credential. There is no guest login, no bearer token, and no guest-session requirement.

## 3. Source files in `Vibehouse_frontend`

Use these files as behavioral references. Do not copy the TDS dark styling blindly.

| Source file | What it contains |
|---|---|
| `app/breakfast/[token]/page.tsx` | Next.js route wrapper, exact preview-token branch, noindex/no-referrer metadata |
| `app/breakfast/preview/page.tsx` | Preview index listing exact fake-token links |
| `lib/breakfast-api.ts` | Public GET/POST types, response normalization, error payload handling |
| `lib/breakfast-order.ts` | Draft creation, validation, payload building, review receipt building, capacity checks, ambiguous-submit matching |
| `lib/breakfast-preview.ts` | Exact preview token allowlist and fake fixture scenarios |
| `components/breakfast/breakfast-page.tsx` | Page state machine, loading/error/frozen/saved/editing/review/confirm flow |
| `components/breakfast/breakfast-order-form.tsx` | Room selector, Plate controls, main dish, optional extras, slot picker, requests, inline validation |
| `components/breakfast/breakfast-order-summary.tsx` | Saved receipt and review receipt details |
| `components/breakfast/breakfast-confirmation-dialog.tsx` | Review/placed receipt dialog and staged room-skip dialog |
| `components/breakfast/breakfast-state-panel.tsx` | Loading, retry, and terminal link-state screens |
| `components/breakfast/*.test.tsx` and `lib/breakfast-*.test.ts` | Focused behavior tests to reproduce in the target app where practical |

## 4. Target repo facts from read-only inspection

`C:\Space\buteak_website` is not a Next.js app. It is a Vite + React + TypeScript SPA with React Router.

Important target files and patterns:

| Target file | Current fact |
|---|---|
| `src\App.tsx` | Owns `BrowserRouter`, lazy page imports, and `<Route>` entries |
| `src\services\api-client.ts` | Shared `requestJson` wrapper; defaults to `https://api.thedailysocial.co.in`; adds `X-Forwarded-Host` as `www.buteak.in` on local hosts |
| `src\services\feedback-api.ts` | Good reference for public token-based route transport and safe result wrappers |
| `src\index.css` | Buteak CSS variables: `--bt-red`, `--bt-red-hover`, `--bt-bg`, `--bt-section`, `--bt-surface`, `--bt-text`, `--bt-text-muted`, `--bt-border`, `--bt-focus-ring`, Manrope |
| `src\components\ui\*` | Existing shadcn/Radix primitives including dialog, button, checkbox, radio group, textarea, select, toast |
| `public\images\logo.svg` | Buteak logo used by the navbar |
| `public\images\features-images\complimentary-breakfast.png` and related assets | Optional breakfast-themed visual assets if a small supporting image is useful |

The target repo was dirty during this context pass. The Buteak agent must run `git status --short` before edits and preserve unrelated user changes.

## 5. Docs to treat as current source of truth

Attach or ask the Buteak agent to read these from `C:\Space\Vibehouse_frontend`:

1. `docs/breakfast/26_breakfast_buteak_website_agent_context.md` - this file.
2. `docs/fe_to_be/breakfast_guest_order_prod_handoff_2026-07-13.md` - current production FE/BE contract and resolved backend context.
3. `guidelines/Vibehouse_docs-main/api_routes/22_breakfast_cx_FE_handoff.md` - current guest contract, per-room and per-plate.
4. `guidelines/Vibehouse_docs-main/api_routes/21_admin_breakfast_FE_handoff.md` - admin workflow context, slots/menu/order board ownership.
5. `guidelines/Vibehouse_docs-main/api_routes/21_admin_breakfast.md` - exact admin API contract for menu, slots, orders, dashboard, invites.
6. `docs/breakfast/24_breakfast_stakeholder_workflow.md` - operations and stakeholder walkthrough.
7. `docs/breakfast/25_breakfast_preview_and_test_routes.md` - exact preview routes and safety boundaries.

Attach or ask the Buteak agent to read these from `C:\Space\buteak_website`:

1. `.codex/migration_context/PROJECT_CONTEXT.md`
2. `.codex/migration_context/RECENT_CODEX_SUMMARIES.md`
3. `.codex/migration_context/CODEX_SESSION_INDEX.md`
4. `.codex/migration_context/MANIFEST.md`
5. `docs/BUTEAK_THEME_IDENTITY.md`
6. `src/App.tsx`
7. `src/services/api-client.ts`
8. `src/services/feedback-api.ts`
9. `src/index.css`
10. Existing `.agents` instructions, especially mobile and motion instructions if present.

Do not use the older `C:\Space\buteak_website\docs\breakfast\22_breakfast_cx_FE_handoff.md` as the final contract without comparing it to the current `Vibehouse_docs-main/api_routes/22_breakfast_cx_FE_handoff.md`. The older Buteak copy may still describe the historical single-room/single-order contract.

## 6. API contract for the Buteak page

### GET

```http
GET /public/breakfast/:token
Accept: application/json
```

Current valid response shape:

```json
{
  "link_state": "valid",
  "window": {
    "state": "open",
    "service_date": "2026-07-12",
    "opens_at_ist": "2026-07-11 11:00 IST",
    "closes_at_ist": "2026-07-12 07:00 IST"
  },
  "brand": "BUTEAK",
  "total_adults": 3,
  "rooms": [
    {
      "ezee_reservation_id": "opaque-room-id",
      "room_number": "404",
      "max_plates": 2,
      "order_status": "PLACED",
      "plates": [
        {
          "plate_number": 1,
          "slot_id": "slot-id",
          "slot_label": "7:30 - 8:00 AM",
          "status": "PLACED",
          "special_requests": "No onion",
          "items": [
            { "menu_item_id": "menu-id", "name": "Masala Dosa", "qty": 1 }
          ]
        }
      ]
    }
  ],
  "menu": [
    {
      "id": "menu-id",
      "name": "Masala Dosa",
      "description": "Backend-provided copy",
      "category": "MAIN",
      "is_veg": true,
      "sort_order": 3
    }
  ],
  "slots": [
    {
      "id": "slot-id",
      "slot_number": 1,
      "label": "7:30 - 8:00 AM",
      "start_min": 450,
      "end_min": 480,
      "capacity": 12,
      "booked": 8,
      "remaining": 4,
      "sort_order": 1
    }
  ]
}
```

Terminal response:

```json
{
  "link_state": "not_found",
  "brand": "BUTEAK"
}
```

Supported `link_state` values:

| Value | UI |
|---|---|
| `valid` | Continue to `window.state` rendering |
| `disabled` | Breakfast is not available at this property |
| `checked_out` | Stay has ended |
| `revoked` | Link is no longer active |
| `not_found` | Link is invalid |

Supported `window.state` values:

| Value | UI |
|---|---|
| `open` | Editable ordering UI |
| `frozen` | Read-only saved order, or no-order message with next opening time |

### POST

```http
POST /public/breakfast/:token
Content-Type: application/json
```

Current payload shape:

```json
{
  "rooms": [
    {
      "ezee_reservation_id": "opaque-room-id-from-get",
      "action": "ORDER",
      "plates": [
        {
          "slot_id": "slot-id-from-get",
          "items": [
            { "menu_item_id": "menu-id-from-get", "qty": 1 }
          ],
          "special_requests": "No onion"
        }
      ]
    },
    {
      "ezee_reservation_id": "second-room-id-from-get",
      "action": "SKIP",
      "plates": []
    }
  ]
}
```

Success:

```json
{
  "ok": true,
  "rooms": [
    {
      "ezee_reservation_id": "opaque-room-id",
      "room_number": "404",
      "max_plates": 2,
      "order_status": "PLACED",
      "plates": []
    }
  ]
}
```

The frontend must merge returned rooms into the current GET response and verify the returned canonical room state matches the reviewed payload before showing success. If the response is missing a submitted room or cannot be reconciled, perform a GET and verify before declaring success.

## 7. Source-of-truth rules

- Backend owns link validity, stay validity, actual per-room guest count, service date, ordering window, rooms, saved order, menu, slots, and slot capacity.
- `rooms[].max_plates` means actual breakfast-eligible adults/guests for that room. It is not the physical max occupancy of the room type.
- A two-pax room booked by one actual guest must render one Plate if backend returns `max_plates: 1`.
- The frontend must not infer Plate count from room label, bed type, marketing copy, PMS room capacity, or inventory.
- Menu items must come from `menu[]`.
- Slots must come from `slots[]`.
- Slot capacity is counted in Plates, not rooms.
- Ordering window is controlled by `window.state`, not device time.
- Service date must be displayed from `window.service_date`, not the user's calendar date.

## 8. Guest UI requirements

### Header

For Buteak, use:

```text
Buteak Suites Menu
```

Supporting copy should stay short and guest-facing, for example:

```text
Choose complimentary breakfast for each guest in your stay.
```

Use the Buteak logo from the target repo. Do not show TDS headings or the TDS dynamic greeting sticker. A small `COMPLIMENTARY` sticker is acceptable if it fits Buteak's visual language.

### Stay context

Show:

- stay or room count;
- total breakfast guests from `total_adults`;
- breakfast date from `window.service_date`.

Avoid internal phrases like:

- "backend listed";
- "backend guests";
- "contract-valid";
- "fixture";
- "payload";
- "test order" on real token pages.

### Room selection

If `rooms.length === 1`, no room selector is required.

If `rooms.length > 1`, show a room selector with:

- `Room {room_number}`;
- state: `Complete`, `Needs choices`, or `Skipped`;
- clear selected state;
- keyboard and touch support.

The guest must be able to skip one room without skipping another room.

### Plate model

For each room:

- initialize Plate 1 through Plate N from `room.max_plates`;
- allow removing Plates down to zero;
- allow adding Plates back only up to `room.max_plates`;
- label as `Plate 1`, `Plate 2`, etc.;
- each Plate represents one breakfast guest's order.

If a room has zero Plates and is not explicitly skipped, the room is incomplete.

### Menu controls

For every ordered Plate:

- exactly one `MAIN` item is required;
- `ADDON` and `BEVERAGE` items are optional;
- show vegetarian/non-vegetarian state from `is_veg`;
- preserve backend sort order;
- use backend descriptions when supplied;
- do not hardcode Buteak menu items in production code.

The main dish should be a radio group or another single-choice accessible control. In the source implementation it is a radio group, which is a good default.

Optional items can use quantity steppers or checkboxes. Source uses quantity steppers capped at 5 for addons/beverages.

### Slots

For every ordered Plate:

- one slot is required;
- show `slot.label`;
- mark full slots as unavailable;
- do not hide full slots;
- count aggregate requested Plates against effective slot availability.

Effective availability for overwrite validation:

```text
slot.remaining + saved plates from this booking already using the slot
```

This allows guests to edit an existing order without falsely blocking their own currently saved slot usage.

### Special requests

Per Plate:

- optional textarea;
- max length should match source implementation unless backend gives a different limit: 500 chars;
- show current count;
- use persistent label, not placeholder-only copy.

### Primary actions

Primary editable-state action:

```text
Review Order
```

It must be disabled until every room is either complete or explicitly skipped.

Secondary room action:

```text
Skip Breakfast for Room {room_number}
```

Skip opens a confirmation dialog and stages the skip locally. It must not POST immediately.

### Review receipt

On `Review Order`, open a modal/dialog titled:

```text
Review Your Order
```

No API call is made when this opens.

Receipt grouping:

```text
Breakfast date
Room
  Plate
    slot
    main
    optional items
    special request
```

Buttons:

- `Edit Order` - secondary, high contrast, not disabled-looking;
- `Confirm Order` - primary red action.

Confirm sends the immutable reviewed snapshot, not whatever the form changes to while the dialog is open.

### Placed receipt

After success, show:

```text
Order Placed
```

The saved receipt should expose `Edit Order` only while `window.state === "open"`.

Do not show a second `Confirm Order` on a saved order until the guest chooses Edit, changes or reviews the draft, and returns to the review dialog.

### Frozen/read-only state

When `window.state === "frozen"`:

- disable all editable controls;
- show saved order if it exists;
- if no saved order exists, show a concise no-order state;
- show the next opening time from `window.opens_at_ist`.

Do not use device time to decide whether the page is open.

## 9. Error and reconciliation behavior

| Result | Required behavior |
|---|---|
| Client validation | Preserve draft, show inline errors, focus first invalid field, switch room if needed |
| `409 slot_full` | Close review, refresh slots/GET, preserve choices, invalidate affected slot |
| `409 window_frozen` | Refresh canonical state and switch to read-only |
| `checked_out`, `revoked`, `disabled`, `not_found` | Replace with terminal state without stay details |
| `400` or `403` | Preserve choices, show safe actionable error |
| Network or `5xx` after POST | Treat as ambiguous; GET before offering another Confirm |
| Ambiguous GET matches reviewed payload | Treat as success |
| Ambiguous GET does not match | Preserve safe draft and require Review again |
| Malformed success body | Do not construct fake success; show service error/reconcile |

Prevent duplicate in-flight POSTs.

Never log, display, document, or send to analytics:

- full breakfast token;
- full `/breakfast/{token}` URL;
- guest phone;
- guest name;
- full eZee reservation identifier.

## 10. Preview route requirements

The target Buteak repo should provide preview routes for testers because there is no backend preview endpoint.

Use the same public route model:

```text
/breakfast/:token
```

Exact allowlisted preview tokens:

| Token | Scenario |
|---|---|
| `test-OnePax` | One guest in one room |
| `test-OneGuestInTwoPaxRoom` | One actual guest in a physically two-pax room; exactly one Plate |
| `test-TwoPaxOneRoom` | Two guests and two Plates in one room |
| `test-FourPaxOneRoom` | Repeated Plate controls |
| `test-ThreeRooms` | One booker with three rooms |
| `test-ExistingOrder` | Saved placed order |
| `test-FrozenOrder` | Saved order in read-only/frozen window |
| `test-AllSlotsFull` | All delivery slots full |
| `test-TDSTwoRooms` | Optional compatibility scenario from source; in Buteak this can be kept only if useful for parity testing |

Preview index:

```text
/breakfast/preview
```

Preview invariants:

- exact allowlist only;
- no `startsWith("test-")` bypass;
- fake fixtures contain no real guest/reservation/token/phone data;
- preview load never calls `GET /public/breakfast/:token`;
- preview Confirm never calls `POST /public/breakfast/:token`;
- preview Confirm shows the same placed receipt behavior in browser state only;
- every non-allowlisted token must call the real backend validation path.

In the Vite SPA, implement this in the page/component layer:

- route `/breakfast/preview` to a preview index page;
- route `/breakfast/:token` to a page using `useParams`;
- if token is exactly allowlisted, render fixture with `simulateSubmit`;
- otherwise call the real API.

## 11. Buteak design direction

Use `C:\Space\buteak_website\docs\BUTEAK_THEME_IDENTITY.md` and current `src/index.css` as the Buteak visual source.

Core tokens already present:

```css
--bt-red: #c62828;
--bt-red-hover: #8e1b1b;
--bt-bg: #ffffff;
--bt-section: #f8f6f4;
--bt-surface: #fcfaf8;
--bt-text: #111111;
--bt-text-muted: #4b4b4b;
--bt-border: #ddd6d1;
--bt-focus-ring: rgba(198, 40, 40, 0.22);
--bt-font-sans: "Manrope", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Design rules for this feature:

- bright page canvas, not the TDS near-black background;
- red primary action buttons;
- white/off-white surfaces;
- near-black primary text and neutral secondary text;
- light warm borders;
- restrained red-tint selected states;
- semantic fieldsets and dividers instead of nested card shells;
- one main page scroller and one modal scroller;
- 16px mobile form text;
- focus rings in Buteak red;
- no decorative gradient orbs;
- no customer-facing explanatory copy about backend/contracts.

Cards are allowed for repeated items only if they are not nested inside another card. Prefer flat sections, separators, fieldsets, and whitespace.

## 12. Suggested target file plan

Keep the implementation modular but not over-engineered.

Recommended additions in `C:\Space\buteak_website`:

| Target file | Purpose |
|---|---|
| `src/services/breakfast-api.ts` | Type definitions, normalizers, `getPublicBreakfast`, `submitPublicBreakfast` using `requestJson` |
| `src/lib/breakfast-order.ts` | Draft creation, validation, payload/review builders, slot availability, reconciliation helpers |
| `src/lib/breakfast-preview.ts` | Exact preview token allowlist and fake scenarios |
| `src/pages/BreakfastPage.tsx` | React Router page using `useParams`, preview-vs-real branch, page state machine |
| `src/pages/BreakfastPreviewIndexPage.tsx` | `/breakfast/preview` list of scenarios |
| `src/components/breakfast/BreakfastOrderForm.tsx` | Room/Plate/menu/slot/request form |
| `src/components/breakfast/BreakfastOrderSummary.tsx` | Review and saved receipt details |
| `src/components/breakfast/BreakfastConfirmationDialog.tsx` | Review/placed modal and skip-room dialog |
| `src/components/breakfast/BreakfastStatePanel.tsx` | Loading, retry, terminal, frozen empty states |
| `src/components/breakfast/BreakfastSticker.tsx` or local utility | Small Buteak sticker if no existing equivalent fits |

Recommended `src\App.tsx` additions:

```tsx
const BreakfastPage = lazy(() => import("./pages/BreakfastPage"));
const BreakfastPreviewIndexPage = lazy(() => import("./pages/BreakfastPreviewIndexPage"));

// add above the catch-all route:
<Route path="/breakfast/preview" element={<BreakfastPreviewIndexPage />} />
<Route path="/breakfast/:token" element={<BreakfastPage />} />
```

Do not use Next.js `metadata`, server components, or `Image` APIs in the Vite target.

## 13. API transport notes for Buteak

Use the target repo's `requestJson` instead of adding a second API client.

Current `requestJson` behavior:

- resolves API origin through `VITE_GUEST_API_ORIGIN` or default;
- on local hosts, uses current origin for proxied API calls;
- sets `X-Forwarded-Host` to `www.buteak.in` locally unless overridden;
- sends `Accept: application/json`;
- sends JSON body when provided;
- throws `ApiRequestError` on non-2xx.

For breakfast:

- path is `/public/breakfast/${encodeURIComponent(token)}`;
- no auth token;
- no guest bearer;
- no localStorage token;
- keep `cache: "no-store"` where possible;
- normalize responses before trusting them;
- convert `ApiRequestError` into safe request result objects like `feedback-api.ts`.

If production Buteak needs a different API origin than the current default, update env/deploy config rather than hardcoding a special origin inside breakfast components.

## 14. Tests and validation expected

At minimum, the Buteak implementation should validate:

- exact preview allowlist;
- unknown `test-*` token uses real API path;
- one actual guest in two-pax room renders one Plate;
- multi-room room selector and independent per-room Skip;
- `Review Order` disabled until every room is complete or skipped;
- Review opens without POST;
- Edit returns to draft with choices preserved;
- Confirm sends exactly one POST for real tokens;
- preview Confirm sends no API request;
- saved receipt exposes Edit only;
- `409 slot_full` preserves choices and refreshes slots;
- `409 window_frozen` becomes read-only;
- terminal link states do not leak room data;
- malformed API response does not produce fake success;
- no duplicate POSTs on rapid Confirm taps.

Suggested commands in target repo:

```powershell
npm run typecheck
npm run build_dev
npm run lint
```

If the target repo has no unit test runner wired for this surface, add focused tests only if local patterns exist. Otherwise document manual/browser verification clearly.

Browser checks:

- `http://localhost:{vite-port}/breakfast/preview`
- `http://localhost:{vite-port}/breakfast/test-OnePax`
- `http://localhost:{vite-port}/breakfast/test-OneGuestInTwoPaxRoom`
- `http://localhost:{vite-port}/breakfast/test-TwoPaxOneRoom`
- `http://localhost:{vite-port}/breakfast/test-ThreeRooms`
- `http://localhost:{vite-port}/breakfast/test-ExistingOrder`
- `http://localhost:{vite-port}/breakfast/test-FrozenOrder`
- `http://localhost:{vite-port}/breakfast/test-AllSlotsFull`

Inspect at 320px, 390px, and desktop. Check keyboard focus, dialog close/focus return, no horizontal overflow, no nested scroll trap, and no preview API calls in the network panel.

Production persistence cannot be verified with preview tokens. It requires an authorized disposable real WATI token and must not record the full tokenized URL.

## 15. Copy rules

Allowed customer-facing labels:

- `Buteak Suites Menu`
- `Choose complimentary breakfast for each guest in your stay.`
- `Choose a room`
- `Build each plate`
- `Plate 1`
- `Choose one main`
- `Delivery slot`
- `Special requests`
- `Review Order`
- `Review Your Order`
- `Edit Order`
- `Confirm Order`
- `Order Placed`
- `Skip Breakfast for Room {room_number}`
- `Breakfast skipped`
- `Breakfast ordered`
- `Breakfast ordering is closed.`
- `This breakfast link is invalid.`
- `This link is no longer active.`

Avoid customer-facing phrases:

- backend;
- source of truth;
- fixture;
- payload;
- contract;
- validation contract;
- adults listed by backend;
- test order on real pages;
- Buteak/TDS implementation notes.

## 16. Agent implementation sequence

1. Read all attached/current docs.
2. Read the Buteak migration context and current `src\App.tsx`, `src\services\api-client.ts`, `src\services\feedback-api.ts`, `src\index.css`.
3. Check `git status --short` in `C:\Space\buteak_website` and identify unrelated dirty files.
4. Produce a planning-first implementation plan using 5.6-Sol, with exact files to add/change and validation gates.
5. Implement the API/types and preview fixtures first.
6. Add React Router routes.
7. Build the page state machine and form behavior.
8. Apply Buteak styling and copy.
9. Add focused tests if repo patterns support them.
10. Run typecheck/build/lint as feasible.
11. Do a browser pass on preview routes.
12. Document any unverified production-token gate.

## 17. Ready-to-paste prompt for the Buteak agent

```text
You are in C:\Space\buteak_website. Use 5.6-Sol planning first. Do not implement until you have read the context files and written a concrete plan.

Goal:
Port the production guest breakfast ordering screens from C:\Space\Vibehouse_frontend into this Buteak Vite/React app. The elements, content model, API calls, preview behavior, confirmation flow, validation, and error handling should match the working The Daily Social implementation, but the UI must use Buteak's identity: red-and-white, Manrope, Buteak logo, white/off-white surfaces, near-black text, light warm borders, and restrained red accents. Do not copy the TDS dark theme.

Read first:
1. C:\Space\Vibehouse_frontend\docs\breakfast\26_breakfast_buteak_website_agent_context.md
2. C:\Space\Vibehouse_frontend\docs\fe_to_be\breakfast_guest_order_prod_handoff_2026-07-13.md
3. C:\Space\Vibehouse_frontend\guidelines\Vibehouse_docs-main\api_routes\22_breakfast_cx_FE_handoff.md
4. C:\Space\Vibehouse_frontend\guidelines\Vibehouse_docs-main\api_routes\21_admin_breakfast_FE_handoff.md
5. C:\Space\Vibehouse_frontend\guidelines\Vibehouse_docs-main\api_routes\21_admin_breakfast.md
6. C:\Space\Vibehouse_frontend\docs\breakfast\24_breakfast_stakeholder_workflow.md
7. C:\Space\Vibehouse_frontend\docs\breakfast\25_breakfast_preview_and_test_routes.md
8. C:\Space\buteak_website\.codex\migration_context\PROJECT_CONTEXT.md
9. C:\Space\buteak_website\.codex\migration_context\RECENT_CODEX_SUMMARIES.md
10. C:\Space\buteak_website\.codex\migration_context\CODEX_SESSION_INDEX.md
11. C:\Space\buteak_website\.codex\migration_context\MANIFEST.md
12. C:\Space\buteak_website\docs\BUTEAK_THEME_IDENTITY.md
13. C:\Space\buteak_website\src\App.tsx
14. C:\Space\buteak_website\src\services\api-client.ts
15. C:\Space\buteak_website\src\services\feedback-api.ts
16. C:\Space\buteak_website\src\index.css
17. Existing .agents instructions in C:\Space\buteak_website, especially mobile and motion instructions if present.

Use these skills/instructions if available:
- frontend-design
- react-best-practices or vercel-react-best-practices
- web-design-guidelines
- design-taste-frontend
- existing .agents design and motion instructions
- existing framer-motion dependency only if motion is needed; do not install another animation library.

Important current contract:
- Real route: /breakfast/:token
- Preview index: /breakfast/preview
- Exact preview tokens only: test-OnePax, test-OneGuestInTwoPaxRoom, test-TwoPaxOneRoom, test-FourPaxOneRoom, test-ThreeRooms, test-ExistingOrder, test-FrozenOrder, test-AllSlotsFull, and optional parity token test-TDSTwoRooms.
- Unknown test-* tokens must not bypass backend validation.
- Real GET: GET /public/breakfast/:token
- Real POST: POST /public/breakfast/:token
- POST body is { rooms: [{ ezee_reservation_id, action: "ORDER" | "SKIP", plates: [{ slot_id, items: [{ menu_item_id, qty }], special_requests? }] }] }
- GET returns link_state, window, brand, total_adults, rooms[], menu[], slots[].
- rooms[].max_plates is actual breakfast-eligible guests/adults for that room, not physical room capacity.
- Backend is authoritative for menu, slots, rooms, service date, actual guest count, saved order, and ordering window.

Required UX:
- Heading: Buteak Suites Menu.
- Every room must be completed or explicitly skipped before Review Order enables.
- One room can be skipped independently of another.
- Each ordered Plate requires exactly one MAIN and one slot.
- Addons/beverages are optional and backend-owned.
- Review Order opens a receipt and must not POST.
- Review dialog has Edit Order and Confirm Order.
- Confirm Order sends one POST for real tokens.
- Preview Confirm simulates success and never calls the breakfast API.
- Saved Order Placed receipt shows Edit Order only.
- Frozen window is read-only.
- Inline errors, focus first invalid field, preserve choices after recoverable errors.
- No customer-facing backend/internal wording.
- No nested container/card structure.

Target repo implementation shape:
- This is Vite + React Router, not Next.js.
- Add routes in src\App.tsx above the catch-all route:
  /breakfast/preview
  /breakfast/:token
- Reuse src\services\api-client.ts for transport.
- Consider adding:
  src/services/breakfast-api.ts
  src/lib/breakfast-order.ts
  src/lib/breakfast-preview.ts
  src/pages/BreakfastPage.tsx
  src/pages/BreakfastPreviewIndexPage.tsx
  src/components/breakfast/*

Validation:
- Run npm run typecheck.
- Run npm run build_dev.
- Run npm run lint if feasible; report pre-existing noise separately.
- Browser-check preview routes at mobile 320px, 390px, and desktop.
- Verify preview Confirm has no GET/POST breakfast API request.
- Do not claim production persistence without a disposable real WATI token.

Safety:
- Run git status before edits.
- Preserve unrelated dirty files.
- Do not log or expose breakfast tokens, full tokenized URLs, phone numbers, guest names, or full eZee reservation IDs.
- Do not hardcode production menu/slot/room data for real tokens.
- Do not widen auth or require guest login.
```

