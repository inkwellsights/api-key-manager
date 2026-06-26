import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashKey } from "@/lib/crypto";

export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(\S+)$/);
  return m ? m[1] : null;
}

export async function validateApiKey(rawKey: string): Promise<{ ok: true; keyId: string } | { ok: false }> {
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, status")
    .eq("lookup_hash", hashKey(rawKey))
    .maybeSingle();
  if (error || !data || data.status !== "active") return { ok: false };
  return { ok: true, keyId: data.id };
}

export async function recordUsage(keyId: string, statusCode: number, responseTimeMs: number) {
  // fire-and-forget: caller does not await on the response path
  await Promise.all([
    supabaseAdmin
      .rpc("increment_key_usage", { p_key_id: keyId })
      .then(() => {}, () => {}),
    supabaseAdmin
      .from("usage_logs")
      .insert({
        api_key_id: keyId,
        endpoint: "/api/data",
        method: "GET",
        status_code: statusCode,
        response_time_ms: responseTimeMs,
      })
      .then(() => {}, () => {}),
  ]).catch(() => {});
}
