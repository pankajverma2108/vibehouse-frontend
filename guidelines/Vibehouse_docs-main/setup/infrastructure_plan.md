# Vibe House — Infrastructure Plan

> **Last Updated**: March 2026
> **Scale**: 50 rooms (40 bunk + 10 private), 200–250 concurrent guests, single property (Bandra)

---

## Current State (Dev)

| Component | Provider | Cost | Notes |
|---|---|---|---|
| **Backend** | Railway.app | Free tier | NestJS container |
| **Database** | Neon.tech | Free tier | PostgreSQL, serverless |
| **Redis** | Redis Cloud | Free 30MB | Cache only — will migrate to container |
| **Kafka** | ❌ Not set up | — | Planned: AWS MSK Serverless |

---

## Production Target (ECS/EKS)

| Component | Provider | Est. Cost/mo | Notes |
|---|---|---|---|
| **Backend** | AWS ECS or EKS | ~$30–50 | NestJS container (256–512MB RAM) |
| **Database** | Neon.tech or AWS RDS | $20–50 | PostgreSQL, keep Neon or migrate |
| **Redis** | Docker container (`redis:7-alpine`) | $0 (runs inside cluster) | ~128–256MB RAM allocation |
| **Kafka** | AWS MSK Serverless | ~$10–15 | Pay-per-use, VPC-native |

---

## 1. Redis — Container Strategy

### Decision: Self-hosted Redis container (not managed Redis Cloud)

**Rationale:**
- Redis is used **only for cache** — data is disposable by design
- Graceful degradation already built — if Redis dies, app falls through to Postgres
- Container runs in the same cluster as the backend — **zero network latency**
- No persistence, backups, or HA needed for a cache layer
- Saves $5+/month vs Redis Cloud (trivial now, adds up at scale)

### Image
```
redis:7-alpine
```
- Alpine variant: ~30MB image size
- No custom config needed for cache use case
- Default `maxmemory-policy: noeviction` → change to `allkeys-lru` (evicts least recently used when full)

### Container Config
```yaml
# ECS Task Definition / docker-compose equivalent
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
  ports:
    - "6379:6379"
  resources:
    memory: 256MB
    cpu: 0.25 vCPU
```

### Connection String (internal)
```env
# When running in same ECS cluster / docker-compose network
REDIS_URL=redis://redis:6379

# Current (Redis Cloud — dev/Railway)
REDIS_URL=redis://default:<password>@redis-15022.crce281.ap-south-1-3.ec2.cloud.redislabs.com:15022
```

