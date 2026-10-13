-- DRAFT: do not apply before auditing the target project's existing RLS, grants,
-- schema, verified operational contact and retention process. Never run at build.
-- Additive, isolated from all existing pilot/auth/ACARS tables.
begin;
create table public.vector_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('interest','contact')),
  email text not null check (length(email) between 3 and 254),
  name text not null default '' check (length(name) <= 100),
  message text not null default '' check (length(message) <= 2000),
  locale text not null check (locale in ('es','en')),
  consent_version text not null,
  created_at timestamptz not null default now()
);
create table public.vector_inquiry_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  attempts integer not null default 0
);
alter table public.vector_inquiries enable row level security;
alter table public.vector_inquiry_limits enable row level security;
revoke all on public.vector_inquiries, public.vector_inquiry_limits from public, anon, authenticated;
-- No public read/write policies: deny by default. Only the server RPC may write.
create function public.vector_submit_inquiry(
 p_kind text, p_email text, p_name text, p_message text, p_locale text,
 p_consent_version text, p_ip_hash text, p_email_hash text
) returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare k text; n integer; w timestamptz := date_trunc('hour', now());
begin
 if p_kind not in ('interest','contact') or p_locale not in ('es','en')
 or length(p_email) > 254 or p_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
 or length(p_name) > 100 or length(p_message) > 2000
 or (p_kind = 'contact' and length(p_message) < 10)
 or p_consent_version <> '2026-10-v1'
 or p_ip_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'Invalid inquiry'; end if;
 -- All requests use the same lock order. Separate namespaces avoid collisions.
 perform pg_advisory_xact_lock(hashtextextended('vector:ip:' || p_ip_hash,0));
 perform pg_advisory_xact_lock(hashtextextended('vector:email:' || p_email_hash,0));
 foreach k in array array['ip:' || p_ip_hash, 'email:' || p_email_hash] loop
   insert into public.vector_inquiry_limits(bucket_key,window_start,attempts) values(k,w,1)
   on conflict(bucket_key) do update set
    attempts = case when vector_inquiry_limits.window_start < w then 1 else vector_inquiry_limits.attempts+1 end,
    window_start = w returning attempts into n;
   if n > case when left(k,3) = 'ip:' then 5 else 3 end then return 'rate_limited'; end if;
 end loop;
 delete from public.vector_inquiry_limits where window_start < now() - interval '24 hours';
 insert into public.vector_inquiries(kind,email,name,message,locale,consent_version)
 values(p_kind,p_email,p_name,p_message,p_locale,p_consent_version);
 return 'accepted';
end;
$$;
revoke all on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text) to service_role;
commit;
-- Rollback of an EMPTY test installation only: DROP FUNCTION, then DROP TABLE.
-- Export/retain any user requests before a separately authorised production removal.
