# AWS Infrastructure Runbook — The Daily Social Backend
> Follow this top to bottom, in order. All resources go in **ap-south-1** (Mumbai).
> Prerequisites: AWS CLI configured (`aws configure`), Docker installed, repo cloned.

---

## 0. Pre-flight checks (do these FIRST)

Before touching AWS, resolve the two blockers from the DevOps meeting:

### 0a. eZee / MyGate IP whitelisting
Contact eZee support and MyGate support and ask:
> "Do your APIs require a static IP whitelist for outbound API calls?"

- **If NO** → proceed. ECS Fargate tasks get dynamic IPs, no NAT Gateway needed.
- **If YES** → add a NAT Gateway to your VPC before creating ECS (adds ~$32/mo).

### 0b. Request SES production access
The account is in SES sandbox (200 emails/day limit). This will break OTP in prod.

```
AWS Console → SES → Account dashboard → Request production access
Use case: transactional emails (OTP, booking confirmation)
Expected volume: ~300 emails/day
```

Approval takes 24–48 hours.

---

## 1. ECR — Container Registry

```bash
# Create the repository
aws ecr create-repository \
  --repository-name tds-backend \
  --region ap-south-1

# Note the repositoryUri output — looks like:
# 985345988013.dkr.ecr.ap-south-1.amazonaws.com/tds-backend
# Replace <ACCOUNT_ID> below with your actual account ID

# Authenticate Docker to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# Build and push the first image
cd backend
docker build -t tds-backend:latest .
docker tag tds-backend:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/tds-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/tds-backend:latest
```

---

## 2. Security Groups

Do this in the AWS Console (VPC → Security Groups) or via CLI.

### ALB security group (`tds-alb-sg`)
| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 443 | 0.0.0.0/0 |
| Inbound | TCP | 80 | 0.0.0.0/0 (redirect to 443) |
| Outbound | All | All | 0.0.0.0/0 |

### ECS security group (`tds-ecs-sg`)
| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 8080 | `tds-alb-sg` |
| Outbound | All | All | 0.0.0.0/0 |

### RDS security group (`tds-rds-sg`)
| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 5432 | `tds-ecs-sg` |
| Outbound | All | All | 0.0.0.0/0 |

---

## 3. Aurora PostgreSQL (RDS)

Create an Aurora Serverless v2 cluster — gives PITR and scales near-zero at low traffic (~$22/mo minimum).

### Console steps (easier than CLI for Aurora):
1. Go to **RDS → Create database**
2. Engine: **Aurora (PostgreSQL Compatible)**
3. Engine version: **Aurora PostgreSQL 16.x**
4. Template: **Production**
5. DB cluster identifier: `tds-production`
6. Master username: `tds_admin`
7. Master password: generate a strong password, save it
8. Instance configuration: **Serverless v2**
   - Min capacity: `0.5 ACU`
   - Max capacity: `4 ACU`
9. Availability: **Single DB instance** (no Multi-AZ — per consultant)
10. VPC: default VPC, assign `tds-rds-sg`
11. Public access: **No**
12. Database name: `tds_production`
13. Backup retention: **7 days** (PITR enabled by default on Aurora)
14. **Create database**

Note the **Writer endpoint** — it looks like:
`tds-production.cluster-xxxx.ap-south-1.rds.amazonaws.com`

### Database migration from Neon

Run these from your local machine (needs PostgreSQL client tools):

```bash
# 1. Dump from Neon (production data)
pg_dump "postgresql://neondb_owner:<NEON_PW>@ep-morning-dream-a11s72fz.ap-southeast-1.aws.neon.tech/neondb" \
  --no-owner --no-acl -Fc -f neon_backup.dump

# 2. Create app user on Aurora
psql -h tds-production.cluster-xxxx.ap-south-1.rds.amazonaws.com \
  -U tds_admin -d tds_production -c "
  CREATE USER tds_app WITH PASSWORD '<STRONG_APP_PASSWORD>';
  GRANT ALL PRIVILEGES ON DATABASE tds_production TO tds_app;
  GRANT ALL ON SCHEMA public TO tds_app;
"

# 3. Restore the dump
pg_restore \
  -h tds-production.cluster-xxxx.ap-south-1.rds.amazonaws.com \
  -U tds_admin -d tds_production \
  --no-owner --no-acl \
  neon_backup.dump

# 4. Verify Prisma migration state
cd backend
DATABASE_URL="postgresql://tds_app:<STRONG_APP_PASSWORD>@tds-production.cluster-xxxx.ap-south-1.rds.amazonaws.com/tds_production" \
  npx prisma migrate deploy
```

---

