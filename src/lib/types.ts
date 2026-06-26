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
