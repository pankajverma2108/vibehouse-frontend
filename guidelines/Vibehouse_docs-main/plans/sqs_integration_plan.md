# AWS SQS Integration Plan — Vibe House Backend (v3)

> **Version**: v3.0 | **Date**: 2026-03-30 | **Status**: ✅ Phase 1 Complete
> **Decision**: AWS SQS replaces all Kafka references. No containers, no Kafka, no MSK.
> **Old doc**: `docs/setup/kafka_setup.md` → archived to `docs/setup/deprecated/kafka_setup.md`
> **Test results**: `docs/api_testing/sqs_integration_test_results.md` (23/23 passed)

---

## 1. The Guest Journey & Where SQS Fits

This is the core flow we're building for. SQS only fires at specific moments — most of the journey is synchronous request-response.

```
NON-GUEST                    GUEST                       CUSTOMER
(not signed in)              (signed in, no booking)     (has active booking)
─────────────────────────────────────────────────────────────────────────────
                                                                            
  Visits website                                                             
       │                                                                     
       ▼                                                                     
  Signs up / Logs in ──────► GUEST                                           
                               │                                             
                               ▼                                             
                          Browses rooms                                      
                          Browses add-ons                                    
                          Builds cart (rooms + add-ons)                      
                               │                                             
                               ▼                                             
                          Pays via Razorpay                                  
                               │                                             
                               ▼                                             
         ┌─────── Razorpay webhook confirms ──────┐                          
         │            payment success              │                         
         │                                         │                         
         │    ┌──────────────────────────────┐      │                        
         │    │   SYNCHRONOUS (in request)   │      │                        
         │    │   • Payment → CAPTURED       │      │                        
         │    │   • Booking → CONFIRMED      │      │                        
         │    │   • Guest → CUSTOMER         │      │                        
         │    └──────────────────────────────┘      │                        
         │                                         │                         
         │    ┌──────────────────────────────┐      │                        
         │    │   ASYNC (via SQS) ◄──────────┼──── SQS messages emitted     
         │    │   • Audit log write  (ops)   │      │                        
         │    │   • eZee sync (ezee-sync)    │      │                        
         │    │   • Guest WhatsApp (notify)  │      │                        
         │    └──────────────────────────────┘      │                        
         │                                         │                         
         └─────────────────────────────────────────┘                         
                               │                                             
                               ▼                                             
                       CUSTOMER arrives                                      
                       (onsite check-in — MANUAL for now)                   
                               │                                             
                               ▼                                             
                    ┌──────────────────────┐                                 
                    │  On check-in, staff  │                                 
                    │  issues returnable   │                                 
                    │  items (towels etc)  │                                 
                    │                      │                                 
                    │  ► SQS: ticket_created ◄── Zoho ticket auto-created   
                    │    (delivery task for │     for each returnable item    
                    │     issued items)     │                                 
                    └──────────────────────┘                                 
```

### What is NOT done via SQS (stays synchronous)

| Operation | Why Synchronous |
|-----------|----------------|
| Guest signup / login | Pure request-response |
| Room browsing / availability check | Read-only, cached |
| Cart add / update / remove | DB writes, guest waits for confirmation |
| Razorpay order creation | Needs order_id returned to frontend immediately |
| Payment verification + booking confirmation | Must be atomic — guest sees "Booking Confirmed" |
| Inventory stock check at cart time | Guest needs real-time "in stock" / "out of stock" |

### What IS done via SQS (async, after the response)

| Event | Queue | Trigger | What the Worker Does |
|-------|-------|---------|---------------------|
| `audit_log` | ops.fifo | Any create/update/delete action | Writes to `admin_activity_log` |
| `payment_success` | ops.fifo | Razorpay payment captured | Logs. (Future: triggers eZee sync + notify) |
| `booking_confirmed` | ops.fifo | Booking payment captured | Logs. (Future: triggers eZee InsertBooking + notify) |
| `insert_booking` | ezee-sync.fifo | Booking confirmed (future) | eZee InsertBooking API call (rate-limited) |
| `add_extra_charge` | ezee-sync.fifo | Addon payment captured (future) | eZee AddExtraCharge API call (rate-limited) |
| `ticket_created` | ops.fifo | Staff issues returnable at check-in | Zoho Desk ticket creation |
| `low_stock_alert` | notify | Inventory below threshold | Admin notification |
| `notify_guest` | notify | Various triggers | WhatsApp/email to guest (future) |
| `sla_escalate` | sla-escalate | Redis timer expiry (future) | Zoho escalation + reassignment |

