-- Synthetic integration checks. Every change is rolled back, including RPC cleanup.
-- Run only after the additive schema exists; requires the SQL owner test session.
begin;
do $qa$
declare
  b text := 'vector-qa-' || gen_random_uuid()::text;
  em text; eh text; ip text; r text;
  t1 text; t2 text; tx text;
  i integer; v record; rejected boolean;
begin
  -- Contact without newsletter consent.
  em := b || '-contact@example.test';
  eh := md5(em) || repeat('1',32);
  ip := md5(b || '-contact') || repeat('0',32);
  r := public.vector_submit_inquiry(
    'contact',em,'QA','Synthetic integration contact','es',
    '2026-10-v1',ip,eh,false,null);
  if r is distinct from 'accepted' then raise exception 'contact failed'; end if;
  if not exists (
    select 1 from public.vector_inquiries
    where email_hash=eh and not newsletter_opt_in
      and newsletter_consent_version is null
      and newsletter_opt_in_at is null
  ) then raise exception 'contact consent persistence failed'; end if;
  if exists (
    select 1 from public.vector_newsletter_subscriptions where email_hash=eh
  ) then raise exception 'unrequested subscription'; end if;

  -- Explicit opt-in remains pending; repeat deduplicates.
  -- A later false choice must not erase the earlier preference.
  em := b || '-newsletter@example.test';
  eh := md5(em) || repeat('1',32);
  ip := md5(b || '-newsletter') || repeat('0',32);
  for i in 1..3 loop
    r := public.vector_submit_inquiry(
      'interest',em,'','','fr','2026-10-v1',ip,eh,i<3,
      case when i<3 then '2026-10-news-v1' else null end);
    if r is distinct from 'accepted' then raise exception 'newsletter submission % failed',i; end if;
  end loop;
  if (select count(*) from public.vector_newsletter_subscriptions where email_hash=eh) <> 1
    or not exists (
      select 1 from public.vector_newsletter_subscriptions
      where email_hash=eh and status='pending' and confirmed_at is null
        and consent_version='2026-10-news-v1'
    )
  then raise exception 'newsletter pending/dedup failed'; end if;
  if (select count(*) from public.vector_inquiries
      where email_hash=eh and newsletter_opt_in
        and newsletter_opt_in_at is not null
        and newsletter_consent_version='2026-10-news-v1') <> 2
  then raise exception 'newsletter consent audit failed'; end if;

  -- Token issuance requires a confirmed active subscription.
  t1 := md5(b || '-token1') || repeat('b',32);
  t2 := md5(b || '-token2') || repeat('c',32);
  tx := md5(b || '-expired') || repeat('e',32);
  r := public.vector_register_unsubscribe_token(eh,t1,now()+interval '1 day');
  if r is distinct from 'not_active' then raise exception 'pending token issuance allowed'; end if;
  update public.vector_newsletter_subscriptions
    set status='active',confirmed_at=now() where email_hash=eh;
  foreach r in array array[t1,t2,tx] loop
    if public.vector_register_unsubscribe_token(eh,r,now()+interval '1 day')
       is distinct from 'registered'
    then raise exception 'token registration failed'; end if;
  end loop;
  update public.vector_unsubscribe_tokens
    set created_at=now()-interval '2 hours',
        expires_at=now()-interval '1 hour'
    where token_hash=tx;
  if public.vector_unsubscribe(tx,ip) is distinct from 'invalid_or_expired'
    or not exists (
      select 1 from public.vector_newsletter_subscriptions
      where email_hash=eh and status='active'
    )
  then raise exception 'expired token handling failed'; end if;
  r := public.vector_unsubscribe(t1,ip);
  if r is distinct from 'unsubscribed' then raise exception 'unsubscribe failed'; end if;
  r := public.vector_unsubscribe(t1,ip);
  if r is distinct from 'invalid_or_expired' then raise exception 'token reused'; end if;
  r := public.vector_unsubscribe(t2,ip);
  if r is distinct from 'invalid_or_expired' then raise exception 'sibling token not revoked'; end if;
  if not exists (
      select 1 from public.vector_newsletter_subscriptions
      where email_hash=eh and status='unsubscribed' and unsubscribed_at is not null
    )
  then raise exception 'one-time unsubscribe/revocation failed'; end if;

  -- Email limit: three accepted with different IP hashes, fourth rejected.
  em := b || '-email-limit@example.test';
  eh := md5(em) || repeat('1',32);
  for i in 1..4 loop
    ip := md5(b || '-email-ip-' || i) || repeat('0',32);
    r := public.vector_submit_inquiry(
      'interest',em,'','','en','2026-10-v1',ip,eh,false,null);
    if r is distinct from (case when i<=3 then 'accepted' else 'rate_limited' end)
    then raise exception 'email limit failed at %',i; end if;
  end loop;
  if (select count(*) from public.vector_inquiries where email_hash=eh) <> 3
  then raise exception 'email limit stored rejected inquiry'; end if;

  -- IP limit: five different emails accepted, sixth rejected.
  ip := md5(b || '-ip-limit') || repeat('0',32);
  for i in 1..6 loop
    em := b || '-ip-limit-' || i || '@example.test';
    eh := md5(em) || repeat('1',32);
    r := public.vector_submit_inquiry(
      'interest',em,'','','en','2026-10-v1',ip,eh,false,null);
    if r is distinct from (case when i<=5 then 'accepted' else 'rate_limited' end)
    then raise exception 'IP limit failed at %',i; end if;
  end loop;
  if (select count(*) from public.vector_inquiries
      where email like b || '-ip-limit-%') <> 5
  then raise exception 'IP limit stored rejected inquiry'; end if;

  -- Server-side validation must reject before storing.
  em := b || '-invalid@example.test';
  eh := md5(em) || repeat('1',32);
  ip := md5(b || '-invalid') || repeat('0',32);
  for v in
    select * from (values
      ('de','2026-10-v1','Synthetic QA contact',false,null::text),
      ('es','wrong','Synthetic QA contact',false,null),
      ('fr','2026-10-v1','short',false,null),
      ('en','2026-10-v1','Synthetic QA contact',true,'wrong'),
      ('es','2026-10-v1','Synthetic QA contact',false,'2026-10-news-v1'),
      ('es','2026-10-v1','Synthetic QA contact',null::boolean,null)
    ) as x(locale,consent,message,news,news_version)
  loop
    rejected := false;
    begin
      perform public.vector_submit_inquiry(
        'contact',em,'QA',v.message,v.locale,v.consent,
        ip,eh,v.news,v.news_version);
    exception when raise_exception then
      if sqlerrm <> 'Invalid inquiry' then raise; end if;
      rejected := true;
    end;
    if not rejected then raise exception 'invalid input accepted'; end if;
  end loop;
  if exists (select 1 from public.vector_inquiries where email_hash=eh)
    or exists (select 1 from public.vector_inquiry_limits where bucket_key='ip:'||ip)
  then raise exception 'validation produced side effects'; end if;

  -- Unsubscribe limit: 20 invalid lookups, then rate limited.
  ip := md5(b || '-unsubscribe-limit') || repeat('0',32);
  for i in 1..21 loop
    r := public.vector_unsubscribe(md5(b || '-missing') || repeat('f',32),ip);
    if r is distinct from (
      case when i<=20 then 'invalid_or_expired' else 'rate_limited' end)
    then raise exception 'unsubscribe limit failed at %',i; end if;
  end loop;

  if (select count(*) from public.vector_inquiries where email like b || '%') <> 12
  then raise exception 'unexpected synthetic inquiry count'; end if;
end
$qa$;
select 'passed' as integration_outcome;
rollback;
