# Vibe House — Cost Reduction Alternatives

> **Last Updated:** March 2026
> **Reference:** `tech_stack_costs.md` — Current prod cost: **~₹29,400/mo (excl. Razorpay)**
> **Goal:** Reduce without dropping requirements, SLA guarantees, or HA posture

> [!IMPORTANT]
> Razorpay (₹21,000/mo) is a **revenue pass-through**, not infrastructure spend. All comparisons below exclude it — your actual infra + SaaS cash out-of-pocket is **₹29,400/mo**.

---

## Summary — Potential Savings by Strategy

| # | Strategy | Effort | Monthly Saving | New Prod Total (excl. Razorpay) |
|---|---|---|---|---|
| 1 | Kill dev env on AWS → Docker Compose locally | Low | ₹~7,200 | ₹29,400 |
| 2 | Shared ALB for dev + staging | Low | ₹~1,500 | ₹27,900 |
| 3 | Replace Kafka → Amazon SQS | Medium | ₹~3,360 | ₹24,540 |
| 4 | Switch Fargate to Graviton (ARM) | Low | ₹~2,400 | ₹22,140 |
| 5 | Next.js → S3 + CloudFront (static) | Medium | ₹~3,276 | ₹18,864 |
| 6 | Textract → GPT-4o-mini Vision | Low | ₹~1,260 | ₹17,604 |
| 7 | Zoho One bundle (if scaling users) | Low | ₹~2,000 | ₹15,604 |
| **All applied** | | | **₹~21,000 saved** | **~₹8,400/mo** |

> Numbers assume ₹84/$ exchange rate.

---

## Strategy 1 — Kill Dev on AWS → Local Docker Compose

**Current cost:** ~$86/mo (dev) = **₹7,224/mo**
**New cost:** $0

### What changes
Run your dev environment with `docker-compose up` on your local machine or a team member's laptop. The same Docker images used in prod work locally — this is what the `docker-compose.yml` in `/db/` is already set up for.

```
Local Docker Compose (free)  →  ECS Staging  →  ECS Prod
```

### What stays the same
- All containers, same images, same code
- No dev environment quality loss — you test the same stack locally
- Staging still runs on AWS (catches env-specific bugs before prod)

### Trade-off
- Dev DB is now local PostgreSQL (not RDS). Minor inconvenience for sharing dev data across team members. Fix: use a shared Neon free tier DB for dev (free up to 0.5 GB — enough for dev data).
- **Savings: ₹7,224/mo** — highest single saving with zero requirement change.

---

## Strategy 2 — Shared ALB for Dev + Staging

**Current cost:** ₹1,512/mo (dev ALB) + ₹1,512/mo (staging ALB) = **₹3,024/mo for two ALBs**
**New cost:** ₹1,512/mo for one shared ALB with host-based routing

### What changes
One ALB handles both dev and staging using **host-based routing rules**:
```
dev.vibehouse.in    → dev ECS target group
staging.vibehouse.in → staging ECS target group
prod.vibehouse.in   → prod ECS target group (separate ALB)
```

The prod ALB stays separate — this is important for blue-green deployment isolation.

### What stays the same
- Full dev + staging environments
- SSL termination on both subdomains (add 2 certs to the same ALB — ALB supports up to 25 SNI certs per listener)
- Blue-green in prod unaffected

### Trade-off
- If the shared ALB goes down, both dev and staging go with it. Acceptable for non-prod environments.
- **Savings: ₹1,512/mo** (if dev is still on AWS) or moot if Strategy 1 is applied first.

---

## Strategy 3 — Replace Kafka with Amazon SQS

**Current cost (Kafka container):** ~$20/mo = ₹1,680/mo  
**Current cost (Kafka Worker container, prod):** ~$20/mo = ₹1,680/mo  
**Total Kafka spend:** ₹3,360/mo  
**New SQS cost:** **$0** (AWS Free Tier: first **1 million messages/month free permanently**)

### Context
Your current volume is **~30,000 Kafka events/month**. That is 3% of SQS's permanent free tier. You would not pay a single rupee for SQS at this volume — even at 10× growth (300K msgs/mo) the cost is $0.24/mo.

### What changes