---

## 2. The Returnable Inventory Decision

Per `docs/returnable_availability_problem.md` — **Solution 2** (Demand Calendar):

> [!IMPORTANT]
> **Inventory is NOT deducted at booking time.** When a customer books 2 towels, we record the order (addon_order_items) but do NOT touch `inventory.available_stock`. The towels are issued at check-in by staff. A demand forecast dashboard shows staff whether they'll have enough stock.

### What this means for SQS:

- **At booking time**: No SQS message for inventory. The payment_success message only needs to handle audit logging and future eZee/notification side-effects.
- **At check-in time** (manual for now): Staff issues the returnable items from the admin panel. This is when:
  1. `inventory.available_stock` gets decremented
  2. `returnable_checkouts` row gets created
  3. A Zoho Desk ticket gets created via SQS (`ticket_created`) for staff to deliver the item
- **The demand forecast** (Solution 2 dashboard) is a read-only API — no SQS involvement.

---

## 3. SQS Queue Architecture

### 4 Queues + 4 Dead-Letter Queues

| Queue | Type | Purpose | Concurrency | When Active |
|-------|------|---------|-------------|-------------|
| `vibehouse-ops.fifo` | FIFO | Audit logs, payment sync, ticket creation | 10 msgs/poll | ✅ Now (Phase 1) |
| `vibehouse-ezee-sync.fifo` | FIFO | **eZee PMS API calls** (rate-limited) | **1 msg/poll** | ✅ Created, consumer stubbed |
| `vibehouse-notify` | Standard | Outbound notifications (WhatsApp, email), low-stock alerts | 10 msgs/poll | ✅ Created, consumer stubbed |
| `vibehouse-sla-escalate` | Standard | SLA timer expirations from Redis watchdog | 10 msgs/poll | Phase 2 |

> [!IMPORTANT]
> **Why a separate `vibehouse-ezee-sync.fifo` queue?** eZee PMS has rate limits on their API. If 10 bookings confirm simultaneously and all try to call eZee InsertBooking at once, we'll get throttled. The dedicated FIFO queue with `maxMessages=1` ensures we process eZee API calls **one at a time**, sequentially. Same logic applies to Razorpay batch operations in the future.

### Queue Configuration

| Queue | Visibility Timeout | Retention | DLQ maxReceiveCount |
|-------|-------------------|-----------|---------------------|
| `vibehouse-ops.fifo` | 60s | 4 days | 3 |
| `vibehouse-ezee-sync.fifo` | 120s | 4 days | 3 |
| `vibehouse-notify` | 30s | 2 days | 3 |
| `vibehouse-sla-escalate` | 30s | 1 day | 3 |

### Consumer Concurrency Design

```
vibehouse-ops.fifo          → OpsTaskWorker      → maxMessages: 10  (fast DB writes)
vibehouse-ezee-sync.fifo   → EzeeSyncWorker      → maxMessages: 1   (rate-limited API)
vibehouse-notify            → NotifyWorker        → maxMessages: 10  (fast delivery)
vibehouse-sla-escalate      → (Phase 2)           → maxMessages: 10
```

---

## 4. Phase 1 — ✅ Complete

Phase 1 covers the flow: **Non-Guest → Guest → Books → Pays → CONFIRMED**.

### 4.1 Files Created

| File | Purpose |
|------|---------|
| `src/sqs/sqs.module.ts` | Global module — wires producer, consumer, 3 workers |
| `src/sqs/sqs.constants.ts` | Queue URL env keys, message type enums (Ops, EzeeSync, Notify, Sla) |
| `src/sqs/sqs-producer.service.ts` | Typed `send()` methods per queue — FIFO and Standard |
| `src/sqs/sqs-consumer.service.ts` | Long-polling loop manager, configurable per-queue concurrency |
| `src/sqs/types/messages.ts` | TypeScript interfaces for all message payloads |
| `src/sqs/workers/ops-task.worker.ts` | Consumes `vibehouse-ops.fifo` — audit logs, payment/booking events |
| `src/sqs/workers/ezee-sync.worker.ts` | Consumes `vibehouse-ezee-sync.fifo` — **stubbed** (eZee API blocked) |
| `src/sqs/workers/notify.worker.ts` | Consumes `vibehouse-notify` — writes to `notification_log` only |
| `scripts/create-sqs-queues.ts` | One-time setup: creates 8 queues (4 main + 4 DLQ) |
| `scripts/test-sqs-integration.ts` | E2E test suite — 23 tests |

