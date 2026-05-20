# Kafka vs Amazon SQS — Deep Comparison

> **Context:** Vibe House uses Kafka (KRaft, self-hosted on ECS Fargate) for async event processing.
> This document compares Kafka and Amazon SQS across pricing, architecture, use cases, and operational overhead to inform the technology decision.

---

## 1. At a Glance

| Dimension | Apache Kafka (self-hosted) | Amazon SQS |
|---|---|---|
| **Type** | Distributed event streaming platform | Managed message queue service |
| **Model** | Publish-Subscribe (topics + consumer groups) | Point-to-point queue (or fan-out via SNS+SQS) |
| **Managed?** | No — you operate it (ECS, EC2, or MSK) | Yes — fully AWS-managed, serverless |
| **Ordering** | Per-partition ordering guaranteed | FIFO queues: strict ordering. Standard: best-effort |
| **Replay** | ✅ Yes — consumers can re-read any offset | ❌ No — message deleted after consumption |
| **Retention** | Configurable (hours to forever) | Max 14 days |
| **Max message size** | 1 MB (default), configurable to 10 MB | 256 KB (SQS) / up to 2 GB with S3 extended client |
| **Throughput ceiling** | Millions of events/sec (horizontal scale) | ~3,000 msg/sec per API action (Standard); unlimited with sharding |
| **Latency** | ~2–20 ms | ~1–10 ms (Standard); up to ~300 ms (FIFO) |
| **Consumer model** | Pull-based (consumers poll at their own pace) | Pull-based (`ReceiveMessage`) or push via Lambda |
| **Fan-out** | Native (multiple consumer groups = multiple readers) | Requires SNS → multiple SQS queues |
| **Dead Letter Queue** | Manual setup | Native DLQ support built-in |
| **Visibility timeout** | N/A (Kafka uses offsets) | Up to 12 hours — message hidden while processing |

---

## 2. Architecture Comparison

### Kafka — Pub/Sub Streaming

```
Producer (API)
    │
    ▼
Kafka Topic: ops.task.payment_success
    │
    ├──▶ Consumer Group A: Ops Task Worker    (reads at own pace)
    └──▶ Consumer Group B: Analytics Worker   (reads same events independently)

Offset tracking: consumers control their position in the log
Old events: still readable by any new consumer until retention expires
```

**Key concept:** Kafka is a **distributed log**. Events are written sequentially and stay there. Multiple consumers can read the same event independently. Consumers can rewind and replay from any point.

---

### Amazon SQS — Message Queue

```
Producer (API)
    │
    ▼
SQS Queue: vibe-ops-tasks.fifo
    │
    ▼
Consumer (Ops Worker polls: ReceiveMessage)
    │
    ├── Processes message
    └── Calls DeleteMessage → message gone permanently

Fan-out pattern (if needed):
Producer → SNS Topic → [SQS Queue A, SQS Queue B, SQS Queue C]
```

**Key concept:** SQS is a **disposable delivery system**. Message is delivered once, processed, then deleted. No replay. If you need fan-out, combine with SNS.

---

## 3. Pricing — Detailed Breakdown

### 3A. Self-Hosted Kafka on ECS Fargate (Vibe House current setup)

| Component | Config | Monthly Cost |
|---|---|---|
| Kafka broker container | 0.5 vCPU, 1 GB, 720 hrs | ~$20 |
| Kafka Worker container | 0.5 vCPU, 1 GB, 720 hrs | ~$20 |
| EBS volume (if needed for log storage) | ~20 GB | ~$2 |
| **Total** | | **~$42/mo (~₹3,528)** |

> This cost is **fixed** — you pay $42/mo whether you send 100 messages or 10 million.

---

### 3B. Amazon MSK Serverless (AWS-managed Kafka)

| Usage | Rate | At Vibe House (30K msgs/mo) |
|---|---|---|
| Cluster-hours | $0.75/cluster-hr | $0.75 × 720 = **$540/mo** ← even idle |
| Storage | $0.1/GB-mo | ~$1 |
| Data in | $0.10/GB | ~$0 |
| **Total** | | **~$541/mo — wildly expensive for this scale** |

