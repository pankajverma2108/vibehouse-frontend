# DevOps Consultant Meeting — Prep Document

> **Meeting Date**: April 1, 2026  
> **Property**: Vibe House Bandra — 5 floors, 39 rooms, 119 beds  
> **Stage**: Dev on Railway → Production on AWS (migration planned)

---

## 1. Current Tech Stack Overview

### Application Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Backend API** | NestJS (Node.js / TypeScript) | REST API, Passport auth (JWT + Google OAuth), Prisma ORM |
| **Frontend** | Next.js (React / TypeScript) | SSR + static pages, Vercel (current), planned move to container |
| **Database** | PostgreSQL | Currently Neon.tech (serverless), planned migration to RDS |
| **Cache** | Redis | Currently Redis Cloud (30MB free), planned self-hosted `redis:alpine` container |
| **Message Queue** | AWS SQS | 3 queues — Standard (notify, ops) + FIFO (eZee sync). ~30K msgs/mo. Free tier |
| **Object Storage** | AWS S3 | KYC images, selfies, signatures. ~2 GB active at any time (purged after stay) |
| **OCR / AI** | AWS Textract + OpenAI GPT-4o-mini | ID document scanning. ~150–300 scans/mo |
| **Payments** | Razorpay | 2% + GST. ~300–500 txns/mo |
| **Email** | AWS SES | OTP, password reset, booking confirmation |
| **WhatsApp** | Wati API | Check-in PINs, service notifications. ~1K–3K msgs/mo |

### External SaaS / Vendor Integrations

| Service | Purpose | Rate Limits (Known) |
|---------|---------|-------------------|
| **eZee PMS** | Source of truth for bookings, rooms, rates, folio | **Not documented by eZee.** We throttle to 1 req/500ms. Sync worker spaces calls 300ms apart. ~20 active bookings polled every 30 min |
| **MyGate IoT** | Smart lock PIN generation/revoke, access logs | **Not documented.** Session tokens expire in 3 days. No known rate info — need to confirm with vendor |
| **Razorpay** | Payment gateway — orders, captures, refunds | Standard: 20 req/sec per API key. Webhooks: unlimited inbound |
| **Zoho CRM/Desk** | Service ticketing, SLA escalations | CRM: ~5,000 API calls/day (Standard plan). Desk: 77,500 credits/day |
| **Wati (WhatsApp)** | Guest/staff notifications | Growth plan rate limit: TBD. Per-message pricing (₹0.13/utility) |
| **AWS Textract** | OCR on ID documents | Default: 5 calls/sec per account. Adjustable via support ticket |
| **OpenAI** | Structured OCR field extraction | Tier 1: 500 RPM, 30K TPM for GPT-4o-mini |
| **Google OAuth** | Guest social login | 10,000 login calls/day (well beyond our needs) |

### Current Hosting (Dev/Staging)

| Component | Current Provider | Monthly Cost |
|-----------|-----------------|-------------|
| Backend | Railway.app | ~Free tier |
| Database | Neon.tech (PostgreSQL) | Free tier |
| Redis | Redis Cloud | Free 30MB |
| Frontend | Vercel | Free tier |

---

## 2. Production Architecture (Proposed)

### Container Topology

```
                    ┌─── ALB (HTTPS :443) ──────────────────────┐
                    │                                            │
                    │   ┌──────────────┐   ┌──────────────┐     │
                    │   │ NestJS API   │   │ NestJS API   │     │
                    │   │ (0.5 vCPU    │   │ (0.5 vCPU    │     │
                    │   │  1 GB) ──#1  │   │  1 GB) ──#2  │     │
                    │   └──────────────┘   └──────────────┘     │
                    │                                            │
                    │   ┌──────────────┐   ┌──────────────┐     │
                    │   │ Next.js FE   │   │ Next.js FE   │     │
                    │   │ (0.5 vCPU    │   │ (0.5 vCPU    │     │
                    │   │  1 GB) ──#1  │   │  1 GB) ──#2  │     │
                    │   └──────────────┘   └──────────────┘     │
                    │                                            │
                    │   ┌──────────────┐   ┌──────────────┐     │
                    │   │ Redis Cache  │   │ SQS Worker   │     │
                    │   │ (0.5 vCPU    │   │ (0.5 vCPU    │     │
                    │   │  1 GB)       │   │  1 GB)       │     │
                    │   └──────────────┘   └──────────────┘     │
                    │                                            │
                    └────────────────────────────────────────────┘
                              │                    │
                        ┌─────┴──────┐     ┌───────┴──────┐
                        │  RDS       │     │  AWS SQS     │
                        │  Postgres  │     │  (3 queues)  │
                        │  t3.micro  │     └──────────────┘
                        └────────────┘
```

