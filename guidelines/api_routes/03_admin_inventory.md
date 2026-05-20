# Admin Inventory — API Routes

> **Base URL**: `http://localhost:8080`
> **Auth**: Bearer token (JWT) — `Authorization: Bearer <token>`
> **All responses**: `Content-Type: application/json`
> **Permission gates**: `inventory.view` for reads, `inventory.edit` for writes, `borrowable.manage` / `borrowable.return_verify` for borrowable ops

---

## Key Concepts

| Term | Meaning |
|---|---|
| **COMMODITY** | Physical chargeable item with tracked stock (towel, blanket, water bottle) |
| **SERVICE** | Time-based or non-physical service — no stock tracking (laundry, room cleaning, early check-in). Free services (₹0) also live here. |
| **BORROWABLE** | Free item lent to guest, must be returned (iron, hair dryer, umbrella). Small unit counts, tracked closely. |
| **product_catalog** | Master list of everything a guest can order or request |
| **inventory** | Stock ledger — one row per product per property. Only COMMODITY and BORROWABLE items have inventory rows. |
| **borrowable_checkouts** | Checkout/return log for borrowed items |

---

## PRODUCT CATALOG

### 1. Create Product

**POST** `/admin/inventory/products`

Creates a product in the catalog. If category is `COMMODITY` or `BORROWABLE`, an inventory row is auto-created with the specified initial stock.

**Permission**: `inventory.edit`

#### Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Product name |
| `description` | string | No | Product description |
| `category` | string | Yes | `COMMODITY` \| `SERVICE` \| `BORROWABLE` |
| `base_price` | number | Yes | Price in INR (use `0` for free/borrowable) |
| `property_id` | string | Yes | Property UUID |
| `initial_stock` | number | No | Initial stock count (ignored for SERVICE). Default: 0 |
| `low_stock_threshold` | number | No | Alert threshold. Default: 5 |

```json
{
  "name": "Bath Towel",
  "description": "Full-size bath towel",
  "category": "COMMODITY",
  "base_price": 200,
  "property_id": "prop-bandra-001",
  "initial_stock": 30,
  "low_stock_threshold": 5
}
```

#### Response — 201 Created
```json
{
  "id": "prod-bath-towel",
  "property_id": "prop-bandra-001",
  "name": "Bath Towel",
  "description": "Full-size bath towel",
  "category": "COMMODITY",
  "base_price": 200,
  "is_active": true,
  "inventory": {
    "id": "inv-xxx-yyy",
    "property_id": "prop-bandra-001",
    "product_id": "prod-bath-towel",
    "total_stock": 30,
    "available_stock": 30,
    "reserved_stock": 0,
    "sold_count": 0,
    "damaged_count": 0,
    "borrowed_out_count": 0,
    "low_stock_threshold": 5,
    "is_low_stock": false,
    "updated_at": "2026-03-13T..."
  }
}
```

For `SERVICE` items, `inventory` will be `null`.

---

### 2. List Products

**GET** `/admin/inventory/products`

Returns all products for the caller's property. OWNER sees all properties.

**Permission**: `inventory.view`

#### Response — 200 OK
```json
[
  {
    "id": "prod-water-bottle",
    "property_id": "prop-bandra-001",
    "name": "Water Bottle",
    "category": "COMMODITY",
    "base_price": 100,
    "is_active": true,
    "inventory": {
      "total_stock": 50,
      "available_stock": 48,
      "damaged_count": 2,
      "is_low_stock": false
    }
  },
  {
    "id": "prod-room-cleaning",
    "name": "Room Cleaning",
    "category": "SERVICE",
    "base_price": 0,
    "is_active": true,
    "inventory": null
  }
]
```

---

### 3. Get Single Product

**GET** `/admin/inventory/products/:id`

**Permission**: `inventory.view`

---

### 4. Update Product

**PATCH** `/admin/inventory/products/:id`

**Permission**: `inventory.edit`

#### Body (JSON) — all optional

| Field | Type | Description |
|---|---|---|
| `name` | string | New name |
| `description` | string | New description |
| `base_price` | number | New price |
| `is_active` | boolean | `false` = hidden from guest PWA |

```json
{
  "base_price": 250,
  "is_active": false
}
```

---

### 5. Delete Product

**DELETE** `/admin/inventory/products/:id`

Hard deletes the product **only if no orders reference it**. If orders exist, returns `409` — use `PATCH` with `is_active: false` instead.

**Permission**: `inventory.edit`

| Status | Scenario |
|---|---|
| `200` | Deleted (including its inventory row) |
| `404` | Product not found |
| `409` | Has existing orders — deactivate instead |

---

## STOCK MANAGEMENT

### 6. List All Stock

**GET** `/admin/inventory/stock`

