# AWS infrastructure

Single CloudFormation stack that provisions the full Early-Stage architecture
for NAFAD-PAY G2 in any AWS account. Target cost: **~$50–60 / month** at idle.

## What it creates

| Layer | Resources |
|---|---|
| Network | 1× VPC, 2× public subnets (2 AZs), Internet Gateway, route table |
| Security groups | ALB SG, ECS SG (ingress from ALB only), RDS SG (ingress from ECS only) |
| Edge | CloudFront distribution with 2 origins (S3 + ALB) and a viewer-request function that strips `/api` before forwarding to the ALB |
| API | ALB, target group, listener, ECS Fargate cluster, placeholder task definition, ECS service (DesiredCount: 0 — bumped by first deploy) |
| Data | RDS PostgreSQL 16 (`db.t4g.micro`, single AZ, encrypted, 7-day backups), DB subnet group |
| Secrets | Secrets Manager entry containing `DATABASE_URL` |
| Registry | ECR repo `nafad-api` with lifecycle policy (keep last 10 images) |
| Observability | CloudWatch log group `/ecs/nafad-api` (30-day retention) |
| Static hosting | S3 bucket (private, OAC-only), CloudFront OAC + bucket policy |
| CI/CD | IAM OIDC provider for `token.actions.githubusercontent.com` (optional), IAM role `nafad-pay-g2-github-actions` scoped to your repo only |

## Deploy

```bash
# 1. Set your region and pick a strong DB password.
REGION=eu-west-3
DB_PASSWORD='change-this-to-something-strong-12chars-min'

# 2. Create the stack.
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name nafad-pay-g2 \
  --template-file infrastructure/cloudformation.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      ProjectName=nafad-pay-g2 \
      GitHubOrg=SidiElvaly \
      GitHubRepo=nafad-pay-g2 \
      DBPassword="$DB_PASSWORD"

# 3. Read the outputs you need for GitHub.
aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name nafad-pay-g2 \
  --query 'Stacks[0].Outputs' --output table
```

The first deployment takes ~15 minutes (RDS is the slowest resource).

> **If your account already has a GitHub OIDC provider**, add
> `CreateOIDCProvider=false` to the `--parameter-overrides` line; otherwise the
> stack will fail with "EntityAlreadyExists".

## Post-deploy: copy outputs into GitHub

In **GitHub → repo Settings → Secrets and variables → Actions**:

### Variables (visible to the workflow)

| Name | Stack output |
|---|---|
| `AWS_REGION` | `Region` |
| `ECR_REPOSITORY` | `ECRRepositoryName` |
| `ECS_CLUSTER` | `ECSClusterName` |
| `ECS_SERVICE` | `ECSServiceName` |
| `ECS_TASK_DEFINITION_FAMILY` | `ECSTaskDefinitionFamily` |
| `ECS_CONTAINER_NAME` | `ECSContainerName` |
| `FRONTEND_S3_BUCKET` | `FrontendBucketName` |
| `VITE_API_URL` | `ViteApiUrl` |
| `API_PUBLIC_URL` | `ApiPublicUrl` (optional — enables post-deploy smoke test) |

### Secrets (encrypted)

| Name | Stack output |
|---|---|
| `AWS_ROLE_ARN` | `GitHubActionsRoleArn` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `CloudFrontDistributionId` |

> The CloudFront distribution ID is technically not sensitive, but storing it
> as a secret keeps it out of public workflow logs.

## First deployment after the stack is up

The stack creates the ECS service with `DesiredCount: 0` and a placeholder
nginx image so that nothing tries to run before your real container exists.
The first run of `deploy-api.yml` will:

1. Build `api/Dockerfile` and push the image to ECR.
2. Render a new task definition with that image.
3. Bump `DesiredCount` from 0 to 1.
4. Wait for the service to stabilize.

Trigger it manually the first time:

```bash
gh workflow run deploy-api.yml
gh workflow run deploy-frontend.yml
```

Or push any change under `api/` or `frontend/` to `main`.

After both workflows finish, the live frontend is at the URL printed in the
`CloudFrontDomain` output. The frontend's API calls go to `/api/*` on the
same origin and CloudFront proxies them to the ALB.

## Tear down

```bash
# Empty the frontend bucket first (CloudFormation refuses to delete a non-empty bucket).
aws s3 rm "s3://$(aws cloudformation describe-stacks --stack-name nafad-pay-g2 \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text)" --recursive

# Delete the stack. RDS leaves a final snapshot per the DeletionPolicy.
aws cloudformation delete-stack --region "$REGION" --stack-name nafad-pay-g2
aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name nafad-pay-g2
```

## Cost estimate (eu-west-3, idle)

| Resource | ~Monthly |
|---|---|
| ALB | $22 |
| RDS db.t4g.micro single-AZ + 20 GB gp3 + 7-day backups | $15 |
| ECS Fargate (1 task, 0.25 vCPU, 512 MB, 24×7) | $9 |
| Secrets Manager (1 secret) | $0.40 |
| CloudWatch Logs (30-day, low volume) | $1 |
| S3 + CloudFront (light traffic, free tier likely covers it) | $1–3 |
| **Total** | **~$50** |

Delete the stack when you're done with the demo to avoid the running cost.
