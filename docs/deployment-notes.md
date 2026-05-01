# AWS Deployment Notes

> Reference document for the AWS deployment. Fill the `<…>` placeholders in
> after running the GitHub Actions deploy workflows
> ([`.github/workflows/deploy-api.yml`](../.github/workflows/deploy-api.yml),
> [`.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml))
> against the sandbox account. Region target: `eu-west-3` (Paris).

---

## Live URLs

| Surface | URL |
|---|---|
| Frontend (CloudFront) | `https://<distribution-id>.cloudfront.net` |
| API (ALB)             | `https://<alb-dns-name>.eu-west-3.elb.amazonaws.com` |

## Resource ARNs

| Resource | ARN |
|---|---|
| VPC | `vpc-<id>` |
| Public subnet (eu-west-3a) | `subnet-<id>` |
| Private subnet (eu-west-3a) | `subnet-<id>` |
| ALB | `arn:aws:elasticloadbalancing:eu-west-3:<account>:loadbalancer/app/<name>/<id>` |
| Target group | `arn:aws:elasticloadbalancing:eu-west-3:<account>:targetgroup/<name>/<id>` |
| ECR repo | `<account>.dkr.ecr.eu-west-3.amazonaws.com/nafad-api` |
| ECS cluster | `arn:aws:ecs:eu-west-3:<account>:cluster/nafad-pay-g2` |
| ECS service | `arn:aws:ecs:eu-west-3:<account>:service/nafad-pay-g2/api` |
| ECS task definition | `arn:aws:ecs:eu-west-3:<account>:task-definition/nafad-api:<rev>` |
| RDS instance | `arn:aws:rds:eu-west-3:<account>:db:nafad-pay-g2-db` |
| Secrets Manager | `arn:aws:secretsmanager:eu-west-3:<account>:secret:nafad-pay-db-<suffix>` |
| S3 bucket (frontend) | `arn:aws:s3:::nafad-pay-g2-frontend` |
| CloudFront distribution | `arn:aws:cloudfront::<account>:distribution/<id>` |
| GitHub OIDC role | `arn:aws:iam::<account>:role/nafad-pay-g2-github-actions` |

## Security group rules

| SG | Inbound | From |
|---|---|---|
| ALB SG | TCP 443 | 0.0.0.0/0 |
| ALB SG | TCP 80 | 0.0.0.0/0 (redirected to 443) |
| ECS SG | TCP 8000 | ALB SG only |
| RDS SG | TCP 5432 | ECS SG only |

## IAM task role policy (excerpt)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:eu-west-3:<account>:secret:nafad-pay-db-*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:eu-west-3:<account>:log-group:/ecs/nafad-api:*"
    }
  ]
}
```

## ECS task definition env

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:eu-west-3:<account>:secret:nafad-pay-db-<suffix>:DATABASE_URL::"
    }
  ],
  "environment": [
    { "name": "LOG_LEVEL", "value": "info" },
    { "name": "ALLOWED_ORIGINS", "value": "https://<distribution-id>.cloudfront.net" }
  ]
}
```

## GitHub OIDC trust policy

The role `nafad-pay-g2-github-actions` must trust GitHub's OIDC provider so the
deploy workflows can assume it without long-lived AWS access keys:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:SidiElvaly/nafad-pay-g2:*" }
    }
  }]
}
```

Permissions attached to this role: `AmazonEC2ContainerRegistryPowerUser`,
`AmazonECS_FullAccess` (or a tighter custom policy for the specific cluster/service),
`AmazonS3FullAccess` on the frontend bucket, and `cloudfront:CreateInvalidation`
on the distribution.

## GitHub repository secrets

Required for the workflows to run. Set under **Settings → Secrets and variables
→ Actions**:

| Name | Type | Example value |
|---|---|---|
| `AWS_ROLE_ARN` | secret | `arn:aws:iam::<account>:role/nafad-pay-g2-github-actions` |
| `AWS_REGION` | variable | `eu-west-3` |
| `ECR_REPOSITORY` | variable | `nafad-api` |
| `ECS_CLUSTER` | variable | `nafad-pay-g2` |
| `ECS_SERVICE` | variable | `api` |
| `ECS_TASK_DEFINITION_FAMILY` | variable | `nafad-api` |
| `ECS_CONTAINER_NAME` | variable | `api` |
| `FRONTEND_S3_BUCKET` | variable | `nafad-pay-g2-frontend` |
| `CLOUDFRONT_DISTRIBUTION_ID` | secret | `<id>` |
| `VITE_API_URL` | variable | `https://api.nafad-pay.example` |
| `API_PUBLIC_URL` | variable (optional) | `https://api.nafad-pay.example` — enables post-deploy smoke test |

## Smoke test (after first deploy)

```bash
ALB=https://<alb-dns-name>
CDN=https://<distribution-id>.cloudfront.net

# API
curl "$ALB/stats"
curl -X POST "$ALB/simulate/batch?n=100"
curl "$ALB/transactions?limit=5"

# Frontend
curl -I "$CDN"
open "$CDN"
```

## Cost tracking

Filled in from AWS Cost Explorer at the end of the sprint. The Early Stage
target is roughly **$50–60 / month** at zero traffic with auto-paused RDS;
see [`architecture-early-stage.md`](architecture-early-stage.md) for the
breakdown.
