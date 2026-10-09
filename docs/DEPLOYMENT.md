# Deployment

**Nothing in this repository has been deployed.** Do not run `terraform apply`, create ECR repositories, or push images until you explicitly approve that spend.

The intended production shape (from `infra/terraform`) is:

- Next.js web and NestJS API as ECS Fargate tasks behind an HTTPS ALB
- Private RDS PostgreSQL 16 (`sslmode=require`)
- Private S3 for tour media
- Secrets Manager for database URL and provider keys
- One-off migrate task (`prisma migrate deploy`); the API never migrates on boot
- Optional SQS (off by default; no worker exists)

Full step-by-step AWS commands, rollback, and smoke tests: `docs/aws/deployment.md`. Operations (backups, alarms): `docs/aws/operations.md`.

## Simplest reliable path

| Need | Local / cheap staging | Production (after Cognito exists) |
| --- | --- | --- |
| Frontend | `npm run dev:web` or the web Docker image | Fargate `web` + ACM certificate |
| API | `npm run dev:api` or the api Docker image | Fargate `api`, `CORS_ORIGIN=https://<domain>` |
| Database | Docker Compose Postgres 16 | Private RDS Multi-AZ |
| Media | Unset `S3_BUCKET` (uploads stay in setup state) | Private S3, task role only |
| Auth | `AUTH_PROVIDER=local` + strong `LOCAL_AUTH_SECRET` | **Blocked:** Cognito adapter is a stub. Production boot requires Cognito. |
| Email/SMS | Not shipped. Local reset codes appear in API JSON when `APP_ENV=local` | Choose a provider later; do not claim mail works |
| LLM | `AI_PROVIDER=mock` or local Ollama / Hugging Face router | Server-only `AI_*` / `HF_TOKEN` in Secrets Manager |
| Jobs | None | Keep `enable_job_queue=false` until a worker exists |

Staging can use local password auth with a 32+ character `LOCAL_AUTH_SECRET`. Production cannot.

## Domains, DNS, HTTPS, CORS

1. Issue an ACM certificate covering the web and API hostnames.
2. Point DNS at the ALB.
3. Set `CORS_ORIGIN` to the **web** origin (`https://app.example.com`), not `*`, not localhost.
4. Cookie mutations are rejected unless `Origin` (or `Referer`) matches `CORS_ORIGIN`.
5. Web image **must** be built with `API_URL=https://api.example.com` (or the internal rewrite target). Next bakes `/backend` rewrites at build time.
6. Also set `NEXT_PUBLIC_APP_URL` to the public web origin.

## Authentication callbacks

Local JWT uses cookie `ef_session` (httpOnly, SameSite=Lax, Secure outside `APP_ENV=local`). There is no OAuth callback URL until Cognito is implemented.

When Cognito is written, you will need:

- Hosted UI / app client callback: `https://<web>/auth/callback` (path does not exist yet)
- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`
- `AUTH_PROVIDER=cognito`

Until then, production `assertSafeRuntime()` refuses to start.

## LLM / Hugging Face

Server only. Demo Copilot never reads these values.

```bash
# Local Ollama
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434
AI_MODEL=qwen3:8b

# Hugging Face router
AI_PROVIDER=huggingface
HF_TOKEN=hf_replace_me
AI_MODEL=Qwen/Qwen2.5-7B-Instruct
```

Settings → AI runs a live test before Copilot is labelled live. Missing credentials show a configuration message; CRM tools still run without an LLM.

## Secrets in the host

- Put secrets in Secrets Manager / the platform secret store, not in `NEXT_PUBLIC_*`.
- Do not set `AWS_ACCESS_KEY_ID` on ECS tasks; the API refuses to start if they are present outside local.
- Rotate anything that was ever pasted into a ticket or chat.

## Post-deploy smoke

1. `GET https://api.<domain>/health` → `ok: true`
2. `GET https://api.<domain>/health/ready` → 200, migrations current
3. HTTPS on the web origin; HTTP redirects
4. Dealer sign-in (staging local auth only)
5. A second agency’s lead id returns 404
6. Settings → Integrations matches reality (Cognito still `not_implemented`)

## Rollback and backups

- Roll API/web to the previous ECS task definition revision.
- Prisma has no down migrations. Restore an RDS snapshot for a bad schema change, or ship a new forward migration.
- Automated RDS backups: see `docs/aws/operations.md`. Rehearse restore in a non-production account.

## Estimated recurring cost (not a quote)

Prices change. Verify on the AWS calculator before you approve spend. Assumptions: one staging environment, `ap-south-1`, light traffic, one NAT gateway, RDS `db.t4g.micro` or small, two Fargate tasks (0.25 vCPU / 512 MB each), 20 GB RDS storage, 50 GB S3.

Order-of-magnitude **monthly** (USD, 2026 public list, excluding data transfer spikes and Cognito MAU):

| Item | Rough range |
| --- | --- |
| NAT gateway | $32+ plus data processing |
| RDS PostgreSQL small + storage | $15–40 |
| Fargate api + web (always on) | $15–30 |
| ALB | $20+ |
| S3 + Secrets Manager + CloudWatch | $5–15 |
| **Staging total** | **about $90–150 / month** |

Production Multi-AZ RDS and extra tasks roughly double compute/database. **Do not treat this as a bill.** Confirm current prices. This project has **not** been applied, so there is no live invoice.

Cheaper alternative for a private staging box: one VM (or local machines) running Compose Postgres + the two Node processes, TLS via Caddy/nginx, no NAT gateway. Still not production: no Cognito, no Multi-AZ, you own backups.
