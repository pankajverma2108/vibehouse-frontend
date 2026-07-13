# AWS OIDC Deployment Credentials - DevOps Handoff

- Date: 2026-07-12
- Source repository: `Emagicor/Vibehouse_frontend`
- Source branch: `main`
- Workflow: `.github/workflows/deploy.yml`
- Audience: DevOps / AWS administrator / GitHub repository administrator
- Frontend owner: FE team
- Backend impact: None
- Status: Blocked on GitHub and AWS configuration

## 1. Executive Summary

The production frontend deployment is failing before the Docker build and before any ECR, ECS, or CloudFront operation runs.

The failing workflow step is:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    role-session-name: GitHubActions-${{ github.run_id }}
    aws-region: ${{ env.AWS_REGION }}
```

The reported error is:

```text
Credentials could not be loaded, please check your action inputs:
Could not load credentials from any providers
```

This is an AWS/GitHub Actions identity configuration problem. It is not caused by the frontend application or the backend API.

The most likely cause is that `AWS_DEPLOY_ROLE_ARN` is empty or unavailable to this workflow run. If the ARN is present, DevOps must verify the AWS GitHub OIDC provider and the target IAM role trust policy.

## 2. Ownership Boundary

### DevOps / repository administrator owns

- Creating or confirming the AWS GitHub OIDC identity provider.
- Creating or confirming the IAM deployment role.
- Configuring the role trust relationship for this repository and branch.
- Attaching the ECR, ECS, IAM PassRole, and optional CloudFront permissions required by the workflow.
- Setting `AWS_DEPLOY_ROLE_ARN` in the correct GitHub Actions secret scope.
- Rerunning and validating the production deployment.

### Frontend owns

- Maintaining `.github/workflows/deploy.yml`.
- Requesting the OIDC token through `permissions.id-token: write`.
- Passing the configured role ARN to `aws-actions/configure-aws-credentials`.
- Building the frontend image and deploying it after AWS authentication succeeds.
- Optionally adding a fast-fail check for a missing role ARN.

### Backend does not own

- GitHub Actions secrets.
- AWS IAM roles or trust policies.
- GitHub OIDC provider configuration.
- ECR/ECS deployment credentials.

No backend API or backend code change is required for this incident.

## 3. Current Frontend Workflow State

The workflow already has the GitHub permissions required to request an OIDC token:

```yaml
permissions:
  id-token: write
  contents: read
```

Current AWS deployment settings are:

| Setting | Current value |
| --- | --- |
| AWS region | `ap-south-1` |
| ECR repository | `tds-frontend` |
| ECS cluster | `tds-frontend` |
| ECS service | `tds-frontend` |
| ECS container name | `tds-frontend` |
| Role input | `${{ secrets.AWS_DEPLOY_ROLE_ARN }}` |
| Trigger | Push to `main` |

The workflow also runs this immediately after credential configuration:

```yaml
- name: Verify AWS identity
  run: aws sts get-caller-identity
```

That identity check cannot run until `configure-aws-credentials` successfully assumes the role.

## 4. Most Likely Failure: Secret Is Missing or Out of Scope

The workflow reads a GitHub Actions secret named exactly:

```text
AWS_DEPLOY_ROLE_ARN
```

Its value must be the complete IAM role ARN:

```text
arn:aws:iam::<AWS_ACCOUNT_ID>:role/<DEPLOY_ROLE_NAME>
```

Example shape only:

```text
arn:aws:iam::123456789012:role/vibehouse-frontend-github-deploy
```

Do not copy the example account ID or role name.

### Required GitHub check

In the GitHub repository, check:

1. `Settings` -> `Secrets and variables` -> `Actions`.
2. Under `Repository secrets`, confirm `AWS_DEPLOY_ROLE_ARN` exists.
3. Update it with the full ARN of the active deployment role in the AWS account that owns the `tds-frontend` resources.
4. Ensure there are no quotes, spaces, or line breaks around the ARN.
5. Rerun the failed workflow after saving it.

### Important environment-secret caveat

The current `deploy` job does not declare a GitHub Actions environment:

```yaml
jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
```

Therefore, an environment-scoped secret is not available unless the job is attached to that environment.

Use one of these approaches:

#### Option A: repository secret

Add `AWS_DEPLOY_ROLE_ARN` under repository Actions secrets. This requires no workflow environment change.

#### Option B: protected deployment environment

If the secret belongs to an environment such as `production`, update the job to declare it:

```yaml
jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    environment: production
```

The environment name must exactly match the environment containing the secret. DevOps should also confirm any required reviewers, wait timers, or branch protection rules for that environment.

## 5. AWS OIDC Provider Requirements

The target AWS account must have an IAM OIDC identity provider with:

| Field | Required value |
| --- | --- |
| Provider URL | `https://token.actions.githubusercontent.com` |
| Audience | `sts.amazonaws.com` |

