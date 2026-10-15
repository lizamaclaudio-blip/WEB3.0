-- Owner-session integration checks after web43-mail. No SMTP calls are made.
-- All synthetic records, claims, rate buckets and changes roll back atomically.
-- QA addresses are under qa-vector.example.org; never run a mail worker here.
begin;
do $qa$
declare
  b text := 'vector-mail-qa-' || gen_random_uuid()::text;
  em text; eh text; ip text; r text; t1 text; t2 text; tw text; missing text;
  worker1 uuid := gen_random_uuid(); worker2 uuid := gen_random_uuid();
  contact_id uuid; reserved_id uuid; qa_subscription_id uuid; legacy_id uuid;
  a uuid; z uuid; c uuid; d uuid; news uuid; welcome uuid; next_news uuid;
  cycle timestamptz; first_at timestamptz; expiration timestamptz;
  v record; i integer; rejected boolean; baseline bigint;
begin
  -- Count only metadata, never inspect historical request PII.
  select count(*) into baseline from public.vector_mail_outbox;
  missing:=md5(b||'-missing')||repeat('a',32);
  em:=b||'-contact@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  r:=public.vector_submit_inquiry('contact',em,'QA','Synthetic transactional contact','es','2026-10-v1',ip,eh,false,null);
  if r is distinct from 'accepted' then raise exception 'Original contact RPC rejected'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select id into contact_id from public.vector_inquiries where email_hash=eh;
  if contact_id is null or not exists (select 1 from public.vector_inquiries where id=contact_id
      and message='Synthetic transactional contact' and not newsletter_opt_in)
    or exists (select 1 from public.vector_newsletter_subscriptions where email_hash=eh)
    or (select count(*) from public.vector_mail_outbox where inquiry_id=contact_id)<>2
    or not exists (select 1 from public.vector_mail_outbox where inquiry_id=contact_id and kind='contact_receipt' and status='queued')
    or not exists (select 1 from public.vector_mail_outbox where inquiry_id=contact_id and kind='internal_contact' and status='queued')
  then raise exception 'Contact persistence / explicit consent / job kinds failed'; end if;
  select id into a from public.vector_mail_outbox where inquiry_id=contact_id and kind='contact_receipt';
  select id into z from public.vector_mail_outbox where inquiry_id=contact_id and kind='internal_contact';
  update public.vector_mail_outbox set next_attempt_at=clock_timestamp()+interval '2 days' where inquiry_id=contact_id;

  em:=b||'-reserved@example.test'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  if public.vector_submit_inquiry('contact',em,'QA','Synthetic reserved contact','en','2026-10-v1',ip,eh,true,'2026-10-news-v1')<>'accepted'
  then raise exception 'Reserved request was lost'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select id into reserved_id from public.vector_inquiries where email_hash=eh;
  if (select count(*) from public.vector_mail_outbox where inquiry_id=reserved_id and status='suppressed')<>2
    or not exists (select 1 from public.vector_mail_outbox o join public.vector_newsletter_subscriptions s on s.id=o.subscription_id
      where s.email_hash=eh and o.kind='newsletter_confirm' and o.status='suppressed')
  then raise exception 'Reserved contact / internal / confirmation suppression failed'; end if;
  foreach em in array array['qa@sub.test','qa@sub.example','qa@sub.invalid','qa@localhost','qa@sub.localhost','qa@example.com'] loop
    if not public.vector_mail_reserved_recipient(em) then raise exception 'Reserved recipient guard failed'; end if;
  end loop;
  if public.vector_mail_reserved_recipient('qa@qa-vector.example.org') then raise exception 'QA address incorrectly suppressed'; end if;

  -- An interest request without explicit consent does not create mail or a subscription.
  em:=b||'-interest@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  if public.vector_submit_inquiry('interest',em,'','','fr','2026-10-v1',ip,eh,false,null)<>'accepted'
  then raise exception 'Interest request failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  if exists (select 1 from public.vector_newsletter_subscriptions where email_hash=eh)
    or exists (select 1 from public.vector_mail_outbox o join public.vector_inquiries q on q.id=o.inquiry_id where q.email_hash=eh)
  then raise exception 'Implicit newsletter / unrequested interest mail'; end if;

  -- Existing-style pending rows and UPDATEs are not backfilled.
  insert into public.vector_newsletter_subscriptions(email_hash,email,locale,consent_version)
  values(md5(b||'-legacy')||repeat('1',32),b||'-legacy@qa-vector.example.org','en','2026-10-news-v1') returning id into legacy_id;
  update public.vector_newsletter_subscriptions set locale='es' where id=legacy_id;
  if exists (select 1 from public.vector_mail_outbox where subscription_id=legacy_id)
  then raise exception 'Historical pending subscription was backfilled'; end if;

  -- Defer trigger correctly observes the subsequent subscription UPSERT.
  em:=b||'-newsletter@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  if public.vector_submit_inquiry('interest',em,'','','en','2026-10-v1',ip,eh,true,'2026-10-news-v1')<>'accepted'
  then raise exception 'Newsletter submit failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select id,requested_at into qa_subscription_id,cycle from public.vector_newsletter_subscriptions where email_hash=eh;
  if public.vector_submit_inquiry('interest',em,'','','fr','2026-10-v1',ip,eh,true,'2026-10-news-v1')<>'accepted'
  then raise exception 'Repeated pending submit failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  if (select count(*) from public.vector_mail_outbox where subscription_id=qa_subscription_id and kind='newsletter_confirm')<>1
  then raise exception 'Pending confirmation dedup failed'; end if;
  if not exists (select 1 from public.vector_newsletter_subscriptions s where s.id=qa_subscription_id and s.requested_at=cycle and s.status='pending')
  then raise exception 'Pending repeat changed subscription cycle'; end if;
  select o.id into news from public.vector_mail_outbox o where o.subscription_id=qa_subscription_id and o.kind='newsletter_confirm';
  if not exists (select 1 from public.vector_mail_outbox where id=news and locale='en')
  then raise exception 'Mail locale was not snapshotted'; end if;
  update public.vector_mail_outbox set next_attempt_at=clock_timestamp()+interval '2 days' where id=news;

  -- Controlled queue order means claim tests operate on QA rows only.
  update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=a;
  select * into v from public.vector_claim_mail(1,worker1);
  if v.id is distinct from a or v.kind<>'contact_receipt' or v.attempts<>1 or v.first_attempt_at is null
    or v.locale<>'es' or v.name<>'QA' or v.message<>'Synthetic transactional contact'
    or v.email<>b||'-contact@qa-vector.example.org' or length(v.email_hash)<>64 or v.created_at is null
  then raise exception 'Claim payload/ordering failed'; end if;
  first_at:=v.first_attempt_at;
  if public.vector_start_mail(a,worker2)<>'not_current' then raise exception 'Wrong owner started mail'; end if;
  r:=public.vector_finish_mail(a,worker2,'suppressed',null,'TEST_GUARD');
  if r<>'recorded'
    or not exists (select 1 from public.vector_mail_outbox where id=a and status='leased' and worker=worker1)
  then raise exception 'Wrong owner changed mail'; end if;
  update public.vector_mail_outbox set next_attempt_at='1900-01-02' where id=z;
  select * into v from public.vector_claim_mail(1,worker2);
  if v.id is distinct from z then raise exception 'Unexpired lease claimed twice'; end if;
  if public.vector_start_mail(z,worker2)<>'sending' then raise exception 'Internal send could not start'; end if;
  update public.vector_mail_outbox set lease_until=clock_timestamp()-interval '1 second' where id in (a,z);
  select * into v from public.vector_claim_mail(1,worker2);
  if v.id is distinct from a or v.attempts<>2 or v.first_attempt_at<>first_at then raise exception 'Expired lease reclaim/fixed first attempt failed'; end if;
  if not exists (select 1 from public.vector_mail_outbox where id=z and status='delivery_unknown' and worker is null)
  then raise exception 'Ambiguous sending lease was retried'; end if;
  perform public.vector_finish_mail(z,worker2,'sent','late-success',null);
  if not exists (select 1 from public.vector_mail_outbox where id=z and status='delivery_unknown' and provider_id is null)
  then raise exception 'Terminal ambiguity overwritten'; end if;
  if public.vector_start_mail(a,worker1)<>'not_current' then raise exception 'Superseded owner started send'; end if;
  perform public.vector_finish_mail(a,worker2,'retry',null,'SMTP_CONNECT');
  if not exists (select 1 from public.vector_mail_outbox where id=a and status='retry' and next_attempt_at>clock_timestamp() and first_attempt_at=first_at)
  then raise exception 'Bounded pre-send retry failed'; end if;
  update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=a;
  select * into v from public.vector_claim_mail(1,worker1);
  if v.id is distinct from a or v.attempts<>3 then raise exception 'Retry claim failed'; end if;
  if public.vector_start_mail(a,worker1)<>'sending' then raise exception 'Receipt send failed to start'; end if;
  perform public.vector_finish_mail(a,worker1,'retry',null,'SMTP_REJECTED');
  update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=a;
  select * into v from public.vector_claim_mail(1,worker1);
  if v.id is distinct from a or v.attempts<>4 or v.first_attempt_at<>first_at then raise exception 'Definitive pre-acceptance retry failed'; end if;
  perform public.vector_start_mail(a,worker1);
  perform public.vector_finish_mail(a,worker1,'sent','qa-provider-id',null);
  perform public.vector_finish_mail(a,worker1,'retry',null,'SMTP_CONNECT');
  if not exists (select 1 from public.vector_mail_outbox where id=a and status='sent' and provider_id='qa-provider-id' and sent_at is not null)
  then raise exception 'Sent finish not idempotent'; end if;

  -- Token registration is immutable and anchored to the first claim, even across retry.
  update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=news;
  select * into v from public.vector_claim_mail(1,worker1);
  if v.id is distinct from news then raise exception 'Confirmation claim failed'; end if;
  first_at:=v.first_attempt_at; expiration:=first_at+interval '24 hours';
  t1:=md5(b||'-confirm')||repeat('b',32); t2:=md5(b||'-other-confirm')||repeat('c',32);
  -- Keep mutations in separate statements. SQL boolean expressions do not
  -- guarantee evaluation order, and EXISTS initplans can run before a writer.
  r:=public.vector_register_mail_token(news,worker2,t1,expiration);
  if r<>'not_current' then raise exception 'Token owner failed'; end if;
  r:=public.vector_register_mail_token(news,worker1,t1,expiration);
  if r<>'registered' then raise exception 'Token registration failed'; end if;
  r:=public.vector_register_mail_token(news,worker1,t1,expiration);
  if r<>'registered' then raise exception 'Token registration idempotence failed'; end if;
  r:=public.vector_register_mail_token(news,worker1,t2,expiration);
  if r<>'not_current' then raise exception 'Token immutability failed'; end if;
  rejected:=false;
  begin perform public.vector_register_mail_token(news,worker1,t1,expiration+interval '1 hour');
  exception when raise_exception then
    if sqlerrm<>'Invalid mail token expiry' then raise; end if; rejected:=true;
  end;
  if not rejected then raise exception 'Token expiry was extended'; end if;
  perform public.vector_finish_mail(news,worker1,'retry',null,'SMTP_CONNECT');
  update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=news;
  select * into v from public.vector_claim_mail(1,worker2);
  r:=public.vector_register_mail_token(news,worker2,t1,expiration);
  if v.id is distinct from news or v.first_attempt_at<>first_at
    or r<>'registered'
  then raise exception 'Retry changed token lifetime'; end if;
  if public.vector_start_mail(news,worker2)<>'sending' then raise exception 'Confirmation start failed'; end if;
  perform public.vector_finish_mail(news,worker2,'sent','qa-confirm',null);
  if public.vector_confirm_newsletter(missing,ip)<>'invalid_or_expired' then raise exception 'Missing confirmation accepted'; end if;
  update public.vector_mail_tokens set created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour' where outbox_id=news;
  if public.vector_confirm_newsletter(t1,ip)<>'invalid_or_expired' then raise exception 'Expired confirmation accepted'; end if;
  update public.vector_mail_tokens set created_at=first_at,expires_at=expiration where outbox_id=news;
  r:=public.vector_confirm_newsletter(t1,ip);
  if r<>'confirmed' then raise exception 'Atomic confirmation failed'; end if;
  r:=public.vector_confirm_newsletter(t1,ip);
  if r<>'invalid_or_expired' then raise exception 'Single-use confirmation failed'; end if;
  if not exists (select 1 from public.vector_newsletter_subscriptions s where s.id=qa_subscription_id and s.status='active' and s.confirmed_at is not null)
    or (select count(*) from public.vector_mail_outbox o where o.subscription_id=qa_subscription_id and o.kind='newsletter_welcome')<>1
  then raise exception 'Confirmed subscription / single welcome failed'; end if;
  select o.id into welcome from public.vector_mail_outbox o where o.subscription_id=qa_subscription_id and o.kind='newsletter_welcome';
  if public.vector_submit_inquiry('interest',em,'','','es','2026-10-v1',ip,eh,true,'2026-10-news-v1')<>'accepted'
  then raise exception 'Active repeat failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  if not exists (select 1 from public.vector_newsletter_subscriptions s where s.id=qa_subscription_id and s.requested_at=cycle and s.status='active')
    or (select count(*) from public.vector_mail_outbox o where o.subscription_id=qa_subscription_id)<>2
  then raise exception 'Active repeat created new cycle or mail'; end if;
  if not exists (select 1 from public.vector_mail_outbox where id=welcome and locale='en')
  then raise exception 'Welcome did not preserve confirmation locale'; end if;

  update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=welcome;
  select * into v from public.vector_claim_mail(1,worker1);
  if v.id is distinct from welcome then raise exception 'Welcome claim failed'; end if;
  tw:=md5(b||'-unsubscribe')||repeat('d',32); expiration:=v.first_attempt_at+interval '30 days';
  r:=public.vector_register_mail_token(welcome,worker1,tw,expiration);
  if r<>'registered' then raise exception 'Welcome unsubscribe registration failed'; end if;
  r:=public.vector_register_mail_token(welcome,worker1,tw,expiration);
  if r<>'registered' then raise exception 'Welcome unsubscribe registration idempotence failed'; end if;
  if not exists (select 1 from public.vector_unsubscribe_tokens where token_hash=tw and expires_at=expiration)
  then raise exception 'Welcome unsubscribe token persistence failed'; end if;
  perform public.vector_start_mail(welcome,worker1);
  perform public.vector_finish_mail(welcome,worker1,'sent','qa-welcome',null);
  r:=public.vector_unsubscribe(tw,ip);
  if r<>'unsubscribed' then raise exception 'Existing unsubscribe RPC compatibility failed'; end if;
  r:=public.vector_unsubscribe(tw,ip);
  if r<>'invalid_or_expired' then raise exception 'Single-use unsubscribe RPC compatibility failed'; end if;

  -- Reset only the synthetic rate buckets to exercise a fourth inquiry/cycle.
  delete from public.vector_inquiry_limits where bucket_key in ('ip:'||ip,'email:'||eh);
  if public.vector_submit_inquiry('interest',em,'','','es','2026-10-v1',ip,eh,true,'2026-10-news-v1')<>'accepted'
  then raise exception 'Explicit resubscribe failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  r:=public.vector_confirm_newsletter(t1,ip);
  if not exists (select 1 from public.vector_newsletter_subscriptions s where s.id=qa_subscription_id and s.status='pending'
      and s.requested_at>cycle and s.confirmed_at is null and s.unsubscribed_at is null)
    or (select count(*) from public.vector_mail_outbox o where o.subscription_id=qa_subscription_id and o.kind='newsletter_confirm')<>2
    or r<>'invalid_or_expired'
  then raise exception 'Resubscription cycle / stale token failed'; end if;
  select o.id into next_news from public.vector_mail_outbox o where o.subscription_id=qa_subscription_id
    and o.kind='newsletter_confirm' and o.subscription_requested_at>cycle;
  update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=next_news;
  select * into v from public.vector_claim_mail(1,worker1);
  if v.id is distinct from next_news then raise exception 'Resubscription claim failed'; end if;
  if public.vector_register_mail_token(next_news,worker1,t2,v.first_attempt_at+interval '24 hours')<>'registered'
  then raise exception 'New-cycle token failed'; end if;
  update public.vector_newsletter_subscriptions set status='unsubscribed',unsubscribed_at=clock_timestamp() where id=qa_subscription_id;
  r:=public.vector_start_mail(next_news,worker1);
  if r<>'not_current'
    or not exists (select 1 from public.vector_mail_outbox where id=next_news and status='suppressed')
  then raise exception 'Current state was not rechecked immediately before send'; end if;
  r:=public.vector_confirm_newsletter(t2,ip);
  if r<>'invalid_or_expired' then raise exception 'Unsubscribed confirmation accepted'; end if;
  perform public.vector_finish_mail(next_news,worker1,'suppressed',null,'SUBSCRIPTION_NOT_CURRENT');

  -- Bound attempts and total time; never retry ambiguous sends.
  em:=b||'-budget@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  perform public.vector_submit_inquiry('contact',em,'QA','Synthetic retry budget contact','en','2026-10-v1',ip,eh,false,null);
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select o.id into c from public.vector_mail_outbox o join public.vector_inquiries q on q.id=o.inquiry_id where q.email_hash=eh and o.kind='contact_receipt';
  select o.id into d from public.vector_mail_outbox o join public.vector_inquiries q on q.id=o.inquiry_id where q.email_hash=eh and o.kind='internal_contact';
  update public.vector_mail_outbox set attempts=4,first_attempt_at=clock_timestamp()-interval '1 hour',next_attempt_at='1900-01-01' where id=c;
  update public.vector_mail_outbox set status='retry',attempts=1,first_attempt_at=clock_timestamp()-interval '24 hours',next_attempt_at='1900-01-02' where id=d;
  select * into v from public.vector_claim_mail(1,worker1);
  if v.id is distinct from c or v.attempts<>5 then raise exception 'Last bounded attempt claim failed'; end if;
  perform public.vector_start_mail(c,worker1);
  perform public.vector_finish_mail(c,worker1,'retry',null,'SMTP_CONNECT');
  if (select count(*) from public.vector_mail_outbox where id in (c,d) and status='failed')<>2
  then raise exception 'Retry attempt/time budget failed'; end if;

  -- Validation must not retain arbitrary provider errors or invalid state.
  foreach r in array array['SMTP 550 user@example.org','lower_case',repeat('A',65)] loop
    rejected:=false;
    begin perform public.vector_finish_mail(c,worker1,'failed',null,r);
    exception when raise_exception then
      if sqlerrm<>'Invalid mail result' then raise; end if; rejected:=true;
    end;
    if not rejected then raise exception 'Unsafe mail error code accepted'; end if;
  end loop;
  rejected:=false;
  begin perform public.vector_finish_mail(c,worker1,'failed',repeat('x',501),null);
  exception when raise_exception then
    if sqlerrm<>'Invalid mail result' then raise; end if; rejected:=true;
  end;
  if not rejected then raise exception 'Oversize provider id accepted'; end if;
  foreach i in array array[0,5] loop
    rejected:=false;
    begin perform public.vector_claim_mail(i,worker1);
    exception when raise_exception then
      if sqlerrm<>'Invalid mail claim' then raise; end if; rejected:=true;
    end;
    if not rejected then raise exception 'Unbounded claim accepted'; end if;
  end loop;
  rejected:=false;
  begin update public.vector_mail_outbox set attempts=6 where id=c;
  exception when check_violation then rejected:=true; end;
  if not rejected then raise exception 'Attempt constraint absent'; end if;
  rejected:=false;
  begin insert into public.vector_mail_outbox(kind,inquiry_id,locale) values('contact_receipt',contact_id,'es');
  exception when unique_violation then rejected:=true; end;
  if not rejected then raise exception 'Contact uniqueness absent'; end if;
  rejected:=false;
  begin insert into public.vector_mail_outbox(kind,subscription_id,subscription_requested_at,locale) values('newsletter_confirm',qa_subscription_id,cycle,'en');
  exception when unique_violation then rejected:=true; end;
  if not rejected then raise exception 'Cycle uniqueness absent'; end if;

  ip:=md5(b||'-confirm-limit')||repeat('0',32);
  for i in 1..21 loop
    r:=public.vector_confirm_newsletter(missing,ip);
    if r is distinct from (case when i<=20 then 'invalid_or_expired' else 'rate_limited' end)
    then raise exception 'Confirmation IP rate limit failed at %',i; end if;
  end loop;

  -- A fresh explicit opt-in may recover a pending cycle older than 24 hours.
  -- This fixture is isolated from sent jobs and never invokes an SMTP worker.
  em:=b||'-expired-pending@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  r:=public.vector_submit_inquiry('interest',em,'','','en','2026-10-v1',ip,eh,true,'2026-10-news-v1');
  if r<>'accepted' then raise exception 'Expired-cycle fixture submit failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select id into qa_subscription_id from public.vector_newsletter_subscriptions where email_hash=eh;
  select id into news from public.vector_mail_outbox where subscription_id=qa_subscription_id and kind='newsletter_confirm';
  cycle:=clock_timestamp()-interval '25 hours';
  update public.vector_newsletter_subscriptions set requested_at=cycle where id=qa_subscription_id;
  update public.vector_mail_outbox set subscription_requested_at=cycle,status='retry',attempts=1,
    first_attempt_at=cycle,next_attempt_at=clock_timestamp()+interval '2 days' where id=news;
  t2:=md5(b||'-expired-confirm')||repeat('e',32); expiration:=cycle+interval '24 hours';
  insert into public.vector_mail_tokens(outbox_id,token_hash,created_at,expires_at)
  values(news,t2,cycle,expiration);
  r:=public.vector_confirm_newsletter(t2,ip);
  if r<>'invalid_or_expired' then raise exception 'Expired pending-cycle token accepted'; end if;

  r:=public.vector_submit_inquiry('interest',em,'','','es','2026-10-v1',ip,eh,false,null);
  if r<>'accepted' then raise exception 'Non-opt-in expired-cycle inquiry failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  if not exists (select 1 from public.vector_newsletter_subscriptions where id=qa_subscription_id and status='pending' and requested_at=cycle)
    or (select count(*) from public.vector_mail_outbox where subscription_id=qa_subscription_id)<>1
  then raise exception 'Expired pending cycle renewed without explicit consent'; end if;

  r:=public.vector_submit_inquiry('interest',em,'','','fr','2026-10-v1',ip,eh,true,'2026-10-news-v1');
  if r<>'accepted' then raise exception 'Explicit expired-cycle renewal failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select requested_at into first_at from public.vector_newsletter_subscriptions where id=qa_subscription_id;
  if first_at<=cycle or first_at<clock_timestamp()-interval '1 minute'
    or not exists (select 1 from public.vector_newsletter_subscriptions where id=qa_subscription_id and status='pending'
      and confirmed_at is null and unsubscribed_at is null)
    or (select count(*) from public.vector_mail_outbox where subscription_id=qa_subscription_id and kind='newsletter_confirm')<>2
    or not exists (select 1 from public.vector_mail_outbox where subscription_id=qa_subscription_id
      and subscription_requested_at=first_at and locale='fr' and status='queued' and attempts=0)
  then raise exception 'Expired pending cycle did not enqueue one fresh confirmation'; end if;
  if not exists (select 1 from public.vector_mail_outbox where id=news and status='retry' and attempts=1
      and subscription_requested_at=cycle and first_attempt_at=cycle)
    or not exists (select 1 from public.vector_mail_tokens where outbox_id=news and token_hash=t2
      and expires_at=expiration and used_at is null)
  then raise exception 'Explicit renewal rewrote historical job/token state'; end if;
  -- Remove expiry as a confounding factor: the old cycle alone must reject it.
  update public.vector_mail_tokens set expires_at=clock_timestamp()+interval '1 hour' where outbox_id=news;
  r:=public.vector_confirm_newsletter(t2,ip);
  if r<>'invalid_or_expired' then raise exception 'Old-cycle link survived explicit pending renewal'; end if;

  -- Active subscriptions never renew, even when the original request is old.
  em:=b||'-old-active@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  cycle:=clock_timestamp()-interval '25 hours'; first_at:=cycle+interval '1 hour';
  insert into public.vector_newsletter_subscriptions(email_hash,email,locale,consent_version,status,requested_at,confirmed_at)
  values(eh,em,'en','2026-10-news-v1','active',cycle,first_at) returning id into qa_subscription_id;
  r:=public.vector_submit_inquiry('interest',em,'','','fr','2026-10-v1',ip,eh,true,'2026-10-news-v1');
  if r<>'accepted' then raise exception 'Old active repeat failed'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  if not exists (select 1 from public.vector_newsletter_subscriptions where id=qa_subscription_id
      and status='active' and requested_at=cycle and confirmed_at=first_at)
    or exists (select 1 from public.vector_mail_outbox where subscription_id=qa_subscription_id)
  then raise exception 'Active repeat renewed consent or enqueued mail'; end if;

  if (select count(*) from public.vector_mail_outbox)<baseline+10 then raise exception 'Synthetic durable queue rows missing'; end if;

  -- Private tables deny all API roles; only the five worker/server RPCs are granted.
  for v in select oid::regclass as object_name,relrowsecurity from pg_class
    where oid in ('public.vector_mail_outbox'::regclass,'public.vector_mail_tokens'::regclass)
  loop
    if not v.relrowsecurity or has_table_privilege('anon',v.object_name,'SELECT,INSERT,UPDATE,DELETE')
      or has_table_privilege('authenticated',v.object_name,'SELECT,INSERT,UPDATE,DELETE')
      or has_table_privilege('service_role',v.object_name,'SELECT,INSERT,UPDATE,DELETE')
    then raise exception 'Private mail table access exposed'; end if;
  end loop;
  for v in select p.oid,p.prosecdef,p.proconfig from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
    where ns.nspname='public' and p.proname in ('vector_claim_mail','vector_register_mail_token','vector_start_mail','vector_finish_mail','vector_confirm_newsletter')
  loop
    if not v.prosecdef or not (v.proconfig @> array['search_path=pg_catalog, public'])
      or has_function_privilege('anon',v.oid,'EXECUTE') or has_function_privilege('authenticated',v.oid,'EXECUTE')
      or not has_function_privilege('service_role',v.oid,'EXECUTE')
    then raise exception 'Mail RPC security grant/search_path failed'; end if;
  end loop;
  if not exists (select 1 from pg_trigger where tgrelid='public.vector_inquiries'::regclass
    and tgname='vector_inquiry_mail_enqueue' and tgdeferrable and tginitdeferred)
  then raise exception 'Enqueue trigger is not deferred'; end if;
end
$qa$;

set local role anon;
do $denied$
begin
  begin perform public.vector_claim_mail(1,gen_random_uuid()); raise exception 'Anonymous claim succeeded';
  exception when insufficient_privilege then null; end;
  begin perform public.vector_confirm_newsletter(repeat('a',64),repeat('b',64)); raise exception 'Anonymous confirmation succeeded';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.vector_mail_outbox limit 1; raise exception 'Anonymous outbox read succeeded';
  exception when insufficient_privilege then null; end;
end
$denied$;
reset role;
set local role authenticated;
do $denied$
begin
  begin perform public.vector_start_mail(gen_random_uuid(),gen_random_uuid()); raise exception 'Authenticated send succeeded';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.vector_mail_tokens limit 1; raise exception 'Authenticated token read succeeded';
  exception when insufficient_privilege then null; end;
end
$denied$;
reset role;
select 'passed' as mail_integration_outcome;
rollback;
