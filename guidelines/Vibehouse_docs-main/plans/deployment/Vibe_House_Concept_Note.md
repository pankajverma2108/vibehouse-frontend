**DevOps Consultant Meeting**

Preparation Document

**Meeting Date:** April 1, 2026 **Property:** Vibe House --- 5 floors,
39 rooms, 119 beds **Stage:** Dev on Railway → Production on AWS

# **1. Current Tech Stack Overview**

## **Application Stack**

  -----------------------------------------------------------------------
  **Layer**   **Technology**      **Details**
  ----------- ------------------- ---------------------------------------
  Backend API NestJS (Node.js /   REST API, Passport auth (JWT + Google
              TypeScript)         OAuth), Prisma ORM

  Frontend    Next.js (React /    SSR + static pages, Vercel (current),
              TypeScript)         planned move to container

  Database    PostgreSQL          Currently Neon.tech (serverless),
                                  planned migration to RDS

  Cache       Redis               Currently Redis Cloud (30MB free),
                                  planned self-hosted redis:alpine
                                  container

  Message     AWS SQS             3 queues --- Standard (notify, ops) +
  Queue                           FIFO (eZee sync). \~30K msgs/mo. Free
                                  tier

  Object      AWS S3              KYC images, selfies, signatures. \~2 GB
  Storage                         active (purged after stay)

  OCR / AI    AWS Textract +      ID document scanning. \~150--300
              OpenAI GPT-4o-mini  scans/mo

  Payments    Razorpay            2% + GST. \~300--500 txns/mo

  Email       AWS SES             OTP, password reset, booking
                                  confirmation

  WhatsApp    Wati API            Check-in PINs, service notifications.
                                  \~1K--3K msgs/mo
  -----------------------------------------------------------------------

## **External SaaS / Vendor Integrations**

  -------------------------------------------------------------------------
  **Service**   **Purpose**                 **Rate Limits (Known)**
  ------------- --------------------------- -------------------------------
  eZee PMS      Source of truth for         Not documented. Throttled to 1
                bookings, rooms, rates,     req/500ms internally
                folio                       

  MyGate IoT    Smart lock PIN              Not documented. Session tokens
                generation/revoke, access   expire in 3 days
                logs                        

  Razorpay      Payment gateway --- orders, 20 req/sec per API key.
                captures, refunds           Webhooks: unlimited inbound

  Zoho CRM/Desk Service ticketing, SLA      CRM: \~5,000 API calls/day.
                escalations                 Desk: 77,500 credits/day

  Wati          Guest/staff notifications   Growth plan rate limit: TBD.
  (WhatsApp)                                Per-message pricing

  AWS Textract  OCR on ID documents         Default: 5 calls/sec per
                                            account. Adjustable

  OpenAI        Structured OCR field        Tier 1: 500 RPM, 30K TPM for
                extraction                  GPT-4o-mini

  Google OAuth  Guest social login          10,000 login calls/day
  -------------------------------------------------------------------------

## **Current Hosting (Dev/Staging)**

  -----------------------------------------------------------------------
  **Component**   **Current Provider**            **Monthly Cost**
  --------------- ------------------------------- -----------------------
  Backend         Railway.app                     \~Free tier

  Database        Neon.tech (PostgreSQL)          Free tier

  Redis           Redis Cloud                     Free 30MB

  Frontend        Vercel                          Free tier
  -----------------------------------------------------------------------

# **2. Production Architecture (Proposed)v db\\f**

**Container Topology**

ALB (HTTPS :443) sits in front of 6 container services:

-   2× NestJS API (0.5 vCPU, 1 GB each)

-   2× Next.js Frontend (0.5 vCPU, 1 GB each)

-   1× Redis Cache (0.5 vCPU, 1 GB)

-   1× SQS Worker (0.5 vCPU, 1 GB)

Backing services: RDS PostgreSQL (t3.micro) + AWS SQS (3 queues)

**Estimated Production Cost:** \~₹14,000/mo infra + \~₹11,700/mo SaaS =
**\~₹25,700/mo total**

# **3. Scale Numbers**

  ------------------------------------------------------------------------
  **Metric**              **Value**        **Basis**
  ----------------------- ---------------- -------------------------------
  Max concurrent guests   119              Total bed count

  Avg occupancy           \~80% (\~95      Industry avg for hostels
                          guests)          

  Monthly guest turnover  \~2,500--3,000   Avg 2--3 night stays

  Daily Active Users      \~300            \~200 in-house + \~100 website
  (DAU)                                    visitors

  API requests/day        \~15,000         300 DAU × \~50 req each

  Peak API requests/hour  \~1,500--2,000   Evening / check-in peaks

  Peak req/sec            \~0.5            Far below any meaningful
                                           scaling threshold

  SQS messages/month      \~30,000         Well within 1M free tier

  DB size                 \~3--5 GB        Bookings live in eZee; we store
                                           guests, sessions, logs

  S3 active storage       \~2 GB           KYC images purged after stay
  ------------------------------------------------------------------------

