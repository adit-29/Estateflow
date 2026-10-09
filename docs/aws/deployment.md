# Deployment guide

**Nothing in this repository has been deployed.**

Do not run `terraform apply`, create an ECR repository, or push images until the owner explicitly approves that spend.

Tooling is Terraform (>= 1.6, AWS provider ~> 5.70). CDK is not used. Kubernetes, Kafka, and Elasticsearch are deliberately absent.

Placeholders only: `REPLACE_ACCOUNT`, `REPLACE_REGION`, `REPLACE_DOMAIN`, `REPLACE_CERT`, `REPLACE_TAG`.

## Environments

| | local | staging | production |
| --- | --- | --- | --- |
| `APP_ENV` | `local` | `staging` (set by Terraform) | `production` (set by Terraform) |
| Web build | `NEXT_PUBLIC_APP_ENV=local` | `staging` | `production`: demo workspace, demo credentials, and sample listings are compiled out |
| Auth | local password auth | local auth with a Terraform-generated 48-character secret, or Cognito | Cognito only. The API refuses to start otherwise |
| Database | any Postgres | private RDS, TLS required | private RDS, Multi-AZ, deletion protection, final snapshot |
| Demo seed | `npm run db:seed` | refused | refused. `SEED_DEMO_DATA=true` blocks startup |
| Storage and providers | optional, show setup states | optional | optional |

`apps/api/src/config/runtime-env.ts` enforces the right-hand columns at boot. Outside `local`, the API exits and logs the offending variable names (never values) if any of these hold:

- `DATABASE_URL` is missing.
- `CORS_ORIGIN` is missing or points at localhost.
- Static AWS access keys are set.
- `NOTIFICATION_SINK=local`.
- A reconstruction provider is set without a webhook secret.
- Local auth is used with a weak secret.

In production it also refuses when `AUTH_PROVIDER` is not `cognito`, when the database URL lacks `sslmode=require`, or when `SEED_DEMO_DATA=true`.

## Validate without deploying

This needs no AWS credentials and creates nothing. CI runs the same steps.

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

## What Terraform would create

- **Network:**
  - A VPC with two public and two private subnets and one NAT gateway.
  - A free S3 gateway endpoint.
  - No public route to the database.
- **Security groups:**
  - The ALB accepts 443, and 80 only to redirect.
  - The ALB sends only to tasks.
  - Tasks accept traffic only from the ALB, and send out 443 plus 5432 to the database.
  - The database accepts traffic only from tasks.
- **RDS PostgreSQL 16:**
  - Private subnets, `publicly_accessible = false`.
  - Encrypted gp3 storage with autoscaling.
  - `rds.force_ssl = 1`, with Postgres logs exported to CloudWatch.
  - Production adds Multi-AZ, deletion protection, 14-day backups, and a final snapshot.
- **S3 media bucket:**
  - Public access blocked, bucket-owner-enforced ownership, SSE with a bucket key.
  - A TLS-only policy, and CORS allowing PUT/GET/HEAD only from `https://<domain_name>`.
  - Lifecycle rules for incomplete multipart uploads and noncurrent versions. Versioning is on in production.
  - The API task role can read and write only `agencies/*`.
  - Tour videos go to `agencies/<agencyId>/tours/<jobId>/`.
- **Secrets Manager:**
  - `estateflow/<env>/database`: the URL with `sslmode=require`, generated password.
  - `estateflow/<env>/app`: empty keys for AI, WhatsApp/Meta, and the reconstruction provider. You fill these in. Terraform ignores later value changes.
  - `estateflow/<env>/local-auth`: only when `auth_provider = "local"`.
  - The execution role can read only these three secrets. The web task gets no secrets.
- **ECS Fargate:**
  - `api` and `web` services with a deployment circuit breaker and automatic rollback.
  - A one-off `migrate` task definition.
- **ALB:**
  - HTTPS with your ACM certificate, and HTTP → HTTPS 301.
  - Invalid header fields are dropped.
  - The API target group health check is `/health/ready`, so a task never gets traffic while migrations are pending or the database is down. The web check is `/api/health`.
