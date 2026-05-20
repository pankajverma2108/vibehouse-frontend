# Frontend Migration Guide — Room Availability Split

> **For**: Frontend developer
> **Date**: 2026-04-13
> **Author**: Backend team
> **Applies to**: Property page / Room listing + Booking flow

---

## What Changed and Why

Previously there was a single endpoint to browse rooms:
```
GET /guest/booking/rooms?property_id=...&checkin=...&checkout=...
```

This had a critical UX bug: **the eZee `RoomList` API only returns rooms that have availability on the requested dates.** If all beds for a room type were fully booked, that room type silently disappeared from the response — customers couldn't even see it existed.

We've now split this into **two endpoints with separate responsibilities**:

| Endpoint | Purpose | Dates? | eZee API used |
|---|---|---|---|
| `GET /guest/booking/rooms` | Catalog — all rooms always | ❌ None | `get_rooms` (Vacation Rental) |
| `GET /guest/booking/availability` | Live counts + rates for specific dates | ✅ Required | `RoomList` |

---

## New User Flow on the Property Page

```
User lands on property page
         │
         ▼
◆ CALL 1: GET /guest/booking/rooms?property_id=...
  → Render all room cards immediately with base prices
  → No dates needed, page loads fast
         │
         ▼
User selects check-in / check-out dates
         │
         ▼
◆ CALL 2: GET /guest/booking/availability?property_id=...&checkin=...&checkout=...
  → Overlay live availability onto existing cards
  → Update prices with live eZee rates
  → Grey out / disable cards where inventory_state = "sold_out"
         │
         ▼
User clicks "Book" on an available room
         │
         ▼
POST /guest/booking/create-order  (auth required)
```

---

## Call 1 — Room Catalog (no dates)

```
GET /guest/booking/rooms?property_id=60765
```

**Response shape**:
```json
{
  "property_id": "60765",
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "slug": "4-bed-mixed-dorm",
      "type": "DORM",
      "beds_per_room": 4,
      "total_beds": 64,
      "base_price_per_night": 500,
      "floor_range": "2-5",
      "amenities": ["AC", "Shared Bathroom", "WiFi", "Personal Locker"],
      "ezee_room_type_id": "6076500000000000001",
      "physical_room_count": 16
    },
    {
      "id": "rt-ka-queen",
      "name": "Queen Size Room",
      "slug": "queen-room",
      "type": "PRIVATE",
      "beds_per_room": 1,
      "total_beds": 14,
      "base_price_per_night": 1500,
      "floor_range": "1-5",
      "amenities": ["AC", "Attached Bathroom", "WiFi", "TV"],
      "ezee_room_type_id": "6076500000000000002",
      "physical_room_count": 14
    }
  ]
}
```

**What to render with this**:
- All room cards with name, type, amenities, floor range
- Show `base_price_per_night` as "From ₹X/night" (indicative, may change when dates are selected)
- No Book button yet — user hasn't selected dates
- No availability badges yet

---

## Call 2 — Live Availability (dates selected)

```
GET /guest/booking/availability?property_id=60765&checkin=2026-04-20&checkout=2026-04-21
```

**Response shape** (same rooms, now with live data):
```json
{
  "property_id": "60765",
  "checkin_date": "2026-04-20",
  "checkout_date": "2026-04-21",
  "no_of_nights": 1,
  "room_types": [
    {
      "id": "rt-ka-4dorm",
      "name": "4 Bed Mixed Dormitory",
      "available_beds": 61,
      "inventory_state": "available",
      "base_price_per_night": 500,
      "total_price": 500,
      "ezee_rate_plan_id": "6076500000000000001",
      "ezee_rate_type_id": "6076500000000000001"
      ...
    },
    {
      "id": "rt-ka-queen",
      "name": "Queen Size Room",
      "available_beds": 0,
      "inventory_state": "sold_out",
      "base_price_per_night": 1500,
      "total_price": 1500,
      ...
    }
  ]
}
```

---

## How to Render `inventory_state`

> [!IMPORTANT]
> Rooms are **always returned** from both endpoints — even sold-out ones. Do NOT hide them. Grey them out so customers know the room type exists and can try different dates.

| `inventory_state` | `available_beds` | Card state | Badge | Book button |
|---|---|---|---|---|
| `"available"` | ≥ 3 | Normal | — | Enabled |
| `"limited"` | 1–2 | Normal with warning | `"Only {N} left"` (amber) | Enabled |
| `"sold_out"` | 0 | **Greyed out** | `"Sold Out"` (grey) | **Disabled** |