### Estimated Prod Cost: ~₹14,000/mo infra + ~₹11,700/mo SaaS = **~₹25,700/mo**

---

## 3. Scale Numbers

| Metric | Value | Basis |
|--------|-------|-------|
| Max concurrent guests | 119 | Total bed count |
| Avg occupancy | ~80% (~95 guests) | Industry avg for hostels |
| Monthly guest turnover | ~2,500–3,000 | Avg 2–3 night stays |
| Daily Active Users (DAU) | ~300 | ~200 in-house + ~100 website visitors |
| API requests/day | ~15,000 | 300 DAU × ~50 req each |
| **Peak API requests/hour** | **~1,500–2,000** | Evening / check-in peaks |
| **Peak req/sec** | **~0.5** | Far below any meaningful scaling threshold |
| SQS messages/month | ~30,000 | Well within 1M free tier |
| DB size | ~3–5 GB | Bookings live in eZee; we only store guests, sessions, logs |
| S3 active storage | ~2 GB | KYC images purged after stay |

---

## 4. Questions for the Consultant

### 4.1 — ECS vs EKS

We've documented ECS Fargate in our cost plan, but want to validate:

- [ ] **At our scale (~0.5 req/sec, 4 containers, single property), is ECS Fargate the right choice?** Or is EKS overkill/premature? We don't need service mesh, complex rolling updates, or multi-cluster federation.
- [ ] **When should we consider moving to EKS?** What's the tipping point — is it number of services, traffic volume, or multi-property expansion?
- [ ] **ECS on Fargate vs ECS on EC2?** Fargate is simpler but more expensive per vCPU. At our sizes (0.25–0.5 vCPU), would a single `t3.medium` EC2 running all containers be significantly cheaper?
- [ ] **Cost comparison**: Fargate prod = ~₹10,200/mo compute. A `t3.medium` (2 vCPU, 4 GB) on-demand = ~$30/mo (~₹2,500/mo). Is the Fargate premium justified for the managed experience?

### 4.2 — Networking: VPS vs Elastic IP

- [ ] **Do we need an Elastic IP at all?** Our current plan uses ALB → ECS (Fargate). Fargate tasks get dynamic IPs. ALB has a static DNS name. Is Elastic IP needed anywhere in this setup?
- [ ] **For the eZee sync worker and MyGate API calls**: These make outbound HTTP requests. Does the destination (eZee, MyGate servers) need to whitelist our IP? If yes, do we need a NAT Gateway with an Elastic IP for stable outbound IP?
- [ ] **Cost of NAT Gateway**: $0.045/hr + $0.045/GB processed = ~$32/mo base. Is this worth it, or can we avoid it?
- [ ] **Alternative**: VPS (single EC2 instance) with an Elastic IP running all containers via Docker Compose. Significantly cheaper (~$30/mo for t3.medium), but we lose auto-scaling, blue-green deploys, and HA. **Is this acceptable for a single-property business doing ~0.5 req/sec?**

### 4.3 — Load Balancer: Nginx vs ALB

- [ ] **ALB costs ~$18/mo** ($0.0239/hr base). At our traffic (~0.5 req/sec peak), the LCU charges are essentially $0. But the base cost is fixed.
- [ ] **Could we replace ALB with Nginx** running as a container in the ECS cluster (or on EC2) doing path-based routing + SSL termination with Let's Encrypt? Saves $18/mo but adds operational overhead.
- [ ] **If we go EC2 + Docker Compose** (VPS approach): is Nginx reverse proxy + Let's Encrypt + Docker the standard pattern? What's the maintenance overhead?
- [ ] **Blue-green deploys**: ALB + CodeDeploy gives us zero-downtime blue-green for free. If we use Nginx, what's the equivalent? Docker rolling update? Manual health check + traffic shift?
- [ ] **Shared ALB**: Can we use one ALB for both dev and staging with host-based routing rules? Saves $18/mo.

