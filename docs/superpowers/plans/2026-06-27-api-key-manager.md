# API Key Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-auth web dashboard (PWA, responsive) to generate, store, enable/disable, regenerate, and revoke secure API keys tied to applications, plus a protected `/api/data` endpoint that returns data only for valid, enabled keys.

**Architecture:** Next.js App Router app. All Supabase access is server-side via the secret key through server actions and route handlers — the browser never touches the DB. API keys are generated with Node `crypto`, stored AES-256-GCM encrypted (revealable) plus a SHA-256 lookup hash (O(1) validation). The protected endpoint validates the key, returns immediately, then updates usage metadata fire-and-forget.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, `@supabase/supabase-js`, Node `crypto`, Vitest (unit tests), Serwist/manual PWA, deployed to Vercel.

## Global Constraints

- Next.js App Router (not Pages Router); TypeScript everywhere.
- Supabase accessed **server-side only** via `SUPABASE_SECRET_KEY`. Never import the secret key or `supabase-js` admin client into a Client Component.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `API_KEY_ENC_SECRET`.
- Project URL: `https://your-project-ref.supabase.co`.
- No em dashes in any user-facing copy.
- `.env.local` is gitignored and never committed. `supabase stuff.txt` must never be committed.
- API key format: `sk_{live|test}_` + 40 base62 chars.
- Dashboard has **no authentication** (puzzle requirement); structured so auth can be added later.
- Protected endpoint: invalid/disabled/revoked key → HTTP 401 `{ "success": false, "error": "Unauthorized" }`. Valid → `{ "success": true, "data": { "message": "Here is your data" } }`.
- Usage metadata updates must never block or alter the endpoint response (fire-and-forget).

## File Structure

```
puzzle_148/
  .env.local                         # secrets (gitignored)
  .gitignore
  next.config.ts
  package.json
  tailwind.config.ts
  postcss.config.mjs
  vitest.config.ts
  public/
    manifest.json                    # PWA manifest
    icons/                           # PWA icons (192, 512, maskable)
  supabase/
    migrations/0001_init.sql         # schema
    seed.mjs                         # seed script (Node, uses crypto + supabase)
  src/
    lib/
      crypto.ts                      # key gen, AES encrypt/decrypt, hash, mask  [TDD]
      crypto.test.ts
      supabase-admin.ts              # server-only supabase client (secret key)
      env.ts                         # typed env access
      types.ts                       # shared TS types (ApiKey, Application, UsageLog, etc.)
    server/
      keys.ts                        # server actions: create/regenerate/revoke/toggle/reveal/list
      applications.ts                # server actions: create/list/delete apps
      logs.ts                        # query usage logs + stats
      validate.ts                    # validateApiKey() used by endpoint  [TDD]
      validate.test.ts
    app/
      layout.tsx                     # root layout, theme, PWA registration
      globals.css                    # Tailwind + design tokens
      page.tsx                       # Dashboard
      keys/page.tsx                  # API Keys
      logs/page.tsx                  # Usage Logs
      applications/page.tsx          # Applications
      settings/page.tsx              # Settings
      docs/page.tsx                  # Documentation
      api/data/route.ts              # protected endpoint
      sw-register.tsx                # client component: registers service worker
    components/
      layout/Sidebar.tsx             # responsive nav (desktop rail + mobile drawer)
      layout/TopBar.tsx              # page title + New API Key button
      dashboard/StatCards.tsx
      dashboard/UsageMiniChart.tsx   # sparkline + quota
      dashboard/KeysTable.tsx        # table, search, status filter, pagination
      dashboard/KeyDetailsPanel.tsx  # reveal/regenerate/revoke + docs panel
      dashboard/RecentUsage.tsx
      keys/NewKeyModal.tsx           # create key, show full key once
      keys/RevealKeyDialog.tsx       # shows decrypted key + copy
      ui/StatusBadge.tsx
      ui/CopyButton.tsx
      ui/Modal.tsx
```

---

### Task 1: Project scaffold, Tailwind, env, base theme

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (placeholder), `.gitignore`, `.env.local`, `src/lib/env.ts`

