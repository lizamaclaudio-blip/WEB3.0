-- Initial create-only schema, applied on 2026-10-14 after the target-name audit.
-- Never rerun on an existing installation or automatically during a build.
-- Additive, isolated from all existing pilot/auth/ACARS tables.
begin;
create table public.vector_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('interest','contact')),
  email text not null check (length(email) between 3 and 254),
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  name text not null default '' check (length(name) <= 100),
  message text not null default '' check (length(message) <= 2000),
  locale text not null check (locale in ('es','en','fr')),
  consent_version text not null,
  newsletter_opt_in boolean not null default false,
  newsletter_consent_version text,
  newsletter_opt_in_at timestamptz,
  check ((newsletter_opt_in and newsletter_consent_version is not null and newsletter_opt_in_at is not null)
    or (not newsletter_opt_in and newsletter_consent_version is null and newsletter_opt_in_at is null)),
  created_at timestamptz not null default now()
);
create index vector_inquiries_email_hash on public.vector_inquiries(email_hash);
create index vector_inquiries_created_at on public.vector_inquiries(created_at);
create table public.vector_inquiry_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  attempts integer not null default 0
);
create table public.vector_newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique check (email_hash ~ '^[a-f0-9]{64}$'),
  email text not null unique check (email = lower(trim(email)) and length(email) between 3 and 254),
  locale text not null check (locale in ('es','en','fr')),
  status text not null default 'pending' check (status in ('pending','active','unsubscribed')),
  consent_version text not null,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  check (status <> 'active' or confirmed_at is not null),
  check ((status = 'unsubscribed') = (unsubscribed_at is not null))
);
create table public.vector_unsubscribe_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  subscription_id uuid not null references public.vector_newsletter_subscriptions(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  check (expires_at > created_at)
);
create index vector_unsubscribe_subscription on public.vector_unsubscribe_tokens(subscription_id);
alter table public.vector_inquiries enable row level security;
alter table public.vector_inquiry_limits enable row level security;
alter table public.vector_newsletter_subscriptions enable row level security;
alter table public.vector_unsubscribe_tokens enable row level security;
revoke all on public.vector_inquiries, public.vector_inquiry_limits,
  public.vector_newsletter_subscriptions, public.vector_unsubscribe_tokens from public, anon, authenticated;
-- No public read/write policies: deny by default. Only the server RPC may write.
create function public.vector_submit_inquiry(
 p_kind text, p_email text, p_name text, p_message text, p_locale text,
 p_consent_version text, p_ip_hash text, p_email_hash text,
 p_newsletter_consent boolean, p_newsletter_consent_version text
) returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare k text; n integer; w timestamptz := date_trunc('hour', now());
begin
 if p_kind is null or p_kind not in ('interest','contact') or p_locale is null or p_locale not in ('es','en','fr')
 or p_email is null or p_email <> lower(trim(p_email)) or length(p_email) > 254 or p_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
 or p_name is null or p_message is null or length(p_name) > 100 or length(p_message) > 2000
 or (p_kind = 'contact' and length(p_message) < 10)
 or p_consent_version is distinct from '2026-10-v1'
 or p_ip_hash is null or p_email_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$'
 or p_newsletter_consent is null
 or (p_newsletter_consent and p_newsletter_consent_version is distinct from '2026-10-news-v1')
 or (not p_newsletter_consent and p_newsletter_consent_version is not null)
 then raise exception 'Invalid inquiry'; end if;
 -- All requests use the same lock order. Separate namespaces avoid collisions.
 perform pg_advisory_xact_lock(hashtextextended('vector:ip:' || p_ip_hash,0));
 perform pg_advisory_xact_lock(hashtextextended('vector:email:' || p_email_hash,0));
 foreach k in array array['ip:' || p_ip_hash, 'email:' || p_email_hash] loop
   insert into public.vector_inquiry_limits(bucket_key,window_start,attempts) values(k,w,1)
   on conflict(bucket_key) do update set
    attempts = case when vector_inquiry_limits.window_start < w then 1 else vector_inquiry_limits.attempts+1 end,
    window_start = w returning attempts into n;
   if n > (case when left(k,3) = 'ip:' then 5 else 3 end) then return 'rate_limited'; end if;
 end loop;
 delete from public.vector_inquiry_limits where window_start < now() - interval '24 hours';
 insert into public.vector_inquiries(kind,email,email_hash,name,message,locale,consent_version,
   newsletter_opt_in,newsletter_consent_version,newsletter_opt_in_at)
 values(p_kind,p_email,p_email_hash,p_name,p_message,p_locale,p_consent_version,
   p_newsletter_consent,p_newsletter_consent_version,case when p_newsletter_consent then now() else null end);
 -- Contact and interest requests never imply newsletter consent. A false choice
 -- does not silently change a previously saved preference either.
 if p_newsletter_consent then
   insert into public.vector_newsletter_subscriptions(email_hash,email,locale,consent_version)
   values(p_email_hash,p_email,p_locale,p_newsletter_consent_version)
   on conflict(email_hash) do update set
     locale = excluded.locale, consent_version = excluded.consent_version, requested_at = now(),
     status = case when vector_newsletter_subscriptions.status = 'active' then 'active' else 'pending' end,
     unsubscribed_at = null;
 end if;
 return 'accepted';
