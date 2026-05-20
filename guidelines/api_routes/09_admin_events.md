# Admin Events — API Routes

> **Base URL**: `http://localhost:8080`
> **Auth**: Bearer token (JWT) — `Authorization: Bearer <token>`
> **All responses**: `Content-Type: application/json`
> **Permission gates**: `events.view` for reads, `events.edit` for writes

---

## Key Concepts

| Term | Meaning |
|---|---|
| **Event** | A social/entertainment event tied to a property (DJ night, pub crawl, yoga session, etc.) |
| **property_id** | Each event belongs to a property — auto-set from the admin's JWT token |
| **is_active** | Controls visibility on the public API. Hidden events still appear in admin but not to guests |
| **badge** | Optional coloured label on the event card (e.g. "Tonight", "Popular", "Sold Out") |
| **poster** | Event image uploaded to S3 via backend proxy. DB stores the S3 file key (not the full URL). Frontend displays via `/public/events/poster?key=<fileKey>` proxy |
| **Hard delete** | Events are permanently deleted, not soft-deleted |

---

## 1. Create Event

**POST** `/admin/events`

Creates a new event for the admin's property.

### Request

| Field | Type | Required | Max Length | Description |
|---|---|---|---|---|
| `title` | string | ✅ | 200 | Event title |
| `description` | string | | — | Full description / details |
| `date` | string (ISO date) | ✅ | — | Event date, e.g. `"2026-04-01"` |
| `time` | string | | 10 | Event time, e.g. `"20:00"` |
| `location` | string | | 200 | Venue / area within property |
| `capacity` | integer | | — | Max attendees (min: 1). Omit for unlimited |
| `price_text` | string | | 100 | Display text, e.g. `"Free for Guests"`, `"₹499"` |
| `contact_link` | string | | 500 | WhatsApp link or URL for RSVP / booking |
| `poster_url` | string | | 500 | S3 URL from the upload-poster endpoint |
| `badge_label` | string | | 30 | Badge text, e.g. `"Tonight"`, `"Sold Out"` |
| `badge_color` | string | | 10 | Badge hex colour, e.g. `"#c62828"` |

#### Body (JSON)
```json
{
  "title": "Neon DJ Night",
  "description": "Electronic music under the stars. Guest DJs from Mumbai.",
  "date": "2026-04-01",
  "time": "21:00",
  "location": "Rooftop Terrace",
  "capacity": 80,
  "price_text": "Free for Guests",
  "contact_link": "https://wa.me/919876543210",
  "poster_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/events/prop-bandra-001/a1b2c3d4.jpg",
  "badge_label": "Tonight",
  "badge_color": "#c62828"
}
```

### Response — 201 Created
```json
{
  "id": "evt-a1b2c3d4",
  "property_id": "prop-bandra-001",
  "title": "Neon DJ Night",
  "description": "Electronic music under the stars. Guest DJs from Mumbai.",
  "date": "2026-04-01T00:00:00.000Z",
  "time": "21:00",
  "location": "Rooftop Terrace",
  "capacity": 80,
  "price_text": "Free for Guests",
  "contact_link": "https://wa.me/919876543210",
  "poster_url": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/events/prop-bandra-001/a1b2c3d4.jpg",
  "badge_label": "Tonight",
  "badge_color": "#c62828",
  "is_active": true,
  "created_by": "a1b2c3d4-...",
  "created_at": "2026-03-23T10:00:00.000Z",
  "updated_at": "2026-03-23T10:00:00.000Z"
}
```

### Errors
| Status | Cause |
|---|---|
| 400 | Missing `title` or `date`, validation failure |
| 401 | Missing / invalid token |
| 403 | User lacks `events.edit` permission |

---

## 2. List Events

**GET** `/admin/events`

Returns all events for the admin's property (both active and hidden), sorted by date descending. Each event includes a computed `is_upcoming` flag.