# **4. Questions**

## **4.1 --- ECS vs EKS**

-   At our scale (\~0.5 req/sec, 4 containers, single property), is ECS
    > Fargate the right choice? Or is EKS overkill?

-   When should we consider moving to EKS? What is the tipping point ---
    > number of services, traffic, or multi-property expansion?

-   ECS on Fargate vs ECS on EC2: at 0.25--0.5 vCPU, would a single
    > t3.medium EC2 running all containers be significantly cheaper?

-   Cost comparison: Fargate prod \~₹10,200/mo compute vs t3.medium
    > on-demand \~\$30/mo (\~₹2,500/mo). Is the Fargate premium
    > justified?

## **4.2 --- Networking: VPS vs Elastic IP**

-   Do we need an Elastic IP at all? ALB has a static DNS name. Is
    > Elastic IP needed anywhere?

-   For eZee sync worker and MyGate API calls: do destination servers
    > need to whitelist our IP? If yes, do we need NAT Gateway?

-   Cost of NAT Gateway: \$0.045/hr + \$0.045/GB processed = \~\$32/mo
    > base. Is this worth it?

-   Alternative: VPS (single EC2) + Elastic IP + Docker Compose. Cheaper
    > (\~\$30/mo) but loses auto-scaling, blue-green, and HA.

## **4.3 --- Load Balancer: Nginx vs ALB**

-   ALB costs \~\$18/mo. Could we replace it with Nginx as a container
    > doing path-based routing + SSL via Let\'s Encrypt?

-   If we go EC2 + Docker Compose: is Nginx reverse proxy + Let\'s
    > Encrypt + Docker the standard pattern?

-   Blue-green deploys: ALB + CodeDeploy gives zero-downtime. If we use
    > Nginx, what is the equivalent?

-   Can one ALB serve both dev and staging with host-based routing
    > rules? Saves \$18/mo.

## **4.4 --- Container Strategy & Docker**

-   Should API + Worker share a single image (same NestJS app, different
    > entrypoint) to reduce build time and ECR costs?

-   Redis as a sidecar in the same task definition vs separate Fargate
    > task?

-   Health check patterns for each container --- especially SQS Worker
    > (long-poll consumer, no HTTP endpoint).

-   CloudWatch Logs: at \~15K req/day, is it sufficient, or should we
    > look at cheaper alternatives (S3 export, Grafana Loki)?

## **4.5 --- Database & Persistence**

-   RDS vs Neon: is migrating to RDS t3.micro (\~\$12/mo reserved) the
    > right move? Or stay on Neon?

-   RDS Multi-AZ: at our scale, is Multi-AZ (\$24/mo vs \$12/mo) worth
    > it vs daily automated backups + PITR?

-   Connection pooling: if we move to RDS, do we need to set up
    > pgbouncer separately?

## **4.6 --- CI/CD & Deployment**

-   GitHub Actions → ECR → ECS: is this the standard pipeline? Build →
    > push ECR → update task definition → CodeDeploy?

-   Blue-green vs rolling update: at 2 tasks per service, is blue-green
    > overkill? Would rolling update (min healthy 50%) suffice?

-   Environment promotion: build once, deploy to dev → staging → prod
    > with only env var changes via ECS task definition overrides?

## **4.7 --- Security & Secrets**

-   Secrets management: AWS Secrets Manager (\$0.40/secret/mo) or SSM
    > Parameter Store (free for standard parameters)?

-   We have \~15 env vars (DB URL, JWT secret, Google OAuth, Razorpay
    > keys, eZee auth, MyGate, AWS creds, SES config).

-   IAM roles: should each container have its own least-privilege IAM
    > role, or one shared role for the whole cluster?

## **4.8 --- Scaling for Multi-Property**

*We\'re starting with 1 property (Kormangla, 119 beds). Business plans
to expand to 3--5 properties within 12 months.*

-   What changes architecturally when we go multi-property? Same backend
    > with property_id filtering, or separate deployments?

-   Database scaling: 3--5 properties = \~15K--25K API req/day. Still
    > within t3.micro? When do we need to scale up?

-   SQS scaling: one worker per property or one shared worker?

-   eZee rate limits: each property has its own eZee account --- does
    > the sync worker need per-property throttling?

## **4.9 --- Monitoring & Alerting**

-   Minimum viable monitoring stack: CloudWatch basic metrics (CPU,
    > memory, 5xx) + alarms → SNS → email/Slack?

-   APM: do we need application performance monitoring at this stage?
    > (Datadog, New Relic, or just CloudWatch Container Insights?)

