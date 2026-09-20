# Remaining three full stack projects: hosting and CI/CD handoff

> Give this to the Codex agent handling my other projects **after the portfolio phase**. This is an implementation brief, not a statement that an AWS account or deployment infrastructure already exists. Inspect each real repository before selecting a host.

## My situation and desired outcome

- I have **four projects total** to deploy. The frontend-only portfolio goes first on Vercel with an is-a.dev subdomain; this document covers **the other three**, which are full stack.
- I have **no AWS account or AWS configuration yet**, and **no Docker setup in any of my projects**. Please plan and, when we reach this phase, build the necessary application and cloud setup from scratch.
- Keep cost as close to ₹0 as practical and make any recurring expense explicit before committing to architecture. I am interested in AWS and CI/CD, but I do not require all three apps to run on AWS.
- I want each app reachable online, with working frontend, API, database and any background or file-storage features it needs, plus automatic deployment after suitable checks.
- The exact three repository URLs, technologies, dependencies, usage levels, domains and whether these are demos or production apps still need confirmation. Taskify, Ezy-Order and the fraud-detection work are known project candidates, **not an established deployment inventory**. In particular, a React Native mobile app is not a web frontend just because it has a Node API.

## Start with an inventory, then make a choice per app

For **each of the actual three projects**, inspect and record:

| Question | Required finding |
| --- | --- |
| Repository and application | Repo URL, branch, frontend and backend structure, package manager, run/build commands, runtime versions |
| Frontend delivery | Static SPA, SSR/Next.js, mobile app, or other; public web URL needed or only an API/distributable |
| Backend behavior | Framework, port, statelessness, startup time, WebSockets, jobs, cron, local file writes, long requests |
| Data | Database engine/version, ORM and migrations, existing data, backup and restore requirements, object storage |
| Integration | Auth, cookies, CORS, payment webhooks, email, external APIs, credentials and production callback URLs |
| Demand and risk | Expected visitors, uptime requirement, tolerable cold starts, budget ceiling, demo versus real users |
| Deployment | Existing tests, secrets, domains, current local setup, any licensing or public-data constraints |

Choose the simplest fit after this inventory. Static frontends can use a free static host when suitable; APIs that can tolerate a serverless model may use functions; an always-running Node process, persistent connections or several containers may need a VM or other application host. A frontend, API and database may be on **different services**. Never assume that hosting the API also hosts a reliable production database.

## Evaluate AWS fairly

- First determine whether the desired AWS services are available on a **new account's Free plan**, and estimate resource usage and what happens after credits or the introductory period. AWS currently describes a new-account credit model and a Free plan lasting up to six months or until credit exhaustion; do **not** label an EC2 deployment “free forever.” See [AWS Free Tier](https://aws.amazon.com/free/).
- Prepare a per-project and combined monthly estimate using the current [AWS Pricing Calculator](https://calculator.aws/): VM/compute, storage volumes, public IPv4, outbound traffic, database, backups, object storage and any logging/build services used. State region, assumed traffic and post-introductory price in USD and an approximate INR conversion marked as variable.
- Compare at least one practical low-cost/non-AWS option per workload. If an AWS implementation would exceed my budget, propose a cheaper deployment and explain the tradeoff (for example sleeping services or cold starts).
- If the three apps fit and the budget permits, evaluate **one small EC2 VM** with a reverse proxy and separate services/containers; check real memory/CPU usage and security boundaries first. A single VM creates a shared failure point and does not make database storage, backups or bandwidth free.
- Consider Lambda only for an app whose request model, runtime and database access suit it. Do not force a traditional server into Lambda just to claim free hosting.

## AWS groundwork when an AWS route is selected

1. Help me create and secure a new AWS account: MFA, non-root daily access, budget and cost alerts, and a selected region. Obtain explicit account access from me when necessary; never request or commit my password or long-lived root keys.
2. Design least-privilege access and networking for the chosen workload. Keep databases private where possible; expose only the required HTTPS endpoints, and document security groups/firewall rules.
3. Set up deployable infrastructure and configuration with reproducible scripts/IaC where proportionate to the project. Include HTTPS, hostnames, log access, health checks, restart behavior and recovery steps.
4. Set up database migrations and durable storage; arrange automated backups and perform at least one restore check before treating production data as protected. Do not put important persistent data only in a disposable container filesystem.
5. If Docker materially helps an always-running backend or multiple services, add a minimal Dockerfile and `.dockerignore` for each relevant backend, local Compose for dependencies if useful, and production configuration. Avoid baking secrets into images. Docker is an implementation choice, not a prerequisite for every frontend.

## CI/CD target

```text
Git push / pull request → build + meaningful tests → preview or staging (where useful)
Merge to production branch → deploy app + safe migrations → health check → rollback path
```

- Prefer a provider's built-in Git deployment for managed frontend hosting. For an AWS target, use GitHub Actions if the repository is on GitHub, or the equivalent for its actual Git provider.
- Where supported, use short-lived AWS credentials through GitHub Actions OIDC and a narrowly scoped IAM role; see [GitHub's AWS OIDC guide](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws). Store application secrets in the deployment platform's secret system, not in Git, Dockerfiles, images or client bundles.
- Each project needs its own deploy configuration, environment variables, domain/callback setup, health check and rollback steps. Avoid rebuilding all apps for an unrelated change unless the repo structure requires it.
- For a shared VM, plan reverse proxy routing, isolation, container/service resource limits and a deployment method that does not unnecessarily take down the other projects.
- Verify end-to-end workflows: frontend calls the production API over HTTPS; auth and CORS work; database writes survive redeployment; migrations and payment webhooks (if present) work with production URLs. For Stripe, use its test mode until I explicitly authorize live payment configuration.

## Order and deliverables

1. Finish the portfolio deployment first.
2. Inventory the three actual projects with me and inspect their code; prepare a deployment matrix with hosting choice, cost estimate, required accounts/domains and reason for each choice.
3. Agree on any paid monthly spend before provisioning billable infrastructure. Then configure accounts, Docker where appropriate, infrastructure and secrets.
4. Deploy **one** full stack project end to end and establish a working CI/CD pattern; apply the lessons to the next two.
5. Hand over live URLs, service map, monthly cost assumptions, deployment workflow, backup/restore and rollback instructions, and any remaining manual steps.

## Key boundary

Do not assume the `*.is-a.dev` portfolio name can be used as a general domain for three unrelated commercial or full stack apps. Decide their public URLs and domain eligibility separately after reviewing is-a.dev's rules and each project's purpose. Free platform-generated domains are acceptable for demos if suitable.
