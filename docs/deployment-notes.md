# AWS Deployment Notes

**Owner:** M4 — fill in by Day 2 evening after the sandbox deployment is live.

> This document captures the *actual* AWS resources deployed in the eu-west-3
> sandbox so M5 can reference them in the At Scale migration plan and the
> Early Stage doc can show real ARNs.

---

## Live URLs

- Frontend (CloudFront): `https://__FILL_IN__.cloudfront.net`
- API (ALB): `https://__FILL_IN__.eu-west-3.elb.amazonaws.com`

## Resource ARNs

| Resource | ARN |
|---|---|
| VPC | `vpc-__FILL_IN__` |
| Public subnet (eu-west-3a) | `subnet-__FILL_IN__` |
| Private subnet (eu-west-3a) | `subnet-__FILL_IN__` |
| ALB | `arn:aws:elasticloadbalancing:eu-west-3:__ACCT__:loadbalancer/app/__NAME__/__ID__` |
| Target group | `arn:aws:elasticloadbalancing:eu-west-3:__ACCT__:targetgroup/__NAME__/__ID__` |
| ECR repo | `__ACCT__.dkr.ecr.eu-west-3.amazonaws.com/nafad-api` |
| ECS cluster | `arn:aws:ecs:eu-west-3:__ACCT__:cluster/nafad-pay-g2` |
| ECS service | `arn:aws:ecs:eu-west-3:__ACCT__:service/nafad-pay-g2/api` |
| ECS task definition | `arn:aws:ecs:eu-west-3:__ACCT__:task-definition/nafad-api:1` |
| RDS instance | `arn:aws:rds:eu-west-3:__ACCT__:db:nafad-pay-g2-db` |
| Secrets Manager | `arn:aws:secretsmanager:eu-west-3:__ACCT__:secret:nafad-pay-db-__SUFFIX__` |
| S3 bucket (frontend) | `arn:aws:s3:::nafad-pay-g2-frontend` |
| CloudFront distribution | `arn:aws:cloudfront::__ACCT__:distribution/__ID__` |

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
      "Resource": "arn:aws:secretsmanager:eu-west-3:__ACCT__:secret:nafad-pay-db-*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:eu-west-3:__ACCT__:log-group:/ecs/nafad-api:*"
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
      "valueFrom": "arn:aws:secretsmanager:eu-west-3:__ACCT__:secret:nafad-pay-db-__SUFFIX__:DATABASE_URL::"
    }
  ],
  "environment": [
    { "name": "LOG_LEVEL", "value": "info" },
    { "name": "ALLOWED_ORIGINS", "value": "https://__CLOUDFRONT__.cloudfront.net" }
  ]
}
```

## Smoke test commands

```bash
# Health check via ALB
curl https://__ALB_URL__/stats

# Generate 100 transactions
curl -X POST https://__ALB_URL__/simulate/batch?n=100

# Check via frontend
open https://__CLOUDFRONT__.cloudfront.net
```

## Cost so far (sandbox, partial month)

To be filled in from the AWS Cost Explorer at the end of the sprint.
