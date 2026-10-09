# Deployment gap report

Updated: 2026-09-27. **No AWS resources have been created, and `terraform apply` has never been run.**

## Status by category

### Code-complete and verified locally

- Environment separation: `APP_ENV` is `local`, `staging`, or `production`. The API refuses to start on unsafe settings: static AWS keys, localhost CORS, weak local-auth secret, non-TLS database URL, non-Cognito auth in production, or demo seeding in production.
- The demo workspace, the demo password, and sample listings are compiled out of a `NEXT_PUBLIC_APP_ENV=production` web build. `db:seed` refuses outside local.
- Health checks:
  - `GET /health` is liveness.
  - `GET /health/ready` checks the database and the `_prisma_migrations` state against the migrations shipped in the image.
  - `GET /api/health` on the web app.
  - `GET /system/setup` (signed in) reports each integration's setup state without values.
- Structured JSON logs with `requestId` on every line, and redaction of share-token paths.
- An `ErrorReporter` hook for 5xx and unhandled rejections. It defaults to a structured log line that a CloudWatch metric filter alarms on.
- Private tour uploads:
  - Presigned S3 PUT (15 minutes) and GET (10 minutes), signed by the task role.
  - Server-side validation and consent.
  - `HeadObject` verification of what was actually stored.
  - A job state machine, a signed provider callback route, attach-to-property, and hashed, expiring, revocable share links.
  - 12 database tests plus unit tests. See `docs/reconstruction-provider.md`.
- Terraform: private RDS with forced TLS, a private S3 bucket, Secrets Manager, least-privilege roles, ALB with HTTPS and redirect, circuit-breaker deploys, a one-off migrate task, alarms and dashboard, and an optional SQS queue. `terraform validate` passes with no credentials.
- CI:
  - Install and a repo secret scan.
  - Migrate and a drift check against Postgres 16.
  - Lint, typecheck, tests, and build.
  - A production web build with a bundle secret scan.
  - `terraform fmt` and `validate`, and Docker image builds without pushing.

### Needs credentials, but no new infrastructure

| Integration | What to supply | Until then |
| --- | --- | --- |
| Live LLM | `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Copilot shows "not configured" |
| WhatsApp Cloud API | Meta app, phone number id, access token, verify token, app secret | Inbox shows "Not connected" |
| Reconstruction vendor | Vendor choice, then an adapter, then key and webhook secret | Videos are stored and not processed |

### Needs an AWS account and approval to spend

- The state bucket and lock table, ECR repositories, and everything in `infra/terraform`.
- The ACM certificate and DNS.
- S3 storage for real tour uploads. Local, demo, and tests use fakes. **A real S3 upload has not been exercised end to end.**
- Confirming the SNS alarm subscription.

### Not built

- **Cognito adapter.** The provider class refuses sign-in. Production is designed to refuse to start without Cognito, so **production cannot run until this is implemented.** Staging can use Terraform-generated local auth.
- **Background worker.** Nothing consumes SQS, so `enable_job_queue` defaults to false. Notifications are delivered in-request.
- **Reconstruction vendor adapter.** See `docs/reconstruction-provider.md`.
- **Retention.** Deletion of tour videos after `RECONSTRUCTION_RETENTION_DAYS` is not enforced. The timestamp is stored.
- **Malware scanning** of uploads.
- **Row-level security at runtime.** Not all Prisma queries run inside `withTenant`, so the runtime database user is still the owner. Application `agencyId` filters are the enforced boundary. Do not switch to `estateflow_app` yet (see `isolation.md`).
- **CSRF.** The session cookie is `httpOnly`, `Secure` outside local, and `SameSite=Lax`. There is no separate CSRF token or Origin check. Lax blocks cross-site POSTs, but sibling subdomains count as same-site.
- **External error tracker** (Sentry or similar). The hook exists (`setErrorReporter`), but no vendor is wired.
- **Dependency scanning** beyond `npm audit`.

## Deployed

Nothing.
