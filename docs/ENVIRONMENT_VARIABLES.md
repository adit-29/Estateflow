# Environment variables

Placeholders live in `.env.example`. **API secrets stay in `apps/api/.env` (or the host secret store). Web public values stay in `apps/web/.env.local`.**

The API reads `APP_ENV` (`local` | `staging` | `production`). If it is unset and `NODE_ENV=production`, the process is treated as production and will refuse unsafe settings.

## Web (public, baked at build time)

| Name | Required | Where to get it |
| --- | --- | --- |
| `API_URL` | Yes for Docker/prod web image | Internal URL the Next server uses to rewrite `/backend` |
| `NEXT_PUBLIC_API_URL` | Local helpful | Same as API origin for SSR; browsers still use `/backend` |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public web origin, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_ENV` | Yes | `local` / `staging` / `production`. `production` strips demo UI |
| `NEXT_PUBLIC_AUTH_MODE` | No | Unused by current code |
| `NEXT_PUBLIC_HERO_POSTER_URL` | No | Optional homepage poster |
| `NEXT_PUBLIC_HERO_VIDEO_URL` | No | Optional homepage video; leave empty rather than inventing one |

Never put `DATABASE_URL`, `LOCAL_AUTH_SECRET`, `AI_API_KEY`, `HF_TOKEN`, WhatsApp tokens, or AWS keys in `NEXT_PUBLIC_*`.

## API — always

| Name | Required | Notes |
| --- | --- | --- |
| `APP_ENV` | Staging/prod | `local` lets the API start without AWS |
| `DATABASE_URL` | Yes outside local health-only | Postgres URL. Production must include `sslmode=require` |
| `TEST_DATABASE_URL` | For DB tests | Separate database; never a production URL |
| `API_PORT` | No | Default `4000` |
| `CORS_ORIGIN` | Yes outside local | Web origin. Comma-separated list allowed. Not localhost outside local |
| `APP_VERSION` | No | Logged on boot |

## Auth

| Name | Required | Notes |
| --- | --- | --- |
| `AUTH_PROVIDER` | Production: `cognito` | `local` for local/staging. Production refuses `local` |
| `LOCAL_AUTH_SECRET` | Local auth outside `APP_ENV=local` | ≥32 characters, not the example value |
| `LOCAL_AUTH_TOKEN_TTL_SECONDS` | No | Default `86400` |
| `COGNITO_USER_POOL_ID` | When Cognito is implemented | Adapter currently throws `NotImplementedException` |
| `COGNITO_CLIENT_ID` | When Cognito is implemented | |
| `COGNITO_REGION` | When Cognito is implemented | |

Platform administrator is **not** an env var. It is `Account.platformAdmin` in Postgres.

## Rate limits

| Name | Default |
| --- | --- |
| `AUTH_RATE_LIMIT_TTL_MS` | 60000 |
| `AUTH_RATE_LIMIT_MAX` | 20 |
| `AI_CHAT_RATE_LIMIT_PER_MIN` | 10 |
| `AI_DAILY_REQUEST_LIMIT` | 300 per agency per India calendar day |

## Copilot LLM (server only)

| Name | Notes |
| --- | --- |
| `AI_PROVIDER` | `mock` (default) \| `ollama` \| `openai-compatible` \| `huggingface` \| `hf` |
| `AI_BASE_URL` | Ollama default `http://localhost:11434`; HF default `https://router.huggingface.co/v1` |
| `AI_API_KEY` | OpenAI-compatible providers |
| `HF_TOKEN` | Hugging Face |
| `AI_MODEL` | Model id |
| `AI_REQUEST_TIMEOUT_MS` | Default 30000 |
| `AI_MAX_OUTPUT_TOKENS` | Default 1200 |

Demo Copilot ignores these. Live Copilot shows “not configured” when they are empty.

## Messaging / WhatsApp

All four of `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET` are required before the inbox can leave “Not connected”. See `docs/whatsapp.md`. Optional: `FACEBOOK_PAGE_ID`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `MESSAGING_PROVIDER`, `WHATSAPP_GRAPH_API_VERSION`.

## Storage and reconstruction

| Name | Notes |
| --- | --- |
| `S3_BUCKET`, `S3_REGION` | Private tour uploads. Task role signs URLs |
| `AWS_REGION` | Fallback region |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Forbidden outside local |
| `RECONSTRUCTION_*` | Vendor adapter is not implemented; see `docs/reconstruction-provider.md` |
| `NOTIFICATION_SINK` | `local` is dev-only and blocked outside local |
| `NOTIFICATION_QUEUE_URL` / `SQS_QUEUE_URL` | No worker yet |
| `SEED_DEMO_DATA` | Must not be `true` in production |