AWS CLI check:

```bash
aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn \
  arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com
```

If the provider does not exist, DevOps must add GitHub as an IAM OIDC provider in the AWS account that owns the deployment resources.

Official references:

- GitHub: `https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws`
- AWS: `https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html`
- AWS credentials action: `https://github.com/aws-actions/configure-aws-credentials`

## 6. Required IAM Role Trust Policy

The deployment role must allow GitHub Actions from this repository's `main` branch to call `sts:AssumeRoleWithWebIdentity`.

Replace `<AWS_ACCOUNT_ID>` with the real account ID:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:Emagicor/Vibehouse_frontend:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

The repository owner, repository name, and branch are case-sensitive identity inputs. They should match:

```text
repo:Emagicor/Vibehouse_frontend:ref:refs/heads/main
```

AWS CLI checks:

```bash
aws iam get-role --role-name <DEPLOY_ROLE_NAME>
```

```bash
aws iam get-role \
  --role-name <DEPLOY_ROLE_NAME> \
  --query 'Role.AssumeRolePolicyDocument'
```

## 7. Required Deployment Permissions

Passing the trust check only allows GitHub to assume the role. The role also needs permissions for the AWS operations performed later in the workflow.

### ECR permissions

The workflow logs in to ECR and pushes both the commit SHA tag and `latest` to `tds-frontend`.

Required actions normally include:

```text
ecr:GetAuthorizationToken
ecr:BatchCheckLayerAvailability
ecr:GetDownloadUrlForLayer
ecr:BatchGetImage
ecr:InitiateLayerUpload
ecr:UploadLayerPart
ecr:CompleteLayerUpload
ecr:PutImage
```

### ECS permissions

The workflow reads the current task definition, checks the service desired count, registers a new task-definition revision, and updates the ECS service.

Required actions normally include:

```text
ecs:DescribeTaskDefinition
ecs:DescribeServices
ecs:RegisterTaskDefinition
ecs:UpdateService
```

### IAM PassRole permission

Registering the task definition may require:

```text
iam:PassRole
```

This should be restricted to the ECS task execution role and task role referenced by the `tds-frontend` task definition. Do not grant unrestricted `iam:PassRole` if the exact roles are known.

### CloudFront permission

If `CLOUDFRONT_DISTRIBUTION_ID` is configured, the workflow also calls:

```text
cloudfront:CreateInvalidation
```

CloudFront invalidation is optional in the current workflow. If the distribution secret is absent, the deployment skips this step after ECS deployment.

## 8. Example Identity Policy Skeleton