## 4. SSM Parameter Store — Secrets

All secrets stored as `SecureString` under `/tds/prod/`. Free (standard tier).

```bash
# Helper function — run once
put_param() {
  aws ssm put-parameter \
    --name "/tds/prod/$1" \
    --value "$2" \
    --type SecureString \
    --region ap-south-1 \
    --overwrite
}

# ── Database ──────────────────────────────────────────────────────────────────
put_param DATABASE_URL "postgresql://tds_app:<STRONG_APP_PASSWORD>@tds-production.cluster-xxxx.ap-south-1.rds.amazonaws.com/tds_production"

# ── App ───────────────────────────────────────────────────────────────────────
put_param NODE_ENV "production"
put_param PORT "8080"

# ── Auth ──────────────────────────────────────────────────────────────────────
put_param JWT_SECRET "<GENERATE_A_STRONG_SECRET>"
put_param JWT_EXPIRY "15m"
put_param JWT_REFRESH_EXPIRY "7d"
put_param GOOGLE_OAUTH_CLIENT_ID "<from .env>"
put_param GOOGLE_OAUTH_CLIENT_SECRET "<from .env>"
put_param GOOGLE_OAUTH_CALLBACK_URL "https://api.thedailysocial.co.in/guest/auth/google/callback"
put_param FRONTEND_URL "https://thedailysocial.co.in"

# ── Payments ──────────────────────────────────────────────────────────────────
# Switch from test keys to live keys when ready
put_param RAZORPAY_KEY_ID "<live or test key>"
put_param RAZORPAY_KEY_SECRET "<live or test secret>"
put_param RAZORPAY_WEBHOOK_URL "https://api.thedailysocial.co.in/webhook/razorpay"
put_param RAZORPAY_WEBHOOK_SECRET "<from .env>"

# ── Redis ─────────────────────────────────────────────────────────────────────
# Sidecar in same ECS task — use localhost
put_param REDIS_URL "redis://localhost:6379"

# ── AWS ───────────────────────────────────────────────────────────────────────
put_param AWS_REGION "ap-south-1"
put_param AWS_ACCESS_KEY_ID "<from .env>"
put_param AWS_SECRET_ACCESS_KEY "<from .env>"
put_param AWS_S3_KYC_BUCKET "vibehouse-kyc-documents"

# ── SQS ───────────────────────────────────────────────────────────────────────
put_param AWS_SQS_EZEE_SYNC_QUEUE_URL "<from .env>"
put_param AWS_SQS_NOTIFY_QUEUE_URL "<from .env>"
put_param AWS_SQS_OPS_QUEUE_URL "<from .env>"
put_param AWS_SQS_SLA_QUEUE_URL "<from .env>"
put_param SQS_CONSUMERS_ENABLED "true"

# ── Third-party ───────────────────────────────────────────────────────────────
put_param OPENAI_API_KEY "<from .env>"
put_param ZOHO_CLIENT_ID "<from .env>"
put_param ZOHO_CLIENT_SECRET "<from .env>"
put_param ZOHO_DESK_REFRESH_TOKEN "<from .env>"
put_param ZOHO_DESK_ORG_ID "<from .env>"
put_param API_URL "https://live.ipms247.com/pmsinterface/pms_connectivity.php"
put_param HOTEL_CODE "<from .env>"
put_param DEFAULT_PROPERTY_ID "<from .env>"
put_param AUTH_CODE "<from .env>"
put_param MYGATE_API_KEY "<from .env>"
put_param MYGATE_PARTNER_ID "<from .env>"
put_param MYGATE_MOBILE "<from .env>"
put_param SES_FROM_EMAIL "noreply@thedailysocial.co.in"
```

---

## 5. IAM Roles

### 5a. ECS Task Execution Role
Allows ECS to pull images from ECR and inject secrets from SSM.

```bash
# Create the role (standard AWS-managed policy handles ECR pull)
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Add SSM read permission
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SSMReadTDSProd \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["ssm:GetParameters","ssm:GetParameter","kms:Decrypt"],
      "Resource": "arn:aws:ssm:ap-south-1:<ACCOUNT_ID>:parameter/tds/prod/*"
    }]
  }'
```

### 5b. ECS Task Role
Gives the running container permission to call SQS, S3, SES, Textract.

```bash
aws iam create-role \
  --role-name tds-ecs-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

# Attach the existing AWS-managed policies (already used in Railway)
aws iam attach-role-policy --role-name tds-ecs-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam attach-role-policy --role-name tds-ecs-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name tds-ecs-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess
aws iam attach-role-policy --role-name tds-ecs-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonTextractFullAccess
```