- **Cognito:** a user pool and a public app client. The API's Cognito adapter is **not implemented**, so production cannot sign anyone in yet. See the gap report.
- **SQS jobs queue and DLQ:** only when `enable_job_queue = true`. The default is false, because no worker consumes it.
- **Observability:**
  - Log groups with 14 days retention (90 in production, overridable), and an SNS alarm topic with KMS.
  - Alarms: ALB 5xx; unhealthy API or web targets; RDS CPU; RDS free storage; `unhandled_error` log lines; DLQ depth when the queue is on.
  - A dashboard.

## Exact manual steps, only after approval

1. **Accounts and prerequisites.**
   - You need an AWS account, a Route 53 or external DNS zone for `REPLACE_DOMAIN`, and an issued ACM certificate in `REPLACE_REGION` that covers the web and API names.
   - Use an operator IAM role for Terraform, not root.
2. **State backend.**
   - Create an S3 bucket (versioned, encrypted, public access blocked) and a DynamoDB lock table by hand.
   - Uncomment the `backend "s3"` block in `versions.tf`.
   - State contains the generated database password, so restrict access to the bucket.
3. **Variables.**
   - `cp envs/staging.tfvars.example envs/staging.tfvars`. This file is gitignored.
   - Fill in the domain, certificate ARN, image tags, and alarm email.
   - Do not put secrets in `api_config`. Validation rejects names that look like secrets.
4. **Registry.** Create ECR repositories `estateflow-api` and `estateflow-web`. This costs money. Get approval first.
5. **Images.** From the repository root:

   ```bash
   TAG=$(git rev-parse --short HEAD)
   docker build -f apps/api/Dockerfile -t REPLACE_ACCOUNT.dkr.ecr.REPLACE_REGION.amazonaws.com/estateflow-api:$TAG .
   docker build -f apps/web/Dockerfile \
     --build-arg API_URL=https://api.staging.REPLACE_DOMAIN \
     --build-arg NEXT_PUBLIC_APP_ENV=staging \
     --build-arg NEXT_PUBLIC_APP_URL=https://staging.REPLACE_DOMAIN \
     -t REPLACE_ACCOUNT.dkr.ecr.REPLACE_REGION.amazonaws.com/estateflow-web:$TAG .
   aws ecr get-login-password | docker login --username AWS --password-stdin REPLACE_ACCOUNT.dkr.ecr.REPLACE_REGION.amazonaws.com
   docker push ...estateflow-api:$TAG && docker push ...estateflow-web:$TAG
   ```

   `API_URL` is required at build time because Next.js bakes rewrites into the build. The web build fails without it.
6. **Plan, then apply.** `terraform plan -var-file=envs/staging.tfvars -out=staging.plan`, review it, and run `terraform apply staging.plan` **with explicit approval only**.

   The services start, but targets stay unhealthy until step 8, because readiness reports `migrations_pending`.
7. **App secret values.** Fill in only the integrations you are enabling:

   ```bash
   aws secretsmanager put-secret-value --secret-id estateflow/staging/app --secret-string file://app-secret.json
   ```

   The file holds keys such as `AI_API_KEY` and `RECONSTRUCTION_WEBHOOK_SECRET`. Keep it outside the repo and delete it afterwards. Put non-secret switches (`AI_PROVIDER`, `S3_BUCKET` is automatic, `RECONSTRUCTION_PROVIDER`) in `api_config`.
8. **Migrations.** Run them as a one-off task, never at startup:

   ```bash
   aws ecs run-task --cluster estateflow-staging --launch-type FARGATE \
     --task-definition "$(terraform output -raw migrate_task_definition)" \
     --network-configuration "awsvpcConfiguration={subnets=[$(terraform output -json private_subnet_ids | jq -r 'join(",")')],securityGroups=[$(terraform output -raw task_security_group_id)],assignPublicIp=DISABLED}"
   ```

   Watch the `migrate` stream in the API log group. It must exit 0.