Returns all inventory rows with product details. Property-scoped for MANAGER; all properties for OWNER.

**Permission**: `inventory.view`

#### Response — 200 OK
```json
[
  {
    "id": "inv-xxx-yyy",
    "property_id": "prop-bandra-001",
    "product_id": "prod-bath-towel",
    "total_stock": 30,
    "available_stock": 28,
    "reserved_stock": 0,
    "sold_count": 2,
    "damaged_count": 0,
    "borrowed_out_count": 0,
    "low_stock_threshold": 5,
    "is_low_stock": false,
    "updated_at": "2026-03-13T...",
    "product": {
      "id": "prod-bath-towel",
      "name": "Bath Towel",
      "category": "COMMODITY",
      "base_price": 200,
      "is_active": true
    }
  }
]
```

---

### 7. Restock (Add Units)

**POST** `/admin/inventory/stock/:productId/restock`

Adds new units to both `total_stock` and `available_stock`.

**Permission**: `inventory.edit`

#### Body (JSON)
```json
{
  "quantity": 20
}
```

The property is auto-detected from the product's inventory row. MANAGER is further scoped to their own property via JWT.

#### Response — 200 OK
Returns the updated inventory row with product details.

---

### 8. Mark Damaged

**POST** `/admin/inventory/stock/:productId/damage`

Decrements `available_stock` and `total_stock`, increments `damaged_count`. Fails if `quantity > available_stock`.

**Permission**: `inventory.edit`

#### Body (JSON)
```json
{
  "quantity": 2,
  "notes": "Iron plate cracked — unit #2"
}
```

#### Error Responses
| Status | Scenario |
|---|---|
| `400` | Quantity exceeds available stock |
| `404` | Inventory not found for this product |

---

### 9. Update Stock Config

**PATCH** `/admin/inventory/stock/:id`

Updates inventory-level config (currently just the low-stock threshold).

**Permission**: `inventory.edit`

`:id` here is the **inventory row UUID** (not the product ID).

#### Body (JSON)
```json
{
  "low_stock_threshold": 3
}
```

---

## BORROWABLE TRACKING

### 10. List Borrowable Inventory

**GET** `/admin/inventory/borrowables`

Returns all BORROWABLE inventory items with their stock levels AND active checkouts (nested). Used to render the Borrowables tab.

**Permission**: `borrowable.manage`

#### Response — 200 OK
```json
[
  {
    "id": "inv-xxx-yyy",
    "property_id": "prop-bandra-001",
    "product_id": "prod-iron",
    "total_stock": 3,
    "available_stock": 2,
    "borrowed_out_count": 1,
    "low_stock_threshold": 1,
    "is_low_stock": false,
    "product": {
      "id": "prod-iron",
      "name": "Iron",
      "category": "BORROWABLE",
      "base_price": 0,
      "is_active": true
    },
    "active_checkouts": [
      {
        "id": "borrow-xxx-yyy",
        "status": "CHECKED_OUT",
        "checked_out_at": "2026-03-13T10:00:00.000Z",
        "unit_code": "IRON",
        "guest": {
          "id": "guest-arjun-001",
          "name": "Arjun Mehta",
          "email": "arjun@thedailysocial.in",
          "phone": "+919000000001"
        },
        "booking": {
          "ezee_reservation_id": "EZEE-BND-2026-001",
          "room_number": "D-101"
        }
      }
    ]
  }
]
```

---

### 11. List Active Checkouts

**GET** `/admin/inventory/borrowables/checkouts`

Returns all active checkout records (`CHECKED_OUT` or `OVERDUE`), flat list with product names.

**Permission**: `borrowable.manage`

---

### 12. Search Active Guests

**GET** `/admin/inventory/borrowables/guests?q=<search>`

Returns guests who have active bookings, filtered by name/email/phone. Used for the borrowable checkout form (debounced search).

**Permission**: `borrowable.manage`

#### Query Parameter
| Param | Required | Description |
|---|---|---|
| `q` | Yes | Search string (name, email, or phone) |

#### Response — 200 OK
```json
[
  {
    "id": "guest-arjun-001",
    "name": "Arjun Mehta",
    "email": "arjun@thedailysocial.in",
    "phone": "+919000000001",
    "bookings": [
      {
        "ezee_reservation_id": "EZEE-BND-2026-001",
        "room_number": "D-101"
      }
    ]
  }
]
```

---

### 13. Borrowable Checkout (Lend to Guest)

**POST** `/admin/inventory/borrowables/:productId/checkout`

Admin lends a borrowable item to a guest. Decrements `available_stock`, increments `borrowed_out_count`, creates a checkout record with `issued_by_admin_id`.

**Permission**: `borrowable.manage`

#### Body (JSON)
```json
{
  "guest_id": "guest-arjun-001",
  "ezee_reservation_id": "EZEE-BND-2026-001"
}
```

