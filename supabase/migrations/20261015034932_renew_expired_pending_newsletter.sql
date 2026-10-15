-- Renew an expired pending newsletter cycle only after a fresh explicit opt-in.
-- Pending repeats inside 24 hours and every active subscription retain their cycle.
-- No backfill and no changes to existing outbox rows, sent mail, or token hashes.
-- Current-cycle checks already invalidate the old links after an explicit renewal.
begin;

create or replace function public.vector_submit_inquiry(
 p_kind text, p_email text, p_name text, p_message text, p_locale text,
 p_consent_version text, p_ip_hash text, p_email_hash text,
 p_newsletter_consent boolean, p_newsletter_consent_version text
) returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare k text; n integer; w timestamptz := date_trunc('hour', now());
  renewal_at timestamptz := clock_timestamp();
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
       or (vector_newsletter_subscriptions.status = 'pending'
         and vector_newsletter_subscriptions.requested_at <= renewal_at - interval '24 hours')
       then greatest(renewal_at, vector_newsletter_subscriptions.requested_at + interval '1 microsecond')
       else vector_newsletter_subscriptions.requested_at end,
     confirmed_at = case when vector_newsletter_subscriptions.status = 'unsubscribed'
       or (vector_newsletter_subscriptions.status = 'pending'
         and vector_newsletter_subscriptions.requested_at <= renewal_at - interval '24 hours')
       then null else vector_newsletter_subscriptions.confirmed_at end,
     status = case when vector_newsletter_subscriptions.status = 'active' then 'active' else 'pending' end,
     unsubscribed_at = null;
 end if;
 return 'accepted';
end;
$$;
revoke all on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.vector_submit_inquiry(text,text,text,text,text,text,text,text,boolean,text) to service_role;

commit;

