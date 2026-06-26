/**
 * supabase/seed.mjs
 * Idempotent seed: wipes and re-populates applications, api_keys, usage_logs.
 * Run: node supabase/seed.mjs
 */

import { config } from "dotenv";
import { randomBytes, createHash, createCipheriv } from "crypto";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

// ── env guards ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const ENC_SECRET = process.env.API_KEY_ENC_SECRET;

if (!SUPABASE_URL || !SUPABASE_SECRET || !ENC_SECRET) {
  console.error("Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, API_KEY_ENC_SECRET are set in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false },
});

// ── crypto helpers (mirrors src/lib/crypto.ts exactly) ───────────────────────
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function base62(bytes) {
  let out = "";
  for (const b of bytes) out += BASE62[b % 62];
  return out;
}

function generateApiKey(environment) {
  return `sk_${environment}_${base62(randomBytes(40))}`;
}

function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

function encKey() {
  return createHash("sha256").update(ENC_SECRET).digest();
}

function encryptKey(key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

function keyPrefix(key) { return key.slice(0, 12); }
function lastFour(key)  { return key.slice(-4); }

// ── helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

/** Random integer in [min, max] */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random date within the current calendar month, up to now */
function randomThisMonth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const ms = now.getTime() - startOfMonth.getTime();
  return new Date(startOfMonth.getTime() + Math.random() * ms).toISOString();
}

// ── seed data ─────────────────────────────────────────────────────────────────
const APP_DEFS = [
  { name: "Website Frontend",    url: "https://mywebsite.com",         env: "live", status: "active",   request_count: 2541, created_days_ago: 75 },
  { name: "Mobile App",          url: "com.myapp.mobile",              env: "live", status: "active",   request_count: 1892, created_days_ago: 60 },
  { name: "Admin Dashboard",     url: "https://admin.myapp.com",       env: "live", status: "active",   request_count: 5214, created_days_ago: 55 },
  { name: "Integration Service", url: "https://api.partner.com",       env: "live", status: "disabled", request_count: 342,  created_days_ago: 45 },
  { name: "Analytics Service",   url: "https://analytics.myapp.com",   env: "live", status: "active",   request_count: 1203, created_days_ago: 35 },
  { name: "Test Application",    url: "https://test.myapp.com",        env: "test", status: "disabled", request_count: 89,   created_days_ago: 30 },
];

const ENDPOINTS = ["/api/users", "/api/data", "/api/analytics", "/api/posts", "/api/webhook"];
const METHODS   = ["GET", "GET", "GET", "POST", "POST"]; // GET-heavy
const STATUS_CODES = [200, 200, 200, 200, 200, 200, 200, 401]; // ~87% 200