#### Response — 201
```json
{
  "message": "Item checked out successfully",
  "checkout_id": "borrow-xxx-yyy"
}
```

| Status | Scenario |
|---|---|
| `400` | Not a BORROWABLE item, or no available stock |
| `404` | Product/guest/booking not found |

---

### 14. Verify Return

**POST** `/admin/inventory/borrowables/:id/verify-return`

Staff confirms a borrowable item has been returned. Updates the checkout record to `RETURNED`, increments `available_stock` back.

**Permission**: `borrowable.return_verify`

#### Body (JSON) — optional
```json
{
  "staff_id": "ZOHO-STAFF-003"
}
```

If `staff_id` is omitted, the logged-in admin's ID is used.

#### Response — 200 OK
```json
{
  "message": "Return verified successfully"
}
```

| Status | Scenario |
|---|---|
| `400` | Item already returned |
| `404` | Checkout not found |

---

## Stock Flow Summary

```
           RESTOCK (+N)          SOLD (guest purchase)       DAMAGED
               │                         │                       │
               ▼                         ▼                       ▼
         total_stock ↑            available_stock ↓       available_stock ↓
         available_stock ↑        sold_count ↑            total_stock ↓
                                                          damaged_count ↑

         BORROWABLE CHECKOUT      BORROWABLE RETURN
               │                         │
               ▼                         ▼
         available_stock ↓        available_stock ↑
         borrowed_out_count ↑     borrowed_out_count ↓
```

---

## Seeded Catalog (Bandra Property)

### Commodities (chargeable, stock-tracked)

| Product ID | Name | Price | Stock | Threshold |
|---|---|---|---|---|
| `prod-water-bottle` | Water Bottle | ₹100 | 50 | 10 |
| `prod-bath-towel` | Bath Towel | ₹200 | 30 | 5 |
| `prod-safe-lock` | Safe Lock | ₹150 | 20 | 5 |
| `prod-toilet-kit` | Toilet Kit | ₹150 | 40 | 10 |
| `prod-blanket` | Blanket | ₹300 | 15 | 3 |
| `prod-locker` | Locker | ₹150 | 25 | 5 |

### Services (no stock tracking)

| Product ID | Name | Price | Notes |
|---|---|---|---|
| `prod-laundry` | Laundry | ₹150 | Chargeable |
| `prod-early-checkin` | Early Check-in | ₹250 | Chargeable |
| `prod-late-checkout` | Late Checkout | ₹250 | Pre-booked rate (same-day is higher) |
| `prod-room-cleaning` | Room Cleaning | ₹0 | Free — triggers SLA ticket |
| `prod-washroom-cleaning` | Washroom Cleaning | ₹0 | Free |
| `prod-garbage-clearance` | Garbage Clearance | ₹0 | Free |
| `prod-linen-change` | Linen Change | ₹0 | Free |
| `prod-wifi-support` | WiFi Support | ₹0 | Free — Maintenance dept |
| `prod-hot-water` | Hot Water Support | ₹0 | Free — Maintenance dept |
| `prod-ac-support` | AC Support | ₹0 | Free — Maintenance dept |
| `prod-other-maintenance` | Other Maintenance | ₹0 | Free — Maintenance dept |
| `prod-first-aid` | First Aid | ₹0 | Free — HIGH priority |
| `prod-staff-assist` | Staff Assistance | ₹0 | Free — Front Office |
| `prod-lost-found` | Lost & Found | ₹0 | Free — Front Office |

### Borrowables (free, must return, stock-tracked)

| Product ID | Name | Stock | Threshold | Notes |
|---|---|---|---|---|
| `prod-iron` | Iron | 3 | 1 | Unit-level tracking recommended |
| `prod-hair-dryer` | Hair Dryer | 2 | 1 | Unit-level tracking recommended |
| `prod-umbrella` | Umbrella | 5 | 2 | |

---

## Permission Matrix

| Route | Required Permission | OWNER | MANAGER | RECEPTION | HK_LEAD | MAINT_LEAD |
|---|---|---|---|---|---|---|
| List products / stock | `inventory.view` | Yes | Yes | Yes | Yes | No |
| Create / Update / Delete product | `inventory.edit` | Yes | Yes | No | Yes | No |
| Restock / Damage | `inventory.edit` | Yes | Yes | No | Yes | No |
| List borrowable inventory / checkouts | `borrowable.manage` | Yes | No | Yes | Yes | No |
| Search active guests | `borrowable.manage` | Yes | No | Yes | Yes | No |
| Borrowable checkout (lend) | `borrowable.manage` | Yes | No | Yes | Yes | No |
| Verify return | `borrowable.return_verify` | Yes | No | No | Yes | No |