> Scope these to least-privilege before public launch. Full-access is fine for initial setup.

### 5c. GitHub Actions Deploy Role (IAM user)

```bash
aws iam create-user --user-name tds-github-deploy
aws iam create-access-key --user-name tds-github-deploy
# Save the AccessKeyId and SecretAccessKey — add to GitHub repo secrets

aws iam put-user-policy \
  --user-name tds-github-deploy \
  --policy-name ECSDeployPolicy \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[
      {"Effect":"Allow","Action":["ecr:GetAuthorizationToken","ecr:BatchCheckLayerAvailability","ecr:PutImage","ecr:InitiateLayerUpload","ecr:UploadLayerPart","ecr:CompleteLayerUpload"],"Resource":"*"},
      {"Effect":"Allow","Action":["ecs:DescribeTaskDefinition","ecs:RegisterTaskDefinition","ecs:UpdateService","ecs:DescribeServices"],"Resource":"*"},
      {"Effect":"Allow","Action":"iam:PassRole","Resource":["arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskExecutionRole","arn:aws:iam::<ACCOUNT_ID>:role/tds-ecs-task-role"]}
    ]
  }'
```

---

## 6. ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name tds-production \
  --capacity-providers FARGATE \
  --region ap-south-1
```

---

## 7. CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/tds-backend \
  --region ap-south-1

# Retain logs for 30 days
aws logs put-retention-policy \
  --log-group-name /ecs/tds-backend \
  --retention-in-days 30 \
  --region ap-south-1
```

---

## 8. ECS Task Definition

Save this as `task-definition.json` (replace placeholders), then register it:

```json
{
  "family": "tds-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/tds-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "tds-api",
      "image": "<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/tds-backend:latest",
      "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
      "essential": true,
      "secrets": [
        { "name": "DATABASE_URL",               "valueFrom": "/tds/prod/DATABASE_URL" },
        { "name": "NODE_ENV",                   "valueFrom": "/tds/prod/NODE_ENV" },
        { "name": "PORT",                       "valueFrom": "/tds/prod/PORT" },
        { "name": "JWT_SECRET",                 "valueFrom": "/tds/prod/JWT_SECRET" },
        { "name": "JWT_EXPIRY",                 "valueFrom": "/tds/prod/JWT_EXPIRY" },
        { "name": "JWT_REFRESH_EXPIRY",         "valueFrom": "/tds/prod/JWT_REFRESH_EXPIRY" },
        { "name": "GOOGLE_OAUTH_CLIENT_ID",     "valueFrom": "/tds/prod/GOOGLE_OAUTH_CLIENT_ID" },
        { "name": "GOOGLE_OAUTH_CLIENT_SECRET", "valueFrom": "/tds/prod/GOOGLE_OAUTH_CLIENT_SECRET" },
        { "name": "GOOGLE_OAUTH_CALLBACK_URL",  "valueFrom": "/tds/prod/GOOGLE_OAUTH_CALLBACK_URL" },
        { "name": "FRONTEND_URL",               "valueFrom": "/tds/prod/FRONTEND_URL" },
        { "name": "RAZORPAY_KEY_ID",            "valueFrom": "/tds/prod/RAZORPAY_KEY_ID" },
        { "name": "RAZORPAY_KEY_SECRET",        "valueFrom": "/tds/prod/RAZORPAY_KEY_SECRET" },
        { "name": "RAZORPAY_WEBHOOK_URL",       "valueFrom": "/tds/prod/RAZORPAY_WEBHOOK_URL" },
        { "name": "RAZORPAY_WEBHOOK_SECRET",    "valueFrom": "/tds/prod/RAZORPAY_WEBHOOK_SECRET" },
        { "name": "REDIS_URL",                  "valueFrom": "/tds/prod/REDIS_URL" },
        { "name": "AWS_REGION",                 "valueFrom": "/tds/prod/AWS_REGION" },
        { "name": "AWS_ACCESS_KEY_ID",          "valueFrom": "/tds/prod/AWS_ACCESS_KEY_ID" },
        { "name": "AWS_SECRET_ACCESS_KEY",      "valueFrom": "/tds/prod/AWS_SECRET_ACCESS_KEY" },
        { "name": "AWS_S3_KYC_BUCKET",          "valueFrom": "/tds/prod/AWS_S3_KYC_BUCKET" },
        { "name": "AWS_SQS_EZEE_SYNC_QUEUE_URL","valueFrom": "/tds/prod/AWS_SQS_EZEE_SYNC_QUEUE_URL" },
        { "name": "AWS_SQS_NOTIFY_QUEUE_URL",   "valueFrom": "/tds/prod/AWS_SQS_NOTIFY_QUEUE_URL" },
        { "name": "AWS_SQS_OPS_QUEUE_URL",      "valueFrom": "/tds/prod/AWS_SQS_OPS_QUEUE_URL" },
        { "name": "AWS_SQS_SLA_QUEUE_URL",      "valueFrom": "/tds/prod/AWS_SQS_SLA_QUEUE_URL" },
        { "name": "SQS_CONSUMERS_ENABLED",      "valueFrom": "/tds/prod/SQS_CONSUMERS_ENABLED" },
        { "name": "OPENAI_API_KEY",             "valueFrom": "/tds/prod/OPENAI_API_KEY" },
        { "name": "ZOHO_CLIENT_ID",             "valueFrom": "/tds/prod/ZOHO_CLIENT_ID" },
        { "name": "ZOHO_CLIENT_SECRET",         "valueFrom": "/tds/prod/ZOHO_CLIENT_SECRET" },
        { "name": "ZOHO_DESK_REFRESH_TOKEN",    "valueFrom": "/tds/prod/ZOHO_DESK_REFRESH_TOKEN" },
        { "name": "ZOHO_DESK_ORG_ID",           "valueFrom": "/tds/prod/ZOHO_DESK_ORG_ID" },
        { "name": "API_URL",                    "valueFrom": "/tds/prod/API_URL" },
        { "name": "HOTEL_CODE",                 "valueFrom": "/tds/prod/HOTEL_CODE" },
        { "name": "DEFAULT_PROPERTY_ID",        "valueFrom": "/tds/prod/DEFAULT_PROPERTY_ID" },
        { "name": "AUTH_CODE",                  "valueFrom": "/tds/prod/AUTH_CODE" },
        { "name": "MYGATE_API_KEY",             "valueFrom": "/tds/prod/MYGATE_API_KEY" },
        { "name": "MYGATE_PARTNER_ID",          "valueFrom": "/tds/prod/MYGATE_PARTNER_ID" },
        { "name": "MYGATE_MOBILE",              "valueFrom": "/tds/prod/MYGATE_MOBILE" },
        { "name": "SES_FROM_EMAIL",             "valueFrom": "/tds/prod/SES_FROM_EMAIL" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tds-backend",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    },
    {
      "name": "redis",
      "image": "redis:7-alpine",
      "command": ["redis-server", "--maxmemory", "128mb", "--maxmemory-policy", "allkeys-lru"],
      "portMappings": [{ "containerPort": 6379, "protocol": "tcp" }],
      "essential": false,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tds-backend",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "redis"
        }
      }
    }
  ]
}
```

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region ap-south-1
```

---

## 9. ALB + Target Group

```bash
# Get default VPC ID and subnet IDs
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text --region ap-south-1)

SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text --region ap-south-1)

ALB_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=tds-alb-sg" \
  --query "SecurityGroups[0].GroupId" --output text --region ap-south-1)

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name tds-alb \
  --subnets $SUBNETS \
  --security-groups $ALB_SG_ID \
  --region ap-south-1 \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)

echo "ALB ARN: $ALB_ARN"

# Create Target Group
TG_ARN=$(aws elbv2 create-target-group \
  --name tds-api-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region ap-south-1 \
  --query "TargetGroups[0].TargetGroupArn" --output text)

echo "Target Group ARN: $TG_ARN"

# HTTP listener — redirects to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region ap-south-1
```

---

## 10. ACM Certificate

```bash
# Request wildcard cert (covers api.thedailysocial.co.in, admin., etc.)
CERT_ARN=$(aws acm request-certificate \
  --domain-name "*.thedailysocial.co.in" \
  --subject-alternative-names "thedailysocial.co.in" \
  --validation-method DNS \
  --region ap-south-1 \
  --query CertificateArn --output text)

echo "Certificate ARN: $CERT_ARN"

# Get the DNS validation record to add to Route 53
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region ap-south-1 \
  --query "Certificate.DomainValidationOptions"
```

Add the CNAME record shown in the output to Route 53.
Wait ~5 minutes for ACM to validate, then check:

```bash
aws acm describe-certificate --certificate-arn $CERT_ARN \
  --region ap-south-1 --query "Certificate.Status"
# Should return "ISSUED"
```

```bash
# HTTPS listener — forwards to target group
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region ap-south-1
```

---

## 11. ECS Service

```bash
ECS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=tds-ecs-sg" \
  --query "SecurityGroups[0].GroupId" --output text --region ap-south-1)

