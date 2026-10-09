# Local setup

Required software:

- Node.js 20 or newer (CI and Docker use 22)
- npm 9+ (npm 10 is fine)
- PostgreSQL 16, or Docker / Podman to run `postgres:16-alpine`

Clone or open this repository, then install workspaces from the root:

```bash
cd /path/to/estateflow
npm install
```

## Environment files

Copy placeholders only. Never put real passwords, API keys, or `.env` files in git.

```bash
cp .env.example apps/api/.env
```

Create `apps/web/.env.local` with **public values only**:

```bash
cat > apps/web/.env.local <<'EOF'
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=local
EOF
```

Do not copy `DATABASE_URL`, `LOCAL_AUTH_SECRET`, `AI_API_KEY`, `HF_TOKEN`, WhatsApp tokens, or AWS keys into the web env file. The browser calls same-origin `/backend`, which Next rewrites to `API_URL`.

Every variable is documented in `docs/ENVIRONMENT_VARIABLES.md` and listed in `.env.example`.

## Database

Start Postgres (Docker or Podman):

```bash
docker compose up -d postgres
```

If you use rootless Podman and `docker compose` cannot talk to the engine:

```bash
systemctl --user start podman.socket
```

Connection string used by the example env:

`postgresql://postgres:postgres@localhost:5432/estateflow?schema=public`

Generate the Prisma client, apply migrations, then (local only) seed labelled demo rows:

```bash
npm run db:generate
cd apps/api && npx prisma migrate deploy && cd ../..
npm run db:seed
```

`db:seed` refuses to run unless `APP_ENV` is `local`. Demo dealer in Postgres:

- Email: `demo.dealer@estateflow.local`
- Password: `DemoPass123!`

That account is **not** the browser demo table (`dealer@estateflow.demo` / `Demo123!`), which lives in `localStorage` only.

To grant platform report review on a local account (not done by seed):

```sql
UPDATE "Account" SET "platformAdmin" = true WHERE email = 'demo.dealer@estateflow.local';
```

## Run locally

Terminal A: `npm run dev:api`  
Terminal B: `npm run dev:web`

- Web: http://localhost:3000
- API liveness: http://localhost:4000/health (does not need the database)
- API readiness: http://localhost:4000/health/ready (needs Postgres and applied migrations)

Sign in as a **dealer** or **builder** with a Postgres account to use live CRM. Buyer, seller, and tenant marketing sign-in still open a labelled browser demo when `NEXT_PUBLIC_APP_ENV` is not `production`.

## Test the API and database

```bash
curl -sS http://localhost:4000/health
curl -sS http://localhost:4000/health/ready
```

Ready must report `database: up` and current migrations. If it returns 503, check `DATABASE_URL` and `npx prisma migrate deploy` in `apps/api`.

## Browser demo vs live

| Mode | How | Storage |
| --- | --- | --- |
| Explore demo | Sign-in page → Open demo | `ef_demo_store_v2`, `ef_demo_session` |
| Live dealer/builder | Email/password against the API | Postgres + `ef_session` cookie |

Do not mix them. A live dashboard that cannot reach the API must show an error, not demo rows.

## Password reset (local auth)

1. http://localhost:3000/auth/forgot-password
2. When `APP_ENV=local`, the API returns `resetCode` in the JSON (no email is sent)
3. http://localhost:3000/auth/reset-password

Cognito reset is not implemented.

## Production builds (on this machine)

```bash
npm run build --workspace=@estateflow/shared
npm run build --workspace=@estateflow/api
npm run build --workspace=@estateflow/web
```

A production-flagged web build compiles demo credentials and sample listings out:

```bash
NEXT_PUBLIC_APP_ENV=production API_URL=http://localhost:4000 npm run build --workspace=@estateflow/web
```
