# Product vs Inventory in Vibe House

If you have ever wondered why some items appear in `product_catalog` but not in `inventory`, this guide is for you.

**TL;DR** — A *Product* is **what** a guest can order. *Inventory* is **how much** of it you have in stock. Not every product needs stock tracking, so not every product gets an inventory row.

---

## The Two Tables at a Glance

| Aspect | `product_catalog` | `inventory` |
|---|---|---|
| **Purpose** | Master menu of everything a guest can order or request | Stock ledger — tracks quantities on hand |
| **One row per** | Unique item/service at a property | Unique *stockable* item at a property |
| **Covers** | COMMODITY, SERVICE, BORROWABLE | COMMODITY and BORROWABLE only |
| **Key fields** | `name`, `category`, `base_price`, `is_active` | `total_stock`, `available_stock`, `reserved_stock`, `sold_count`, `damaged_count`, `borrowed_out_count` |

> Think of `product_catalog` as the **menu on the wall** and `inventory` as the **shelf behind the counter**.

---

## The Three Product Categories

### 1. COMMODITY — Physical, Chargeable, Stock-Tracked

These are items a guest pays for and keeps. Each sale reduces your available stock.

| Product | Base Price | Has Inventory Row? |
|---|---|---|
| Water Bottle | Rs 100 | Yes |
| Bath Towel (extra) | Rs 200 | Yes |
| Extra Blanket | Rs 300 | Yes |

**Example:** Vibe House Bandra stocks 50 water bottles. When a guest buys one, `available_stock` drops from 50 to 49 and `sold_count` goes from 0 to 1.

### 2. SERVICE — Non-Physical, No Stock to Track

Services are fulfilled by staff or third parties. There is nothing to count on a shelf, so they have **no inventory row at all**.

| Product | Base Price | Has Inventory Row? |
|---|---|---|
| Room Cleaning | Rs 0 (free) | No |
| Laundry | Rs 150 | No |
| Early Check-in | Rs 250 | No |

**Example:** A guest requests Room Cleaning. The system creates a task/ticket for housekeeping. No stock numbers change because there is no stock — just staff time.

### 3. BORROWABLE — Free to Use, Must Return, Closely Tracked

These are items lent to guests at no charge. The guest does not keep them; they must be returned. Because quantities are small (a property might own only 3 irons), every checkout and return is logged in `borrowable_checkouts`.

| Product | Base Price | Has Inventory Row? |
|---|---|---|
| Iron | Rs 0 | Yes |
| Hair Dryer | Rs 0 | Yes |
| Umbrella | Rs 0 | Yes |

**Example:** Vibe House Bandra owns 3 irons. A guest borrows one: `available_stock` drops from 3 to 2 and `borrowed_out_count` goes from 0 to 1. When the guest returns it, those numbers reverse.

---

## How Stock Numbers Change

The table below shows what happens to the `inventory` row for each type of event.

| Event | `total_stock` | `available_stock` | `sold_count` | `damaged_count` | `borrowed_out_count` |
|---|---|---|---|---|---|
| **Restock** (new units arrive) | +N | +N | — | — | — |
| **Sold** (guest buys a commodity) | — | -1 | +1 | — | — |
| **Damaged** (unit written off) | -1 | -1 | — | +1 | — |
| **Borrowable Checkout** (guest borrows) | — | -1 | — | — | +1 |
| **Borrowable Return** (guest returns) | — | +1 | — | — | -1 |

### Walkthrough: Water Bottle at Vibe House Bandra

Starting state:

```
total_stock: 50   available_stock: 50   sold_count: 0   damaged_count: 0
```

1. **Guest buys 1 bottle** — `available_stock` 50 -> 49, `sold_count` 0 -> 1
2. **Staff finds 2 damaged bottles** — `total_stock` 50 -> 48, `available_stock` 49 -> 47, `damaged_count` 0 -> 2
3. **Restock of 20 bottles arrives** — `total_stock` 48 -> 68, `available_stock` 47 -> 67

Final state:

```
total_stock: 68   available_stock: 67   sold_count: 1   damaged_count: 2
```

### Walkthrough: Iron (Borrowable) at Vibe House Bandra

Starting state:

```
total_stock: 3   available_stock: 3   borrowed_out_count: 0
```

1. **Guest A borrows an iron** — `available_stock` 3 -> 2, `borrowed_out_count` 0 -> 1
2. **Guest B borrows an iron** — `available_stock` 2 -> 1, `borrowed_out_count` 1 -> 2
3. **Guest A returns the iron** — `available_stock` 1 -> 2, `borrowed_out_count` 2 -> 1
4. **Guest C tries to borrow** — `available_stock` is 2, so allowed. `available_stock` 2 -> 1, `borrowed_out_count` 1 -> 2

Final state:

```
total_stock: 3   available_stock: 1   borrowed_out_count: 2
```

---

## Quick Decision Flowchart

```
Is it a physical item the guest keeps?
  YES -> COMMODITY (has inventory row, base_price > 0)

Is it something staff do or a time-based perk?
  YES -> SERVICE (no inventory row, price may be 0 or > 0)

Is it a physical item the guest borrows and returns?
  YES -> BORROWABLE (has inventory row, base_price = 0)
```

---

## Common Confusion, Clarified

| Question | Answer |
|---|---|
| "Why does Room Cleaning have no inventory row?" | Because it is a SERVICE. There is no physical stock to count — it is fulfilled by staff time. |
| "Why does a free item like Iron have an inventory row?" | Because it is BORROWABLE. Even though it is free, the property owns a finite number of irons and needs to know how many are available. |
| "Can a SERVICE have a price?" | Yes. Laundry costs Rs 150, Early Check-in costs Rs 250. Price and stock tracking are independent concepts. |
| "Where do I see who currently has an iron?" | In the `borrowable_checkouts` table, which logs every checkout and return event per guest. |
| "What triggers a low-stock alert?" | When `available_stock` drops to or below the `low_stock_threshold` value set on the inventory row. |
