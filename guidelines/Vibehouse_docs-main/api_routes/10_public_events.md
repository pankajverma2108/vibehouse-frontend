# Public Events — API Routes

> **Base URL (prod)**: `https://api.thedailysocial.co.in`
> **Base URL (dev)**: `http://localhost:8080`
> **Auth**: None — these endpoints are fully public (no JWT required)
> **All responses**: `Content-Type: application/json`

> [!IMPORTANT]
> **Breaking change (2026-05-19, multi-property rollout):** `property_id` is no longer optional. The old `DEFAULT_PROPERTY_ID=60765` fallback has been removed because the platform now serves two properties (TDS `60765` + Buteak `55402`). Either pass `?property_id=` explicitly, or call from a recognized hostname so the backend can resolve it via the `Host` header. Missing both returns **400**.

---

## Key Concepts

| Term | Meaning |
|---|---|
| **Public Events** | Only events with `is_active = true` are returned. Hidden events are excluded. |
| **No auth** | These endpoints have no authentication guards — guests, non-guests, and anonymous users can access them |
| **Filter** | `upcoming` (date >= today) or `past` (date < today). Omit for all active events |
| **property_id** | **Required.** Resolution order: (1) `?property_id=` query param, (2) `Host` / `X-Forwarded-Host` header mapping (`www.thedailysocial.co.in` → `60765`, `www.buteak.in` → `55402`). Missing both → 400. |
| **Buteak (property 55402)** | `branding_config.features.events = false` — Buteak doesn't use events. The endpoint still responds 200 with an empty array if called for `55402`. |

---

## 1. List Public Events

**GET** `/public/events`

Returns all active events for a property, optionally filtered by upcoming/past. Each event includes a computed `is_upcoming` flag.

### Query Params

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `property_id` | string | ✅ (or resolvable from Host) | — | Numeric eZee hotel code: `60765` (TDS) or `55402` (Buteak) |
| `filter` | string | | (all) | `"upcoming"` or `"past"` |

### Sort Order
- **Upcoming**: ascending by date (nearest first)
- **Past**: descending by date (most recent first)
- **All (no filter)**: depends on data; upcoming events sorted asc

### Examples
```
GET /public/events?property_id=60765                  → TDS events
GET /public/events?property_id=55402                  → Buteak events (likely empty)
GET /public/events?property_id=60765&filter=upcoming
GET /public/events?filter=past                        → 400 unless Host resolves to a property
GET /public/events    (Host: www.buteak.in)           → Buteak events (Host resolves to 55402)
```

### Errors
| Status | Cause |
|---|---|
| 400 | Neither `?property_id=` nor a recognized `Host` header. Body: `{"statusCode":400,"message":"property_id is required (or call from a known host)"}` |

### Response — 200 OK
```json
[
  {
    "id": "evt-a1b2c3d4",
    "title": "Neon DJ Night",
    "description": "Electronic music under the stars. Guest DJs from Mumbai.",
    "date": "2026-04-01T00:00:00.000Z",
    "time": "21:00",
    "location": "Rooftop Terrace",
    "capacity": 80,
    "price_text": "Free for Guests",
    "contact_link": "https://wa.me/919876543210",
    "poster_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/events/60765/a1b2c3d4.jpg",
    "badge_label": "Tonight",
    "badge_color": "#ff2e62",
    "is_upcoming": true
  }
]
```

> **Note**: Public responses exclude sensitive fields: `property_id`, `is_active`, `created_by`, `created_at`, `updated_at`.

---

## 2. Get Single Public Event

**GET** `/public/events/:id`

Returns a single active event by ID. Returns 404 if the event doesn't exist or is hidden (`is_active = false`).

### Path Params
| Param | Description |
|---|---|
| `id` | Event ID, e.g. `evt-a1b2c3d4` |

### Response — 200 OK
```json
{
  "id": "evt-a1b2c3d4",
  "title": "Neon DJ Night",
  "description": "Electronic music under the stars. Guest DJs from Mumbai.",
  "date": "2026-04-01T00:00:00.000Z",
  "time": "21:00",
  "location": "Rooftop Terrace",
  "capacity": 80,
  "price_text": "Free for Guests",
  "contact_link": "https://wa.me/919876543210",
  "poster_url": "https://...",
  "badge_label": "Tonight",
  "badge_color": "#ff2e62",
  "is_upcoming": true
}
```

### Errors
| Status | Cause |
|---|---|
| 404 | Event not found, or event exists but `is_active = false` |

---

## Response Field Reference

| Field | Type | Description |
|---|---|---|
| `id` | string | `evt-{uuid8}` format |
| `title` | string | Event title (max 200 chars) |
| `description` | string \| null | Event details |
| `date` | string (ISO) | Event date as ISO timestamp |
| `time` | string \| null | Event time, e.g. `"21:00"` |
| `location` | string \| null | Venue name |
| `capacity` | number \| null | Max attendees, or null for unlimited |
| `price_text` | string \| null | Display price text |
| `contact_link` | string \| null | RSVP / contact URL |
| `poster_url` | string \| null | S3 URL of event poster image |
| `badge_label` | string \| null | Badge text (e.g. "Tonight") |
| `badge_color` | string \| null | Badge hex colour (e.g. "#ff2e62") |
| `is_upcoming` | boolean | Computed: `true` if `date >= today` |

---

## 3. Get Event Poster (Image Proxy)

**GET** `/public/events/poster?key=<fileKey>`

Proxies an event poster image from S3 through the backend. This avoids CORS/private-bucket issues — the browser loads the image from the backend, which fetches it from S3 server-side.

### Query Params

| Param | Type | Required | Description |
|---|---|---|---|
| `key` | string | ✅ | S3 file key, e.g. `events/60765/a1b2c3d4.jpg`. **Must** start with `events/` |

### Example
```
GET /public/events/poster?key=events/60765/a1b2c3d4.jpg
```

### Response — 200 OK
- Binary image data streamed directly
- `Content-Type` set from the S3 object (e.g. `image/jpeg`, `image/png`)
- `Cache-Control: public, max-age=86400` (cached for 24 hours)

### cURL Example
```bash
curl -o poster.jpg "http://localhost:8080/public/events/poster?key=events/60765/a1b2c3d4.jpg"
```

### Frontend Usage
```html
<img src="http://localhost:8080/public/events/poster?key=events/60765/a1b2c3d4.jpg" />
```

### Errors
| Status | Cause |
|---|---|
| 400 | Missing `key` param or key doesn't start with `events/` |
| 404 | S3 object not found for the given key |

---

## Usage Notes

- **No payment handling** — paid events show `price_text` and `contact_link` for guests to reach the event organiser
- **Poster images** are stored in S3 under `events/{property_id}/`. The DB stores the S3 file key (e.g. `events/60765/abc.jpg`), and the frontend displays posters via the `/public/events/poster` proxy endpoint
- **Hidden events** (`is_active = false`) are invisible to the public API but still appear in admin endpoints