### 4.4 — Container Strategy & Docker

- [ ] **Single-stage vs multi-stage Dockerfiles**: We have 4 images (NestJS API, Next.js FE, SQS Worker, Redis). Should API + Worker share a single image (same NestJS app, different entrypoint) to reduce build time and ECR costs?
- [ ] **Redis as a sidecar**: Currently planned as a separate Fargate task. Should it be a sidecar container in the same task definition as the API? (Simpler networking, lower cost, but coupled lifecycle)
- [ ] **Health checks**: What health check patterns do you recommend for each container? Our API has `GET /health`, but the SQS Worker is a long-poll consumer with no HTTP endpoint.
- [ ] **Logging**: CloudWatch Logs is the default for ECS. At our log volume (~15K req/day), is CloudWatch sufficient, or should we look at cheaper alternatives (S3 log export, Grafana Loki)?

### 4.5 — Database & Persistence

- [ ] **RDS vs Neon**: We're currently on Neon.tech (serverless Postgres). Is migrating to RDS t3.micro (~$12/mo reserved) the right move? Or should we stay on Neon and avoid RDS management?
- [ ] **RDS Multi-AZ**: At our scale, is Multi-AZ ($24/mo vs $12/mo) worth it, or is daily automated backups + point-in-time recovery sufficient?
- [ ] **Connection pooling**: Prisma uses a connection pool. Neon has a built-in pgbouncer. If we move to RDS, do we need to set up pgbouncer separately?

### 4.6 — CI/CD & Deployment

- [ ] **GitHub Actions → ECR → ECS**: Is this the standard pipeline? Build image → push to ECR → update ECS task definition → CodeDeploy blue-green?
- [ ] **Blue-green vs rolling update**: At our scale (2 tasks per service), is blue-green overkill? Would a simple rolling update (`min healthy 50%`) suffice and save CodeDeploy complexity?
- [ ] **Environment promotion**: Build once, deploy to dev → staging → prod with only env var changes. Is ECS task definition overrides the standard way to handle this?

### 4.7 — Security & Secrets

- [ ] **Secrets management**: Currently using `.env` files via Railway. In ECS, should we use AWS Secrets Manager ($0.40/secret/mo) or SSM Parameter Store (free for standard parameters)?
- [ ] **How many secrets do we have?** ~15 env vars (DB URL, JWT secret, Google OAuth, Razorpay keys, eZee auth, MyGate keys, AWS creds, SES config)
- [ ] **IAM roles for ECS tasks**: Should each container have its own IAM role with least-privilege access? Or one shared role for the whole cluster?

### 4.8 — Scaling for Multi-Property

We're starting with 1 property (Bandra, 119 beds). The business plans to expand to 3–5 properties within 12 months.

- [ ] **What changes architecturally when we go multi-property?** Same backend with property_id filtering? Or separate deployments per property?
- [ ] **Database scaling**: 3–5 properties means ~15K–25K API req/day. Still well within t3.micro? When do we need to scale up?
- [ ] **SQS scaling**: More properties = more sync worker messages. Should we have one SQS worker per property or one shared worker?
- [ ] **eZee rate limits**: Each property has its own eZee account. Does the sync worker need per-property throttling? Or is each property independent from eZee's perspective?

### 4.9 — Monitoring & Alerting

- [ ] **What's the minimum viable monitoring stack?** CloudWatch basic metrics (CPU, memory, 5xx count) + alarms → SNS → email/Slack?
- [ ] **APM**: Do we need application performance monitoring at this stage? (Datadog, New Relic, or just CloudWatch Container Insights?)
- [ ] **Uptime monitoring**: Simple ping checks on `/health` endpoint from outside the VPC — Route53 health checks, or external services like UptimeRobot?

### 4.10 — Cost Optimization

- [ ] **Our current prod estimate is ~₹14,000/mo (~$167/mo) for infra.** Is this reasonable for our scale, or are we over-provisioning?
- [ ] **Savings plans**: Should we commit to Compute Savings Plans (1-yr) for Fargate? At our sizes, the savings might be ~30% ($167 → ~$117).
- [ ] **Dev environment**: Is running a full ECS dev environment worth ~₹5,500/mo, or should dev be purely local Docker Compose?
- [ ] **Staging**: Do we need a dedicated staging environment, or can we use the same ECS cluster as prod with a separate task definition?