| Feature | Kafka (current) | Amazon SQS (alternative) |
|---|---|---|
| Message broker | Self-hosted ECS container | AWS-managed, serverless |
| At-rest durability | In-memory (ECS restart = lost) | 4-day retention, guaranteed delivery |
| Ordering | Per-partition ordering | FIFO queues support strict ordering |
| Replay | Yes (offset-based) | No (once consumed + deleted) |
| Cost at 30K msgs/mo | $40/mo (2 containers) | **$0** |

### Topics → SQS Queue mapping

| Kafka Topic | SQS Queue | Type |
|---|---|---|
| `ops.task.*` | `vibe-ops-tasks.fifo` | FIFO (order matters for check-in flow) |
| `notify.*` | `vibe-notifications` | Standard (order doesn't matter) |
| `ezee.sync.refresh` | Replaced by **EventBridge Scheduler** (cron, free) | — |

### Worker changes
The **Kafka Worker** ECS container becomes a lightweight **SQS poller** inside the existing NestJS API — no separate container needed. At 30K msgs/mo (~1 msg/min), the API handles polling alongside normal request serving with zero capacity impact.

> [!NOTE]
> If you ever scale to **500K+ msgs/month** or need **complex stream processing / replay**, revisit Kafka (or Amazon MSK Serverless). At current scale, Kafka is solving a problem you don't have yet.

- **Savings: ₹3,360/mo** (eliminate both Kafka containers)

---

## Strategy 4 — Switch Fargate to Graviton (ARM) Architecture

**Current compute cost (prod):** ~$142/mo = ₹11,928/mo
**New compute cost (prod with ARM):** ~$114/mo = ₹9,576/mo

### What changes
AWS Fargate offers **ARM64 (Graviton2)** tasks at **~20% less** than x86:
- vCPU: $0.04656 → **$0.03722/hr** (-20%)
- GB: $0.00511 → **$0.00408/hr** (-20%)

Your NestJS (Node.js) and Next.js apps run natively on ARM with zero code changes — just change one line in the ECS task definition:

```json
"runtimePlatform": {
  "cpuArchitecture": "ARM64",   // change from X86_64
  "operatingSystemFamily": "LINUX"
}
```

And rebuild Docker images on ARM:
```bash
docker buildx build --platform linux/arm64 -t your-image .
```

Redis, Bitnami Kafka — both have official ARM images.

### What stays the same
- Same container sizes, same HA posture (2 tasks)
- Same ECS Fargate (no EC2, no management)
- Zero application code changes

- **Savings: ~₹2,352/mo on compute**

---

## Strategy 5 — Next.js Static Export → S3 + CloudFront

**Current cost (Next.js ECS, prod):** 2 tasks × ~$20.50/task = **~$41/mo = ₹3,444/mo**
**New cost (S3 + CloudFront):** ~$1–2/mo = **₹84–168/mo**

### When this works
Your Next.js PWA is primarily a **guest-facing app** and **kiosk UI**. If pages use `getStaticProps` / client-side data fetching (calling your NestJS API), you can do a **static export** (`next export`) and host on S3 + CloudFront.

```
Static Pages (S3 + CloudFront, ~$1/mo)
         ↕  (API calls via HTTPS)
NestJS API (ECS Fargate, unchanged)
```

### What stays the same
- All functionality — KYC, booking dashboard, add-ons, kiosk flow
- The NestJS API handles all data — Next.js just becomes a client
- Zero requirement change, zero guest-facing difference

### What changes
- No SSR (server-side rendering) — initial page loads are from CDN, then JS hydrates with API data
- Slightly longer initial content load on first visit (mitigated by CloudFront CDN edge caching)

### What you lose
- Real-time SSR metadata (OG tags per booking, etc.) — minor, can be handled with client-side meta injection

> [!NOTE]
> This only works if your Next.js pages don't use `getServerSideProps`. If any pages do, they need to be refactored to client-side fetching first (a day or two of work). Worth checking before committing.

- **Savings: ~₹3,276/mo**

---

## Strategy 6 — Replace AWS Textract with GPT-4o-mini Vision

**Current cost (Textract, prod):** ~$15/mo (₹1,260/mo)
**New cost (GPT-4o-mini Vision, prod):** ~$0.30–0.50/mo (₹25–42/mo)

### How it works
Instead of:
```
Upload image → AWS Textract (OCR) → extracted text → GPT-4o-mini (structure) → fields
```

Do:
```
Upload image → GPT-4o-mini Vision (OCR + structure in one call) → fields
```

GPT-4o-mini supports image inputs. At your volume (~300 ID scans/month):
- Input: ~300 calls × 1 image × ~250 tokens = 75K tokens → $0.011
- Output: ~300 calls × ~300 tokens = 90K tokens → $0.054
- **Total: ~$0.07/mo** — essentially free

### What stays the same
- OCR accuracy is comparable for printed IDs (Aadhaar, Passport). 
- GPT can directly return structured JSON (`{ name, dob, id_number, address }`) — fewer steps than current Textract → GPT pipeline.

### Trade-off
- GPT-4o-mini vision is slightly less accurate than Textract on **handwritten or damaged documents** — but your users submit photos of printed government IDs, which GPT handles excellently.
- OpenAI API dependency (already in the stack for GPT field extraction).

- **Savings: ~₹1,218/mo** + simplification of the OCR pipeline

---

## Strategy 7 — Zoho One Bundle (If Scaling Staff Users)

**Current cost (Zoho CRM Standard):** ₹800/user/mo × 3–5 users = ₹2,400–4,000/mo
**Zoho One cost:** ₹2,000/user/mo — but includes 45+ apps (CRM, Desk, Books, Analytics, Cliq, etc.)

### When this makes sense
If you end up using more than 2 Zoho products (e.g. Zoho Desk for ticketing + Zoho Books for accounting + Zoho Analytics for dashboards), Zoho One at ₹2,000/user beats buying them separately.

| Scenario | Cost |
|---|---|
| Zoho CRM only, 3 users | ₹2,400/mo |
| Zoho CRM + Desk + Analytics, 3 users | ₹4,800–7,200/mo |
| Zoho One, 3 users | ₹6,000/mo — but all 45 apps included |

This is a bundling play, not a raw saving — but worth factoring if the product expands.

---

## Combined Savings Model

Applying strategies **1, 3, 4, 5, 6** (most impactful, low-to-medium effort):

| Line Item | Current (prod) | After Optimisation | Saving |
|---|---|---|---|
| Dev environment | ₹7,224 | ₹0 (local Docker) | **₹7,224** |
| Kafka + Kafka Worker | ₹3,360 | ₹0 (SQS free tier) | **₹3,360** |
| Fargate compute (ARM) | ₹11,928 | ₹9,576 (-20%) | **₹2,352** |
| Next.js hosting | ₹3,444 | ₹168 (S3+CF) | **₹3,276** |
| Textract | ₹1,260 | ₹42 (GPT Vision) | **₹1,218** |
| Everything else | ₹13,908 | ₹13,908 | — |
| **Total** | **₹41,124** | **~₹23,694** | **₹17,430 saved** |

> This brings your all-in prod cost (excl. Razorpay) from **₹29,400 → ~₹12,000/mo** (~$143/mo). That's a **59% reduction** with no functional requirement changes.

---

## Recommended Phasing

### Phase 1 — This Month (zero code changes, 2 hrs work)
- ✅ Kill dev on AWS → Docker Compose locally (`Strategy 1`) — **save ₹7,224/mo immediately**
- ✅ Switch Fargate tasks to ARM → update `cpuArchitecture` in task definitions + rebuild images (`Strategy 4`) — **save ₹2,352/mo**

### Phase 2 — Next Sprint (1–2 days work)
- 🔧 Replace Textract with GPT-4o-mini Vision (`Strategy 6`) — simplifies pipeline, saves ₹1,218/mo
- 🔧 Review Next.js pages for SSR usage — if clean, export to S3 + CloudFront (`Strategy 5`)

### Phase 3 — After Stable Launch (when needing to optimise further)
- 🔧 Migrate Kafka → Amazon SQS (`Strategy 3`) — saves ₹3,360/mo but requires refactoring worker event subscriptions

---

## What NOT to Touch

| Item | Why keep it |
|---|---|
| **2× NestJS tasks in prod** | HA is non-negotiable — if one task crashes during check-in, guests are locked out |
| **Blue-green deployment** | Zero-downtime deploys protect guests mid-stay |
| **RDS (not Aurora Serverless)** | Aurora Serverless has cold-start latency on first query — bad for real-time KYC/payment flows |
| **Dedicated Redis container** | JWT cache + inventory locking requires sub-ms response. ElastiCache Serverless cold-starts are unacceptable for auth |
| **Dedicated prod ALB** | Shared ALB with prod risks staging traffic affecting prod routing. Keep separate. |