// ── main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("=== API Key Manager — Seed Script ===\n");

  // 1. Wipe existing data (FK-safe order)
  console.log("Clearing existing data...");
  const { error: e1 } = await supabase.from("usage_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e1) throw new Error(`Clear usage_logs: ${e1.message}`);
  const { error: e2 } = await supabase.from("api_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e2) throw new Error(`Clear api_keys: ${e2.message}`);
  const { error: e3 } = await supabase.from("applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e3) throw new Error(`Clear applications: ${e3.message}`);
  console.log("Existing data cleared.\n");

  // 2. Insert applications
  console.log("Inserting applications...");
  const insertedApps = [];
  for (const def of APP_DEFS) {
    const { data, error } = await supabase
      .from("applications")
      .insert({ name: def.name, url: def.url, created_at: daysAgo(def.created_days_ago) })
      .select()
      .single();
    if (error) throw new Error(`Insert app "${def.name}": ${error.message}`);
    insertedApps.push({ ...def, id: data.id });
    console.log(`  [app] ${def.name} → ${data.id}`);
  }
  console.log();

  // 3. Insert one API key per application
  console.log("Inserting API keys...");
  const insertedKeys = [];
  for (const app of insertedApps) {
    const plainKey = generateApiKey(app.env);
    const { ciphertext, iv, authTag } = encryptKey(plainKey);
    const lookup_hash = hashKey(plainKey);

    // last_used_at: null for disabled/least-used, recent otherwise
    const last_used_at =
      app.status === "disabled"
        ? null
        : hoursAgo(randInt(1, 72));

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        application_id: app.id,
        key_ciphertext: ciphertext,
        key_iv: iv,
        key_auth_tag: authTag,
        key_prefix: keyPrefix(plainKey),
        last_four: lastFour(plainKey),
        lookup_hash,
        environment: app.env,
        status: app.status,
        created_at: daysAgo(app.created_days_ago - 1),
        last_used_at,
        request_count: app.request_count,
        rate_limit: 100,
      })
      .select()
      .single();
    if (error) throw new Error(`Insert key for "${app.name}": ${error.message}`);

    insertedKeys.push({ id: data.id, appName: app.name, status: app.status });
    console.log(`  [key] ${app.name}`);
    console.log(`         plaintext : ${plainKey}`);
    console.log(`         prefix    : ${keyPrefix(plainKey)}  last4: ${lastFour(plainKey)}`);
  }
  console.log();

  // 4. Insert usage_logs
  console.log("Inserting usage logs...");

  // Active key IDs (most logs come from active keys)
  const activeKeyIds = insertedKeys.filter(k => k.status === "active").map(k => k.id);
  const allKeyIds    = insertedKeys.map(k => k.id);

  const logRows = [];

  // ~320 logs spread across the current month (for "Requests This Month")
  const MONTH_LOG_COUNT = 320;
  for (let i = 0; i < MONTH_LOG_COUNT; i++) {
    const keyId = activeKeyIds[randInt(0, activeKeyIds.length - 1)];
    logRows.push({
      api_key_id: keyId,
      endpoint: ENDPOINTS[randInt(0, ENDPOINTS.length - 1)],
      method: METHODS[randInt(0, METHODS.length - 1)],
      status_code: STATUS_CODES[randInt(0, STATUS_CODES.length - 1)],
      response_time_ms: randInt(40, 200),
      created_at: randomThisMonth(),
    });
  }

  // ~8 very recent logs (within last 6 hours) for "Recent API Usage" panel
  const RECENT_COUNT = 8;
  for (let i = 0; i < RECENT_COUNT; i++) {
    const keyId = allKeyIds[randInt(0, allKeyIds.length - 1)];
    logRows.push({
      api_key_id: keyId,
      endpoint: ENDPOINTS[randInt(0, ENDPOINTS.length - 1)],
      method: METHODS[randInt(0, METHODS.length - 1)],
      status_code: STATUS_CODES[randInt(0, STATUS_CODES.length - 1)],
      response_time_ms: randInt(40, 200),
      created_at: hoursAgo(randInt(0, 6)),
    });
  }

  // Insert in batches of 100 (Supabase row limit per request)
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < logRows.length; i += BATCH) {
    const batch = logRows.slice(i, i + BATCH);
    const { error } = await supabase.from("usage_logs").insert(batch);
    if (error) throw new Error(`Insert usage_logs batch ${i}: ${error.message}`);
    inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} usage log rows (${MONTH_LOG_COUNT} this-month + ${RECENT_COUNT} recent)\n`);

  // 5. Summary
  console.log("=== Seed complete ===");
  console.log(`  Applications : ${insertedApps.length}`);
  console.log(`  API keys     : ${insertedKeys.length}`);
  console.log(`  Usage logs   : ${inserted}`);
  console.log(`  This-month   : ${MONTH_LOG_COUNT}`);
  console.log(`  Recent (<6h) : ${RECENT_COUNT}`);
  console.log("\nPlaintext keys (stdout only — never committed):");
  for (const k of insertedKeys) {
    // Already printed above; this is a consolidated recap
    console.log(`  ${k.appName.padEnd(22)} [${k.status}] — key_id: ${k.id}`);
  }
}

seed().catch((err) => {
  console.error("\nSeed FAILED:", err.message);
  process.exit(1);
});