This is a starting template, not a copy-paste final policy. DevOps must replace all placeholders with the real account, region, repository, cluster, service, task, role, and distribution resources.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrAuthorization",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "PushFrontendImage",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "arn:aws:ecr:ap-south-1:<AWS_ACCOUNT_ID>:repository/tds-frontend"
    },
    {
      "Sid": "ReadAndDeployEcsService",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeServices",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassFrontendTaskRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::<AWS_ACCOUNT_ID>:role/<ECS_TASK_EXECUTION_ROLE>",
        "arn:aws:iam::<AWS_ACCOUNT_ID>:role/<ECS_TASK_ROLE>"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    },
    {
      "Sid": "InvalidateFrontendCloudFrontCache",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::<AWS_ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
    }
  ]
}
```

DevOps should scope ECS permissions further where AWS supports resource-level restrictions without breaking task-definition registration and service deployment.

## 9. Error Interpretation Guide

| Error stage or text | Likely cause | Owner |
| --- | --- | --- |
| `Could not load credentials from any providers` | Role ARN secret is missing, empty, misspelled, or unavailable due to environment scope | GitHub repository admin / DevOps |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | OIDC provider, audience, subject condition, branch, repository name, or role trust policy is wrong | AWS DevOps |
| `No OpenIDConnect provider found` | GitHub OIDC provider is missing from the AWS account | AWS DevOps |
| `AccessDenied` during ECR login or push | Role was assumed but ECR permissions or repository/account targeting is wrong | AWS DevOps |
| `AccessDenied` during task-definition or service update | ECS permissions or `iam:PassRole` is missing or incorrectly scoped | AWS DevOps |
| `AccessDenied` during CloudFront invalidation | Optional CloudFront permission or distribution resource is missing | AWS DevOps |
| `The security token included in the request is invalid` with static keys | Old static key secrets are invalid, inactive, or from the wrong account | AWS DevOps |

The reported Node.js 20 deprecation message is informational and is not the cause of this credentials failure.

## 10. Recommended Frontend Fast-Fail Improvement

After DevOps confirms how the secret is scoped, FE can add this step before credential configuration:

```yaml
- name: Validate deploy role ARN
  env:
    AWS_DEPLOY_ROLE_ARN: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
  run: |
    if [ -z "$AWS_DEPLOY_ROLE_ARN" ]; then
      echo "AWS_DEPLOY_ROLE_ARN is not set or is unavailable to this job"
      exit 1
    fi
```

This only improves diagnostics. It does not create the secret, OIDC provider, trust relationship, or IAM permissions.

Do not print the ARN or other credentials during validation unless DevOps has explicitly approved that exposure in Actions logs.

## 11. DevOps Remediation Sequence

Complete these steps in order:

1. Identify the AWS account that owns ECR repository `tds-frontend`, ECS cluster `tds-frontend`, and ECS service `tds-frontend` in `ap-south-1`.
2. Confirm the GitHub OIDC provider exists in that same AWS account.
3. Confirm the deployment IAM role exists and is active.
4. Apply or correct the role trust policy for `Emagicor/Vibehouse_frontend` on `main`.
5. Confirm the role has the required ECR, ECS, `iam:PassRole`, and optional CloudFront permissions.
6. Copy the complete role ARN.
7. Set it as the repository secret `AWS_DEPLOY_ROLE_ARN`, or tell FE the exact protected environment name that contains it.
8. Rerun the failed GitHub Actions job.
9. Confirm `Configure AWS credentials` succeeds.
10. Confirm `Verify AWS identity` prints the expected AWS account and assumed role.
11. Confirm the image is pushed to the expected `tds-frontend` ECR repository.
12. Confirm ECS registers a new task-definition revision and updates the expected service.
13. Confirm the ECS service reaches a stable state with the intended desired count.
14. If configured, confirm CloudFront invalidation succeeds.

## 12. Acceptance Criteria

The issue is resolved only when all applicable checks pass:

- [ ] `AWS_DEPLOY_ROLE_ARN` is visible to the deploy job through the intended GitHub secret scope.
- [ ] The ARN points to the deployment role in the AWS account that owns `tds-frontend`.
- [ ] GitHub OIDC provider URL is `https://token.actions.githubusercontent.com`.
- [ ] OIDC audience is `sts.amazonaws.com`.
- [ ] Trust policy permits only the intended repository and `main` branch deployment identity.
- [ ] `Configure AWS credentials` completes successfully.
- [ ] `aws sts get-caller-identity` returns the expected account and assumed role.
- [ ] ECR login succeeds.
- [ ] Docker image push succeeds for the commit SHA and `latest` tags.
- [ ] ECS task-definition registration succeeds.
- [ ] ECS service update succeeds and reaches stability.
- [ ] CloudFront invalidation succeeds when a distribution ID is configured.
- [ ] No long-lived `AWS_DEPLOY_ACCESS_KEY_ID` or `AWS_DEPLOY_SECRET_ACCESS_KEY` is required by this workflow.

