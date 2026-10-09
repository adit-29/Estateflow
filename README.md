# EstateFlow

Multi-role real estate platform with a **polished local demo mode** (no AWS required).

## Demo quickstart (web only)

```bash
cd /path/to/estateflow
npm install
npm run dev:web
```

Open **http://localhost:3000** → **Get started** → pick a role → **Explore as demo user** (one click) or use:

| Role | Email | Password |
|------|-------|----------|
| Dealer | `dealer@estateflow.demo` | `Demo123!` (Raj Mehta, EstateFlow Demo Realty) |
| Buyer | `buyer@estateflow.demo` | `Demo123!` |
| Builder | `builder@estateflow.demo` | `Demo123!` |
| Seller | `seller@estateflow.demo` | `Demo123!` |

Demo sessions persist in `localStorage` until you sign out. Use **Settings → Reset demo data** to clear seeded demo records.

## Full stack (optional API + Postgres)

See sections below for NestJS + Prisma when you want the database-backed dealer CRM.

## Stack

| Layer | Technology |
|--------|------------|
| Web | Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI, Lucide |
| API | NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Contracts | `@estateflow/shared` (Zod schemas + types) |
| Auth | Provider interface; **local demo** by default; Amazon Cognito stub for production |

## Prerequisites

- Node.js 20+
- npm 9+ (npm 10+ is fine)
- Docker or Podman (optional, for PostgreSQL)

## Local setup

1. **Clone and install**

```bash
cd /path/to/estateflow
npm install
```

2. **Environment**

```bash
cp .env.example apps/api/.env
```

For Next.js, create `apps/web/.env.local` with **only** public values (do not copy `DATABASE_URL` or provider tokens into the web app):

```bash
cat > apps/web/.env.local <<'EOF'
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=local
EOF
```

3. **PostgreSQL**

```bash
docker compose up -d postgres
```

4. **Database migrate & generate**

```bash
npm run db:generate
cd apps/api && npx prisma migrate deploy && cd ../..
```

For active development with migration history:

```bash
npm run db:migrate
```

5. **Seed demo data (development only)**

```bash
npm run db:seed
```

Demo dealer: `demo.dealer@estateflow.local` / `DemoPass123!` (labelled demo data in seed output).

6. **Run**

Terminal A:

```bash
npm run dev:api
```

Terminal B:

```bash
npm run dev:web
```

- Web: http://localhost:3000  
- API: http://localhost:4000/health  

## Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Next.js dev server |
| `npm run dev:api` | NestJS watch mode |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | TypeScript check all packages |
| `npm run lint` | Lint all packages |
| `npm run test` | Unit tests (shared + API) |

## Auth modes

- **Explore demo** on the sign-in page opens Raj Mehta’s fictional workspace in this browser. Those records stay in `localStorage` and are not written to PostgreSQL.
- **Sign in to your agency** calls `POST /auth/signin`. The API sets an httpOnly cookie named `ef_session`. The browser calls the API through the Next.js `/backend` rewrite so the cookie stays on the web origin. Passwords are not stored in the browser. Do not put the session token in `localStorage`.
- Local development uses `SameSite=Lax` and `Secure` only when `NODE_ENV=production`. Production should be served over HTTPS behind the load balancer.
- `AUTH_PROVIDER=local` (default): local password hashes in Postgres. A development verification code is returned only when `NODE_ENV` is not production.
- `AUTH_PROVIDER=cognito`: the API reports the provider as not configured until the Cognito adapter is implemented. The UI shows “Authentication provider not configured” and does not fall back to the demo workspace.

Passwords are hashed only in the local credential table for dev; the app stores Cognito/local **subject id** and profile metadata on `Account` — never plaintext passwords in dealer profiles.

Demo dealer (Postgres seed, used by `POST /auth/signin` in local API mode): `demo.dealer@estateflow.local` / `DemoPass123!`. That is a different account from the browser demo table above.

## Dealer journey

1. Landing → **Get started** → role selection (dealer, buyer, builder, owner)
2. Sign up → verify contact → multi-step onboarding → workspace
3. Overview dashboard, **Leads** CRM (create, filter, detail, archive)
4. **Inventory** (my / network / builder placeholder), **Buyers**, **Matching** (rule-based scores + breakdown)
5. **Site visits**, **Deals** pipeline (kanban/table), **Commissions** (demo legal disclaimer)
6. **Network** directory, invites, sharing API, Dealer Passport metrics, report queue

After pulling schema changes:

```bash
cd apps/api && npx prisma migrate deploy && npm run db:seed
```

Onboarding statuses: `not_started`, `pending`, `verified`, `rejected`. Completing the form sets **pending**, not verified.

## Project layout

```
apps/web          Next.js UI (public + dealer app shell)
apps/api          NestJS REST API
packages/shared   Shared Zod schemas and enums
```

## Production notes

- Set strong `LOCAL_AUTH_SECRET` only for non-production local use; use Cognito in production.
- Never commit `.env` files.
- Run `prisma migrate deploy` in CI/CD against managed PostgreSQL.
- AWS deployment assets are in `infra/terraform` and `docs/aws`. Do not apply them or create cloud resources without explicit approval. Start with `docs/aws/gap-report.md`.
