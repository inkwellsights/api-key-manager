# API Key Manager

A full-stack API key management dashboard built with Next.js 16, Supabase, and Tailwind CSS. Generate, manage, and validate API keys with encrypted storage, per-application scoping, and automatic usage tracking.

---

## Features

- **Secure key generation** -- cryptographically random keys (crypto.randomBytes) generated server-side
- **Encrypted at rest** -- keys stored AES-256-GCM encrypted; decryptable on demand via the Reveal action
- **Application scoping** -- keys are associated with named applications for organisational clarity
- **Enable / disable keys** -- toggle key status without deletion; disabled keys return 401
- **Created + last-used tracking** -- `created_at` and `last_used_at` timestamps on every key
- **Usage logs** -- per-request log entries with endpoint, method, status, and timestamp
- **Full dashboard** -- Dashboard, API Keys, Usage Logs, Applications, Settings, and Documentation pages
- **Regenerate / revoke** -- one-click regenerate (new key value, same record) or permanent revoke
- **Protected endpoint** -- `GET /api/data` enforces Bearer token validation before returning data
- **PWA** -- installable on desktop and mobile; fully responsive layout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + REST) |
| Encryption | Node.js `crypto` (AES-256-GCM) |
| Runtime | Node.js 20+ |
| Deploy target | Vercel |

---

## Prerequisites

- **Node.js 20 or later**
- **A Supabase project** (free tier is fine). Create one at [supabase.com](https://supabase.com).

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd puzzle_148
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value. See `.env.example` for inline explanations.

**Where to find your Supabase keys:**
Supabase dashboard > your project > Project Settings > API

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | `anon` / `public` key |
| `SUPABASE_SECRET_KEY` | `service_role` key |

**Generate the encryption key:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as `API_KEY_ENC_SECRET`.

**`DATABASE_URL` (local migrations only):**
This is needed only to run the SQL migrations from your machine. The deployed app on Vercel does NOT use it.

Supabase's direct host (`db.<ref>.supabase.co`) is IPv6-only. If your network is IPv4-only, use the Session Pooler connection string from Supabase dashboard > Project Settings > Database > Connection string (Session mode).

### 3. Run migrations

Run the three migration files in order. You can do this in two ways:

**Option A: included runner (requires `DATABASE_URL` in `.env.local`)**

```bash
node supabase/run-sql.mjs supabase/migrations/0001_init.sql
node supabase/run-sql.mjs supabase/migrations/0002_rls.sql
node supabase/run-sql.mjs supabase/migrations/0003_usage_fn.sql
```

**Option B: Supabase SQL Editor**

Open each file in `supabase/migrations/` and paste its contents into the SQL Editor in your Supabase dashboard, running them in order (`0001`, `0002`, `0003`).

Row-level security (RLS) is configured in `0002_rls.sql`. All table access is server-only (via the secret key).

### 4. Seed sample data

```bash
npm run seed
```

Populates sample applications, API keys, and usage logs so the dashboard is not empty on first load.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Using the Protected Endpoint

`GET /api/data` is the demo-protected route. Include a valid, active API key as a Bearer token.

**Valid key (200):**

```bash
curl http://localhost:3000/api/data \
  -H "Authorization: Bearer <your-api-key>"
```

Response:

```json
{"success":true,"data":{"message":"Here is your data"}}
```

**Missing, invalid, disabled, or revoked key (401):**

```bash
curl http://localhost:3000/api/data
```

Response:

```json
{"success":false,"error":"Unauthorized"}
```

Usage metadata (`last_used_at`, `request_count`, usage log entry) is updated automatically after the response is sent, using Next.js `after()` so it does not add latency to the request.

---

## Deploying to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. In Vercel project settings > Environment Variables, add these four variables:

   | Variable | Required at runtime |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes |
   | `SUPABASE_PUBLISHABLE_KEY` | Yes |
   | `SUPABASE_SECRET_KEY` | Yes |
   | `API_KEY_ENC_SECRET` | Yes |

   `DATABASE_URL` is NOT required on Vercel. The app communicates with Supabase via the JS client and REST API using the secret key, so the direct Postgres connection (and the IPv6 / pooler caveat) does not apply in production.

4. Deploy. Vercel will run `npm run build` automatically.

---

## Security Notes

- API key values are stored AES-256-GCM encrypted in the database. The encryption key lives only in the `API_KEY_ENC_SECRET` environment variable, never in the database.
- A SHA-256 hash of each key is stored separately for fast lookup without decryption.
- Row-level security is enabled on all tables. The dashboard uses the `service_role` (secret) key, so all access is server-side only.
- **The dashboard has no authentication layer.** This is intentional for the demo. Before exposing this app publicly, add an auth layer (Supabase Auth, Clerk, NextAuth, or similar) to protect the dashboard routes.

---

## Project Structure

```
src/
  app/                  Next.js App Router pages and API routes
    api/data/           Protected endpoint
    keys/               API Keys page
    logs/               Usage Logs page
    applications/       Applications page
    settings/           Settings page
    docs/               Documentation page
  components/           Shared UI components
  lib/                  Shared utilities (Supabase client setup)
  server/               Server-only modules (crypto, data access, server actions)
supabase/
  migrations/           SQL migration files (run in order: 0001, 0002, 0003)
  run-sql.mjs           Migration runner script
  seed.mjs              Seed script
public/                 Static assets and PWA manifest
```

---

## Architecture Notes

The endpoint follows a validate-before-business-logic pattern: `extractBearer` pulls the token from the `Authorization` header, `validateApiKey` checks the SHA-256 hash against the database and verifies the key is active, and only then is the protected data returned. Usage recording (`recordUsage`) runs after the response via `after()`, keeping it off the critical path.
