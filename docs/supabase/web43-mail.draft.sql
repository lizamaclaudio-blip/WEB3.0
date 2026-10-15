-- Additive transactional mail outbox. Apply once after vector-inquiries.
-- No historical backfill; existing inquiries, subscriptions and unsubscribe RPCs remain.
-- SMTP has no provider idempotency: an ambiguous send is held for manual review.
begin;

create table public.vector_mail_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact_receipt','internal_contact','newsletter_confirm','newsletter_welcome')),
  inquiry_id uuid references public.vector_inquiries(id) on delete restrict,
  subscription_id uuid references public.vector_newsletter_subscriptions(id) on delete restrict,
  subscription_requested_at timestamptz,
  locale text not null check (locale in ('es','en','fr')),
  status text not null default 'queued' check (status in ('queued','leased','sending','retry','sent','failed','delivery_unknown','suppressed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  worker uuid,
  lease_until timestamptz,
  provider_id text check (length(provider_id) <= 500),
  last_error_code text check (last_error_code ~ '^[A-Z][A-Z_]{0,63}$'),
  sent_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind in ('contact_receipt','internal_contact') and inquiry_id is not null
      and subscription_id is null and subscription_requested_at is null)
    or (kind in ('newsletter_confirm','newsletter_welcome') and inquiry_id is null
      and subscription_id is not null and subscription_requested_at is not null)),
  check ((status in ('leased','sending')) = (worker is not null and lease_until is not null)),
  check ((attempts = 0) = (first_attempt_at is null)),
  check (status <> 'sent' or sent_at is not null)
);
create unique index vector_mail_contact_once on public.vector_mail_outbox(inquiry_id,kind)
  where inquiry_id is not null;
create unique index vector_mail_newsletter_once on public.vector_mail_outbox(subscription_id,kind,subscription_requested_at)
  where subscription_id is not null;
create index vector_mail_ready on public.vector_mail_outbox(next_attempt_at,created_at,id)
  where status in ('queued','retry','leased','sending');
create index vector_mail_subscription on public.vector_mail_outbox(subscription_id)
  where subscription_id is not null;