> MSK Serverless is designed for **unpredictable bursts at enterprise scale**. It's a terrible fit for 30K msgs/mo.

---

### 3C. Amazon SQS

| Tier | Rate | At Vibe House |
|---|---|---|
| First **1 million** API requests/mo | **FREE** (permanent, not just first year) | ✅ Covered entirely |
| 1M–100M requests/mo | $0.40/million | Not reached |
| FIFO queue surcharge | +10% over standard | $0 (still in free tier) |
| Data transfer | $0 within same region | $0 |
| **Total at 30K msgs/mo** | | **$0.00/mo** |
| **Total at 300K msgs/mo** | | **$0.00/mo** (still in free tier) |
| **Total at 5M msgs/mo** | | **~$1.60/mo** |
| **Total at 50M msgs/mo** | | **~$19.20/mo** |

> SQS free tier = **1 million API calls/month, permanently, for every AWS account.**
> Each message = 1 API call to send + 1 to receive + 1 to delete = ~3 calls per message.
> Effective free quota: **~333,000 messages/month, free forever**.
> Vibe House sends ~30,000/mo = **9% of free quota.**

---

### 3D. Pricing Summary Table

| Volume (msgs/mo) | Self-hosted Kafka | MSK Serverless | Amazon SQS |
|---|---|---|---|
| 30K (Vibe House current) | **$42** | $541 | **$0** |
| 300K | **$42** | $541 | **$0** |
| 1M | **$42** | $555 | **$0.96** |
| 10M | $42–80 (scale up) | $600+ | **$3.20** |
| 100M | $200+ | $650+ | **$38** |
| 1B | $2,000+ | $1,200+ | **$380** |

> **Kafka is a fixed-cost system** — relatively cheap at very high throughput, relatively expensive at low volume.
> **SQS is a pure pay-per-message system** — essentially free at low volume, scales linearly.

---

## 4. Feature Comparison — Deep Dive

### 4A. Message Ordering

| | Kafka | SQS Standard | SQS FIFO |
|---|---|---|---|
| Ordering guarantee | Per-partition (strict within a partition) | Best-effort (no guarantee) | Strict FIFO per MessageGroupId |
| Out-of-order delivery | Possible across partitions | Common | Never |
| Throughput with ordering | High (partition parallelism) | Very high | Up to 3,000 msg/sec per queue |
| Use case | Event streams where order-per-entity matters | Decoupled tasks where order is irrelevant | Financial transactions, sequential workflows |

**Vibe House verdict:** For `ops.task.checkin_complete` → generate PIN → send WhatsApp, **FIFO SQS is sufficient**. Order matters per reservation, which maps to `MessageGroupId = reservation_id`.

---

### 4B. Message Replay / Reprocessing

| | Kafka | SQS |
|---|---|---|
| Can re-read past messages? | ✅ Yes — seek to any offset | ❌ No — deleted after `DeleteMessage` call |
| Retention | Hours to days to forever | Max 14 days (default 4 days) |
| New consumer reading old events | ✅ Yes — start from beginning | ❌ No — already processed and deleted |
| Useful for | Event sourcing, audit trails, debugging, backfilling new services | Fire-and-forget task queues |

**Vibe House verdict:** You don't need replay. Each event is an operational task (generate PIN, create Zoho ticket, send WhatsApp). If a task fails → DLQ handles it. No need to replay from 3 days ago.

---

### 4C. Dead Letter Queues (DLQ)

| | Kafka | SQS |
|---|---|---|
| Native DLQ | ❌ No — must implement manually (separate topic + routing logic) | ✅ Yes — configure `maxReceiveCount` + DLQ ARN, done |
| Failed message visibility | Manual — must track in your consumer code | Automatic — message moves to DLQ after N failures |
| DLQ alerting | Manual CloudWatch alarm on consumer lag | Native CloudWatch metric on DLQ depth |

**Vibe House verdict:** SQS DLQ is significantly easier to operate. If a MyGate PIN generation fails 3 times → automatically moves to `vibe-ops-tasks-dlq` → triggers a CloudWatch alarm → you investigate. With Kafka this is 50+ lines of custom code.

