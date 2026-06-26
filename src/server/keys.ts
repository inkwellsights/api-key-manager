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
