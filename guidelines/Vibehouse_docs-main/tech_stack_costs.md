# Vibe House — Tech Stack & Cost Breakdown

> **Last Updated:** March 2026
> **Property:** Vibe House Bandra — 5 floors, 39 rooms, 119 beds
> **Room Mix:** 15 Queen (15 beds) · 20 × 4-Dorm (80 beds) · 4 × 6-Dorm (24 beds)

---

## Architecture Overview

All environments (Dev, Staging, Prod) run fully containerised on **AWS ECS Fargate** with the same Docker images, removing all temporary/external hosting dependencies (Railway, Neon, Redis Cloud, Upstash). Blue-green deployments use **AWS ALB + CodeDeploy** for zero-downtime promotion from Staging → Prod.

```
Local Docker Compose  →  ECS Dev  →  ECS Staging  →  ECS Prod (Blue/Green via ALB + CodeDeploy)
```

### Containers per Environment

| Container | Image | Dev Size | Staging Size | Prod Size |
|-----------|-------|----------|--------------|-----------|
| **NestJS API** | Custom | 0.25 vCPU / 0.5 GB | 0.25 vCPU / 0.5 GB | 0.5 vCPU / 1 GB × 2 tasks |
| **Next.js Frontend** | Custom | 0.25 vCPU / 0.5 GB | 0.25 vCPU / 0.5 GB | 0.5 vCPU / 1 GB × 2 tasks |
| **Redis** | redis:alpine | 0.25 vCPU / 0.5 GB | 0.25 vCPU / 0.5 GB | 0.5 vCPU / 1 GB |
| **SQS Worker** | Custom | 0.25 vCPU / 0.5 GB | 0.25 vCPU / 0.5 GB | 0.5 vCPU / 1 GB |

> Blue-green note: During deployment, ECS CodeDeploy spins up the green task set, ALB shifts traffic, then terminates blue. You only pay for double compute during the ~5 min deployment window, not 24/7.

---

## Scale Assumptions

| Metric | Estimate | Basis |
|--------|----------|-------|
| Max concurrent guests | 119 | Total bed count |
| Avg occupancy | ~80% (~95 guests) | Industry avg for hostels |
| Monthly guest turnover | ~2,500–3,000 | Avg 2–3 night stays |
| **Daily active users (DAU)** | **~300** | **~200 in-house guests + ~100 non-guest website visitors** |
| API requests/day | ~15,000 | 300 DAU × ~50 req each |
| API requests/hour (peak) | ~1,500–2,000 | Evening/check-in peaks |
| KYC submissions/month | ~150–300 | New unique guests (first visit only) |
| SQS messages/hour (peak) | ~50 | Ops tasks, notifications, eZee sync |
| **Monthly SQS messages** | **~30,000** | **Well within SQS free tier (1M requests/mo)** |
| Payments/month | ~300–500 txns | Bookings + upsells + extensions |
| WhatsApp messages/month | ~1,000–3,000 | Check-in, PIN, service updates |
| **S3 active storage** | **~2 GB at any time** | **KYC images kept only for duration of stay, then purged** |
| S3 new data/month | ~250 MB | ~95 active guests × ~2.5 MB (4 images each) |
| **RDS actual data footprint** | **~3–5 GB** | **Only guests, sessions, service requests, logs — bookings live in eZee** |

---

## Master Cost Table

> **Fargate rates (ap-south-1):** $0.04656/vCPU-hr · $0.00511/GB-hr  
> **ALB rate (ap-south-1):** $0.0239/hr base + $0.008/LCU-hr (LCU usage ≈ $0 at Vibe House traffic volumes)  
> **Formula:** `(vCPU × $0.04656 + GB × $0.00511) × 720 hrs`

### 1. Compute — ECS Fargate