---

### 4D. Fan-out (Multiple Consumers of Same Event)

| | Kafka | SQS |
|---|---|---|
| Multiple consumers, same event | ✅ Native — add a new consumer group, it reads all events independently | ❌ Not native — each message delivered to one consumer only |
| Fan-out workaround | N/A — native | SNS topic → multiple SQS queues (1 SNS publish → N queues) |
| Latency of fan-out | ~0 (same broker) | ~1–5 ms (SNS → SQS hop) |

**Vibe House verdict:** You currently have: `ops.task.payment_success` → [eZee sync + notify guest]. This **isn't true fan-out** — it's one sequential task. The Ops Worker does both steps. No fan-out needed. If you ever need it: SNS + SQS costs ~$0.50/month at your volume.

---

### 4E. Operational Overhead

| Task | Kafka (self-hosted) | SQS |
|---|---|---|
| Initial setup | Write docker-compose, tune broker config, KRaft vs ZooKeeper, partitions, replication | Create queue via AWS console or Terraform, done |
| Monitoring | Set up consumer lag dashboards manually | Native CloudWatch metrics out of the box |
| Scaling | Add partitions (irreversible), add brokers, rebalance consumer groups | Automatic — SQS scales to any throughput |
| Upgrades | Manual image updates, rolling restarts, compatibility checks | Zero — AWS handles it |
| Failure handling | Broker crash → potential data loss (ECS restart loses in-memory data) | AWS-guaranteed durability — messages stored in 3 AZs |
| Expertise required | Kafka-specific knowledge (offsets, rebalancing, ISR, retention) | S3-like simplicity — any developer can use it |

---

### 4F. Durability & Reliability

| | Kafka (ECS, single broker) | Kafka (MSK, multi-broker) | SQS |
|---|---|---|---|
| Data durability | ⚠️ ECS restart = potential data loss | ✅ 3-AZ replication | ✅ 3-AZ replication (always) |
| Message delivery | At-least-once (with acks) | At-least-once | At-least-once (Standard) / exactly-once (FIFO) |
| Availability SLA | No SLA (self-managed) | 99.9% | **99.9%** |
| If broker crashes | Consumer group rebalances; may replay or lose unacked | Auto-failover | Transparent — no single point of failure |

> [!WARNING]
> Vibe House currently runs **single-broker Kafka on ECS** with no data volume. If the ECS task restarts, any in-flight messages that haven't been consumed are **gone**. SQS stores every message in 3 Availability Zones the moment it's enqueued.

---

## 5. When to Use Each

### Use Kafka when you need:
- **Very high throughput** — millions of events/second (financial trading, IoT sensor streams, log aggregation at scale)
- **Event sourcing** — your events are the source of truth, and you need to rebuild state from the log
- **Message replay** — new consumers must read historical events (e.g. a new analytics service catching up on 6 months of events)
- **Stream processing** — real-time aggregations, windowing, joins across streams (Kafka Streams, ksqlDB)
- **Long retention** — events stored for weeks/months as an immutable log
- **Complex topology** — dozens of services reading the same topics for different purposes

### Use SQS when you need:
- **Decoupled task execution** — "do this work asynchronously, I don't care about the log"
- **Simple operational model** — teams without Kafka expertise, fast iteration
- **Unpredictable or low volume** — pay for what you use, not a provisioned cluster
- **Native AWS integration** — Lambda triggers, CloudWatch, DLQ, SNS fan-out all work out of the box
- **Fire-and-forget reliability** — 3-AZ durability without managing replication yourself

---

## 6. Vibe House — Specific Decision Matrix

| Requirement | Kafka needed? | SQS sufficient? |
|---|---|---|
| Generate MyGate PIN after check-in | ❌ | ✅ |
| Send WhatsApp after payment | ❌ | ✅ |
| Create Zoho ticket for service request | ❌ | ✅ |
| Sync paid items to eZee folio | ❌ | ✅ |
| Revoke PIN at checkout | ❌ | ✅ |
| SLA escalation trigger | ❌ | ✅ |
| Refresh eZee booking cache (cron) | ❌ | ✅ EventBridge Scheduler (free, no queue needed) |
| Replay events if a new service onboards | ❌ (not planned) | ❌ (DLQ covers failures) |
| 1M+ events/month | ❌ (30K/mo current) | ✅ (free up to 1M calls/mo) |
| Fan-out: one event, many consumers | ❌ (not required) | ✅ SNS+SQS if ever needed |