### Migration Path
1. **Now (Railway dev):** Keep Redis Cloud (Railway can't run sidecar containers easily)
2. **When moving to ECS/EKS:** Add Redis container to task definition, change `REDIS_URL` to internal address, drop Redis Cloud subscription

### What's NOT in Redis (now or future)
| Data | Where It Goes | Why Not Redis |
|---|---|---|
| Sessions | JWT (stateless) | No server-side sessions |
| SLA timers | Kafka delayed messages or Redis EXPIRE+keyspace notifications | Phase 2 |
| JWT blacklist | Redis SET with TTL | Phase 2 — when we need immediate token revocation |
| Rate limiting | Redis counters | Phase 2 |

---

## 2. Kafka — AWS MSK Serverless

### Decision: AWS MSK Serverless (not self-hosted Kafka containers, not BullMQ)

**Rationale:**
- Self-hosted Kafka needs 1–2GB RAM per broker + ZooKeeper — more than the entire backend
- MSK Serverless is pay-per-use: ~$10–15/month at our throughput (~500 events/hour)
- VPC-native — pairs with ECS/EKS (same VPC, no internet hop)
- Auto-scales partitions and throughput — zero ops
- Kafka gives us a real event backbone for future multi-system integration (eZee, Zoho, MyGate, Wati)

### Why not BullMQ?
- BullMQ is a job queue, not an event streaming platform
- Can't replay events, no consumer groups, no topic-based routing
- Kafka gives us a persistent event log — critical for audit trails and debugging
- When we add eZee webhooks, Zoho sync, payment webhooks — these are events, not jobs

### Throughput Estimate
| Metric | Value |
|---|---|
| Events/hour (peak) | ~500 |
| Events/day | ~5,000–10,000 |
| Events/month | ~150,000–300,000 |
| MSK Serverless pricing | $0.10/hr cluster + $0.10/GB ingested |
| Monthly cost | ~$10–15 |

### Topics (Phase 1 — for currently built features)

| Topic | Producer | Consumer | Purpose |
|---|---|---|---|
| `ops.audit.log` | Admin services | AuditLogWorker | Async admin activity logging |
| `ops.inventory.low_stock` | AdminInventoryService | InventoryAlertWorker | Stock threshold breach alert |
| `ops.cache.invalidate` | Inventory + Store services | CacheInvalidationWorker | Multi-instance Redis cache clear |
| `notify.guest` | GuestStoreService | NotificationWorker | Guest notifications (stubbed) |
| `notify.staff` | Future | NotificationWorker | Staff notifications (stubbed) |

### Topics (Phase 2 — when integrations are ready)

| Topic | Blocked By |
|---|---|
| `ops.task.payment_success` | Razorpay integration |
| `ops.task.checkin_complete` | Kiosk + face match |
| `ops.task.stay_extension` | Stay extension flow |
| `ops.task.checkout_complete` | eZee checkout webhook |
| `ops.task.ticket_created` | Zoho CRM integration |
| `ops.task.sla_breach` | SLA timer implementation |
| `ops.task.lock_battery_low` | MyGate webhook |
| `ezee.sync.refresh` | eZee API integration |

### MSK Serverless Setup Steps
1. Go to AWS Console → Amazon MSK → Create Cluster
2. Select **Serverless** cluster type
3. Name: `vibehouse-kafka`
4. VPC: same VPC as your ECS/EKS cluster
5. Subnets: select 2+ AZs
6. Security group: allow inbound port `9098` (IAM auth) from backend security group
7. Authentication: **IAM** (no SASL passwords — uses AWS IAM roles)
8. Copy the bootstrap server endpoint

### Connection (KafkaJS)
```typescript
// MSK Serverless uses IAM authentication
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'vibehouse-backend',
  brokers: [process.env.KAFKA_BROKERS],
  ssl: true,
  sasl: {
    mechanism: 'aws',
    authorizationIdentity: process.env.AWS_ACCESS_KEY_ID,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // if using assumed roles
  },
});
```

### Dev Environment Strategy
MSK Serverless requires VPC — Railway can't reach it. Options for dev:

| Option | Pros | Cons |
|---|---|---|
| **Upstash Kafka** (recommended for dev) | Free tier 10K msg/day, standard protocol, no VPC | Different provider than prod |
| **Feature flag sync mode** | Zero infra, events run inline | No real Kafka testing |
| **Local Docker Kafka** | Full Kafka locally | Heavyweight (1–2GB RAM), only works locally |

**Recommendation:** Use Upstash Kafka for dev (free), MSK Serverless for prod. KafkaJS connects to both identically — just swap the broker URL and auth.

---

## 3. Migration Timeline

```
Phase 1 — NOW (Railway + Redis Cloud)
├─ ✅ Backend on Railway
├─ ✅ Postgres on Neon.tech
├─ ✅ Redis on Redis Cloud (cache)
└─ ⬜ No Kafka yet

Phase 2 — KAFKA INTEGRATION (still Railway)
├─ Set up Upstash Kafka (dev)
├─ Install kafkajs
├─ Build KafkaModule + 4 workers
├─ Wire producers into existing services
└─ Test on Railway + Upstash

Phase 3 — MOVE TO ECS/EKS
├─ ECS task definition with backend + Redis containers
├─ Switch REDIS_URL to internal redis:6379
├─ Create MSK Serverless cluster in same VPC
├─ Switch KAFKA_BROKERS to MSK endpoint
├─ Drop Redis Cloud subscription
└─ Drop Railway
```

---

## 4. Environment Variables Summary

### Dev (Railway)
```env
DATABASE_URL=postgresql://...@neon.tech/neondb
REDIS_URL=redis://default:***@redis-15022.crce281...redislabs.com:15022
KAFKA_BROKERS=<upstash-endpoint>:9092
KAFKA_SASL_USERNAME=<upstash-username>
KAFKA_SASL_PASSWORD=<upstash-password>
```

### Prod (ECS/EKS)
```env
DATABASE_URL=postgresql://...@neon.tech/neondb  # or RDS
REDIS_URL=redis://redis:6379                     # internal container
KAFKA_BROKERS=<msk-bootstrap>:9098              # MSK Serverless
# No SASL creds — uses IAM role attached to ECS task
```
