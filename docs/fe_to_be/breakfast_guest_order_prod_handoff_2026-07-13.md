# Breakfast Guest Order - Frontend to Backend Production Handoff

**Date:** 2026-07-13

**Audience:** breakfast backend owner and release tester

**Purpose:** record the current guest-order contract, the frontend confirmation flow, production diagnosis, and the exact evidence still needed without exposing a guest token.

## Release scope

The guest page route is `/breakfast/{token}`. A real opaque token is issued through the WhatsApp/WATI invitation and is the only guest credential. There is no guest login or bearer token.

Current frontend production target: `https://thedailysocial.co.in/breakfast/{token}`.

Buteak is a later hosting rollout. At the time of this handoff, `buteak.in` serves a different frontend and must not be treated as proof that the breakfast route is deployed there.

## Canonical API contract

### Read

```http
GET /public/breakfast/:token
Accept: application/json
```

The frontend expects the current handoff shape: `link_state`, `window`, `brand`, `total_adults`, `rooms[]`, `menu[]`, and `slots[]`.

Each room must include:

- `ezee_reservation_id`: opaque room key echoed in POST;
- `room_number`: guest-facing room label;
- `max_plates`: actual breakfast-eligible guest/adult count for this room;
- `order_status`: `PLACED`, `SKIPPED`, or `null`;
- `plates[]`: canonical saved Plate data for `window.service_date`.

`max_plates` must not be the physical capacity of the room type. Example: one actual guest in a two-pax apartment must return `max_plates: 1`. The frontend cannot infer this safely from the room label or inventory and will render the backend value.

### Place, modify, or skip

```http
POST /public/breakfast/:token
Content-Type: application/json
```

```json
{
  "rooms": [
    {
      "ezee_reservation_id": "opaque-id-from-get",
      "action": "ORDER",
      "plates": [
        {
          "slot_id": "slot-id-from-get",
          "items": [{ "menu_item_id": "menu-id-from-get", "qty": 1 }],
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

Resubmission overwrites only the included room's desired Plate state for the backend-selected `window.service_date`. Slot capacity is counted in Plates.

## Frontend mutation sequence

1. The guest completes or explicitly skips every room.
2. `Review Order` becomes available only when mandatory choices are complete.
3. Review opens a receipt grouped as Room -> Plates. No API request is made here.
4. `Edit Order` returns to the unchanged draft.
5. `Confirm Order` sends one POST containing the immutable reviewed payload.
6. A `200` response replaces frontend state with the returned canonical rooms and shows `Order Placed`.
7. A saved order exposes `Edit Order` only. Confirm is shown again only after the guest edits and reviews a new desired state.

Room Skip is staged as part of the same reviewed payload. It is not an immediate separate POST.

## Why an order can look missing in admin

The guest GET chooses the applicable breakfast morning under `window.service_date`. Around or after the ordering cutoff, that date can differ from the calendar date initially shown by the admin order board.

Always verify the guest order in admin using the exact `window.service_date` returned by the guest GET. Checking only the admin screen's default date can make a correctly placed next-morning order appear absent.

After a confirmed POST, verify all three of these with the same disposable test stay:

1. POST returns `200` with the expected canonical room status and Plates.
2. A following guest GET returns the same `PLACED` or `SKIPPED` state for the same `window.service_date`.
3. The admin order list/board queried for that service date shows the room.

## Production diagnosis completed

- The current backend contract and frontend body shape match: both use `rooms[]`, room-keyed `ezee_reservation_id`, `ORDER`/`SKIP`, and per-Plate slots/items.
- Current backend logic derives the room Plate cap from per-room booking guest fields; the frontend consumes the returned `max_plates` and does not use physical room capacity.
- Breakfast CORS preflights from the configured TDS and Buteak origins returned the expected allowed origin, methods, and frontend request headers.
- An invalid token GET returned the terminal `not_found` state without guest data.
- The TDS production host serves the tokenized Next.js breakfast route.
- No authorized disposable real token was available during this diagnosis, so a real production POST and subsequent database/admin observation are not claimed as verified here.

The remaining release gate is one redacted end-to-end run with a disposable real WATI token. Preview confirmation is intentionally API-free and cannot satisfy this gate.

## Error behavior expected by the frontend

| Backend result | Frontend behavior |
|---|---|
| `409 slot_full` | Preserve the draft, refresh GET, invalidate the conflicting slot, and require Review again |
| `409 window_frozen` | Refresh GET and switch to read-only |
| Checked out, revoked, disabled, or not found | Replace the form with the matching terminal state |
| `400` or `403` | Preserve choices and show a safe actionable error |
| Network or `5xx` after POST | Treat as ambiguous and reconcile with GET before allowing another POST |
| `200` | Use returned canonical rooms; do not construct success from the draft alone |

If backend validation can return stable machine-readable error codes and refreshed slots, keep those fields consistent with the public handoff so the frontend can focus the affected room/slot.

## Backend checks for actual guest count

For the reported one-guest/two-pax-room case, capture only redacted field values and verify:

- per-room `no_of_adults` and `no_of_guests` in the booking/PMS cache;
- the value selected by the breakfast room-cap calculation;
- emitted `rooms[].max_plates`;
- `total_adults` equals the sum of returned room caps;
- no room-type maximum, bed capacity, or apartment marketing capacity is substituted.

If GET emits `max_plates: 2` for a room with one actual eligible guest, the correction belongs in PMS synchronization or backend derivation. The frontend must not guess a lower number.

## Preview isolation

Exact allowlisted preview tokens such as `test-OneGuestInTwoPaxRoom` use fake frontend fixtures and never call breakfast GET or POST. All other tokens use normal backend validation. There is no `test-*` wildcard bypass.

Do not use preview routes to diagnose persistence.

## Privacy rules for evidence

Do not place any of the following in logs, screenshots, documentation, tickets, or chat:

- opaque breakfast token or full tokenized URL;
- guest phone or WhatsApp identifier;
- guest name;
- full eZee reservation identifier.

Safe evidence includes response status, redacted room label, Plate count, service date, machine-readable error code, and whether the following GET/admin query matched.