9. **Roll services.** Run `aws ecs update-service --cluster estateflow-staging --service api --force-new-deployment`, and the same for `web`. Wait for targets to become healthy.
10. **DNS.** Point the web and API names at `alb_dns_name`.
11. **Alarm email.** Confirm the SNS subscription email, or every alarm is silent.
12. **Smoke test.** Run the checklist below.

## Migrations and rollback

- `prisma migrate deploy` runs **only** through the `migrate` task. The API container never migrates on startup, and nothing runs `migrate reset` or `db push` against RDS.
- `/health/ready` compares the migration folders baked into the image with `_prisma_migrations`. It returns 503 with `migrations_pending`, `migration_failed`, or `migrations_missing` until the two match.
- Write migrations as **expand, then contract**:
  1. Add nullable columns or tables in release N, and ship code that works with both shapes.
  2. Backfill.
  3. Drop old columns only in a later release, after N has been stable.

  With this pattern, rolling the image back never meets a schema it can't read.
- **Rolling back code:** `aws ecs update-service --service api --task-definition <previous revision>`. The circuit breaker also rolls back automatically when new tasks fail health checks.
- **Rolling back a migration:** Prisma has no down migrations. Either write a new forward migration that reverses the change, or, for a destructive mistake, restore the pre-deploy RDS snapshot. Take a manual snapshot before any migration that drops or rewrites data.
- **A failed migration** (`migration_failed` in readiness): fix the data or SQL, then `prisma migrate resolve --rolled-back <name>` or `--applied <name>` from a one-off task, then rerun the migrate task.

## Secrets

| Name | Where it lives | In the browser |
| --- | --- | --- |
| `DATABASE_URL` | `estateflow/<env>/database` | No |
| `LOCAL_AUTH_SECRET` | `estateflow/<env>/local-auth` (non-production local auth only) | No |
| `AI_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, `RECONSTRUCTION_API_KEY`, `RECONSTRUCTION_WEBHOOK_SECRET` | `estateflow/<env>/app` | No |
| Cognito pool id and client id | Task environment | The client id may be public |
| AWS access keys | Never created. Tasks use IAM roles, and the API refuses to start if they are set outside local | No |

Only `NEXT_PUBLIC_*` values reach the web bundle: the auth mode and app env. CI builds the production bundle and runs `node scripts/check-secrets.mjs bundle --production`, which fails on credential patterns, server secret names, or the demo password.

## Staging smoke test

1. `GET https://api.staging.REPLACE_DOMAIN/health` returns `ok: true, env: "staging"`.
2. `GET /health/ready` returns 200 with `database: up, migrations: current`.
3. `https://staging.REPLACE_DOMAIN` serves a valid certificate, and `http://` redirects to it.
4. Sign in with a staging user. A second agency's lead id returns 404.
5. Sending `x-agency-id` for another agency doesn't change the scope.
6. Settings → Integrations → Server setup shows each integration's real state.
7. Tours:
   - A non-video upload is rejected.
   - A real MP4 upload reaches `video_uploaded`, or `queued` with a provider.
   - A direct object URL to the bucket returns 403.
8. Stop one API task. The ALB keeps serving, and ECS replaces the task.
9. CloudWatch: request lines carry `requestId`, and no line contains a password, token, phone number, or share token.

## Production go-live checklist

- [ ] Staging smoke test recorded.
- [ ] Cognito adapter implemented and tested, and `auth_provider = "cognito"`. The API refuses to boot in production otherwise.
- [ ] The runtime database user is the non-owner `estateflow_app` role, and a cross-tenant query returns no rows (see `isolation.md`).
- [ ] Backups retained, a restore rehearsed, deletion protection on.
- [ ] The alarm email subscription is confirmed.
- [ ] Secrets rotated after any shared staging use.
- [ ] A pre-deploy snapshot is taken, and the previous task definition revision is written down.
- [ ] The web image is built with `NEXT_PUBLIC_APP_ENV=production`, and the bundle scan is clean.
- [ ] The owner has approved `terraform apply` for production.