### 4.2 Files Modified

| File | Change |
|------|--------|
| `.env` | Added 4 SQS queue URLs + `SQS_CONSUMERS_ENABLED=true` |
| `package.json` | Added `@aws-sdk/client-sqs` |
| `src/app.module.ts` | Import `SqsModule` |
| `src/payment/payment.service.ts` | 6 audit writes → SQS, added `payment_success` + `booking_confirmed` events |
| `src/admin/inventory/admin-inventory.service.ts` | 8 audit writes → SQS, added `low_stock_alert` emission |
| `src/admin/users/admin-users.service.ts` | 4 audit writes → SQS |

### 4.3 Phase 1 Message Types

| MessageType | Queue | Producer | Consumer Action |
|-------------|-------|----------|----------------|
| `audit_log` | ops.fifo | PaymentService, AdminInventoryService, AdminUsersService | INSERT into `admin_activity_log` |
| `payment_success` | ops.fifo | PaymentService (after fulfilOrder) | Log success. (Future: trigger eZee + notify) |
| `booking_confirmed` | ops.fifo | PaymentService (after fulfilBookingOrder) | Log success. (Future: trigger eZee + notify) |
| `low_stock_alert` | notify | AdminInventoryService | Log warning. (Future: admin WhatsApp/email) |

### 4.4 What Phase 1 Achieved

- ✅ **4 SQS queues + 4 DLQs** created in ap-south-1 (8 total)
- ✅ **18 audit log writes** moved from request path to SQS — faster API responses
- ✅ **Rate-limited eZee sync queue** — `maxMessages=1` prevents API throttling
- ✅ **Producer, consumer, 3 workers** fully wired and tested
- ✅ `payment_success` and `booking_confirmed` events flowing through SQS
- ✅ `low_stock_alert` events emitted when inventory drops below threshold
- ✅ **DLQs configured** — failed messages retained for 14 days for investigation
- ✅ **Feature flag** — `SQS_CONSUMERS_ENABLED=false` disables all consumers
- ✅ **23/23 E2E tests passed** (see `docs/api_testing/sqs_integration_test_results.md`)

---

## 5. Phase 2 — After Wati + Zoho Setup

| Component | What Gets Built |
|-----------|----------------|
| **NotifyWorker** (real) | Sends WhatsApp via Wati API, updates `notification_log` status |
| **EzeeSyncWorker** (real) | Calls eZee InsertBooking/AddExtraCharge, writes `ezee_sync_log` |
| **Zoho Desk in OpsTaskWorker** | `ticket_created` handler: POST Zoho Desk, assign staff, set Redis SLA timers |
| **SLA Watchdog** | Listens to Redis keyspace notifications, emits `sla_escalate` to SLA queue |
| **SLA Escalation worker** | PATCH Zoho escalation fields, reassign staff, emit notification |
| **Guest store → SQS** | `requestBorrowable` and `requestFreeService` emit `ticket_created` |

---

## 6. Phase 3 — Future (Post-Launch)

> [!NOTE]
> These are explicitly **not being built now**. Onsite check-in, stay extension, and checkout will be done manually for launch.

| Future Event | Trigger | Worker Actions |
|-------------|---------|----------------|
| `checkin_complete` | Kiosk submit | eZee mark CHECKED_IN, MyGate generate PIN, emit notify |
| `stay_extension` | Extension payment success | eZee update dates, MyGate PIN rotation, emit notify |
| `checkout_complete` | Manual/auto checkout | MyGate revoke PIN, overdue detection, emit notify |
| `lock_battery_low` | MyGate battery webhook | Update device, create maintenance ticket |

---

## 7. Audit Log Strategy

> **Decision: Option A — Move all audit writes to SQS (accept tiny loss risk)**

**Reasoning:**
- Audit logs are non-critical operational data. They track "who did what" for debugging and admin visibility.
- If the NestJS process crashes between emitting the SQS message and SQS acknowledging receipt, we lose one audit event. This is acceptable because:
  1. The actual business action (payment capture, booking confirmation) already completed in the synchronous path.
  2. Razorpay has its own audit trail. Our DB has the payment record. The audit log is supplementary.
  3. The chance of this happening is extremely low (SQS `SendMessage` typically resolves in <50ms).