| # | Container | Purpose | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|-----------|---------|---------------|-------------------|--------------------|-------------|
| 1 | **NestJS API** | REST API backend | **$10** | **$10** | **$41** | Dev/Staging: 1 task (0.25 vCPU, 0.5 GB). Prod: 2 tasks (0.5 vCPU, 1 GB) for HA |
| 2 | **Next.js Frontend** | Guest PWA + Kiosk UI | **$10** | **$10** | **$41** | Same sizing as backend. Prod serves SSR + static assets |
| 3 | **Redis Container** | JWT cache, catalog, session | **$10** | **$10** | **$20** | Dev/Staging: 0.25 vCPU, 0.5 GB. Prod: 0.5 vCPU, 1 GB. allkeys-lru eviction |
| 4 | **SQS Worker** | Ops Task, Notification, eZee Sync consumers | **$10** | **$10** | **$20** | Polls SQS queues. Dev/Staging: 0.25 vCPU, 0.5 GB. Prod: 0.5 vCPU, 1 GB |
| | | **Compute Subtotal** | **~$40** | **~$40** | **~$122** | |

### 2. Networking

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 6 | **AWS ALB** | Blue-green traffic routing + SSL termination | $0.0239/hr base + $0.008/LCU-hr | **$18** | **$18** | **$18** | 1 ALB per env. Base: $0.0239 × 720 = $17.2/mo. LCU usage ≈ $0 at 15K req/day (threshold is 25 new connections/sec per LCU — Vibe House peaks at ~0.17 req/sec) |
| 7 | **AWS CodeDeploy** | Blue-green orchestration (ECS) | Free for ECS | **$0** | **$0** | **$0** | No charge for ECS blue-green deployments |

### 3. Container Registry

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 8 | **AWS ECR** | Docker image storage (4 repos) | $0.10/GB-mo (after 500 MB free) | **$0.15** | **$0.15** | **$0.15** | ~1.6 GB total images (4 repos × ~400 MB). Shared across envs |

### 4. Database

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 9 | **AWS RDS PostgreSQL** | Dev + Staging DB (shared instance, separate schemas) | db.t3.micro: $0.018/hr + $0.133/GB-mo | **$8** *(shared)* | **$8** *(shared)* | — | Single db.t3.micro shared between dev & staging. Actual data ~1–2 GB. 20 GB is RDS minimum allocation |
| 10 | **AWS RDS PostgreSQL** | Prod primary database | db.t3.micro: $0.018/hr on-demand; ~$0.0166/hr reserved | — | — | **$12** | 1-yr no-upfront reserved db.t3.micro in ap-south-1 ≈ $0.0166/hr × 720 = ~$12/mo (not $8 — $8 was optimistic). Full upfront lowers to ~$10/mo. 20 GB storage ($2.66) included. |

### 5. Storage

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 11 | **AWS S3** | KYC images, selfies, G-Card PDFs, signatures | $0.025/GB-mo (ap-south-1 Standard) + $0.005/1K PUT | **$0.05** | **$0.05** | **$0.10–0.20** | KYC images purged after stay ends → ~2 GB active at any time. ~95 active guests × 4 images × ~500 KB = ~190 MB peak storage. ~250 MB new uploads/mo × $0.025 ≈ $0.006. PUT costs ~$0.05. Total < $0.20/mo in prod |

### 6. Message Queue

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 12 | **AWS SQS** | Async message queue (Ops Tasks, Notifications, eZee Sync) | Standard: $0.40/1M requests. First 1M/mo FREE | **$0** | **$0** | **$0** | 30K msgs/mo = ~90K SQS requests (send + receive + delete = ~3× msg count). Well within the 1M free tier. No broker container needed — fully managed |

### 7. AI / OCR

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 13 | **AWS Textract** | Raw text extraction from ID documents | $0.065/page (DetectDocumentText) | **$0** | **$0.50** | **$10–20** | AWS free tier: 1K pages/mo for 3 months. Prod: ~150–300 scans/mo (front + back of ID) |
| 14 | **OpenAI GPT-4o-mini** | Structured field extraction from OCR text | $0.15/1M input + $0.60/1M output tokens | **$0.01** | **$0.05** | **$0.10–0.30** | ~150–300 calls/mo × ~500 input + ~200 output tokens |

### 8. Payments

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 15 | **Razorpay** | Payment gateway (bookings, upsells, extensions) | **2% + 18% GST** domestic. 3% premium methods | **$0** | **$0** | **Variable** | Test mode for Dev/Staging. Production: see note |

> **Razorpay Production Estimate:**
> ~300 txns/mo × ₹3,000 avg = ₹9,00,000/mo revenue
> Fee: ₹9,00,000 × 2.36% (incl. GST) = **~₹21,000/mo (~$250)**
> This is a settlement deduction (pass-through), not an AWS/infra line item.

