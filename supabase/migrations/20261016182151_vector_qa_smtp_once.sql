-- Additive, isolated QA receipt. No inquiry, subscription, historical outbox,
-- moderation, scheduler, extension or existing policy is modified.
begin;
create table vector_community_private.qa_mail_receipts (
 purpose text primary key check(purpose='web53_owner_smtp_single'),
 worker uuid not null,
 status text not null check(status in ('claimed','sent','failed','delivery_unknown')),
 created_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz
);
alter table vector_community_private.qa_mail_receipts enable row level security;
revoke all on vector_community_private.qa_mail_receipts from public,anon,authenticated,service_role;
create function public.vector_community_qa_mail(p_action text,p_worker uuid,p_result text default null)
returns text language plpgsql security definer
set search_path=pg_catalog,vector_community_private as $$
declare inserted integer;
begin
 if p_worker is null then raise exception 'Worker required'; end if;
 if p_action='claim' then
  insert into vector_community_private.qa_mail_receipts(purpose,worker,status)
  values('web53_owner_smtp_single',p_worker,'claimed') on conflict do nothing;
  get diagnostics inserted=row_count;
  return case when inserted=1 then 'claimed' else 'already_attempted' end;
 elsif p_action='finish' and p_result in ('sent','failed','delivery_unknown') then
  update vector_community_private.qa_mail_receipts set status=p_result,finished_at=clock_timestamp()
  where purpose='web53_owner_smtp_single' and worker=p_worker and status='claimed';
  get diagnostics inserted=row_count;
  return case when inserted=1 then 'recorded' else 'not_current' end;
 end if;
 raise exception 'Invalid action';
end;
$$;
revoke all on function public.vector_community_qa_mail(text,uuid,text) from public,anon,authenticated;
grant execute on function public.vector_community_qa_mail(text,uuid,text) to service_role;
comment on function public.vector_community_qa_mail(text,uuid,text) is
 'Private one-attempt QA ledger. A claimed or ambiguous attempt cannot be retried.';
commit;
