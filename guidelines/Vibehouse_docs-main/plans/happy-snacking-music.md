# Plan: Tech Stack Cost Document

## Context
Vibe House needs a comprehensive cost breakdown of every service/dependency in the stack — covering Dev, Staging, and Production environments. The property has **39 rooms / 119 beds** across 5 floors (15 Queen, 20×4-dorm, 4×6-dorm). This document will live at `docs/tech_stack_costs.md`.

## What I'll Create

A single markdown file with:

1. **Property scale assumptions** (119 beds, estimated ~3,000 guests/month turnover, ~500 Kafka events/hr peak)
2. **Master cost table** — every service with: Name, Purpose, Rate (public pricing), Estimated Monthly Cost for Dev / Staging / Prod, and Assumptions
3. **Monthly total summary** per environment
4. **Notes on free tiers, volume discounts, and contract-based pricing**

## Services & Estimated Costs (Research Summary)

### Infrastructure (AWS / Cloud)

| # | Service | Purpose | Dev | Staging | Prod | Rate Basis |
|---|---------|---------|-----|---------|------|------------|
| 1 | **AWS ECS Fargate** | NestJS backend containers | Railway free/$5 | ~$15 (0.25vCPU, 0.5GB) | ~$30-40 (0.5vCPU, 1GB × 2 tasks) | ~$0.04/vCPU-hr + $0.004/GB-hr (ap-south-1 ~15% higher) |
| 2 | **AWS RDS PostgreSQL** | Primary database | Neon free tier | Neon Launch $5 | ~$25-35 (db.t3.micro or Neon Scale) | db.t3.micro ~$0.018/hr = ~$13/mo + storage |
| 3 | **Redis** | Caching (catalog, JWT, sessions) | Redis Cloud free 30MB | Redis Cloud free 30MB | ~$0 (self-hosted on ECS) or $5 Upstash | Redis Cloud free = 30MB; Upstash pay-as-you-go $0.2/100K commands |
| 4 | **AWS MSK Serverless** | Kafka async workers | Upstash free (10K msg/day) | Upstash $10 | ~$15-25 | $0.75/partition-hr + $0.015/GB in |
| 5 | **AWS S3** | KYC images, G-Cards, signatures | ~$0.50 | ~$0.50 | ~$1-3 | $0.025/GB-mo (ap-south-1); ~10-50GB storage |
| 6 | **Railway** | Dev hosting | ~$5/mo | — | — | Pay-per-use, $5 min |

### External APIs (Pay-per-use)

| # | Service | Purpose | Dev | Staging | Prod | Rate Basis |
|---|---------|---------|-----|---------|------|------------|
| 7 | **AWS Textract** | OCR (ID document text extraction) | ~$0 (free tier 1K pages) | ~$0.50 | ~$5-10 | $0.065/page (first 1M); ~100-150 KYC/mo |
| 8 | **OpenAI GPT-4o-mini** | Structured OCR field extraction | ~$0.01 | ~$0.05 | ~$0.10-0.30 | $0.15/1M input + $0.60/1M output; ~150 calls/mo × ~500 tokens |
| 9 | **Razorpay** | Payment gateway | $0 (test mode) | $0 (test mode) | **2% + GST per txn** | 2% domestic; no setup/AMC; ~₹2,000-5,000 avg txn |
| 10 | **Wati (WhatsApp)** | Guest & staff notifications | ~₹999 starter | ~₹999 | ~₹2,500-4,000 | ₹0.88/marketing msg, ₹0.13/utility; ~1,000-3,000 msgs/mo |
| 11 | **eZee PMS** | Booking source of truth | Included (existing contract) | — | ~$50/mo (Elite plan) | $50/mo Elite plan; already in use |
| 12 | **Zoho CRM** | Ticketing & staff mgmt | Free (3 users) | Free (3 users) | ~₹800-1,400/user/mo | Standard ₹800/user/mo; ~3-5 users |
| 13 | **MyGate** | Smart lock PIN management | Contract-based | — | Contract-based | Hardware + API — pricing not public, need vendor quote |

### Dev Tools & Build

| # | Service | Purpose | Dev | Staging | Prod | Rate Basis |
|---|---------|---------|-----|---------|------|------------|
| 14 | **Neon PostgreSQL** | Serverless DB (dev/staging) | $0 (free tier) | $5 (Launch) | — (use RDS) | Free: 100 CU-hr/mo, 0.5GB; Launch: $5 min |
| 15 | **Upstash Kafka** | Dev/staging message queue | $0 (free 10K msg/day) | ~$10 | — (use MSK) | Free: 10K msg/day; Pro: $0.6/100K msgs |

## Monthly Cost Estimates

| Environment | Estimated Monthly Total | Notes |
|-------------|------------------------|-------|
| **Dev** | **~$5-10** | Mostly free tiers (Neon, Redis Cloud, Upstash, Textract) + Railway $5 |
| **Staging** | **~$30-40** | Neon Launch + Upstash paid + minimal Fargate |
| **Production** | **~₹15,000-25,000 ($180-300)** | ECS + RDS/Neon + MSK + S3 + Textract + Wati + Zoho + Razorpay % |

> **Razorpay is variable** — 2% + GST on every transaction. At ~300 bookings/mo × ₹3,000 avg = ₹9L revenue → ~₹21,000 in gateway fees. This is a pass-through cost, not infrastructure.

> **eZee & MyGate** are existing vendor contracts — costs depend on your current agreements.

## File to Create
- [docs/tech_stack_costs.md](docs/tech_stack_costs.md) — full formatted document with all tables above, clean markdown

## Verification
- Cross-check all AWS pricing against the [AWS Pricing Calculator](https://calculator.aws/)
- Validate Razorpay rates against [Razorpay pricing page](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/)
- Confirm Wati rates against [Wati pricing page](https://www.wati.io/pricing/)