### 9. Notifications

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 16 | **Wati (WhatsApp API)** | Guest notifications (check-in, PIN, services), staff alerts | Platform: ₹2,499/mo (Growth). Messages: ₹0.13/utility, ₹0.88/marketing | **₹999** | **₹999** | **₹2,500–4,000** | Dev/Staging: Starter plan. Prod: Growth plan + ~1,000–3,000 utility msgs/mo |

### 10. External SaaS (Vendor Contracts)

| # | Service | Purpose | Rate | Dev (Monthly) | Staging (Monthly) | Prod (Monthly) | Assumptions |
|---|---------|---------|------|---------------|-------------------|--------------------|-------------|
| 17 | **eZee PMS** | Source of truth: bookings, rooms, rates, folio | $50/mo (Elite plan) | **Included** | — | **~$50** | Existing contract. API access included in Elite. One live property |
| 18 | **Zoho CRM** | Service ticketing, SLA escalations, staff management | Standard: ₹800/user/mo (annual). Free ≤3 users | **$0** | **$0** | **₹2,400–7,000** | Free tier for dev. Prod: 3–5 staff users on Standard plan |
| 19 | **MyGate** | Smart lock PIN generation/revoke, access logs, battery alerts | **Contract-based** (not publicly listed) | **TBD** | — | **TBD** | Hardware + API subscription. Estimate ₹200–500/lock/mo. Requires vendor quote |

---

## Monthly Cost Summary

### Infrastructure (USD)

| Component | Dev | Staging | Prod | Notes |
|-----------|-----|---------|------|-------|
| ECS — NestJS API | $10 | $10 | $41 | Prod: 2 tasks (0.5 vCPU, 1 GB) for HA |
| ECS — Next.js Frontend | $10 | $10 | $41 | Prod: 2 tasks (0.5 vCPU, 1 GB) |
| ECS — Redis container | $10 | $10 | $20 | Prod: 0.5 vCPU, 1 GB |
| ECS — SQS Worker | $10 | $10 | $20 | Polls SQS queues for ops/notif/sync tasks |
| AWS SQS | $0 | $0 | $0 | 30K msgs/mo = ~90K requests — free tier (1M/mo) |
| ALB | $18 | $18 | $18 | $0.0239/hr × 720 = $17.2 base; LCU ≈ $0 at our traffic |
| ECR | $0.15 | $0.15 | $0.15 | ~1.6 GB total images (4 repos), shared |
| RDS PostgreSQL | $8 *(shared)* | $8 *(shared)* | **$12** | Dev/Staging share 1 db.t3.micro. Prod: db.t3.micro 1-yr no-upfront reserved (~$12/mo) |
| S3 | $0.05 | $0.05 | $0.20 | KYC images purged after stay; <2 GB active at all times |
| Textract | $0 | $0.50 | $15 | AWS free tier (1K pages) covers dev |
| OpenAI GPT-4o-mini | $0.01 | $0.05 | $0.20 | ~300 OCR calls/mo at prod scale |
| CodeDeploy | $0 | $0 | $0 | Free for ECS blue-green |
| **Infra Subtotal (USD)** | **~$66** | **~$67** | **~$167** | |
| **Infra Subtotal (₹ @ ₹84)** | **~₹5,544** | **~₹5,628** | **~₹14,028** | |

### SaaS & APIs (INR)

| Component | Dev | Staging | Prod |
|-----------|-----|---------|------|
| Wati (WhatsApp) | ₹999 | ₹999 | ₹3,500 |
| eZee PMS | Included | — | ₹4,200 |
| Zoho CRM | ₹0 | ₹0 | ₹4,000 |
| MyGate | TBD | — | TBD |
| Razorpay (pass-through) | ₹0 | ₹0 | ₹21,000 |
| **SaaS Subtotal** | **~₹999** | **~₹999** | **~₹32,700** |

### All-In Monthly Total

| Environment | Infra (USD→₹) | SaaS (₹) | Total (₹) |
|-------------|--------------|---------|-----------|
| **Dev** | ₹5,544 | ₹999 (Wati) | **~₹6,500/mo** |
| **Staging** | ₹5,628 | ₹999 (Wati) | **~₹6,600/mo** |
| **Production (excl. Razorpay)** | ₹14,028 | ₹11,700 (Wati + eZee + Zoho) | **~₹25,700/mo** |
| **Production (incl. Razorpay)** | ₹14,028 | ₹32,700 | **~₹46,700/mo** |