---

## 5. 3rd-Party API Rate Limits Summary (for operational planning)

| API | Known Rate Limit | Our Usage | Risk Level |
|-----|-----------------|-----------|------------|
| **eZee PMS** | **Not publicly documented** — no official rate limit page. We've observed no throttling at 1 req/500ms. Need to confirm with eZee support | ~40 calls per sync cycle (20 bookings × 2). Sync every 30 min = ~80/hr peak | ⚠️ MEDIUM — unknown ceiling |
| **MyGate IoT** | **Not documented** — session tokens expire in 3 days. No observed rate limits during testing | ~10–20 calls/day (check-in PIN gen + checkout revoke) | ⚠️ LOW — very low volume |
| **Razorpay** | **20 req/sec per API key** (documented). Payment links: 10/sec. Webhooks: unlimited inbound | ~300–500 txns/mo, never >1 req/sec | ✅ LOW — well within limits |
| **Zoho CRM** (Standard) | **~5,000 API calls/day.** Desk: 77,500 credits/day | ~50–200 calls/day (ticket CRUD + status updates) | ✅ LOW |
| **Wati (WhatsApp)** | Growth plan: **TBD** — per-message pricing. No documented req/sec limit | ~50–100 msgs/day | ✅ LOW |
| **AWS Textract** | **Default: 5 TPS** (DetectDocumentText). Adjustable via support | ~10–20 scans/day | ✅ LOW |
| **AWS SES** | **Sandbox: 200/day, 1/sec.** Production: adjustable (request SES production access) | ~100–300 emails/day at prod scale | ⚠️ MEDIUM — need prod SES approval |
| **OpenAI GPT-4o-mini** | **Tier 1: 500 RPM, 30K TPM** | ~10–20 calls/day | ✅ LOW |

> **Action Item**: Confirm eZee and MyGate rate limits directly with their support teams before production launch.

---

## 6. Architecture Decision: Quick Reference

| Decision | Options | Our Current Choice | What to Validate |
|----------|---------|-------------------|-----------------|
| Container orchestration | ECS Fargate / ECS on EC2 / EKS / VPS + Docker Compose | ECS Fargate | Is Fargate worth the premium at ~0.5 req/sec? |
| Load balancer | ALB / Nginx on EC2 / Nginx sidecar | ALB (~$18/mo) | Can Nginx save $18/mo without too much overhead? |
| Outbound IP | NAT Gateway / Elastic IP on VPS / No fixed IP | Not decided | Do eZee/MyGate require IP whitelisting? |
| Database | RDS / Neon / Aurora Serverless | RDS t3.micro reserved | Is Neon cheaper and sufficient? |
| Redis | Self-hosted container / ElastiCache / Redis Cloud | Self-hosted container | Sidecar or separate task? |
| Deployments | Blue-green (CodeDeploy) / Rolling update / Manual | Blue-green via ALB | Is rolling update simpler and sufficient? |
| Monitoring | CloudWatch / Datadog / Grafana + Loki | CloudWatch | Is CloudWatch enough for MVP? |
| Secrets | Secrets Manager / SSM Parameter Store / .env | Not decided | SSM free vs Secrets Manager $6/mo |
| Domain / SSL | ACM + ALB / Let's Encrypt + Nginx | ACM + ALB | Comes free with ALB |

---

## 7. Summary: What We Need From This Meeting

1. **Validate or correct our ECS Fargate choice** — are we over-engineering for ~0.5 req/sec?
2. **VPS route**: Would a single t3.medium + Docker Compose + Nginx + Let's Encrypt be a pragmatic and cheaper start?
3. **Networking clarity**: NAT Gateway vs no fixed IP vs Elastic IP — what does our integration pattern require?
4. **Deployment pipeline**: GitHub Actions → ECR → ECS with blue-green — is this standard or overkill?
5. **Multi-property roadmap**: What to architect now vs what to defer until property #2?
6. **Cost benchmarking**: Is ~₹25,700/mo (infra + SaaS) reasonable for a single-property hostel tech stack?