**Interfaces:**
- Produces: running Next.js dev server; `env` object exporting `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `API_KEY_ENC_SECRET`.

- [ ] **Step 1: Scaffold the app**

Run (non-interactive):
```bash
cd "E:/msaai/Puzzles/puzzle_148"
npx create-next-app@latest . --ts --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack --yes
```
Expected: Next.js project files created in place.

- [ ] **Step 2: Write `.env.local`** (gitignored — confirm it is in `.gitignore`)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-publishable-key>
SUPABASE_SECRET_KEY=sb_secret_<your-secret-key>
API_KEY_ENC_SECRET=<generate: openssl rand -hex 32>
```
Generate the enc secret: `openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), paste as `API_KEY_ENC_SECRET`.

- [ ] **Step 3: Write `src/lib/env.ts`**

```ts
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_SECRET_KEY: required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  SUPABASE_PUBLISHABLE_KEY: required("SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY),
  API_KEY_ENC_SECRET: required("API_KEY_ENC_SECRET", process.env.API_KEY_ENC_SECRET),
};
```

- [ ] **Step 4: Set dark theme tokens in `globals.css`**

Add CSS variables matching the mockup (near-black background `#0a0a0f`, panel `#13131a`, border `#23232e`, accent violet `#7c5cff`, green `#22c55e`, amber `#f59e0b`, red `#ef4444`, muted text `#8b8b9e`). Set `body { background: var(--bg); color: var(--text); }`.

- [ ] **Step 5: Verify dev server runs**

Run: `npm run dev`
Expected: app serves at `http://localhost:3000` with dark background, no errors.

- [ ] **Step 6: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Next.js + Tailwind + env"
```
(Confirm `.env.local`, `node_modules`, `supabase stuff.txt` are gitignored before committing.)

---

### Task 2: Crypto module (TDD)

**Files:**
- Create: `src/lib/crypto.ts`, `src/lib/crypto.test.ts`, `vitest.config.ts`

**Interfaces:**
- Produces:
  - `generateApiKey(env: "live" | "test"): string` → `sk_live_<40 base62>`
  - `hashKey(key: string): string` → 64-char hex SHA-256
  - `encryptKey(key: string): { ciphertext: string; iv: string; authTag: string }` (all hex)
  - `decryptKey(parts: { ciphertext: string; iv: string; authTag: string }): string`
  - `maskKey(prefix: string, lastFour: string): string` → `sk_live_51H8...e2c1`
  - `keyPrefix(key: string): string` → first 12 chars; `lastFour(key: string): string` → last 4 chars

- [ ] **Step 1: Install Vitest + config**

```bash
npm i -D vitest
```
Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Write failing tests `src/lib/crypto.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { generateApiKey, hashKey, encryptKey, decryptKey, maskKey, keyPrefix, lastFour } from "./crypto";

