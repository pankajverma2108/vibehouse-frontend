Ok # 15 — Production Deployment: DevOps & AWS Setup

**Status:** Live  
**Completed:** 2026-04-20  
**Environment:** AWS ap-south-1 (Mumbai)  
**Live API URL:** `https://api.thedailysocial.co.in`  
**Admin Frontend:** Vercel (URL in SSM `/tds/prod/FRONTEND_URL`)

---

## Architecture

```
Internet
    │
    ▼
Route 53  (Hosted Zone: Z093277914O7SD75X4ZYK)
  api.thedailysocial.co.in  →  A alias  →  tds-alb
    │
    ▼
ALB  tds-alb
  Listener 1: HTTP :80   →  redirect 301 to HTTPS
  Listener 2: HTTPS :443 →  forward to tds-api-tg  (TLS terminated, ACM cert)
    │
    ▼
ECS Cluster: tds-production  (Fargate, ap-south-1)
ECS Service: tds-api  (desiredCount=2, rolling update, circuit breaker+rollback)
    ├── Task 1:  [tds-api :8080] + [redis :6379 sidecar]
    └── Task 2:  [tds-api :8080] + [redis :6379 sidecar]
    │
    ▼
Aurora PostgreSQL Serverless v2
  Cluster: tds-aurora-cluster
  Writer:  tds-aurora-writer  (0.5–4 ACU, single AZ)
  DB:      tds_production
  App user: tds_app
    │
    ▼
Existing AWS integrations (unchanged from pre-migration):
  S3 (vibehouse-kyc-documents)
  SQS (4 FIFO queues)
  SES (thedailysocial.co.in, pending production access)
  Textract
```

---

## Phase 1 — Dockerization

### Files Created