aws ecs create-service \
  --cluster tds-production \
  --service-name tds-api \
  --task-definition tds-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --deployment-configuration '{
    "minimumHealthyPercent": 50,
    "maximumPercent": 200,
    "deploymentCircuitBreaker": {"enable": true, "rollback": true}
  }' \
  --load-balancers "[{\"targetGroupArn\":\"$TG_ARN\",\"containerName\":\"tds-api\",\"containerPort\":8080}]" \
  --network-configuration "{
    \"awsvpcConfiguration\": {
      \"subnets\": [$(echo $SUBNETS | tr ' ' ',' | sed 's/,/\",\"/g;s/^/\"/;s/$/\"/')],
      \"securityGroups\": [\"$ECS_SG_ID\"],
      \"assignPublicIp\": \"ENABLED\"
    }
  }" \
  --region ap-south-1
```

---

## 12. Auto-Scaling (45–50% CPU/Memory — per consultant)

```bash
# Register the scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/tds-production/tds-api \
  --min-capacity 2 \
  --max-capacity 6 \
  --region ap-south-1

# Scale out on CPU > 45%
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/tds-production/tds-api \
  --policy-name tds-scale-cpu \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 45.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ECSServiceAverageCPUUtilization"},
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }' \
  --region ap-south-1

# Scale out on Memory > 50%
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/tds-production/tds-api \
  --policy-name tds-scale-memory \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 50.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ECSServiceAverageMemoryUtilization"},
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }' \
  --region ap-south-1
```

---

## 13. Route 53 — DNS

```bash
# Get the ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names tds-alb \
  --query "LoadBalancers[0].DNSName" --output text --region ap-south-1)

ALB_ZONE=$(aws elbv2 describe-load-balancers \
  --names tds-alb \
  --query "LoadBalancers[0].CanonicalHostedZoneId" --output text --region ap-south-1)

# Get your Route 53 hosted zone ID for thedailysocial.co.in
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name thedailysocial.co.in \
  --query "HostedZones[0].Id" --output text | cut -d/ -f3)

# Create alias record: api.thedailysocial.co.in → ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"CREATE\",
      \"ResourceRecordSet\": {
        \"Name\": \"api.thedailysocial.co.in\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"HostedZoneId\": \"$ALB_ZONE\",
          \"DNSName\": \"$ALB_DNS\",
          \"EvaluateTargetHealth\": true
        }
      }
    }]
  }"
```

---

## 14. Update External Services

### Google Cloud Console
1. Go to APIs & Services → Credentials → your OAuth client
2. Under "Authorised redirect URIs" add:
   `https://api.thedailysocial.co.in/guest/auth/google/callback`

### Razorpay Dashboard
1. Settings → Webhooks → Edit your webhook
2. URL: `https://api.thedailysocial.co.in/webhook/razorpay`
3. Secret: must match the value you set in SSM for `RAZORPAY_WEBHOOK_SECRET`

### SQS Dead-Letter Queues (AWS Console)
For each FIFO queue (`vibehouse-ops.fifo`, `vibehouse-ezee-sync.fifo`):
1. SQS → select queue → Edit
2. Dead-letter queue: create a new standard DLQ (e.g. `vibehouse-ops-dlq`)
3. Maximum receives: **3**

---

## 15. GitHub Actions Secrets

In your GitHub repo → Settings → Secrets → Actions, add:

| Secret name | Value |
|---|---|
| `AWS_DEPLOY_ACCESS_KEY_ID` | Access key from step 5c |
| `AWS_DEPLOY_SECRET_ACCESS_KEY` | Secret from step 5c |
| `DATABASE_URL` | Aurora connection string (for `prisma migrate deploy` in CI) |

---

## 16. Validation Checklist

Run these after DNS propagates (~5 min):

```bash
# Health check
curl https://api.thedailysocial.co.in/health
# Expected: {"status":"ok"}

# Admin login (should work against Aurora DB)
curl -X POST https://api.thedailysocial.co.in/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager.ka@thedailysocial.in","password":"TDS@2026!"}'

# Check ECS task count (should be 2)
aws ecs describe-services \
  --cluster tds-production --services tds-api \
  --query "services[0].{running:runningCount,desired:desiredCount}" \
  --region ap-south-1

# Check CloudWatch logs are flowing
aws logs tail /ecs/tds-backend --follow --region ap-south-1
```

---

## 17. Cutover & Decommission

1. Monitor ECS for 48 hours — watch CloudWatch logs for errors
2. Verify Razorpay webhook deliveries succeed in Razorpay dashboard
3. Verify Google OAuth works end-to-end
4. After 48 hours with no issues → disable Railway service
5. After 7 days → delete Railway project (keeps Neon.tech separate — cancel Neon after confirming Aurora has all data)