### Response — 200 OK
```json
[
  {
    "id": "evt-a1b2c3d4",
    "property_id": "prop-bandra-001",
    "title": "Neon DJ Night",
    "description": "Electronic music under the stars.",
    "date": "2026-04-01T00:00:00.000Z",
    "time": "21:00",
    "location": "Rooftop Terrace",
    "capacity": 80,
    "price_text": "Free for Guests",
    "contact_link": "https://wa.me/919876543210",
    "poster_url": "https://...",
    "badge_label": "Tonight",
    "badge_color": "#c62828",
    "is_active": true,
    "created_by": "a1b2c3d4-...",
    "created_at": "2026-03-23T10:00:00.000Z",
    "updated_at": "2026-03-23T10:00:00.000Z",
    "is_upcoming": true
  }
]
```

### Errors
| Status | Cause |
|---|---|
| 401 | Missing / invalid token |
| 403 | User lacks `events.view` permission |

---

## 3. Get Single Event

**GET** `/admin/events/:id`

Returns one event by ID, with `is_upcoming` computed.

### Path Params
| Param | Description |
|---|---|
| `id` | Event ID, e.g. `evt-a1b2c3d4` |

### Response — 200 OK
Same shape as a single item from the list endpoint, with `is_upcoming` included.

### Errors
| Status | Cause |
|---|---|
| 401 | Missing / invalid token |
| 403 | User lacks `events.view` permission |
| 404 | Event not found |

---

## 4. Update Event

**PATCH** `/admin/events/:id`

Partially updates an event. Only provided fields are changed. Also supports toggling `is_active` to hide/publish.

### Path Params
| Param | Description |
|---|---|
| `id` | Event ID |

### Request

All fields from Create are accepted, all optional. Additionally:

| Field | Type | Description |
|---|---|---|
| `is_active` | boolean | `false` to hide from public, `true` to re-publish |

#### Body (JSON) — example: update title and hide
```json
{
  "title": "Neon DJ Night — POSTPONED",
  "is_active": false
}
```

### Response — 200 OK
Returns the full updated event object.

### Errors
| Status | Cause |
|---|---|
| 400 | Validation failure |
| 401 | Missing / invalid token |
| 403 | User lacks `events.edit` permission |
| 404 | Event not found |

---

## 5. Delete Event

**DELETE** `/admin/events/:id`

Permanently deletes an event (hard delete).

### Path Params
| Param | Description |
|---|---|
| `id` | Event ID |

### Response — 200 OK
```json
{
  "message": "Event deleted"
}
```

### Errors
| Status | Cause |
|---|---|
| 401 | Missing / invalid token |
| 403 | User lacks `events.edit` permission |
| 404 | Event not found |

---

## 6. Upload Poster

**POST** `/admin/events/upload-poster`

Uploads an event poster image to S3 via the backend (server-side upload, no CORS issues). The file is sent as `multipart/form-data`.

### Request

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File (multipart) | ✅ | Image file (max 10 MB) |

#### cURL Example
```bash
curl -X POST http://localhost:8080/admin/events/upload-poster \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/poster.jpg"
```

### Response — 201 Created
```json
{
  "fileKey": "events/prop-bandra-001/a1b2c3d4.jpg",
  "fileUrl": "https://vibehouse-kyc-documents.s3.ap-south-1.amazonaws.com/events/prop-bandra-001/a1b2c3d4.jpg"
}
```

### Frontend Upload Example
```typescript
const formData = new FormData();
formData.append('file', file);
const res = await fetch(`${BASE}/admin/events/upload-poster`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
const { fileUrl } = await res.json();
// Use fileUrl when creating/updating the event
await apiCreateEvent(token, { ...eventData, poster_url: fileUrl });
```

### S3 Key Format
```
events/{property_id}/{uuid8}.{ext}
```

### Errors
| Status | Cause |
|---|---|
| 400 | No file provided |
| 401 | Missing / invalid token |
| 403 | User lacks `events.edit` permission |

---

## Permission Matrix

| Role | `events.view` | `events.edit` |
|---|---|---|
| OWNER | ✅ | ✅ |
| MANAGER | ✅ | ✅ |
| RECEPTION | ✅ | ❌ |
| HOUSEKEEPING_LEAD | ❌ | ❌ |
| MAINTENANCE_LEAD | ❌ | ❌ |

---

## Activity Logging

All write operations (`CREATE`, `UPDATE`, `DELETE`) are logged to `admin_activity_log` with:
- `entity_type`: `"events"`
- `entity_id`: the event ID
- `old_value` / `new_value`: full before/after state (JSON)
