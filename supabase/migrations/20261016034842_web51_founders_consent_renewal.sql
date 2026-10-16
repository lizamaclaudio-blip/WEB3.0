-- Renew an explicitly requested news preference through the existing idempotent mail queue.
-- No jobs are executed, no historical requests changed, no schedules enabled.
create or replace function public.vector_founders_register(p_email text,p_email_hash text,p_name text,p_locale text,p_country text,p_newsletter boolean,p_ip_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare inserted uuid; outcome text; old_status text; old_newsletter boolean;
begin
 if p_email is null or p_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' or p_newsletter is null then return 'invalid'; end if;
 if not vector_community_private.allow_request('founders',p_ip_hash,5) then return 'rate_limited'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_email,51));
 select status,newsletter_consent into old_status,old_newsletter from vector_community_private.founders_notices where email=p_email for update;
 insert into vector_community_private.founders_notices(email,email_hash,name,locale,country,notice_consent_version,newsletter_consent)
 values(p_email,p_email_hash,p_name,p_locale,p_country,'2026-10-founders-notice-v1',p_newsletter) on conflict(email) do nothing returning id into inserted;
 if inserted is null then
  update vector_community_private.founders_notices set status=case when status='withdrawn' then 'pending' else status end,
   notice_consented_at=case when status='withdrawn' then now() else notice_consented_at end,
   newsletter_consent=newsletter_consent or p_newsletter where email=p_email;
 end if;
 if p_newsletter then
  outcome:=public.vector_submit_inquiry('interest',p_email,p_name,'',p_locale,'2026-10-v1',p_ip_hash,p_email_hash,true,'2026-10-news-v1');
  if outcome<>'accepted' then raise exception 'Storage unavailable'; end if;
 end if;
 return 'saved_pending_verification';
end $$;
