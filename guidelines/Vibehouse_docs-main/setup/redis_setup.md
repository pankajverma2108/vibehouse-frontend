# Redis Cache Setup — Vibe House Backend

## 1. Overview

Redis is used as a **read-only cache** to reduce database load. The DB remains the single source of truth for all write operations.

**What gets cached:**
| Data | Cache Key Pattern | TTL | Why |
|---|---|---|---|
| Guest catalog (COMMODITY + paid SERVICE) | `catalog:{propertyId}` | 10 min | High-frequency guest browsing |
| Free services list | `services:{propertyId}` | 10 min | Rarely changes |
| Borrowable availability | `borrowables:{propertyId}` | 10 min | Updated via invalidation on checkout/return |
| Admin product list | `admin:products:{propertyId}` | 10 min | Dashboard refreshes |
| Admin stock list | `admin:stock:{propertyId}` | 10 min | Dashboard refreshes |
| Admin JWT `is_active` check | `jwt:admin:{adminId}` | 60 sec | Runs on every authenticated request |
| Guest JWT existence check | `jwt:guest:{guestId}` | 60 sec | Runs on every authenticated request |

**What is NOT cached (always hits DB):**
- Cart operations (add, update, remove)
- Checkout / payment (final stock validation)
- Borrowable requests (real-time availability check)
- Free service requests
- All admin write operations

---

## 2. Redis Provider: Redis Cloud

**Why Redis Cloud over Railway Redis:**
- Backend will eventually move to ECS/EKS — Redis Cloud is cloud-agnostic
- Free tier: 30 MB (more than enough for our cache keys)
- Managed, persistent, no infra maintenance

### Setup Steps

1. Go to [cloud.redis.io](https://cloud.redis.io) → Sign up / Login (Google SSO works)
2. Create a free **Essentials** subscription (AWS Mumbai `ap-south-1` recommended for low latency with Neon)
3. Create a database:
   - Name: `vibehouse-cache`
   - Memory: 30 MB (free tier)
   - Data eviction policy: `allkeys-lru` (least recently used gets evicted when memory is full)
4. Copy the connection string from the database dashboard — format:
   ```
   redis://default:<password>@<host>:<port>
   ```
5. Add to `.env`:
   ```
   REDIS_URL=redis://default:<password>@<host>:<port>
   ```
6. Add same env var on Railway dashboard (Settings → Variables) for the deployed backend.

---

## 3. Architecture: Cache-Aside with Write-Through Invalidation

```
┌──────────────┐    cache hit     ┌───────────┐
│  Guest PWA   │ ──── READ ────→  │   Redis   │  ← returns cached data
│  Admin Panel │                  └───────────┘
│              │    cache miss         │
│              │ ──── READ ────→  ┌───────────┐
│              │                  │  Postgres  │  ← fetch + write to cache
│              │                  └───────────┘
│              │
│              │ ──── WRITE ───→  ┌───────────┐  → invalidate cache key
│              │                  │  Postgres  │
│              │                  └───────────┘
└──────────────┘
```

### Rules
1. **READ** endpoints → cache first, DB on miss, write result to cache
2. **WRITE** endpoints → DB first, then `DEL` the relevant cache key(s)
3. **Checkout** → always validates stock from DB directly (never trusts cache)

---

## 4. Race Condition & Stale Data

**Scenario:** Product shows "in stock" from cache, but sold out between cache write and user checkout.

**Mitigation (already built-in):**
- `guest-store.service.ts` → `checkout()` does a **fresh DB stock validation** for every COMMODITY line item before processing payment. If stock is `0`, checkout fails with `400 Insufficient stock`.
- Cache is invalidated on every stock-changing operation (sale, damage, restock, borrow, return), so the stale window is typically <1 second.

**Phase 2 (at scale):**
- Kafka-based cache invalidation across multiple backend instances (pub/sub)
- Redis-backed soft-lock: reserve stock for 10 min while user is in checkout flow
- Optimistic concurrency control with version column on `inventory` table

---

## 5. Dependencies

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet
```

| Package | Purpose |
|---|---|
| `@nestjs/cache-manager` | NestJS integration module — provides `CACHE_MANAGER` DI token |
| `cache-manager` | Core caching abstraction layer |
| `cache-manager-redis-yet` | Redis store adapter (uses `node-redis` v4 internally) |

---

## 6. New Files

| File | Purpose |
|---|---|
| `src/redis/redis.module.ts` | Global `CacheModule` configured with Redis Cloud |
| `src/redis/cache.service.ts` | Typed wrapper: `get`, `set`, `del`, `invalidateByPrefix` |

---

## 7. Modified Files

| File | Change |
|---|---|
| `.env` | Add `REDIS_URL` |
| `src/app.module.ts` | Import `RedisModule` |
| `src/guest/store/guest-store.service.ts` | Inject `CacheService`, cache catalog/services/borrowables reads, invalidate on checkout |
| `src/admin/inventory/admin-inventory.service.ts` | Inject `CacheService`, cache product/stock reads, invalidate on all writes |
| `src/common/guards/admin-jwt.strategy.ts` | Cache `is_active` check (60s TTL) |
| `src/common/guards/guest-jwt.strategy.ts` | Cache guest existence check (60s TTL) |
| `src/admin/users/admin-users.service.ts` | Invalidate JWT cache on deactivate/delete |

---

## 8. Cache Invalidation Map

When any of these operations happen, the corresponding cache keys are deleted:

| Operation | Invalidated Keys |
|---|---|
| Create product | `catalog:{pid}`, `services:{pid}`, `borrowables:{pid}`, `admin:products:{pid}`, `admin:stock:{pid}` |
| Update product | Same as above |
| Delete product | Same as above |
| Restock | `catalog:{pid}`, `borrowables:{pid}`, `admin:stock:{pid}` |
| Mark damaged | Same as restock |
| Borrowable checkout (admin) | `borrowables:{pid}`, `admin:stock:{pid}` |
| Verify return | Same as borrowable checkout |
| Guest checkout (sale) | `catalog:{pid}`, `admin:stock:{pid}` |
| Admin deactivate | `jwt:admin:{id}` |
| Admin delete | `jwt:admin:{id}` |

`{pid}` = property ID of the affected product

---

## 9. Graceful Degradation

If Redis is unreachable (network issue, Redis Cloud outage):
- App still starts — cache operations return `undefined` (miss), and all reads fall through to Postgres
- No crashes, no hung requests
- Log a warning on connection failure

---

## 10. Verifying It Works

### Connection Check
Look for this log on startup:
```
[RedisModule] Redis cache connected: vibehouse-cache
```

### Cache Hit Test
```bash
# First call — cache miss (slower)
curl http://localhost:8080/guest/store/catalog?property_id=60765

# Second call — cache hit (faster)
curl http://localhost:8080/guest/store/catalog?property_id=60765
```

### Invalidation Test
```bash
# Create product via admin → cache invalidated → next catalog call re-fetches from DB
```
