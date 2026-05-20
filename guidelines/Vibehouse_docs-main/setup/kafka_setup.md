# Kafka Setup — Vibe House Backend

## 1. Overview

Kafka adds **async event processing** to decouple API response times from side-effects like audit logging, stock alerts, cache invalidation, and notifications. At 200–250 concurrent guests, event throughput is ~300–500 events/hour.

### Workers (Phase 1 — What Exists Today)

| Worker | Topic | What It Does |
|---|---|---|
| **AuditLogWorker** | `ops.audit.log` | Async `admin_activity_log` writes (currently synchronous in request path) |
| **InventoryAlertWorker** | `ops.inventory.low_stock` | Triggers when stock drops below `low_stock_threshold` |
| **CacheInvalidationWorker** | `ops.cache.invalidate` | Redis cache invalidation via Kafka (replaces direct calls for multi-instance) |
| **NotificationWorker** | `notify.guest`, `notify.staff` | Writes to `notification_log`. Actual send (WhatsApp/email) is stubbed |

### Workers (Phase 2 — When Dependencies Are Ready)

| Worker | Blocked By |
|---|---|
| eZee Sync Worker | eZee API integration |
| Zoho Ticket Worker | Zoho CRM integration |
| MyGate Lock Worker | MyGate API integration |
| SLA Timer Worker | Zoho ticket flow |
| Payment Webhook Worker | Real Razorpay integration |

---

## 2. Kafka Provider

### Development: Upstash Kafka (Recommended)
- Serverless Kafka — free tier: 10K messages/day
- No VPC configuration needed (works with Railway)
- Standard Kafka protocol + REST API
- Setup: [console.upstash.com](https://console.upstash.com) → Create Kafka Cluster

### Production: AWS MSK Serverless
- Pay-per-use: ~$10–15/month at this scale
- VPC-native — pairs with ECS/EKS
- Auto-scales partitions and throughput

---

## 3. Environment Variables

```env
# Kafka (Upstash — dev)
KAFKA_BROKERS=your-cluster.upstash.io:9092
KAFKA_CLIENT_ID=vibehouse-backend
KAFKA_GROUP_ID=vibehouse-workers
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
KAFKA_USE_SSL=true
```

---

## 4. Topic Structure

| Topic | Key | Use |
|---|---|---|
| `ops.audit.log` | `actor_id` | Admin activity audit trail |
| `ops.inventory.low_stock` | `property_id` | Stock threshold breach alerts |
| `ops.cache.invalidate` | `property_id` | Cross-instance Redis cache invalidation |
| `notify.guest` | `guest_id` | Guest-facing notifications (checkout conf, service updates) |
| `notify.staff` | `staff_id` | Staff-facing notifications (future) |

---

## 5. New Files

| File | Purpose |
|---|---|
| `src/kafka/kafka.module.ts` | Global module — KafkaJS client init |
| `src/kafka/kafka-producer.service.ts` | Singleton producer with typed emit methods |
| `src/kafka/workers/audit-log.worker.ts` | Consumer: `ops.audit.log` → DB write |
| `src/kafka/workers/inventory-alert.worker.ts` | Consumer: `ops.inventory.low_stock` → log + future notification |
| `src/kafka/workers/cache-invalidation.worker.ts` | Consumer: `ops.cache.invalidate` → Redis DEL |
| `src/kafka/workers/notification.worker.ts` | Consumer: `notify.*` → `notification_log` write |

---

## 6. Modified Files

| File | Change |
|---|---|
| `.env` | Add Kafka env vars |
| `app.module.ts` | Import `KafkaModule` |
| `admin-inventory.service.ts` | Replace inline audit log writes with `kafkaProducer.emitAudit()`, add low-stock check |
| `admin-users.service.ts` | Replace inline audit log writes with `kafkaProducer.emitAudit()` |
| `guest-store.service.ts` | Emit cache invalidation + notification events |

---

## 7. Graceful Degradation

If Kafka is unreachable:
- Producer logs warning, event is **dropped** (non-critical side-effects)
- Audit writes fall back to inline DB writes
- App continues serving requests normally
- Retry logic for critical events via `ezee_sync_log` pattern (future)