**`backend/Dockerfile`** (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npx prisma generate
RUN node_modules/.bin/tsc -p tsconfig.docker.json
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not produced" && exit 1)

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
USER nestjs
EXPOSE 8080
CMD ["node", "dist/main"]
```

Why `tsc` directly instead of `nest build`: `nest build` silently exits 0 with 0 output files on Alpine. The `tsc` safety-check at the end would then catch a missing `dist/main.js`.

**`backend/tsconfig.docker.json`**

```json
{
  "extends": "./tsconfig.build.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "resolvePackageJsonExports": false,
    "incremental": false,
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Why not `tsconfig.build.json` directly: TypeScript's `nodenext` module mode emits 0 files on a clean Alpine build. `rootDir: ./src` is required — without it, the presence of `prisma/*.ts` files causes TypeScript to infer a higher rootDir and emit to `dist/src/main.js` instead of `dist/main.js`.

**`backend/.dockerignore`**

```
node_modules
dist
.env
.env.local
.env.docker
*.tsbuildinfo
test
test_Scripts
prisma/migrations
```

`*.tsbuildinfo` is critical — a stale incremental build cache made TypeScript skip all output silently.

### Prisma Fix — OpenSSL 3

Alpine 3.21 ships OpenSSL 3 only. Prisma's default binary target is OpenSSL 1.1, causing startup crash: `libssl.so.1.1: No such file or directory`.

Fix in `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

`openssl` package added to both Dockerfile stages: builder needs it to detect version during `prisma generate`; production needs it to load the shared library at runtime.

### Health Endpoint

`GET /health` added to `backend/src/app.controller.ts` — required for ALB target group health checks. `AppController` was missing from `AppModule` and had to be re-added.

### Local Docker Test

```bash
cd backend
docker build -t tds-backend:local .
docker run --rm -p 8080:8080 --env-file .env.docker tds-backend:local
curl http://localhost:8080/health
# → {"status":"ok"}
```

**Important:** Docker `--env-file` does NOT strip surrounding double quotes from values, but Node's `dotenv` does. Using the regular `.env` (which has quoted values like `DATABASE_URL="postgresql://..."`) causes Prisma to throw P1012 because it sees `"postgresql://..."` starting with a quote character. `.env.docker` is a copy with all quotes stripped.

---

## Phase 2 — AWS Account & IAM

### Account Details

| Item | Value |
|---|---|
| Account ID | 985345988013 |
| Region | ap-south-1 (Mumbai) |
| Admin IAM user | `tds-deploy-admin` |

### IAM Users

**`tds-deploy-admin`**
- Policies: AdministratorAccess, AmazonEC2FullAccess (plus others added during setup)
- Used for: local AWS CLI commands, GitHub Actions deployments
- Access key type: **Third-party service** (NOT CLI — CLI type uses STS session tokens which don't work in GitHub Actions; third-party service issues long-lived static credentials that work correctly)

### IAM Roles

**`tds-ecs-execution-role`** — used by ECS control plane
- `AmazonECSTaskExecutionRolePolicy` (pull ECR image, write CloudWatch Logs)
- Inline policy: `ssm:GetParameters` on `arn:aws:ssm:ap-south-1:985345988013:parameter/tds/prod/*`

**`tds-ecs-task-role`** (formerly `tds-task-role`) — used by the running NestJS application
- `AmazonS3FullAccess` scoped to `vibehouse-kyc-documents`
- `AmazonSQSFullAccess` scoped to the 4 SQS queues
- `AmazonTextractFullAccess`
- SES send permissions
- Inline policy `tds-s3-bucket-cors`: `s3:GetBucketCors`, `s3:PutBucketCors` on `arn:aws:s3:::vibehouse-kyc-documents`

**Critical pattern — AWS SDK credential chain:**  
All AWS SDK clients (`S3Client`, `TextractClient`, `SESClient`, `SQSClient`) must be initialized WITHOUT an explicit `credentials` block. Providing empty strings overrides the default credential chain and prevents the task role from being used:

```typescript
// WRONG — empty strings block the task role
this.s3 = new S3Client({
  region: 'ap-south-1',
  credentials: { accessKeyId: '', secretAccessKey: '' },
});

// CORRECT — SDK uses ECS task role via IMDSv2 automatically
this.s3 = new S3Client({ region: 'ap-south-1' });
```

Files fixed (all had the wrong pattern initially):
- `src/aws/s3.service.ts`
- `src/aws/textract.service.ts`
- `src/admin/kyc/admin-kyc.service.ts`
- `src/email/email.service.ts`
- `src/sqs/sqs-producer.service.ts`
- `src/sqs/sqs-consumer.service.ts`

---

## Phase 3 — ECR

```bash
# Repository created
aws ecr create-repository --repository-name tds-backend --region ap-south-1

# First manual push (before CI/CD was set up)
aws ecr get-login-password --region ap-south-1 --profile tds-admin | \
  docker login --username AWS --password-stdin \
  985345988013.dkr.ecr.ap-south-1.amazonaws.com

docker build -t tds-backend:local .
docker tag tds-backend:local 985345988013.dkr.ecr.ap-south-1.amazonaws.com/tds-backend:latest
docker push 985345988013.dkr.ecr.ap-south-1.amazonaws.com/tds-backend:latest
```

**Repository:** `985345988013.dkr.ecr.ap-south-1.amazonaws.com/tds-backend`  
**Scan on push:** enabled  
**Tag convention:** `latest` + `$GITHUB_SHA` (set by CI/CD)

---

## Phase 4 — Networking (VPC & Security Groups)

Used the default VPC in ap-south-1.

| Resource | ID | Rules |
|---|---|---|
| VPC | `vpc-048ba084d6b08a980` (172.31.0.0/16) | — |
| Subnet 1a | `subnet-0336cdf666aef4dc1` | — |
| Subnet 1b | `subnet-0f2db6e3dfc0dfa17` | — |
| Subnet 1c | `subnet-051cd40f880567176` | — |
| `tds-alb-sg` | `sg-0b4ad7e7fcdf18fd4` | Inbound: TCP 80 + 443 from 0.0.0.0/0 |
| `tds-ecs-sg` | `sg-0fc5c1075b47b6bf7` | Inbound: TCP 8080 from tds-alb-sg only |
| `tds-rds-sg` | `sg-005473e7a108478c4` | Inbound: TCP 5432 from tds-ecs-sg only |

No NAT Gateway — eZee and MyGate confirmed they do not require static outbound IPs.

---

## Phase 5 — TLS Certificate (ACM)

```bash
aws acm request-certificate \
  --domain-name "*.thedailysocial.co.in" \
  --subject-alternative-names "thedailysocial.co.in" \
  --validation-method DNS \
  --region ap-south-1
```

| Item | Value |
|---|---|
| ARN | `arn:aws:acm:ap-south-1:985345988013:certificate/88e9881c-5520-4847-ab25-186369da4043` |
| Covers | `*.thedailysocial.co.in` + `thedailysocial.co.in` |
| Validation | DNS CNAME added to Route 53 hosted zone automatically |
| Status | ISSUED |

---

## Phase 6 — Aurora PostgreSQL

```bash
# Cluster created via AWS Console (ap-south-1)
# Engine: Aurora PostgreSQL 16.6
# Capacity: Serverless v2, min 0.5 ACU, max 4 ACU
# Single writer, no Multi-AZ (per DevOps consultant decision)
# PITR: enabled by default on Aurora
```

| Item | Value |
|---|---|
| Cluster ID | `tds-aurora-cluster` |
| Cluster endpoint | `tds-aurora-cluster.cluster-cvcoqwym0b0d.ap-south-1.rds.amazonaws.com:5432` |
| Writer instance | `tds-aurora-writer` (db.serverless) |
| Engine | Aurora PostgreSQL 16.6 |
| Database name | `tds_production` |
| Master user | `tds_admin` |
| App user | `tds_app` / `VhApp@TDS2026!` |
| Backup retention | 7 days |
| Public accessibility | Disabled (only `tds-rds-sg` can reach port 5432) |

### Database Bootstrap (done once, fresh Aurora)

The decision was made NOT to migrate data from Neon — Aurora starts clean.

```bash
# 1. Temporarily enable public access (for initial setup from local machine)
#    AWS Console → RDS → tds-aurora-writer → Modify → Publicly accessible = Yes

# 2. Apply schema (prisma migrate deploy had a broken migration 3 referencing
#    colive_draft_bookings before it existed, so db push was used instead)
DATABASE_URL="postgresql://tds_app:VhApp%40TDS2026!@<aurora-endpoint>/tds_production?sslmode=require" \
  npx prisma db push --force-reset

# 3. Baseline all 5 existing migrations so future migrate deploy doesn't re-run them
export MSYS_NO_PATHCONV=1
DATABASE_URL="..." npx prisma migrate resolve --applied 20260401000000_init
DATABASE_URL="..." npx prisma migrate resolve --applied 20260402000000_admin_auth
DATABASE_URL="..." npx prisma migrate resolve --applied 20260413000000_rename_property_ids_to_ezee_codes
DATABASE_URL="..." npx prisma migrate resolve --applied 20260414000000_kyc_slot_overhaul
DATABASE_URL="..." npx prisma migrate resolve --applied 20260415000000_add_kyc_slot_index

# 4. Run production seed
DATABASE_URL="..." DEFAULT_PROPERTY_ID=60765 HOTEL_CODE=60765 \
  AUTH_CODE=5119488337db81be25-26ab-11f1-9 \
  npx ts-node -r tsconfig-paths/register prisma/seed.prod.ts

# 5. Disable public access again
#    AWS Console → RDS → tds-aurora-writer → Modify → Publicly accessible = No
```

**What the seed creates (`prisma/seed.prod.ts`):**
- Property `60765`: The Daily Social - Koramangala A
- eZee connection: `ezee-conn-ka-001` (hotel_code=60765)
- 5 admin roles: OWNER, MANAGER, RECEPTION, HOUSEKEEPING_LEAD, MAINTENANCE_LEAD
- Admin user: `owner@tds.com` / `TDS@2026!` / role-owner

**Future schema changes:**
```bash
# 1. Edit prisma/schema.prisma locally
# 2. Generate migration
npx prisma migrate dev --name describe_change
# 3. Commit the migration file in prisma/migrations/
# 4. Push to main → CI runs prisma migrate deploy inside VPC automatically
```

---

## Phase 7 — SSM Parameter Store

All application secrets stored as `SecureString` under `/tds/prod/<KEY>`.

```bash
# Pattern for adding/updating a secret
export MSYS_NO_PATHCONV=1
aws ssm put-parameter \
  --name "/tds/prod/KEY_NAME" \
  --value "value" \
  --type SecureString \
  --overwrite \
  --region ap-south-1 \
  --profile tds-admin
```

**Full parameter list:**

| Parameter | Notes |
|---|---|
| `DATABASE_URL` | `postgresql://tds_app:VhApp%40TDS2026!@tds-aurora-cluster.cluster-cvcoqwym0b0d.ap-south-1.rds.amazonaws.com/tds_production?sslmode=require` |
| `JWT_SECRET` | Strong random secret (rotate from placeholder) |
| `JWT_EXPIRY` | `15m` |
| `JWT_REFRESH_EXPIRY` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `REDIS_URL` | `redis://localhost:6379` (sidecar in same task) |
| `AWS_REGION` | `ap-south-1` |
| `AWS_S3_KYC_BUCKET` | `vibehouse-kyc-documents` |
| `AWS_SQS_EZEE_SYNC_QUEUE_URL` | Full SQS FIFO queue URL |
| `AWS_SQS_NOTIFY_QUEUE_URL` | Full SQS FIFO queue URL |
| `AWS_SQS_OPS_QUEUE_URL` | Full SQS FIFO queue URL |
| `AWS_SQS_SLA_QUEUE_URL` | Full SQS FIFO queue URL |
| `SQS_CONSUMERS_ENABLED` | `true` |
| `GOOGLE_OAUTH_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_OAUTH_CALLBACK_URL` | `https://api.thedailysocial.co.in/guest/auth/google/callback` |
| `FRONTEND_URL` | Vercel deployment URL (update when custom domain is live) |
| `RAZORPAY_TEST_API_KEY` | `rzp_test_*` key |
| `RAZORPAY_TEST_API_SECRET` | From Razorpay dashboard |
| `RAZORPAY_WEBHOOK_URL` | `https://api.thedailysocial.co.in/webhook/razorpay` |
| `RAZORPAY_WEBHOOK_SECRET` | Must match Razorpay dashboard setting |
| `OPENAI_API_KEY` | For Textract GPT-4o-mini extraction |
| `ZOHO_CLIENT_ID` | Zoho CRM |
| `ZOHO_CLIENT_SECRET` | Zoho CRM |
| `ZOHO_DESK_REFRESH_TOKEN` | Zoho Desk |
| `ZOHO_DESK_ORG_ID` | Zoho Desk |
| `API_URL` | eZee base URL `https://live.ipms247.com/` |
| `HOTEL_CODE` | `60765` |
| `DEFAULT_PROPERTY_ID` | `60765` |
| `AUTH_CODE` | eZee API key |
| `MYGATE_API_KEY` | MyGate |
| `MYGATE_PARTNER_ID` | MyGate |
| `MYGATE_MOBILE` | MyGate |
| `SES_FROM_EMAIL` | `noreply@thedailysocial.co.in` |

**Note:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are intentionally NOT in SSM. The ECS task role is used instead (see Phase 2 — IAM). Providing these env vars would have overridden the task role and broken S3/SQS/SES/Textract.

---

## Phase 8 — ECS Cluster & Task Definition

### Cluster

```bash
aws ecs create-cluster --cluster-name tds-production --region ap-south-1
```

Container Insights: enabled.

### Task Definition (`tds-backend`)

| Setting | Value |
|---|---|
| Family | `tds-backend` |
| Network mode | `awsvpc` |
| CPU | 512 (0.5 vCPU) |
| Memory | 1024 MB |
| Launch type | FARGATE |
| Execution role | `tds-ecs-execution-role` |
| Task role | `tds-ecs-task-role` |

**Container 1: `tds-api`**
- Image: `985345988013.dkr.ecr.ap-south-1.amazonaws.com/tds-backend:latest`
- Port: 8080
- Env vars: all injected from SSM at task startup via execution role
- Logs: CloudWatch `/ecs/tds-backend`, stream prefix `tds-api`

**Container 2: `redis`**
- Image: `redis:7-alpine`
- Port: 6379
- Command: `redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru`
- Logs: CloudWatch `/ecs/tds-backend`, stream prefix `redis`

### ECS Service (`tds-api`)

| Setting | Value |
|---|---|
| Cluster | `tds-production` |
| Launch type | FARGATE |
| Desired count | 2 |
| Deployment type | Rolling update |
| minimumHealthyPercent | 50 |
| maximumPercent | 200 |
| Circuit breaker | Enabled, with auto-rollback |
| Subnets | `subnet-0336cdf666aef4dc1`, `subnet-051cd40f880567176` |
| Security group | `tds-ecs-sg` |
| Public IP | ENABLED (required — tasks have no NAT Gateway) |

**Auto-scaling policy:**

| Trigger | Action |
|---|---|
| CPU > 45% for 2 periods | Scale out +1 task (cooldown: 60s) |
| Memory > 50% for 2 periods | Scale out +1 task (cooldown: 60s) |
| CPU < 45% AND Memory < 50% | Scale in −1 task (cooldown: 300s) |
| Min tasks | 2 |
| Max tasks | 6 |

---

## Phase 9 — Application Load Balancer

```bash
aws elbv2 create-load-balancer \
  --name tds-alb \
  --subnets subnet-0336cdf666aef4dc1 subnet-051cd40f880567176 \
  --security-groups sg-0b4ad7e7fcdf18fd4 \
  --region ap-south-1
```

| Item | Value |
|---|---|
| Name | `tds-alb` |
| DNS | `tds-alb-1204184237.ap-south-1.elb.amazonaws.com` |
| ARN | `arn:aws:elasticloadbalancing:ap-south-1:985345988013:loadbalancer/app/tds-alb/f3351deb9b8108af` |

**Target group `tds-api-tg`:**
- Protocol: HTTP, Port: 8080
- Target type: IP
- Health check: `GET /health` → expects HTTP 200
- Healthy threshold: 2, Unhealthy threshold: 3, Interval: 30s

**Listeners:**
- HTTP :80 → redirect to HTTPS (HTTP 301)
- HTTPS :443 → forward to `tds-api-tg`, TLS terminated using ACM cert

---

## Phase 10 — Route 53

Hosted zone: `Z093277914O7SD75X4ZYK` (thedailysocial.co.in)

| Record | Type | Value |
|---|---|---|
| `api.thedailysocial.co.in` | A (alias) | `tds-alb-1204184237.ap-south-1.elb.amazonaws.com` |
| ACM validation CNAME | CNAME | (added automatically by ACM) |

---

## Phase 11 — CloudWatch Logs

Log group: `/ecs/tds-backend`  
Retention: 30 days  
Streams: `tds-api/<task-id>`, `redis/<task-id>`

```bash
# Tail live logs
aws logs tail /ecs/tds-backend --follow --region ap-south-1 --profile tds-admin
```

---

## Phase 12 — CI/CD Pipeline (GitHub Actions)

**Repo:** `github.com/Emagicor/Vibehouse_backend`  
**File:** `.github/workflows/deploy.yml` (inside the backend repo root — the workflow was initially created in the wrong monorepo root and never picked up by GitHub)

**Trigger:** every push to `main` branch.

**Pipeline steps:**
1. Configure AWS credentials (`AWS_DEPLOY_ACCESS_KEY_ID` + `AWS_DEPLOY_SECRET_ACCESS_KEY`)
2. Login to ECR
3. `docker build` + tag with `$GITHUB_SHA` + push both `$SHA` and `latest` tags
4. Run `prisma migrate deploy` as a one-off ECS `run-task` inside the VPC (CI runners are on the public internet and cannot reach Aurora; the ECS task can)
5. Download current task definition JSON from ECS
6. Render new task definition with the new image SHA
7. Deploy to ECS with rolling update, wait for service stability

**GitHub Actions secrets:**

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ACCESS_KEY_ID` | Access key for `tds-deploy-admin` |
| `AWS_DEPLOY_SECRET_ACCESS_KEY` | Secret key for `tds-deploy-admin` |
| `DATABASE_URL` | Aurora connection string (for migration task) |

**Key detail — access key type:** When creating IAM access keys for GitHub Actions, select **"Third-party service"** in the AWS console wizard (NOT "Command Line Interface"). The CLI option issues STS session tokens that fail signature verification in GitHub Actions. Third-party service issues long-lived static credentials that work correctly.

**Migration strategy:**  
Migrations run as `aws ecs run-task` with command override `["npx","prisma","migrate","deploy"]`. The pipeline waits for the task to stop and reads the container exit code — if non-zero, the pipeline fails before the new image is deployed.

---

## Phase 13 — Admin Frontend (Vercel)

The admin frontend (`admin_frontend/`) is deployed on Vercel.

**Critical:** Next.js bakes `NEXT_PUBLIC_*` env vars at build time, not runtime. The variable `NEXT_PUBLIC_API_URL` must be set in Vercel project settings BEFORE triggering a deploy, or the bundle hardcodes `http://localhost:8080`.

**Vercel environment variable:**

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.thedailysocial.co.in` |

**Custom domain:** `admin.thedailysocial.co.in` (add CNAME in Route 53 pointing to Vercel's DNS target once configured in Vercel project settings).

**Update SSM after domain is live:**
```bash
export MSYS_NO_PATHCONV=1
aws ssm put-parameter \
  --name "/tds/prod/FRONTEND_URL" \
  --value "https://admin.thedailysocial.co.in" \
  --type SecureString --overwrite \
  --region ap-south-1 --profile tds-admin

# Force redeploy to pick up the new FRONTEND_URL
aws ecs update-service --cluster tds-production --service tds-api \
  --force-new-deployment --region ap-south-1 --profile tds-admin
```

---

## Post-Deployment Code Fixes

These bugs were found only after the service was live in ECS — they could not have been caught locally.

### AWS SDK Empty Credentials (S3, Textract, SES, SQS)

**Root cause:** All AWS SDK clients were initialized with `credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '', secretAccessKey: '' }`. Since `AWS_ACCESS_KEY_ID` is intentionally not in SSM, these resolved to empty strings. Empty-string credentials override the default credential chain and prevent the ECS task role from being used. Every S3, Textract, SES, and SQS call silently failed.

**Fix:** Remove the `credentials` block entirely from all 6 SDK client constructors (see Phase 2 — IAM for the full file list).

### Google OAuth FRONTEND_URL

After ECS was live, Google OAuth redirected users to the wrong domain. `/tds/prod/FRONTEND_URL` was set to `https://thedailysocial.co.in` instead of the actual Vercel admin URL. Updated via SSM + force-redeployed ECS.

### Room Catalog — eZee Fallback

`GET /guest/booking/rooms` and `GET /guest/booking/availability` both threw 404 when the `room_types` DB table was empty (Aurora is a fresh database; Neon data was not migrated). Fixed: when the local DB has no room types, both endpoints now fall through to eZee as the source of truth and return live data with `source: "ezee_only"`. Once the `room_types` table is populated, they automatically upgrade to `source: "db"` with full enrichment (prices, amenities, slugs).

---

## Operational Runbook

### Deploy a new version

Push to `main` → GitHub Actions handles everything automatically. No manual steps needed.

### Update a secret in SSM

```bash
export MSYS_NO_PATHCONV=1
aws ssm put-parameter \
  --name "/tds/prod/KEY_NAME" \
  --value "new-value" \
  --type SecureString \
  --overwrite \
  --region ap-south-1 \
  --profile tds-admin

# Force ECS to restart tasks and pick up the new secret
aws ecs update-service \
  --cluster tds-production \
  --service tds-api \
  --force-new-deployment \
  --region ap-south-1 \
  --profile tds-admin
```

### View live logs

```bash
aws logs tail /ecs/tds-backend --follow --region ap-south-1 --profile tds-admin
# Or: AWS Console → CloudWatch → Log groups → /ecs/tds-backend
```

### Scale manually

```bash
aws ecs update-service \
  --cluster tds-production \
  --service tds-api \
  --desired-count 4 \
  --region ap-south-1 \
  --profile tds-admin
```

### Emergency rollback

ECS circuit breaker auto-rolls back on failed health checks. To manually force a previous revision:

```bash
aws ecs update-service \
  --cluster tds-production \
  --service tds-api \
  --task-definition tds-backend:1 \
  --region ap-south-1 \
  --profile tds-admin
```

### Add a new Prisma migration

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate the migration SQL
npx prisma migrate dev --name describe_your_change
# 3. Commit the file in prisma/migrations/
# 4. Push to main → CI runs prisma migrate deploy inside VPC automatically
```

### MSYS_NO_PATHCONV note (Windows only)

On Windows with Git Bash/MSYS, AWS CLI arguments starting with `/` (like SSM paths or CloudWatch log groups) get converted to Windows paths by the shell. Always prepend:

```bash
export MSYS_NO_PATHCONV=1
```

before any AWS CLI command that takes a path starting with `/`.

---

## Pending Items

| # | Item | Priority | Notes |
|---|---|---|---|
| 1 | **Rotate JWT_SECRET** | High | Current value is a placeholder. Generate a strong random value, update SSM, force-redeploy ECS. |
| 2 | **Fix RAZORPAY_WEBHOOK_SECRET** | High | Current value `my_webhook_secret_123` is a placeholder. Must match Razorpay dashboard setting. |
| 3 | **SES production access** | High | Submitted 2026-04-15. Until approved, OTP emails and checkout emails silently fail. Also verify `thedailysocial.co.in` as a domain identity and add DKIM CNAMEs to Route 53. |
| 4 | **Switch to Razorpay live keys** | Before real payments | Create new SSM params `RAZORPAY_LIVE_API_KEY` and `RAZORPAY_LIVE_API_SECRET`. Update code to use live keys in production. |
| 5 | **SQS DLQs** | Medium | Attach dead-letter queues to `vibehouse-ops.fifo` and `vibehouse-ezee-sync.fifo` in AWS console. maxReceiveCount=3. |
| 6 | **CloudWatch alarms** | Medium | Create alarms: ALB 5xx rate > 1%, ECS task count < 2, CPU > 80% sustained. |
| 7 | **FRONTEND_URL** | On domain go-live | Update `/tds/prod/FRONTEND_URL` from current Vercel URL to `https://admin.thedailysocial.co.in` when custom domain is wired up. |
| 8 | **Populate room_types table** | Before guest bookings open | Add room type records in Aurora so the room catalog serves DB-enriched data (prices, amenities, slugs) instead of raw eZee data. |

---

## Cost Estimate

| Component | Est. Cost/mo |
|---|---|
| ECS Fargate (2 tasks × 0.5 vCPU × 1 GB + Redis sidecar) | ~$33–38 |
| Aurora PostgreSQL Serverless v2 (0.5–4 ACU, scales to zero at idle) | ~$22–35 |
| ALB | ~$18 |
| ECR storage | ~$1 |
| Route 53 hosted zone | ~$0.50 |
| ACM certificate | Free |
| CloudWatch Logs (30-day retention) | ~$2–4 |
| **Total** | **~$77–97/mo** |

No NAT Gateway required — eZee and MyGate confirmed no static outbound IP requirement.
