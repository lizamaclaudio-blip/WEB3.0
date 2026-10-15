-- Owner-session rollback checks. No worker, SMTP call, policy change or DELETE.
-- Synthetic retry fixtures only; pre-existing terminal mail is never modified.
begin;
do $qa$
declare
  b text := 'vector-retry-qa-' || gen_random_uuid()::text;
  em text; eh text; ip text; r text; v record; i integer;
  w uuid := gen_random_uuid(); fixture uuid; receipt uuid; internal uuid; ambiguity uuid;
  first_at timestamptz; delay_seconds numeric; terminal_before bigint;
begin
  select count(*) into terminal_before from public.vector_mail_outbox
    where status in ('sent','delivery_unknown');
  em:=b||'@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  r:=public.vector_submit_inquiry('contact',em,'QA','Synthetic backoff verification','fr',
    '2026-10-v1',ip,eh,false,null);
  if r<>'accepted' then raise exception 'Retry fixture rejected'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select id into fixture from public.vector_inquiries where email_hash=eh;
  select id into receipt from public.vector_mail_outbox where inquiry_id=fixture and kind='contact_receipt';
  select id into internal from public.vector_mail_outbox where inquiry_id=fixture and kind='internal_contact';
  update public.vector_mail_outbox set next_attempt_at=clock_timestamp()+interval '2 days'
    where inquiry_id=fixture;
  for i in 1..5 loop
    update public.vector_mail_outbox set next_attempt_at='1900-01-01' where id=receipt;
    select * into v from public.vector_claim_mail(1,w);
    if v.id is distinct from receipt or v.attempts<>i then raise exception 'Bounded attempt % was not claimed',i; end if;
    if i=1 then first_at:=v.first_attempt_at;
    elsif v.first_attempt_at<>first_at then raise exception 'Retry extended first-attempt budget'; end if;
    r:=public.vector_start_mail(receipt,w);
    if r<>'sending' then raise exception 'Retry failed to cross recorded sending boundary'; end if;
    r:=public.vector_finish_mail(receipt,w,'retry',null,'SMTP_TEMPORARY_REJECTION');
    if r<>'recorded' then raise exception 'Retry persistence failed'; end if;
    if i<5 then
      select extract(epoch from (next_attempt_at-updated_at)) into delay_seconds
        from public.vector_mail_outbox where id=receipt and status='retry' and attempts=i and worker is null and lease_until is null;
      if delay_seconds is distinct from (60*(2^(i-1)))::numeric then raise exception 'Backoff at attempt % is incorrect',i; end if;
    elsif not exists (select 1 from public.vector_mail_outbox where id=receipt
      and status='failed' and attempts=5 and last_error_code='RETRY_BUDGET_EXHAUSTED' and finished_at is not null)
    then raise exception 'Fifth rejection was not final'; end if;
  end loop;

  -- A failure remains final despite a stale successful acknowledgement.
  perform public.vector_finish_mail(receipt,w,'sent','late-synthetic-ack',null);
  if not exists (select 1 from public.vector_mail_outbox where id=receipt and status='failed'
      and attempts=5 and provider_id is null and sent_at is null)
  then raise exception 'Terminal failure was overwritten'; end if;

  em:=b||'-ambiguity@qa-vector.example.org'; eh:=md5(em)||repeat('1',32); ip:=md5(em)||repeat('0',32);
  r:=public.vector_submit_inquiry('contact',em,'QA','Synthetic ambiguity verification','en',
    '2026-10-v1',ip,eh,false,null);
  if r<>'accepted' then raise exception 'Ambiguity fixture rejected'; end if;
  set constraints vector_inquiry_mail_enqueue immediate;
  set constraints vector_inquiry_mail_enqueue deferred;
  select o.id into ambiguity from public.vector_mail_outbox o join public.vector_inquiries q on q.id=o.inquiry_id
    where q.email_hash=eh and o.kind='contact_receipt';
  update public.vector_mail_outbox set next_attempt_at=clock_timestamp()+interval '2 days'
    where inquiry_id=(select id from public.vector_inquiries where email_hash=eh);

  -- The 23-hour cap also finalizes work whose fifth attempt was never reached.
  update public.vector_mail_outbox set status='retry',attempts=1,
    first_attempt_at=clock_timestamp()-interval '23 hours 1 second',next_attempt_at='1900-01-01' where id=internal;
  -- Keep a separate fresh synthetic row eligible so no real work is leased.
  update public.vector_mail_outbox set next_attempt_at='1900-01-02' where id=ambiguity;
  select * into v from public.vector_claim_mail(1,w);
  if v.id is distinct from ambiguity or not exists (select 1 from public.vector_mail_outbox where id=internal
      and status='failed' and attempts=1 and last_error_code='RETRY_BUDGET_EXHAUSTED')
  then raise exception 'Total retry time cap failed'; end if;
  perform public.vector_start_mail(ambiguity,w);
  perform public.vector_finish_mail(ambiguity,w,'delivery_unknown',null,'SMTP_DELIVERY_UNKNOWN');
  perform public.vector_finish_mail(ambiguity,w,'retry',null,'SMTP_PREACCEPT_CONNECTION');
  if not exists (select 1 from public.vector_mail_outbox where id=ambiguity and status='delivery_unknown'
      and provider_id is null and worker is null and lease_until is null)
  then raise exception 'Ambiguous SMTP outcome was retried'; end if;
  if (select count(*) from public.vector_mail_outbox where status in ('sent','delivery_unknown'))<>terminal_before+1
  then raise exception 'Pre-existing terminal count changed'; end if;
  if not exists (select 1 from public.vector_inquiries where id=fixture and message='Synthetic backoff verification')
  then raise exception 'Failed mail lost the stored inquiry'; end if;
end
$qa$;
select 'passed' as web44_retry_integration;
rollback;
