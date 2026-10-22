-- Rate-limit anonymous Zzer ingestion at the server boundary.
-- The table and RPC are only callable by the server-side service_role.
create table if not exists public.zzer_ingest_rate_limits (
  bucket text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.zzer_ingest_rate_limits enable row level security;
revoke all on table public.zzer_ingest_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.zzer_ingest_rate_limits to service_role;

create or replace function public.consume_zzer_ingest_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_count integer;
begin
  if p_bucket is null
     or pg_catalog.length(p_bucket) > 100
     or p_limit < 1
     or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.zzer_ingest_rate_limits as limits
    (bucket, window_started_at, request_count, updated_at)
  values
    (p_bucket, v_now, 1, v_now)
  on conflict (bucket) do update
    set window_started_at = case
          when limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
            then v_now
          else limits.window_started_at
        end,
        request_count = case
          when limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
            then 1
          else limits.request_count + 1
        end,
        updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$function$;

revoke all on function public.consume_zzer_ingest_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_zzer_ingest_rate_limit(text, integer, integer) to service_role;