### CSS suggestion for sold-out cards
```css
.room-card.sold-out {
  opacity: 0.5;
  filter: grayscale(60%);
  pointer-events: none; /* or keep for UX — just disable the Book button */
}

.room-card.sold-out .book-btn {
  background: #9ca3af;
  cursor: not-allowed;
}

.badge.sold-out {
  background: #6b7280;
  color: white;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
}

.badge.limited {
  background: #f59e0b;
  color: white;
}
```

### Example card logic (pseudocode)
```jsx
function RoomCard({ room }) {
  const soldOut = room.inventory_state === 'sold_out';
  const limited = room.inventory_state === 'limited';

  return (
    <div className={`room-card ${soldOut ? 'sold-out' : ''}`}>
      <h3>{room.name}</h3>
      <p>From ₹{room.base_price_per_night}/night</p>

      {soldOut && <Badge variant="grey">Sold Out</Badge>}
      {limited && <Badge variant="amber">Only {room.available_beds} left</Badge>}

      <AmenitiesList items={room.amenities} />

      <button
        disabled={soldOut}
        onClick={() => onBook(room)}
      >
        {soldOut ? 'Unavailable' : 'Book Now'}
      </button>
    </div>
  );
}
```

---

## Two-Call Implementation Pattern

```js
// 1. Load catalog on page mount (no dates needed)
useEffect(() => {
  fetch(`/guest/booking/rooms?property_id=${propertyId}`)
    .then(r => r.json())
    .then(data => setRooms(data.room_types));
}, [propertyId]);

// 2. Load live availability when dates are selected
useEffect(() => {
  if (!checkin || !checkout) return;

  setLoadingAvailability(true);

  fetch(`/guest/booking/availability?property_id=${propertyId}&checkin=${checkin}&checkout=${checkout}`)
    .then(r => r.json())
    .then(data => {
      // Merge availability into room cards (match by id)
      setRooms(prev =>
        prev.map(room => {
          const live = data.room_types.find(r => r.id === room.id);
          return live ? { ...room, ...live } : room;
        })
      );
    })
    .finally(() => setLoadingAvailability(false));
}, [checkin, checkout, propertyId]);
```

> The merge by `id` means: catalog data (amenities, descriptions) is preserved, and live availability + price is overlaid on top when dates change.

---

## Fields to Use at Each Step

| Field | Source | Use |
|---|---|---|
| `name`, `slug`, `type` | `/rooms` | Card label, routing, type badge |
| `amenities`, `floor_range` | `/rooms` | Feature list on card |
| `beds_per_room` | `/rooms` | "4-bed dorm" label |
| `base_price_per_night` | `/rooms` | "From ₹X/night" before dates selected |
| `physical_room_count` | `/rooms` | Optional: "16 rooms available" |
| `available_beds` | `/availability` | "N beds left" counter |
| `inventory_state` | `/availability` | Grey out / badge logic (see above) |
| `base_price_per_night` | `/availability` | **Live rate** — use this for pricing after dates selected |
| `total_price` | `/availability` | Total for selected nights — show in cart |
| `ezee_rate_plan_id` | `/availability` | Pass through to `create-order` (backend needs it) |
| `ezee_rate_type_id` | `/availability` | Pass through to `create-order` (backend needs it) |

---

## What NOT to Change

- `POST /guest/booking/create-order` — **no change to this endpoint**
- `POST /payment/create-booking-order` — **no change**
- `POST /payment/verify` or webhook — **no change**
- Auth flow — **no change**

---

## FAQ

**Q: What if the user hasn't selected dates yet — should I still show prices?**
Yes — show `base_price_per_night` from `/rooms` as "From ₹X/night". Once dates are selected, replace it with the live rate from `/availability`.

**Q: Should sold-out rooms be clickable?**
No need for them to be bookable, but you may want to keep them visible so the user knows the room type exists. You could add a "Try different dates" CTA on the sold-out card.

**Q: The `/availability` response has `no_of_nights` — should I use it?**
Yes — use `total_price` (= `base_price_per_night × no_of_nights`) for displaying the total cost in the cart, not a manually computed value.

**Q: Do I need to pass `ezee_*` IDs back to the backend?**
No — `create-order` only needs `room_type_id` (our internal DB ID). The backend looks up eZee IDs itself. You don't need to forward them.
