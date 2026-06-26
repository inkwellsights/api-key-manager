"use server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { UsageLog } from "@/lib/types";

type LogWithApp = UsageLog & { application_name: string | null };

// Supabase nested shape returned from the join
type RawLogRow = UsageLog & {
  api_keys: {
    application: { name: string } | null;
  } | null;
};

function mapRow(row: RawLogRow): LogWithApp {
  const { api_keys, ...rest } = row;
  return {
    ...rest,
    application_name: api_keys?.application?.name ?? null,
  };
}

const LOG_SELECT = `id, api_key_id, endpoint, method, status_code, response_time_ms, created_at, api_keys(application:applications(name))`;

export async function listLogs(
  opts: { page?: number; pageSize?: number } = {}
): Promise<{ rows: LogWithApp[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;

  const { data, error, count } = await supabaseAdmin
    .from("usage_logs")
    .select(LOG_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown as RawLogRow[]).map(mapRow);
  return { rows, total: count ?? 0 };
}

export async function getStats(): Promise<{
  total: number;
  active: number;
  disabled: number;
  requestsThisMonth: number;
}> {
  const [totalRes, activeRes, disabledRes, monthRes] = await Promise.all([
    supabaseAdmin
      .from("api_keys")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabaseAdmin
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("status", "disabled"),
    ((): Promise<{ count: number | null; error: { message: string } | null }> => {
      const now = new Date();
      const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      return supabaseAdmin
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", firstOfMonth.toISOString()) as unknown as Promise<{
        count: number | null;
        error: { message: string } | null;
      }>;
    })(),
  ]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (activeRes.error) throw new Error(activeRes.error.message);
  if (disabledRes.error) throw new Error(disabledRes.error.message);
  if (monthRes.error) throw new Error(monthRes.error.message);

  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    disabled: disabledRes.count ?? 0,
    requestsThisMonth: monthRes.count ?? 0,
  };
}

export async function recentUsage(limit = 5): Promise<LogWithApp[]> {
  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .select(LOG_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawLogRow[]).map(mapRow);
}
