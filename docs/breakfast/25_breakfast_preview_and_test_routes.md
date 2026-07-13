# Breakfast Preview and Test Routes

## Purpose

These exact routes let stakeholders, designers, and testers review breakfast ordering without a real booking or backend-issued token.

Preview fixtures are fake and local to the frontend. Preview load and `Confirm Order` never read or write the breakfast API. Confirmation changes only the current browser session.

## Route model

Both real and preview pages use:

```text
/breakfast/{token}
```

- A backend-issued opaque token follows real GET validation and real POST confirmation.
- An exact allowlisted test token uses a fake fixture and simulated confirmation.
- Any unknown token, including an unknown `test-*` token, follows real backend validation.
- There is no prefix wildcard.

## Available origins

- Local preview index: `http://localhost:3000/breakfast/preview`
- Current TDS deployment: `https://thedailysocial.co.in/breakfast/preview`
- Buteak: later rollout; do not use `https://buteak.in/breakfast/preview` as acceptance evidence until the Buteak host deploys this Next.js route.

## Exact preview links

Replace `{origin}` with `http://localhost:3000` or the deployed TDS origin.

| Scenario | Route |
|---|---|
| One guest in one room | `{origin}/breakfast/test-OnePax` |
| One actual guest in a physically two-pax apartment | `{origin}/breakfast/test-OneGuestInTwoPaxRoom` |
| Two guests and two Plates in one room | `{origin}/breakfast/test-TwoPaxOneRoom` |
| Four guests and repeated Plate controls | `{origin}/breakfast/test-FourPaxOneRoom` |
| One booker with three rooms | `{origin}/breakfast/test-ThreeRooms` |
| Existing submitted order | `{origin}/breakfast/test-ExistingOrder` |
| Existing order in a frozen window | `{origin}/breakfast/test-FrozenOrder` |
| All delivery slots full | `{origin}/breakfast/test-AllSlotsFull` |
| TDS branding with two rooms | `{origin}/breakfast/test-TDSTwoRooms` |

### Direct localhost links

- `http://localhost:3000/breakfast/test-OnePax`
- `http://localhost:3000/breakfast/test-OneGuestInTwoPaxRoom`
- `http://localhost:3000/breakfast/test-TwoPaxOneRoom`
- `http://localhost:3000/breakfast/test-FourPaxOneRoom`
- `http://localhost:3000/breakfast/test-ThreeRooms`
- `http://localhost:3000/breakfast/test-ExistingOrder`
- `http://localhost:3000/breakfast/test-FrozenOrder`
- `http://localhost:3000/breakfast/test-AllSlotsFull`
- `http://localhost:3000/breakfast/test-TDSTwoRooms`

## Tester walkthrough

1. Open `/breakfast/preview` and choose a scenario.
2. Confirm the preview notice says the submission is simulated.
3. Open `test-OneGuestInTwoPaxRoom`; verify the apartment label implies two-pax capacity but the page renders only Plate 1 because backend `max_plates` is one.
4. Open a multi-room scenario and complete or Skip every room independently.
5. Verify room navigation distinguishes complete, incomplete, and skipped rooms.
6. Verify `Review Order` remains disabled until all mandatory room and Plate choices are complete.
7. Select one main and one available slot for each ordered Plate; optionally select extras and requests.
8. Select `Review Order`; verify no network request is made and a receipt opens in Room -> Plate order.
9. Select `Edit Order`; verify all choices are preserved.
10. Review again and select `Confirm Order`; verify the sample `Order Placed` receipt opens and no breakfast GET or POST is made.
11. Verify the saved receipt exposes only `Edit Order` as its action.
12. Open `test-ExistingOrder`; verify the saved summary initially exposes only Edit.
13. Open `test-FrozenOrder`; verify the saved order is read-only.
14. Open `test-AllSlotsFull`; verify full slots remain visible and unavailable.

## Real-token production checks

Preview success does not prove backend persistence. With an authorized disposable WATI token, verify:

- `GET /public/breakfast/{token}` supplies the correct rooms, actual per-room eligible guest count under `max_plates`, service date, menu, slots, and saved order;
- Review opens without POST;
- `Confirm Order` sends exactly one `POST /public/breakfast/{token}` with the reviewed Room/Plate payload;
- the success response becomes the saved receipt;
- a following GET reports `PLACED` or `SKIPPED` room state matching the receipt;
- the admin order view is checked for the same `window.service_date`, not merely its default date;
- `409 slot_full` preserves choices and requests another slot;
- `409 window_frozen` switches to read-only;
- invalid, checked-out, revoked, and disabled links expose no stay details.

Never paste the real token or full tokenized URL into logs, screenshots, docs, tickets, or chat.

## Safety rules

- Fake fixtures contain no real booking IDs, names, phones, or production tokens.
- Exact allowlisting is the only preview bypass.
- Preview Confirm and Skip are simulated and never call the breakfast API.
- Non-allowlisted tokens always use backend validation.
- Breakfast token routes use `no-referrer`; preview routes use `noindex, nofollow`.
- CDN, proxy, and observability access logs still require server-side token-path redaction.

## Implementation locations

- Test-token allowlist and fixtures: `lib/breakfast-preview.ts`
- Real-versus-preview route decision: `app/breakfast/[token]/page.tsx`
- Preview index: `app/breakfast/preview/page.tsx`
- API transport: `lib/breakfast-api.ts`
- Shared review and confirmation behavior: `components/breakfast/breakfast-page.tsx`
