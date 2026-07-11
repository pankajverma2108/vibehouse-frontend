# Breakfast Preview and Test Routes

## Purpose

These routes let product owners, property stakeholders, designers, and testers review the breakfast experience without a real stay or backend-issued breakfast token.

Preview scenarios use static fake booking data. They never read or write guest data. **Submit order** and **Skip breakfast** update only the current browser session and show a sample confirmation; they never call the breakfast API.

## Route model

The real and preview experiences intentionally share the same public route shape:

```text
/breakfast/{token}
```

- A backend-issued opaque token uses the real API validation and order workflow.
- An exact allowlisted test token uses its fake scenario and simulated Submit/Skip behavior.
- Any unknown token is treated as a real token and sent to backend validation.

The allowlist uses exact equality. There is no `test-` prefix wildcard.

## Preview indexes

- Local: `http://localhost:3000/breakfast/preview`
- Buteak deployment: `https://buteak.in/breakfast/preview`
- TDS deployment: `https://thedailysocial.co.in/breakfast/preview`

The deployed URL is available only after the frontend version containing this feature is released on that domain.

## Scenario links

Use the path on localhost, Buteak, or TDS by replacing `{origin}` with the required origin.

| Scenario | Route |
|---|---|
| One guest in one room | `{origin}/breakfast/test-OnePax` |
| Two guests and two Plates in one room | `{origin}/breakfast/test-TwoPaxOneRoom` |
| Four guests and four Plates in one room | `{origin}/breakfast/test-FourPaxOneRoom` |
| One booker with three rooms at 1, 2, and 3 eligible adults | `{origin}/breakfast/test-ThreeRooms` |
| Existing submitted two-Plate order | `{origin}/breakfast/test-ExistingOrder` |
| Existing order in the frozen read-only window | `{origin}/breakfast/test-FrozenOrder` |
| All delivery slots full | `{origin}/breakfast/test-AllSlotsFull` |
| TDS branding with two rooms | `{origin}/breakfast/test-TDSTwoRooms` |

### Direct localhost links

- `http://localhost:3000/breakfast/test-OnePax`
- `http://localhost:3000/breakfast/test-TwoPaxOneRoom`
- `http://localhost:3000/breakfast/test-FourPaxOneRoom`
- `http://localhost:3000/breakfast/test-ThreeRooms`
- `http://localhost:3000/breakfast/test-ExistingOrder`
- `http://localhost:3000/breakfast/test-FrozenOrder`
- `http://localhost:3000/breakfast/test-AllSlotsFull`
- `http://localhost:3000/breakfast/test-TDSTwoRooms`

## Tester walkthrough

1. Open the preview index and choose a scenario.
2. Confirm the page header shows **Design preview** and **Submit is simulated**.
3. For a multi-room scenario, switch between every room and verify the room's Plate count matches occupancy.
4. For every Plate, choose one main dish and one available delivery slot.
5. Optionally add sides, beverages, or a special request.
6. Remove a Plate and add it back to verify the occupancy cap.
7. Select **Submit order**.
8. Confirm the **Order submitted** dialog opens with a Plate-by-Plate summary and the message that no order was saved.
9. Close the dialog and use **Edit breakfast choices** to return to the form.
10. Verify **Skip breakfast for Room ...** requires confirmation and affects only that room.
11. Open the frozen scenario and confirm no Submit action is available.
12. Open the all-slots-full scenario and confirm every delivery slot is disabled.

## Real-token production checks

Preview success does not replace a staging test with a backend-issued token. Before release acceptance, verify:

- `GET /public/breakfast/{token}` loads backend rooms, current menu items, slots, window, and existing orders.
- The live menu can contain any number of backend items; the frontend groups all returned active items by `MAIN`, `ADDON`, and `BEVERAGE` and sorts them by `sort_order`.
- `POST /public/breakfast/{token}` saves the selected room and Plate payloads.
- The success response replaces the UI with backend-returned room state and opens the confirmation dialog.
- `409 slot_full` refreshes capacity and asks the guest to select another slot.
- `409 window_frozen` switches the page to read-only.
- Checked-out, revoked, disabled, and invalid tokens show terminal states without exposing guest information.

## Safety and data-isolation rules

- Test fixtures contain no real booking IDs, guest names, phone numbers, or opaque production tokens.
- Test-token Submit and Skip never call GET or POST breakfast APIs.
- Real tokens never use preview fixtures unless they exactly match the explicit test-token allowlist.
- Both route types use `no-referrer` metadata so the token path is not forwarded as a browser referrer.
- Preview pages are marked `noindex, nofollow` and are not linked from the public marketing navigation.
- The preview fixture file must never contain copied production responses with guest data.

## Implementation locations

- Test-token allowlist and fake scenarios: `lib/breakfast-preview.ts`
- Route decision between preview and real API: `app/breakfast/[token]/page.tsx`
- Preview index: `app/breakfast/preview/page.tsx`
- Real API lookup and Submit: `lib/breakfast-api.ts`
- Shared page and simulated mutation behavior: `components/breakfast/breakfast-page.tsx`
