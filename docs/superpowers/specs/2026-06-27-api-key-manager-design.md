# API Key Manager — Design Spec

**Date:** 2026-06-27
**Puzzle:** "Puzzle me this #148" — mini API key manager
**Status:** Approved design, ready for implementation plan

## Goal

A mini API key manager: a no-auth web dashboard to generate, store, enable/disable,
regenerate, and revoke secure API keys, each tied to an application; plus a protected
API endpoint that returns data only for valid, enabled keys and Unauthorized otherwise.

Guiding clue: *treat API keys as identities, not passwords. Validate the key before
running business logic; update usage metadata without affecting the response flow.*

## Stack

- **Next.js (App Router) + TypeScript** — single responsive codebase
- **Tailwind CSS** — dark dashboard styling matching the provided mockup
- **PWA** — `manifest.json` + service worker; installable, offline app shell, responsive
  (sidebar collapses to mobile nav, stat cards stack, keys table scrolls/cards on mobile)
- **Supabase (Postgres)** — data store; accessed server-side only via `service_role`
- **Vercel** — deployment target

Decision: **Next.js, not React Native.** React Native produces native binaries, cannot
run in a browser or be a PWA, and would still require a separate web app for the
dashboard and protected endpoint. Next.js delivers the responsive + PWA goal in one app.

## Data model (Supabase / Postgres)

### `applications`
| column | type | notes |
|---|---|---|
| id | uuid pk | default gen_random_uuid() |
| name | text not null | e.g. "Website Frontend" |
| url | text | e.g. "https://mywebsite.com" |
| created_at | timestamptz | default now() |

### `api_keys`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| application_id | uuid fk -> applications | on delete cascade |
| key_ciphertext | text not null | AES-256-GCM encrypted full key (reversible reveal) |
| key_iv | text not null | per-key initialization vector |
| key_auth_tag | text not null | GCM auth tag |
| key_prefix | text not null | e.g. "sk_live_51H8" (display + fast lookup) |
| last_four | text not null | e.g. "e2c1" (masked display) |
| lookup_hash | text not null, unique | SHA-256 of full key — used for O(1) validation |
| environment | text | "live" or "test" |
| status | text not null | "active", "disabled", or "revoked"; default "active" |
| created_at | timestamptz | default now() |
| last_used_at | timestamptz | nullable |
| request_count | bigint | default 0 |
| rate_limit | int | default 100 (requests/minute, display only for now) |

### `usage_logs`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| api_key_id | uuid fk -> api_keys | on delete cascade |
| endpoint | text | e.g. "/api/data" |
| method | text | e.g. "GET" |
| status_code | int | 200 / 401 |
| response_time_ms | int | |
| created_at | timestamptz | default now() |

Indexes: `api_keys(lookup_hash)` unique, `api_keys(status)`, `usage_logs(created_at desc)`,
`usage_logs(api_key_id)`.

## Key lifecycle

- **Generation:** `sk_{env}_` + 32 random bytes via `crypto.randomBytes`, base62-encoded.
- **Storage (encrypted, revealable):** store AES-256-GCM ciphertext + IV + auth tag, plus
  a SHA-256 `lookup_hash` for validation, plus `key_prefix` and `last_four` for display.
  The AES key lives in a Vercel env var (`API_KEY_ENC_SECRET`), **never in the database** —
  so a DB-only leak yields ciphertext, not usable keys.
- **Reveal:** dashboard eye icon calls a server action that decrypts and returns the full
  key on demand (mockup fidelity). Copy button included.
- **Regenerate:** generate a fresh key, overwrite ciphertext/hash/prefix/last_four, reset
  `last_used_at`; old key stops validating immediately.
- **Revoke:** set `status = 'revoked'` (permanent, one-way — cannot be re-enabled). The row
  and its usage history are preserved; the key never validates again (treated like disabled
  at the endpoint). Chosen over row deletion so usage logs survive.
- **Enable/disable:** toggle `status` between "active" and "disabled" (reversible); disabled
  keys return 401 from the endpoint.

## Protected endpoint — `GET /api/data`

1. Read `Authorization: Bearer sk_...`. Missing/malformed → **401 Unauthorized**.
2. Compute SHA-256, look up by `lookup_hash`.
3. Not found OR `status != 'active'` (i.e. disabled or revoked) → **401 Unauthorized**.
4. Valid → build the success payload and **return it immediately**.
5. **Fire-and-forget** (does not block or alter the response): update `last_used_at = now()`,
   `request_count += 1`, and insert a `usage_logs` row. Metadata failures never affect the
   response — this is the clue's "update usage metadata without affecting the response flow."

Success response shape (matches mockup):
```json
{ "success": true, "data": { "message": "Here is your data" } }
```
Unauthorized response: `401` with `{ "success": false, "error": "Unauthorized" }`.

## Dashboard (no auth, per puzzle)

Pages (full mockup):
- **Dashboard** — 4 stat cards (Total / Active / Disabled keys, Requests this month),
  API Usage mini-chart + quota, API Keys table (Application, masked key + copy, Status badge,
  Created, Last Used, Requests, actions: reveal/edit/delete), search + status filter,
  pagination, **Key Details** side panel (reveal, regenerate, revoke), API Documentation panel,
  Recent API Usage table.
- **API Keys** — full table view.
- **Usage Logs** — full `usage_logs` table with filters.
- **Applications** — manage applications (create / list).
- **Settings** — basic settings page (env vars info, quota display).
- **Documentation** — endpoint usage docs.

Actions: **New API Key** modal (pick application + environment → shows full key once with copy),
**Regenerate**, **Revoke**, **Enable/Disable**. All via server actions / route handlers using
the `service_role` key server-side only.

Note: dashboard is intentionally **no-auth** (puzzle requirement). Structured so login/2FA can
be dropped in later as access-path protection. Encryption-at-rest covers DB-compromise risk
regardless of dashboard auth.

## Seed data

SQL seed inserts sample applications, keys (with real encrypted values generated at seed time
or via a seed script), and usage logs so stat cards, charts, and tables look populated like the
mockup on first load.

## Security posture summary

- Keys encrypted at rest (AES-256-GCM); encryption key in env var, not DB.
- `service_role` key server-side only; never shipped to the browser.
- Validation by SHA-256 lookup hash (constant work, no plaintext compare).
- Dashboard no-auth by puzzle requirement; documented as a deploy-time consideration.

## Out of scope (YAGNI)

- Real rate-limiting enforcement (rate_limit shown but not enforced yet)
- Multi-user / team accounts
- Billing / quota enforcement (quota is display only)
- Native mobile app (PWA covers mobile)

## Deployment

- Vercel project, Next.js framework preset.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `API_KEY_ENC_SECRET`.
- Supabase migration + seed run against the user's project.
