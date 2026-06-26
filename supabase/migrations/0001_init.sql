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
  environment text not null default 'live' check (environment in ('live','test')),
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