- Moving audit writes out of the request path removes 1 DB write from every payment operation — measurable latency improvement.

---

## 8. Environment Variables

```env
# AWS SQS (added to existing .env alongside S3/Textract credentials)
AWS_SQS_OPS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/vibehouse-ops.fifo
AWS_SQS_EZEE_SYNC_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/vibehouse-ezee-sync.fifo
AWS_SQS_NOTIFY_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/vibehouse-notify
AWS_SQS_SLA_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/vibehouse-sla-escalate

# Feature flag
SQS_CONSUMERS_ENABLED=true
```

> [!NOTE]
> `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are shared with S3 + Textract. SQS uses the same IAM credentials.

---

## 9. IAM Setup — ✅ Done

SQS permissions have been added to the existing IAM user as an inline policy named `VibehouseSQSAccess`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VibehouseSQSAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:CreateQueue",
        "sqs:SetQueueAttributes",
        "sqs:ListQueues"
      ],
      "Resource": "arn:aws:sqs:ap-south-1:*:vibehouse-*"
    }
  ]
}
```

> [!TIP]
> After initial setup, you can tighten permissions to only `SendMessage`, `ReceiveMessage`, `DeleteMessage`, and `GetQueueAttributes`.

---

## 10. NPM Dependencies

```bash
npm install @aws-sdk/client-sqs
```

Already installed alongside `@aws-sdk/client-s3` and `@aws-sdk/client-textract`.

---

## 11. Folder Structure

```
src/
├── sqs/
│   ├── sqs.module.ts                  # @Global module — exports SqsProducerService
│   ├── sqs.constants.ts               # Queue URL env keys, 4 message type enums
│   ├── sqs-producer.service.ts        # Typed send methods: sendAuditLog, sendPaymentSuccess, etc.
│   ├── sqs-consumer.service.ts        # Long-polling loop manager with configurable concurrency
│   ├── types/
│   │   └── messages.ts                # TS interfaces: AuditLogPayload, PaymentSuccessPayload, etc.
│   └── workers/
│       ├── ops-task.worker.ts         # vibehouse-ops.fifo → audit_log, payment_success, booking_confirmed
│       ├── ezee-sync.worker.ts        # vibehouse-ezee-sync.fifo → insert_booking, add_extra_charge (stubbed)
│       └── notify.worker.ts           # vibehouse-notify → notify_guest, notify_staff, low_stock (stubbed)
scripts/
├── create-sqs-queues.ts               # One-time: creates 8 queues
└── test-sqs-integration.ts            # E2E test suite (23 tests)
```

---

## 12. Graceful Degradation

| Scenario | What Happens |
|----------|-------------|
| SQS unreachable (send fails) | Producer catches error, logs warning. API response is NOT affected. Audit log for that action is lost. |
| Queue URL not configured | Producer logs warning: "queue URL not configured — message dropped". App starts normally. |
| Consumer crashes | NestJS auto-restarts (Railway). Messages stay in queue. No data loss. |
| Worker processing fails | Message stays in queue. SQS retries after visibility timeout. After 3 failures → DLQ. |
| Long SQS outage | All business operations continue normally (payment, booking, cart). Only background side-effects are delayed. |

---

## 13. Old Kafka Docs — Archive Plan

| File | Action |
|------|--------|
| `docs/setup/kafka_setup.md` | Move to `docs/setup/deprecated/kafka_setup.md` |
| `docs/setup/infrastructure_plan.md` | Update §2 (Kafka section) → replace with SQS reference |

---

## 14. Verification — ✅ Complete

See `docs/api_testing/sqs_integration_test_results.md` for full test results.

| Test | Result |
|------|--------|
| Server starts with SQS module loaded | ✅ Pass |
| All 4 queues reachable from local env | ✅ Pass |
| All 4 DLQs empty (no poisoned messages) | ✅ Pass |
| Admin restock → audit_log via SQS → DB write | ✅ Pass |
| Mark damaged → audit_log + low_stock_alert | ✅ Pass |
| Create product → audit_log via SQS | ✅ Pass |
| Non-SQS endpoints still work (regression) | ✅ Pass |
| Feature flag `SQS_CONSUMERS_ENABLED` configured | ✅ Pass |
| **Total: 23/23 passed** | ✅ |