-   Uptime monitoring: Route53 health checks or external services like
    > UptimeRobot for /health endpoint pings?

## **4.10 --- Cost Optimization**

-   Our current prod estimate is \~₹14,000/mo (\~\$167/mo) for infra. Is
    > this reasonable, or are we over-provisioning?

-   Should we commit to Compute Savings Plans (1-yr) for Fargate?
    > Savings could be \~30% (\$167 → \~\$117).

-   Dev environment: is running a full ECS dev env worth \~₹5,500/mo, or
    > should dev be local Docker Compose?

-   Staging: dedicated environment, or same ECS cluster as prod with a
    > separate task definition?

# **5. 3rd-Party API Rate Limits Summary**

  --------------------------------------------------------------------------
  **API**       **Known Rate Limit**   **Our Usage**          **Risk Level**
  ------------- ---------------------- ---------------------- --------------
  eZee PMS      Not documented.        \~80 calls/hr peak (20 MEDIUM ---
                Throttled to 1         bookings × 2, sync     unknown
                req/500ms              every 30 min)          ceiling

  MyGate IoT    Not documented.        \~10--20 calls/day     LOW --- very
                Session tokens expire  (PIN gen + revoke)     low volume
                3 days                                        

  Razorpay      20 req/sec per API key \~300--500 txns/mo,    LOW --- well
                (documented)           never \>1 req/sec      within limits

  Zoho CRM      \~5,000 API calls/day. \~50--200 calls/day    LOW
                Desk: 77,500                                  
                credits/day                                   

  Wati          Growth plan: TBD ---   \~50--100 msgs/day     LOW
  (WhatsApp)    per-message pricing                           

  AWS Textract  Default: 5 TPS.        \~10--20 scans/day     LOW
                Adjustable via support                        

  AWS SES       Sandbox: 200/day,      \~100--300 emails/day  MEDIUM ---
                1/sec. Prod:           at prod scale          need prod SES
                adjustable                                    approval

  OpenAI        Tier 1: 500 RPM, 30K   \~10--20 calls/day     LOW
  GPT-4o-mini   TPM                                           
  --------------------------------------------------------------------------

**Action Item:** *Confirm eZee and MyGate rate limits directly with
their support teams before production launch.*

# **6. Architecture Decision: Quick Reference**

  ---------------------------------------------------------------------------
  **Decision**    **Options**          **Current       **What to Validate**
                                       Choice**        
  --------------- -------------------- --------------- ----------------------
  Container       ECS Fargate / ECS on ECS Fargate     Is Fargate worth the
  orchestration   EC2 / EKS / VPS +                    premium at \~0.5
                  Docker Compose                       req/sec?

  Load balancer   ALB / Nginx on EC2 / ALB (\~\$18/mo) Can Nginx save \$18/mo
                  Nginx sidecar                        without too much
                                                       overhead?

  Outbound IP     NAT Gateway /        Not decided     Do eZee/MyGate require
                  Elastic IP on VPS /                  IP whitelisting?
                  No fixed IP                          

  Database        RDS / Neon / Aurora  RDS t3.micro    Is Neon cheaper and
                  Serverless           reserved        sufficient?

  Redis           Self-hosted          Self-hosted     Sidecar or separate
                  container /          container       task?
                  ElastiCache / Redis                  
                  Cloud                                

  Deployments     Blue-green           Blue-green via  Is rolling update
                  (CodeDeploy) /       ALB             simpler and
                  Rolling update /                     sufficient?
                  Manual                               

  Monitoring      CloudWatch / Datadog CloudWatch      Is CloudWatch enough
                  / Grafana + Loki                     for MVP?

  Secrets         Secrets Manager /    Not decided     SSM free vs Secrets
                  SSM Parameter Store                  Manager \$6/mo
                  / .env                               

  Domain / SSL    ACM + ALB / Let\'s   ACM + ALB       Comes free with ALB
                  Encrypt + Nginx                      
  ---------------------------------------------------------------------------

# **7. Summary: What We Need From This Meeting**

-   Validate or correct our ECS Fargate choice --- are we
    > over-engineering for \~0.5 req/sec?

-   VPS route: would a single t3.medium + Docker Compose + Nginx +
    > Let\'s Encrypt be a pragmatic and cheaper start?

-   Networking clarity: NAT Gateway vs no fixed IP vs Elastic IP ---
    > what does our integration pattern require?

-   Deployment pipeline: GitHub Actions → ECR → ECS with blue-green ---
    > is this standard or overkill?

-   Multi-property roadmap: what to architect now vs what to defer until
    > property #2?

-   Cost benchmarking: is \~₹25,700/mo (infra + SaaS) reasonable for a
    > single-property hostel tech stack?