-- Bearer values never enter Postgres. One immutable hash/expiry per mail job.
-- The outbox reference also binds a confirmation to its subscription cycle.
create table public.vector_mail_tokens (
  outbox_id uuid primary key references public.vector_mail_outbox(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  check (expires_at > created_at)
);
alter table public.vector_mail_outbox enable row level security;
alter table public.vector_mail_tokens enable row level security;
revoke all on public.vector_mail_outbox, public.vector_mail_tokens from public, anon, authenticated, service_role;

create function public.vector_mail_reserved_recipient(p_email text)
returns boolean language sql immutable strict set search_path = pg_catalog, public as $$
  select lower(split_part(p_email,'@',2)) ~ '(^|\.)(test|example|invalid|localhost)$'
    or lower(split_part(p_email,'@',2)) in ('example.com','example.net','example.org');
$$;
revoke all on function public.vector_mail_reserved_recipient(text) from public, anon, authenticated;

-- Same input/return contract, validation, rate limits and inquiry persistence.
-- Only newsletter cycle handling changes: pending/active repeats retain their cycle.
create or replace function public.vector_submit_inquiry(
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
 if p_newsletter_consent then
   insert into public.vector_newsletter_subscriptions(email_hash,email,locale,consent_version)
   values(p_email_hash,p_email,p_locale,p_newsletter_consent_version)
   on conflict(email_hash) do update set
     locale = excluded.locale, consent_version = excluded.consent_version,
     requested_at = case when vector_newsletter_subscriptions.status = 'unsubscribed'
       then greatest(clock_timestamp(), vector_newsletter_subscriptions.requested_at + interval '1 microsecond')
       else vector_newsletter_subscriptions.requested_at end,
     confirmed_at = case when vector_newsletter_subscriptions.status = 'unsubscribed'
       then null else vector_newsletter_subscriptions.confirmed_at end,
     status = case when vector_newsletter_subscriptions.status = 'active' then 'active' else 'pending' end,
     unsubscribed_at = null;
 end if;
 return 'accepted';
end;
$$;
revoke all on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text,boolean,text) to service_role;

create function public.vector_enqueue_inquiry_mail()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare s public.vector_newsletter_subscriptions%rowtype; suppressed boolean;
begin
 suppressed := public.vector_mail_reserved_recipient(new.email);
 if new.kind = 'contact' then
   insert into public.vector_mail_outbox(kind,inquiry_id,locale,status,last_error_code,finished_at)
   select k,new.id,new.locale,case when suppressed then 'suppressed' else 'queued' end,
     case when suppressed then 'RESERVED_RECIPIENT' end,case when suppressed then now() end
   from unnest(array['contact_receipt','internal_contact']) as k
   on conflict do nothing;
 end if;
 if new.newsletter_opt_in then
   select * into s from public.vector_newsletter_subscriptions where email_hash = new.email_hash;
   if s.id is not null and s.status = 'pending' then
     insert into public.vector_mail_outbox(kind,subscription_id,subscription_requested_at,locale,status,last_error_code,finished_at)
     values('newsletter_confirm',s.id,s.requested_at,new.locale,
       case when suppressed then 'suppressed' else 'queued' end,
       case when suppressed then 'RESERVED_RECIPIENT' end,case when suppressed then now() end)
     on conflict do nothing;
   end if;
 end if;
 return new;
end;
$$;
revoke all on function public.vector_enqueue_inquiry_mail() from public, anon, authenticated;
-- Deferred timing sees the subscription UPSERT which follows the inquiry INSERT.
create constraint trigger vector_inquiry_mail_enqueue after insert on public.vector_inquiries
  deferrable initially deferred for each row execute function public.vector_enqueue_inquiry_mail();

create function public.vector_claim_mail(p_limit integer,p_worker uuid)
returns table(id uuid,kind text,locale text,email text,email_hash text,name text,message text,
  created_at timestamptz,first_attempt_at timestamptz,attempts integer)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare t timestamptz := clock_timestamp();
begin
 if p_limit is null or p_limit < 1 or p_limit > 4 or p_worker is null then raise exception 'Invalid mail claim'; end if;
 -- Sending means the SMTP acceptance boundary may have been crossed. Never reclaim it.
 update public.vector_mail_outbox o set status='delivery_unknown',worker=null,lease_until=null,
   last_error_code='LEASE_EXPIRED_DURING_SEND',finished_at=t,updated_at=t
 where o.status='sending' and o.lease_until <= t;
 update public.vector_mail_outbox o set status='failed',worker=null,lease_until=null,
   last_error_code='RETRY_BUDGET_EXHAUSTED',finished_at=t,updated_at=t
 where (o.status in ('queued','retry') or (o.status='leased' and o.lease_until <= t))
   and (o.attempts >= 5 or o.first_attempt_at <= t - interval '23 hours');
 -- A superseded newsletter cycle can never send, including after unsubscribe.
 update public.vector_mail_outbox o set status='suppressed',worker=null,lease_until=null,
   last_error_code='SUBSCRIPTION_NOT_CURRENT',finished_at=t,updated_at=t
 where (o.status in ('queued','retry') or (o.status='leased' and o.lease_until <= t))
   and o.subscription_id is not null and not exists (
     select 1 from public.vector_newsletter_subscriptions s where s.id=o.subscription_id
       and s.requested_at=o.subscription_requested_at
       and s.status=case when o.kind='newsletter_confirm' then 'pending' else 'active' end);
 return query
 with candidates as (
   select o.id from public.vector_mail_outbox o
   where (o.status in ('queued','retry') and o.next_attempt_at <= t)
     or (o.status='leased' and o.lease_until <= t)
   order by o.next_attempt_at,o.created_at,o.id for update skip locked limit p_limit
 ), claimed as (
   update public.vector_mail_outbox o set status='leased',worker=p_worker,
     lease_until=t+interval '180 seconds',attempts=o.attempts+1,
     first_attempt_at=coalesce(o.first_attempt_at,t),updated_at=t
   from candidates c where o.id=c.id returning o.*
 )
 select o.id,o.kind,o.locale,coalesce(i.email,s.email),coalesce(i.email_hash,s.email_hash),
   coalesce(i.name,''),coalesce(i.message,''),o.created_at,o.first_attempt_at,o.attempts
 from claimed o left join public.vector_inquiries i on i.id=o.inquiry_id
 left join public.vector_newsletter_subscriptions s on s.id=o.subscription_id;
end;
$$;

create function public.vector_register_mail_token(p_id uuid,p_worker uuid,p_token_hash text,p_expires_at timestamptz)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare o public.vector_mail_outbox%rowtype; s public.vector_newsletter_subscriptions%rowtype;
  mt public.vector_mail_tokens%rowtype; expected timestamptz; t timestamptz := clock_timestamp();
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at is null then raise exception 'Invalid mail token'; end if;
 -- All newsletter operations lock subscription before outbox/token.
 select * into o from public.vector_mail_outbox where id=p_id;
 if o.subscription_id is null then return 'not_current'; end if;
 select * into s from public.vector_newsletter_subscriptions where id=o.subscription_id for update;
 select * into o from public.vector_mail_outbox where id=p_id for update;
 t:=clock_timestamp();
 if o.status <> 'leased' or o.worker is distinct from p_worker or o.lease_until <= t
   or o.first_attempt_at <= t-interval '23 hours' or s.requested_at <> o.subscription_requested_at
   or s.status <> (case when o.kind='newsletter_confirm' then 'pending' else 'active' end)
   or public.vector_mail_reserved_recipient(s.email) then return 'not_current'; end if;
 expected := o.first_attempt_at + case when o.kind='newsletter_confirm' then interval '24 hours' else interval '30 days' end;
 -- JS dates truncate microseconds; persist the DB-derived expiry, never extend it.
 if abs(extract(epoch from (p_expires_at-expected))) > 1 or expected <= t then raise exception 'Invalid mail token expiry'; end if;
 select * into mt from public.vector_mail_tokens where outbox_id=o.id;
 if mt.outbox_id is not null then
   if mt.token_hash=p_token_hash and mt.expires_at=expected and mt.used_at is null then return 'registered'; end if;
   return 'not_current';
 end if;
 begin
   insert into public.vector_mail_tokens(outbox_id,token_hash,expires_at) values(o.id,p_token_hash,expected);
   if o.kind='newsletter_welcome' then
     insert into public.vector_unsubscribe_tokens(token_hash,subscription_id,expires_at)
     values(p_token_hash,s.id,expected);
   end if;
 exception when unique_violation then return 'not_current';
 end;
 return 'registered';
end;
$$;

create function public.vector_start_mail(p_id uuid,p_worker uuid)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare o public.vector_mail_outbox%rowtype; s public.vector_newsletter_subscriptions%rowtype;
  recipient text; t timestamptz := clock_timestamp();
begin
 select * into o from public.vector_mail_outbox where id=p_id;
 if o.id is null then return 'not_current'; end if;
 if o.subscription_id is not null then
   select * into s from public.vector_newsletter_subscriptions where id=o.subscription_id for update;
 end if;
 select * into o from public.vector_mail_outbox where id=p_id for update;
 t:=clock_timestamp();
 if o.status <> 'leased' or o.worker is distinct from p_worker or o.lease_until <= t then return 'not_current'; end if;
 if o.first_attempt_at <= t-interval '23 hours' then
   update public.vector_mail_outbox set status='failed',worker=null,lease_until=null,
     last_error_code='RETRY_BUDGET_EXHAUSTED',finished_at=t,updated_at=t where id=o.id;
   return 'not_current';
 end if;
 if o.subscription_id is not null and (s.requested_at <> o.subscription_requested_at
   or s.status <> (case when o.kind='newsletter_confirm' then 'pending' else 'active' end)) then
   update public.vector_mail_outbox set status='suppressed',worker=null,lease_until=null,
     last_error_code='SUBSCRIPTION_NOT_CURRENT',finished_at=t,updated_at=t where id=o.id;
   return 'not_current';
 end if;
 if o.subscription_id is not null then recipient:=s.email;
 else select i.email into recipient from public.vector_inquiries i where i.id=o.inquiry_id; end if;
 if public.vector_mail_reserved_recipient(recipient) then
   update public.vector_mail_outbox set status='suppressed',worker=null,lease_until=null,
     last_error_code='RESERVED_RECIPIENT',finished_at=t,updated_at=t where id=o.id;
   return 'not_current';
 end if;
 if o.subscription_id is not null and not exists (
   select 1 from public.vector_mail_tokens mt where mt.outbox_id=o.id and mt.used_at is null and mt.expires_at>t
     and (o.kind='newsletter_confirm' or exists (
       select 1 from public.vector_unsubscribe_tokens ut where ut.token_hash=mt.token_hash
         and ut.subscription_id=s.id and ut.used_at is null and ut.expires_at>t))) then return 'not_current'; end if;
 update public.vector_mail_outbox set status='sending',updated_at=t where id=o.id;
 return 'sending';
end;
$$;

create function public.vector_finish_mail(p_id uuid,p_worker uuid,p_result text,p_provider_id text,p_error_code text)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare o public.vector_mail_outbox%rowtype; target text; t timestamptz := clock_timestamp();
begin
 if p_result is null or p_result not in ('sent','retry','delivery_unknown','failed','suppressed')
   or length(p_provider_id)>500 or (p_error_code is not null and p_error_code !~ '^[A-Z][A-Z_]{0,63}$')
 then raise exception 'Invalid mail result'; end if;
 select * into o from public.vector_mail_outbox where id=p_id for update;
 t:=clock_timestamp();
 if o.id is null or o.worker is distinct from p_worker or o.status not in ('leased','sending') then return 'recorded'; end if;
 if o.status='sending' and o.lease_until <= t then
   target:='delivery_unknown'; p_error_code:='LEASE_EXPIRED_DURING_SEND';
 elsif o.status='leased' and o.lease_until <= t then return 'recorded';
 elsif o.status='leased' and p_result in ('sent','delivery_unknown') then return 'recorded';
 elsif p_result='retry' and (o.attempts>=5 or o.first_attempt_at <= t-interval '23 hours') then
   target:='failed'; p_error_code:='RETRY_BUDGET_EXHAUSTED';
 else target:=p_result; end if;
 update public.vector_mail_outbox set status=target,worker=null,lease_until=null,
   next_attempt_at=case when target='retry' then t+make_interval(secs=>least(900,60*(2^(o.attempts-1))::integer)) else next_attempt_at end,
   provider_id=case when target='sent' then p_provider_id else null end,last_error_code=p_error_code,
   sent_at=case when target='sent' then t else null end,
   finished_at=case when target='retry' then null else t end,updated_at=t where id=o.id;
 return 'recorded';
end;
$$;

create function public.vector_confirm_newsletter(p_token_hash text,p_ip_hash text)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare s public.vector_newsletter_subscriptions%rowtype; o public.vector_mail_outbox%rowtype;
  n integer; w timestamptz := date_trunc('hour', now()); t timestamptz := clock_timestamp();
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
   or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then return 'invalid_or_expired'; end if;
 perform pg_advisory_xact_lock(hashtextextended('vector:confirm:ip:'||p_ip_hash,0));
 insert into public.vector_inquiry_limits(bucket_key,window_start,attempts) values('confirm:ip:'||p_ip_hash,w,1)
 on conflict(bucket_key) do update set
   attempts=case when vector_inquiry_limits.window_start<w then 1 else vector_inquiry_limits.attempts+1 end,
   window_start=w returning attempts into n;
 if n>20 then return 'rate_limited'; end if;
 select s1.* into s from public.vector_newsletter_subscriptions s1
 join public.vector_mail_outbox o1 on o1.subscription_id=s1.id
 join public.vector_mail_tokens mt on mt.outbox_id=o1.id
 where mt.token_hash=p_token_hash and mt.used_at is null and mt.expires_at>t
   and o1.kind='newsletter_confirm' and o1.subscription_requested_at=s1.requested_at
   and s1.status='pending' for update of s1;
 if s.id is null then return 'invalid_or_expired'; end if;
 select o1.* into o from public.vector_mail_outbox o1
 join public.vector_mail_tokens mt on mt.outbox_id=o1.id where mt.token_hash=p_token_hash;
 -- Recheck after acquiring the subscription lock; concurrent consumption cannot win twice.
 t:=clock_timestamp();
 update public.vector_mail_tokens set used_at=t
 where token_hash=p_token_hash and used_at is null and expires_at>t;
 if not found or s.status<>'pending' or s.requested_at<>o.subscription_requested_at then return 'invalid_or_expired'; end if;
 update public.vector_newsletter_subscriptions set status='active',confirmed_at=t where id=s.id;
 update public.vector_mail_tokens mt set used_at=t from public.vector_mail_outbox o1
 where mt.outbox_id=o1.id and o1.subscription_id=s.id and o1.kind='newsletter_confirm' and mt.used_at is null;
 insert into public.vector_mail_outbox(kind,subscription_id,subscription_requested_at,locale,status,last_error_code,finished_at)
 values('newsletter_welcome',s.id,s.requested_at,o.locale,
   case when public.vector_mail_reserved_recipient(s.email) then 'suppressed' else 'queued' end,
   case when public.vector_mail_reserved_recipient(s.email) then 'RESERVED_RECIPIENT' end,
   case when public.vector_mail_reserved_recipient(s.email) then t end)
 on conflict do nothing;
 return 'confirmed';
end;
$$;

revoke all on function public.vector_claim_mail(integer,uuid),
  public.vector_register_mail_token(uuid,uuid,text,timestamptz),
  public.vector_start_mail(uuid,uuid),public.vector_finish_mail(uuid,uuid,text,text,text),
  public.vector_confirm_newsletter(text,text) from public, anon, authenticated;
grant execute on function public.vector_claim_mail(integer,uuid),
  public.vector_register_mail_token(uuid,uuid,text,timestamptz),
  public.vector_start_mail(uuid,uuid),public.vector_finish_mail(uuid,uuid,text,text,text),
  public.vector_confirm_newsletter(text,text) to service_role;
comment on table public.vector_mail_outbox is 'Private mail metadata; PII remains in the original inquiry/subscription. Delivery unknown requires manual review, never automatic resend.';
comment on table public.vector_mail_tokens is 'Immutable SHA-256 token hashes only; no bearer tokens. Expiry is anchored to the first claimed attempt.';
commit;