describe("crypto", () => {
  it("generates a live key with correct format", () => {
    const k = generateApiKey("live");
    expect(k).toMatch(/^sk_live_[0-9A-Za-z]{40}$/);
  });
  it("generates unique keys", () => {
    expect(generateApiKey("test")).not.toBe(generateApiKey("test"));
  });
  it("hashes deterministically to 64 hex chars", () => {
    const k = generateApiKey("live");
    expect(hashKey(k)).toBe(hashKey(k));
    expect(hashKey(k)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("encrypts and decrypts round-trip", () => {
    const k = generateApiKey("live");
    const enc = encryptKey(k);
    expect(enc.ciphertext).not.toContain(k);
    expect(decryptKey(enc)).toBe(k);
  });
  it("fails to decrypt tampered ciphertext", () => {
    const enc = encryptKey(generateApiKey("live"));
    const bad = { ...enc, authTag: "0".repeat(enc.authTag.length) };
    expect(() => decryptKey(bad)).toThrow();
  });
  it("masks key for display", () => {
    expect(maskKey("sk_live_51H8", "e2c1")).toBe("sk_live_51H8...e2c1");
  });
  it("extracts prefix and last four", () => {
    const k = "sk_live_51H8abcdEFGH";
    expect(keyPrefix(k)).toBe("sk_live_51H8");
    expect(lastFour(k)).toBe("EFGH");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module `./crypto` not found / exports missing.

- [ ] **Step 4: Implement `src/lib/crypto.ts`**

```ts
import { randomBytes, createHash, createCipheriv, createDecipheriv } from "crypto";
import { env } from "./env";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function base62(bytes: Buffer): string {
  let out = "";
  for (const b of bytes) out += BASE62[b % 62];
  return out;
}

export function generateApiKey(environment: "live" | "test"): string {
  return `sk_${environment}_${base62(randomBytes(40))}`;
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// 32-byte AES key derived from the env secret (secret may be any string).
function encKey(): Buffer {
  return createHash("sha256").update(env.API_KEY_ENC_SECRET).digest();
}

export function encryptKey(key: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("hex"), iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex") };
}

export function decryptKey(parts: { ciphertext: string; iv: string; authTag: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(parts.iv, "hex"));
  decipher.setAuthTag(Buffer.from(parts.authTag, "hex"));
  const out = Buffer.concat([decipher.update(Buffer.from(parts.ciphertext, "hex")), decipher.final()]);
  return out.toString("utf8");
}

export function keyPrefix(key: string): string {
  return key.slice(0, 12);
}

export function lastFour(key: string): string {
  return key.slice(-4);
}

export function maskKey(prefix: string, last4: string): string {
  return `${prefix}...${last4}`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (7 tests). Note: tests need `API_KEY_ENC_SECRET` — Vitest loads `.env.local`? No — add `import "dotenv/config"` is not wired; instead set a test default. Simplest: `npm i -D dotenv` and add `setupFiles: ["dotenv/config"]` to `vitest.config.ts` with `.env.local` via `DOTENV_CONFIG_PATH=.env.local`. Or hardcode a fallback in `encKey()` only when `NODE_ENV==="test"`. Use the dotenv setupFile approach.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto.ts src/lib/crypto.test.ts vitest.config.ts package.json
git commit -m "feat: secure key gen, AES-256-GCM encryption, hashing (TDD)"
```

---

### Task 3: Supabase schema + server-only client

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/supabase-admin.ts`, `src/lib/types.ts`

**Interfaces:**
- Produces: `supabaseAdmin` (server-only client); TS types `Application`, `ApiKey`, `UsageLog`, `KeyStatus`.

- [ ] **Step 1: Write `supabase/migrations/0001_init.sql`**

```sql
create extension if not exists pgcrypto;

create table applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  created_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  key_ciphertext text not null,
  key_iv text not null,
  key_auth_tag text not null,
  key_prefix text not null,
  last_four text not null,
  lookup_hash text not null unique,
  environment text not null default 'live',
  status text not null default 'active' check (status in ('active','disabled','revoked')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  request_count bigint not null default 0,
  rate_limit int not null default 100
);
create index api_keys_status_idx on api_keys(status);
create index api_keys_app_idx on api_keys(application_id);

create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references api_keys(id) on delete cascade,
  endpoint text,
  method text,
  status_code int,
  response_time_ms int,
  created_at timestamptz not null default now()
);
create index usage_logs_created_idx on usage_logs(created_at desc);
create index usage_logs_key_idx on usage_logs(api_key_id);
```

- [ ] **Step 2: Run the migration**

Paste the SQL into Supabase Dashboard → SQL Editor → New query → Run. Expected: "Success. No rows returned." Verify tables exist under Table Editor.

- [ ] **Step 3: Install supabase-js and write `src/lib/supabase-admin.ts`**

```bash
npm i @supabase/supabase-js
```
```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

- [ ] **Step 4: Write `src/lib/types.ts`**

```ts
export type KeyStatus = "active" | "disabled" | "revoked";

export interface Application { id: string; name: string; url: string | null; created_at: string; }

export interface ApiKey {
  id: string; application_id: string;
  key_prefix: string; last_four: string;
  environment: "live" | "test"; status: KeyStatus;
  created_at: string; last_used_at: string | null;
  request_count: number; rate_limit: number;
}

export interface ApiKeyWithApp extends ApiKey { application: Application; }

export interface UsageLog {
  id: string; api_key_id: string | null; endpoint: string | null;
  method: string | null; status_code: number | null;
  response_time_ms: number | null; created_at: string;
}
```

- [ ] **Step 5: Verify client connects**

Run a one-off: `node -e "require('dotenv').config({path:'.env.local'}); const {createClient}=require('@supabase/supabase-js'); createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY).from('applications').select('*').then(r=>console.log(r.error||'OK', r.data))"`
Expected: `OK []` (empty table, no error).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations src/lib/supabase-admin.ts src/lib/types.ts package.json
git commit -m "feat: supabase schema + server-only admin client + types"
```

---

### Task 4: Data layer — server actions

**Files:**
- Create: `src/server/keys.ts`, `src/server/applications.ts`, `src/server/logs.ts`

**Interfaces:**
- Consumes: `supabaseAdmin`, crypto helpers, types.
- Produces (all `"use server"` async, never return ciphertext to client except `revealKey`):
  - `listKeys(opts?: { search?: string; status?: KeyStatus | "all"; page?: number; pageSize?: number }): Promise<{ rows: ApiKeyWithApp[]; total: number }>`
  - `createKey(input: { applicationId: string; environment: "live" | "test" }): Promise<{ key: ApiKey; plaintext: string }>`
  - `regenerateKey(id: string): Promise<{ plaintext: string }>`
  - `revokeKey(id: string): Promise<void>` (sets status `revoked`)
  - `setKeyStatus(id: string, status: "active" | "disabled"): Promise<void>`
  - `revealKey(id: string): Promise<string>` (decrypts)
  - `listApplications(): Promise<Application[]>`, `createApplication(input: { name: string; url?: string }): Promise<Application>`, `deleteApplication(id: string): Promise<void>`
  - `listLogs(opts?: { page?: number; pageSize?: number }): Promise<{ rows: (UsageLog & { application_name: string | null })[]; total: number }>`
  - `getStats(): Promise<{ total: number; active: number; disabled: number; requestsThisMonth: number }>`
  - `recentUsage(limit?: number): Promise<(UsageLog & { application_name: string | null })[]>`

- [ ] **Step 1: Write `src/server/keys.ts`**

Implement each function with `supabaseAdmin`. Key points:
- `createKey`: `const plaintext = generateApiKey(environment); const enc = encryptKey(plaintext);` insert row with `key_ciphertext: enc.ciphertext, key_iv: enc.iv, key_auth_tag: enc.authTag, key_prefix: keyPrefix(plaintext), last_four: lastFour(plaintext), lookup_hash: hashKey(plaintext)`. Return `{ key, plaintext }`. Call `revalidatePath("/")`.
- `regenerateKey`: generate new plaintext, update the same row's ciphertext/iv/authTag/prefix/last_four/lookup_hash, set `last_used_at=null`, `request_count=0`. Return `{ plaintext }`.
- `revokeKey`: `update({ status: "revoked" })`.
- `setKeyStatus`: `update({ status })` (guard against revoked → active by checking current status; revoked is terminal).
- `revealKey`: select ciphertext/iv/authTag, `decryptKey(...)`.
- `listKeys`: join `applications`, apply search (`ilike` on application name or `key_prefix`), status filter, range pagination, `count: "exact"`.

```ts
"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateApiKey, encryptKey, hashKey, keyPrefix, lastFour, decryptKey } from "@/lib/crypto";
import type { ApiKey, ApiKeyWithApp, KeyStatus } from "@/lib/types";

const SELECT = `id, application_id, key_prefix, last_four, environment, status, created_at, last_used_at, request_count, rate_limit, application:applications(*)`;

export async function createKey(input: { applicationId: string; environment: "live" | "test" }) {
  const plaintext = generateApiKey(input.environment);
  const enc = encryptKey(plaintext);
  const { data, error } = await supabaseAdmin.from("api_keys").insert({
    application_id: input.applicationId,
    key_ciphertext: enc.ciphertext, key_iv: enc.iv, key_auth_tag: enc.authTag,
    key_prefix: keyPrefix(plaintext), last_four: lastFour(plaintext),
    lookup_hash: hashKey(plaintext), environment: input.environment,
  }).select(SELECT).single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { key: data as unknown as ApiKey, plaintext };
}

export async function regenerateKey(id: string) {
  // fetch environment, then rotate
  const { data: existing, error: e1 } = await supabaseAdmin.from("api_keys").select("environment").eq("id", id).single();
  if (e1) throw new Error(e1.message);
  const plaintext = generateApiKey(existing.environment as "live" | "test");
  const enc = encryptKey(plaintext);
  const { error } = await supabaseAdmin.from("api_keys").update({
    key_ciphertext: enc.ciphertext, key_iv: enc.iv, key_auth_tag: enc.authTag,
    key_prefix: keyPrefix(plaintext), last_four: lastFour(plaintext),
    lookup_hash: hashKey(plaintext), last_used_at: null, request_count: 0,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { plaintext };
}

export async function revokeKey(id: string) {
  const { error } = await supabaseAdmin.from("api_keys").update({ status: "revoked" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function setKeyStatus(id: string, status: "active" | "disabled") {
  const { error } = await supabaseAdmin.from("api_keys").update({ status }).eq("id", id).neq("status", "revoked");
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function revealKey(id: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from("api_keys").select("key_ciphertext, key_iv, key_auth_tag").eq("id", id).single();
  if (error) throw new Error(error.message);
  return decryptKey({ ciphertext: data.key_ciphertext, iv: data.key_iv, authTag: data.key_auth_tag });
}

export async function listKeys(opts: { search?: string; status?: KeyStatus | "all"; page?: number; pageSize?: number } = {}) {
  const page = opts.page ?? 1, pageSize = opts.pageSize ?? 6;
  let q = supabaseAdmin.from("api_keys").select(SELECT, { count: "exact" });
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.search) q = q.ilike("key_prefix", `%${opts.search}%`);
  q = q.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as ApiKeyWithApp[], total: count ?? 0 };
}
```

- [ ] **Step 2: Write `src/server/applications.ts`** — `listApplications`, `createApplication`, `deleteApplication` using `supabaseAdmin.from("applications")`. `revalidatePath` on writes.

- [ ] **Step 3: Write `src/server/logs.ts`** — `listLogs` (join app name via api_keys→applications), `getStats` (counts + month filter `gte created_at` first of month via SQL `rpc` or compute boundary in JS), `recentUsage(limit=5)`.

For `getStats`, compute counts with three `head:true, count:"exact"` queries (total, active, disabled) and `requestsThisMonth` from `usage_logs` where `created_at >= <first-of-month ISO>`.

- [ ] **Step 4: Smoke test the data layer**

Create a temp script `node --experimental-strip-types` or a throwaway route to call `createApplication` then `createKey`; verify a row appears in Supabase Table Editor and `plaintext` matches format. Delete the temp script after.

- [ ] **Step 5: Commit**

```bash
git add src/server
git commit -m "feat: server actions for keys, applications, logs, stats"
```

---

### Task 5: Protected endpoint `/api/data` (TDD on the validator)

**Files:**
- Create: `src/server/validate.ts`, `src/server/validate.test.ts`, `src/app/api/data/route.ts`

**Interfaces:**
- Consumes: `supabaseAdmin`, `hashKey`.
- Produces:
  - `extractBearer(header: string | null): string | null`
  - `validateApiKey(rawKey: string): Promise<{ ok: true; keyId: string } | { ok: false }>`
  - route `GET /api/data`

- [ ] **Step 1: Write failing tests `src/server/validate.test.ts`** (pure parsing logic — no DB)

```ts
import { describe, it, expect } from "vitest";
import { extractBearer } from "./validate";

describe("extractBearer", () => {
  it("returns token from a valid Bearer header", () => {
    expect(extractBearer("Bearer sk_live_abc")).toBe("sk_live_abc");
  });
  it("returns null for missing header", () => {
    expect(extractBearer(null)).toBeNull();
  });
  it("returns null for malformed header", () => {
    expect(extractBearer("Token sk_live_abc")).toBeNull();
    expect(extractBearer("Bearer")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test` → FAIL (no `extractBearer`).

- [ ] **Step 3: Implement `src/server/validate.ts`**

```ts
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashKey } from "@/lib/crypto";

export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(\S+)$/);
  return m ? m[1] : null;
}

export async function validateApiKey(rawKey: string): Promise<{ ok: true; keyId: string } | { ok: false }> {
  const { data, error } = await supabaseAdmin
    .from("api_keys").select("id, status").eq("lookup_hash", hashKey(rawKey)).maybeSingle();
  if (error || !data || data.status !== "active") return { ok: false };
  return { ok: true, keyId: data.id };
}

export async function recordUsage(keyId: string, statusCode: number, responseTimeMs: number) {
  // fire-and-forget: caller does not await the response path on this
  await Promise.all([
    supabaseAdmin.rpc("increment_key_usage", { p_key_id: keyId }).then(() => {}, () => {}),
    supabaseAdmin.from("usage_logs").insert({
      api_key_id: keyId, endpoint: "/api/data", method: "GET",
      status_code: statusCode, response_time_ms: responseTimeMs,
    }).then(() => {}, () => {}),
  ]).catch(() => {});
}
```
Add the SQL function to migration `0001_init.sql` (or a `0002`):
```sql
create or replace function increment_key_usage(p_key_id uuid) returns void language sql as $$
  update api_keys set request_count = request_count + 1, last_used_at = now() where id = p_key_id;
$$;
```
(Run this in SQL Editor too.)

- [ ] **Step 4: Run to verify pass** — `npm test` → PASS.

- [ ] **Step 5: Implement `src/app/api/data/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { extractBearer, validateApiKey, recordUsage } from "@/server/validate";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const token = extractBearer(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const result = await validateApiKey(token);
  if (!result.ok) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = { success: true, data: { message: "Here is your data" } };
  // fire-and-forget: do NOT await — response is returned immediately
  void recordUsage(result.keyId, 200, Date.now() - start);
  return NextResponse.json(body, { status: 200 });
}
```

- [ ] **Step 6: Manual verification** (after seed/Task 6 or a created key)

```bash
curl -i http://localhost:3000/api/data                                  # 401
curl -i -H "Authorization: Bearer <valid live key>" http://localhost:3000/api/data   # 200 + data
# disable the key in dashboard, repeat:
curl -i -H "Authorization: Bearer <disabled key>" http://localhost:3000/api/data     # 401
```
Then confirm `last_used_at`/`request_count` updated and a `usage_logs` row appeared.

- [ ] **Step 7: Commit**

```bash
git add src/server/validate.ts src/server/validate.test.ts src/app/api/data supabase/migrations
git commit -m "feat: protected /api/data endpoint with fire-and-forget usage tracking (TDD)"
```

---

### Task 6: Seed script

**Files:**
- Create: `supabase/seed.mjs`

**Interfaces:**
- Consumes: env, crypto helpers (re-import from compiled or inline copies — script is standalone Node).

- [ ] **Step 1: Write `supabase/seed.mjs`**

Standalone Node script using `@supabase/supabase-js` + `crypto`. Inline the same `generateApiKey/encryptKey/hashKey/keyPrefix/lastFour` logic (or import from a `.mjs` shared file). Insert the 6 sample applications + keys from the mockup (Website Frontend, Mobile App, Admin Dashboard, Integration Service [disabled], Analytics Service, Test Application [disabled, test env]), each with realistic `created_at`, `request_count`, and a spread of `usage_logs` rows (endpoints `/api/users`, `/api/data`, `/api/analytics`, `/api/posts`, `/api/webhook` with 200/401 statuses). Print each generated plaintext key once to stdout.

```bash
node -e "import('dotenv').then(d=>d.config({path:'.env.local'}))"   # ensure dotenv available: npm i -D dotenv
```

- [ ] **Step 2: Run the seed**

Run: `node supabase/seed.mjs`
Expected: prints inserted applications + plaintext keys; rows visible in Supabase.

- [ ] **Step 3: Commit** (do NOT commit printed keys)

```bash
git add supabase/seed.mjs package.json
git commit -m "feat: database seed with sample apps, keys, usage logs"
```

---

### Task 7: App shell — responsive sidebar + top bar

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`, `src/components/ui/StatusBadge.tsx`, `src/components/ui/CopyButton.tsx`, `src/components/ui/Modal.tsx`; Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `<Sidebar />`, `<TopBar title />`, `<StatusBadge status />`, `<CopyButton value />`, `<Modal open onClose>`.

- [ ] **Step 1: Build `Sidebar.tsx`** — logo "API Key Manager", nav links (Dashboard, API Keys, Usage Logs, Applications, Settings, Documentation) with icons (lucide-react: `npm i lucide-react`), active state via `usePathname`. Bottom "API Usage (This Month)" mini card. **Responsive:** fixed rail `lg:w-64` on desktop; on mobile hidden, toggled by a hamburger in `TopBar` as a slide-over drawer (state via a client component wrapper).

- [ ] **Step 2: Build `TopBar.tsx`** — page title + subtitle, hamburger (mobile), "+ New API Key" button (violet) on the right; opens `NewKeyModal` (wired in Task 8).

- [ ] **Step 3: Build `StatusBadge.tsx`** — green "Active", amber "Disabled", red "Revoked" pill.

- [ ] **Step 4: Build `CopyButton.tsx`** — client component, copies to clipboard, shows check for 1.5s.

- [ ] **Step 5: Build `Modal.tsx`** — accessible overlay + panel, ESC/backdrop close, focus trap basic.

- [ ] **Step 6: Wire `layout.tsx`** — grid: sidebar + main; render `{children}`; include `<SwRegister />` (Task 10).

- [ ] **Step 7: Verify** — `npm run dev`, check desktop layout matches mockup and the sidebar collapses to a drawer below `lg`. Resize browser to confirm responsiveness.

- [ ] **Step 8: Commit** — `git commit -m "feat: responsive app shell, sidebar, topbar, shared UI"`

---

### Task 8: Dashboard page

**Files:**
- Create: `src/components/dashboard/StatCards.tsx`, `UsageMiniChart.tsx`, `KeysTable.tsx`, `KeyDetailsPanel.tsx`, `RecentUsage.tsx`, `src/components/keys/NewKeyModal.tsx`, `src/components/keys/RevealKeyDialog.tsx`; Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `getStats`, `listKeys`, `recentUsage`, `listApplications`, and key server actions.

- [ ] **Step 1: `src/app/page.tsx`** — Server Component. Fetch `getStats()`, `listKeys({page})`, `recentUsage()`, `listApplications()`. Read `searchParams` for `page`, `status`, `q`. Render `<StatCards>`, `<KeysTable>`, `<KeyDetailsPanel>`, `<RecentUsage>`, with `<UsageMiniChart>` and docs panel in the right column. Layout: main column + right rail (`xl:grid-cols-[1fr_320px]`), stacks on mobile.

- [ ] **Step 2: `StatCards.tsx`** — 4 cards (Total / Active / Disabled / Requests This Month) with icon, number, sublabel, matching mockup colors.

- [ ] **Step 3: `KeysTable.tsx`** (client) — columns: Application (avatar initial + name + url), API Key (masked `key_prefix...last_four` + CopyButton, copies masked only; full key only via reveal), Status badge, Created, Last Used, Requests, Actions (reveal eye → `RevealKeyDialog`, edit → status toggle menu, trash → revoke confirm). Search box + status `<select>` update URL `searchParams` (router.push). Pagination footer "Showing X to Y of N".

- [ ] **Step 4: `KeyDetailsPanel.tsx`** — right rail card for the selected/first key: Application, masked key + reveal + copy, Created, Last Used, Total Requests, Rate Limit, "Regenerate Key" (violet) and "Revoke Key" (red) buttons calling server actions; below it the "API Documentation" panel (curl example) + "Example Response" JSON block.

- [ ] **Step 5: `NewKeyModal.tsx`** (client) — select application (from `listApplications`) + environment (live/test) → calls `createKey` → shows the returned `plaintext` ONCE with a CopyButton and a "you won't see this again" warning. On close, `router.refresh()`.

- [ ] **Step 6: `RevealKeyDialog.tsx`** (client) — calls `revealKey(id)` server action, shows full decrypted key + CopyButton.

- [ ] **Step 7: `RecentUsage.tsx`** — table: Time, API Key (app name), Endpoint, Status (colored 200/401), Response Time. From `recentUsage()`.

- [ ] **Step 8: `UsageMiniChart.tsx`** — simple SVG sparkline of requests + "X of 30,000 quota" bar (quota display only).

- [ ] **Step 9: Verify** against the mockup at desktop + mobile widths; create a key via modal, reveal it, toggle status, regenerate, revoke; confirm DB reflects each.

- [ ] **Step 10: Commit** — `git commit -m "feat: dashboard page with stat cards, keys table, details panel, new-key + reveal flows"`

---

### Task 9: Remaining pages (API Keys, Usage Logs, Applications, Settings, Documentation)

**Files:**
- Create/Modify: `src/app/keys/page.tsx`, `src/app/logs/page.tsx`, `src/app/applications/page.tsx`, `src/app/settings/page.tsx`, `src/app/docs/page.tsx`

- [ ] **Step 1: `keys/page.tsx`** — full-width `KeysTable` (reuse component) with larger page size.
- [ ] **Step 2: `logs/page.tsx`** — paginated `usage_logs` table from `listLogs`, with status/endpoint columns.
- [ ] **Step 3: `applications/page.tsx`** — list applications (card/table) + "New Application" form (`createApplication`), delete with confirm (`deleteApplication`).
- [ ] **Step 4: `settings/page.tsx`** — read-only display of configured env (URL, which keys are set — never show secret values), quota display, and a note that the dashboard is intentionally unauthenticated.
- [ ] **Step 5: `docs/page.tsx`** — endpoint documentation: auth header, example `curl`, success + 401 responses, rate limit note.
- [ ] **Step 6: Verify** each route renders, nav highlights correctly, responsive.
- [ ] **Step 7: Commit** — `git commit -m "feat: keys, logs, applications, settings, documentation pages"`

---

### Task 10: PWA (manifest, service worker, installable)

**Files:**
- Create: `public/manifest.json`, `public/icons/*`, `src/app/sw-register.tsx`, `public/sw.js`; Modify: `src/app/layout.tsx` (metadata), `next.config.ts`

- [ ] **Step 1: `public/manifest.json`** — name "API Key Manager", short_name, `display: "standalone"`, `background_color`/`theme_color` `#0a0a0f`, icons 192/512 + maskable.
- [ ] **Step 2: Generate icons** — place 192x192, 512x512, and maskable PNG icons in `public/icons/` (simple violet link-glyph on dark, matching the logo).
- [ ] **Step 3: `public/sw.js`** — minimal service worker: cache the app shell (offline fallback), network-first for navigation. Keep it small and dependency-free.
- [ ] **Step 4: `src/app/sw-register.tsx`** (client) — `useEffect` registers `/sw.js` if `"serviceWorker" in navigator`. Render `null`. Include in `layout.tsx`.
- [ ] **Step 5: `layout.tsx` metadata** — add `manifest: "/manifest.json"`, `themeColor`, apple-touch-icon, and `appleWebApp` settings.
- [ ] **Step 6: Verify** — Chrome DevTools → Application → Manifest shows valid, installable; Lighthouse PWA category passes installability; "Install app" prompt appears.
- [ ] **Step 7: Commit** — `git commit -m "feat: PWA manifest, service worker, installable + offline shell"`

---

### Task 11: Deploy to Vercel + final verification

**Files:**
- Create: `README.md`, `vercel.json` (only if needed), `.env.example`

- [ ] **Step 1: `.env.example`** — list the 4 env var names with placeholder values (no real secrets).
- [ ] **Step 2: `README.md`** — setup: install, env, run migration + seed, dev, deploy; document `/api/data` usage.
- [ ] **Step 3: Push to a Git remote** (GitHub) so Vercel can import. Confirm `.env.local` and `supabase stuff.txt` are NOT pushed.
- [ ] **Step 4: Deploy** — `vercel` (preview) then `vercel --prod`, OR import the repo in the Vercel dashboard. Add the 4 env vars in Vercel Project Settings → Environment Variables.
- [ ] **Step 5: Verify production** — load the deployed dashboard, create a key, hit the production `/api/data` with it (200) and without/disabled (401), confirm metadata updates.
- [ ] **Step 6: Commit** — `git commit -m "docs: README + env example; chore: deploy config"`

---

## Self-Review

**Spec coverage:**
- Generate secure keys → Task 2. Store in Supabase → Tasks 3, 4. Associate with app name → `applications` + `application_id` (Tasks 3, 4, 9). Enable/disable → `setKeyStatus` (Tasks 4, 8). Track created → `created_at` (Task 3). Track last used → `recordUsage` (Task 5). No-auth dashboard → Tasks 7, 8, 9. Regenerate/revoke → Tasks 4, 8. Protected endpoint → Task 5. Valid-key-only data + 401 → Task 5. Encrypted-at-rest revealable keys → Tasks 2, 4, 8. Full mockup + pages → Tasks 7, 8, 9. PWA + responsive → Tasks 7, 10. Seed → Task 6. Deploy Vercel → Task 11. All covered.

**Placeholder scan:** UI tasks (7-9) describe components with concrete responsibilities and data sources rather than full JSX, by design (visual code is written during execution against the mockup); load-bearing logic (crypto, schema, data layer, endpoint) has complete code. No "TBD/handle edge cases" left.

**Type consistency:** `KeyStatus`, `ApiKey`, `ApiKeyWithApp`, `Application`, `UsageLog` defined in Task 3 and consumed consistently in Tasks 4, 5, 8, 9. Server action names (`createKey`, `regenerateKey`, `revokeKey`, `setKeyStatus`, `revealKey`, `listKeys`, `getStats`, `recentUsage`, `listLogs`, `listApplications`, `createApplication`, `deleteApplication`) consistent across Tasks 4, 8, 9. Endpoint helpers (`extractBearer`, `validateApiKey`, `recordUsage`) consistent in Task 5.