end;
$$;
revoke all on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text,boolean,text) to service_role;

-- Only a future VERIFIED mailer may issue a token. No public token-issuance API.
-- It receives an independently generated token hash, never the bearer token.
create function public.vector_register_unsubscribe_token(p_email_hash text,p_token_hash text,p_expires_at timestamptz)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare subscription uuid;
begin
 if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$'
 or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
 or p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '31 days'
 then raise exception 'Invalid unsubscribe token'; end if;
 select id into subscription from public.vector_newsletter_subscriptions
 where email_hash = p_email_hash and status = 'active' and confirmed_at is not null for update;
 if subscription is null then return 'not_active'; end if;
 insert into public.vector_unsubscribe_tokens(token_hash,subscription_id,expires_at)
 values(p_token_hash,subscription,p_expires_at);
 delete from public.vector_unsubscribe_tokens where expires_at < now() - interval '24 hours';
 return 'registered';
end;
$$;
revoke all on function public.vector_register_unsubscribe_token(text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.vector_register_unsubscribe_token(text,text,timestamptz) to service_role;

create function public.vector_unsubscribe(p_token_hash text,p_ip_hash text)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare subscription uuid; n integer; w timestamptz := date_trunc('hour', now());
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
 or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then return 'invalid_or_expired'; end if;
 perform pg_advisory_xact_lock(hashtextextended('vector:unsubscribe:ip:' || p_ip_hash,0));
 insert into public.vector_inquiry_limits(bucket_key,window_start,attempts)
 values('unsubscribe:ip:' || p_ip_hash,w,1)
 on conflict(bucket_key) do update set
   attempts = case when vector_inquiry_limits.window_start < w then 1 else vector_inquiry_limits.attempts+1 end,
   window_start = w returning attempts into n;
 if n > 20 then return 'rate_limited'; end if;
 -- Lock subscription before token so concurrent issuance and opt-outs share
 -- lock order. Then consume the token atomically; a second use cannot succeed.
 select s.id into subscription from public.vector_newsletter_subscriptions s
 join public.vector_unsubscribe_tokens t on t.subscription_id = s.id
 where t.token_hash = p_token_hash and t.used_at is null and t.expires_at > now()
 for update of s;
 if subscription is null then return 'invalid_or_expired'; end if;
 update public.vector_unsubscribe_tokens set used_at = now()
 where token_hash = p_token_hash and used_at is null and expires_at > now();
 if not found then return 'invalid_or_expired'; end if;
 update public.vector_newsletter_subscriptions set status = 'unsubscribed', unsubscribed_at = now()
 where id = subscription;
 update public.vector_unsubscribe_tokens set used_at = now()
 where subscription_id = subscription and used_at is null;
 return 'unsubscribed';
end;
$$;
revoke all on function public.vector_unsubscribe(text,text) from public, anon, authenticated;
grant execute on function public.vector_unsubscribe(text,text) to service_role;
commit;
-- Rollback of an EMPTY test installation only: DROP FUNCTION, then DROP TABLE.
-- Export/retain any user requests before a separately authorised production removal.