> [!NOTE]
> **Validation Audit (March 2026):** All Fargate calculations verified using `(vCPU × $0.04656 + GB × $0.00511) × 720`. ALB base rate is `$0.0239/hr` (LCU usage ≈ $0 at our traffic). RDS reserved 1-yr no-upfront in ap-south-1: `~$0.0166/hr = ~$12/mo`. Kafka → SQS migration (March 2026) removed the Kafka broker container ($20/env) and replaced MSK/Upstash with SQS free tier, saving ~$20/env/mo.

---

## Blue-Green Deployment Architecture

```
ECR (image push)
       │
  CodePipeline / GitHub Actions
       │
  CodeDeploy (ECS Blue/Green)
       │
  ALB Listener (HTTPS :443)
    ├── Blue Target Group → ECS Service v1 (current prod)
    └── Green Target Group → ECS Service v2 (new version)
         │
    [Traffic shifted 10%→50%→100% or all-at-once]
         │
    Blue terminated after stabilisation (5–10 min)
```

**Cost impact of blue-green:** ~5–10 min of double compute per deployment = negligible ($0.05–0.10/deploy). No standing idle cost.

---

## Notes

### Why All Environments on ECS (No Free Tiers)
- **Parity**: Dev containers = prod containers. No "it works on my machine" bugs from Railway vs ECS differences.
- **Blue-green readiness**: Images promoted from dev → staging → prod unchanged. Only config (env vars, DB URL) changes via ECS task definition.
- **No cold starts**: Unlike Neon or Railway free tiers, ECS tasks stay warm. Staging is always queryable.

> Dev + Staging together cost ~₹13,100/mo (~$156). This is the cost of environment parity.
> If this is too high early on, Dev can run locally via Docker Compose (free) and only Staging runs on ECS — saves ~₹5,500/mo.

### Applied Optimisations (already reflected in table above)
- ✅ **Kafka → AWS SQS** — Removed Kafka broker container ($20/env) and MSK Serverless ($25 prod). SQS is fully managed, no infrastructure to run, and 30K msgs/mo falls within the permanent free tier (1M requests/mo). Saves ~$20/env/mo across all environments.
- ✅ **RDS Reserved (1-yr) for prod** — db.t3.micro reserved at ~$12/mo vs $16 on-demand. Requires 1-year no-upfront commitment.

### Further Optimisation Options (not yet applied)
1. **Dev on Docker Compose** — Run dev locally (free). Only Staging + Prod on AWS. Saves ~₹5,500/mo.
2. **Shared ALB** — Use one ALB for dev + staging with host-based routing rules (different hostnames). Saves ~$18/mo.
3. **Textract → GPT-4o Vision** — Skip Textract entirely; use GPT-4o-mini's vision capability for OCR. Saves ~$15/mo at our volume. Slight quality trade-off on handwritten IDs.
4. **Next.js on CloudFront + S3** — Static export of Next.js to S3 + CloudFront (~$1/mo) instead of ECS container (~$41/mo). Only viable if no SSR is needed.

### Contract-Dependent Costs (Vendor Quotes Required)
- **MyGate** — Hardware + API pricing not public. Contact sales for device count quote.
- **eZee PMS** — Elite plan ~$50/mo but verify API rate limits for sync workers.
- **Zoho CRM** — Consider Zoho One bundle (₹2,000/user/mo) if Zoho Desk, Books, or Analytics are also needed.

---

## Sources
- [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [AWS RDS PostgreSQL Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [AWS SQS Pricing](https://aws.amazon.com/sqs/pricing/)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [AWS ECR Pricing](https://aws.amazon.com/ecr/pricing/)
- [AWS ALB Pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- [AWS Textract Pricing](https://aws.amazon.com/textract/pricing/)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Razorpay Pricing](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/)
- [Wati Pricing](https://www.wati.io/pricing/)
- [eZee Absolute Pricing](https://www.ezeeabsolute.com/pricing.php)
- [Zoho CRM Pricing](https://www.zoho.com/crm/zohocrm-pricing.html)
