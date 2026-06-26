-- Lock all tables to server-only access.
-- RLS enabled with NO policies => the anon/publishable key gets zero access;
-- only the service_role (secret) key bypasses RLS. The app only ever talks to
-- these tables server-side via the secret key, so this is the correct posture.
alter table applications enable row level security;
alter table api_keys enable row level security;
alter table usage_logs enable row level security;