**All 8 active Kafka use cases at Vibe House are fully satisfied by SQS FIFO + a standard queue.**

---

## 7. Migration Path (Kafka → SQS)

If you decide to switch, here's the exact change surface — it's smaller than it sounds:

### Step 1 — Create SQS queues (5 mins)
```bash
# Via AWS CLI or Terraform
aws sqs create-queue --queue-name vibe-ops-tasks.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=true
aws sqs create-queue --queue-name vibe-notifications
aws sqs create-queue --queue-name vibe-ops-tasks-dlq.fifo \
  --attributes FifoQueue=true
```

### Step 2 — Replace Kafka producer calls in NestJS

```typescript
// BEFORE (Kafka)
this.kafkaClient.emit('ops.task.payment_success', payload);

// AFTER (SQS via @aws-sdk/client-sqs)
await sqsClient.send(new SendMessageCommand({
  QueueUrl: process.env.OPS_TASKS_QUEUE_URL,
  MessageBody: JSON.stringify(payload),
  MessageGroupId: payload.reservation_id,    // FIFO ordering per reservation
  MessageDeduplicationId: payload.payment_id  // prevent duplicate processing
}));
```

### Step 3 — Replace Kafka consumer in Worker

```typescript
// BEFORE (Kafka consumer group + offset management)
@EventPattern('ops.task.payment_success')
async handlePayment(payload: KafkaMessage) { ... }

// AFTER (SQS polling loop — or Lambda trigger)
// Option A: polling in existing NestJS API (at 30K msgs/mo, 1 poll/min is enough)
setInterval(async () => {
  const result = await sqsClient.send(new ReceiveMessageCommand({
    QueueUrl: process.env.OPS_TASKS_QUEUE_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20  // long-polling — no cost for empty polls
  }));
  for (const msg of result.Messages ?? []) {
    await processOpsTask(JSON.parse(msg.Body));
    await sqsClient.send(new DeleteMessageCommand({
      QueueUrl: process.env.OPS_TASKS_QUEUE_URL,
      ReceiptHandle: msg.ReceiptHandle
    }));
  }
}, 60_000);
```

### Step 4 — Remove Kafka containers from ECS
- Delete `Kafka (KRaft)` task definition
- Delete `Kafka Worker` task definition
- Remove from `docker-compose.yml`
- **Save $40/mo**

---

## 8. Final Recommendation for Vibe House

| Scenario | Recommendation |
|---|---|
| **Now (30K msgs/mo, 1 property, early stage)** | **Switch to SQS** — $0 cost, simpler, more durable, easier DLQ |
| **Scaling to 5 properties, 500K msgs/mo** | Still SQS — cost is ~$2/mo, still simpler to operate |
| **Scaling to platform-level (50+ properties, millions of events, event sourcing)** | Revisit Kafka (MSK) or Confluent Cloud |

> **Kafka is the right answer at the wrong time.** It's a phenomenal technology built for problems you don't have yet. At 30,000 events/month, SQS is strictly better across cost, durability, operational simplicity, and reliability — with no loss of functionality.
>
> **Revisit this decision when:** monthly event volume exceeds ~5M messages, OR you need event replay for a new service, OR you add stream processing (real-time aggregations).

---

## Sources
- [Amazon SQS Pricing](https://aws.amazon.com/sqs/pricing/)
- [Amazon MSK Pricing](https://aws.amazon.com/msk/pricing/)
- [Confluent Cloud Pricing](https://www.confluent.io/confluent-cloud/pricing/)
- [AWS SQS vs Kafka — AWS Blog](https://aws.amazon.com/blogs/compute/migrating-from-apache-kafka-to-amazon-sqs/)
- [SQS FIFO Queues Documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html)
- [Kafka KRaft Documentation](https://kafka.apache.org/documentation/#kraft)
