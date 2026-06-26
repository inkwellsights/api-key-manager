create or replace function increment_key_usage(p_key_id uuid) returns void language sql as $$
  update api_keys
  set request_count = request_count + 1,
      last_used_at  = now()
  where id = p_key_id;
$$;