## 13. Evidence Requested From DevOps

Please return the following without sharing secret values:

1. Confirmation that `AWS_DEPLOY_ROLE_ARN` is a repository secret, or the exact GitHub environment name if it is environment-scoped.
2. The IAM deployment role name and AWS account ID. Account IDs and role names are identifiers, not secret access credentials, but share them only in the approved engineering channel.
3. Confirmation that the role trust subject is:

   ```text
   repo:Emagicor/Vibehouse_frontend:ref:refs/heads/main
   ```

4. Confirmation that the expected ECR repository, ECS cluster, and ECS service all exist in `ap-south-1`.
5. The rerun URL and the first failed step if the deployment still fails.
6. The redacted `aws sts get-caller-identity` result if authentication succeeds but a later AWS permission fails.

Never send an AWS secret access key, session token, GitHub secret value, or OIDC token in the handoff response.

## 14. Rollback and Security Notes

- Do not restore long-lived IAM access keys as the permanent fix.
- If temporary static credentials are ever used under an emergency process, they must be time-bounded, least-privileged, approved, rotated immediately afterward, and removed from GitHub when OIDC is restored.
- Keep the trust policy restricted to the intended repository and branch.
- Keep `iam:PassRole` restricted to the ECS roles used by this service.
- Do not log GitHub secret values or AWS tokens.
- Do not delete or rotate unrelated production IAM roles while diagnosing this workflow.

## 15. Final Handoff Message

The frontend deployment workflow is ready to authenticate through GitHub OIDC, but no usable AWS credential source is reaching `aws-actions/configure-aws-credentials`. DevOps should first verify the GitHub secret scope, then the AWS OIDC provider and IAM role trust relationship. Backend work is not required. Once authentication succeeds, any later `AccessDenied` should be handled as a specific ECR, ECS, `iam:PassRole`, or CloudFront policy issue using the error guide above.





tried again at 15:50: 
Root cause: the job fails at **Configure AWS credentials** because no valid AWS credentials source is available for the action.

From the workflow ([`.github/workflows/deploy.yml`](https://github.com/Emagicor/Vibehouse_frontend/blob/8c4fc30f35d955db58f15a3c82b86229f1063603/.github/workflows/deploy.yml), lines 27–32), it uses OIDC + role assumption:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    role-session-name: GitHubActions-${{ github.run_id }}
    aws-region: ${{ env.AWS_REGION }}
```

The error indicates this step cannot obtain credentials, which usually means one of these is misconfigured:

1. `AWS_DEPLOY_ROLE_ARN` secret is missing/empty/wrong.
2. The IAM role trust policy does not allow GitHub OIDC for this repo/branch.
3. The role has insufficient permissions for ECS/ECR/CloudFront operations.

## Fix

### 1) Ensure secret is set correctly
Set repo secret `AWS_DEPLOY_ROLE_ARN` to the exact role ARN, e.g.:

`arn:aws:iam::<account-id>:role/<github-deploy-role>`

---

### 2) Fix IAM role trust policy for GitHub OIDC
Attach/update trust policy on that role to allow this repo and branch (`main`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:Emagicor/Vibehouse_frontend:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

---

### 3) Ensure role permissions cover what this workflow does
Minimum scope should include:
- ECR auth + push
- ECS describe/update/deploy task definition
- `iam:PassRole` for task execution/task role used by ECS task definition
- CloudFront invalidation (if used)

---

### 4) Add a guardrail in workflow to fail fast with clearer message
Add this right before AWS credential configuration:

```yaml
- name: Validate required secrets
  run: |
    if [ -z "${{ secrets.AWS_DEPLOY_ROLE_ARN }}" ]; then
      echo "AWS_DEPLOY_ROLE_ARN is not set"
      exit 1
    fi
```

This will make failures explicit instead of surfacing as generic provider-chain credential errors.

---

The failure is not in Docker/ECS deploy logic; it happens before any AWS API call because credential bootstrapping via OIDC is not succeeding.