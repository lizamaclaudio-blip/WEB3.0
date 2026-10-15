-- Prepared infrastructure only: both gates are false at COMMIT. No HTTP is sent.
-- Generates no secret, sends no message and does not alter inquiry/mail policies.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- This deployment has neither extension yet. Refuse to alter a pre-existing net
-- installation's privileges without another dependency review.
do $$
begin
  if current_user <> 'postgres' then
    raise exception 'Install disabled scheduler as postgres owner';
  end if;
  if exists (select 1 from pg_catalog.pg_extension where extname in ('pg_net','pg_cron')) then
    raise exception 'Review existing scheduler extension dependencies before installation';
  end if;
  if not exists (select 1 from pg_catalog.pg_extension where extname = 'supabase_vault') then
    raise exception 'Supabase Vault must be enabled before installing scheduler';
  end if;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;
create extension pg_net;

revoke all on schema cron from public, anon, authenticated, service_role;
revoke all on all tables in schema cron from public, anon, authenticated, service_role;
revoke all on all sequences in schema cron from public, anon, authenticated, service_role;
revoke all on all functions in schema cron from public, anon, authenticated, service_role;

-- pg_net queues request headers transiently. No application role may read them
-- or invoke arbitrary outbound HTTP. This is a newly installed extension only.
revoke all on schema net from public, anon, authenticated, service_role;
revoke all on all tables in schema net from public, anon, authenticated, service_role;
revoke all on all sequences in schema net from public, anon, authenticated, service_role;
revoke all on all functions in schema net from public, anon, authenticated, service_role;

create schema vector_mail_scheduler authorization postgres;
revoke all on schema vector_mail_scheduler from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema vector_mail_scheduler
  revoke execute on functions from public;
alter default privileges for role postgres in schema vector_mail_scheduler
  revoke all on tables from public, anon, authenticated, service_role;

create table vector_mail_scheduler.state (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  last_invoked_at timestamptz,
  last_request_id bigint,
  last_http_status integer check (last_http_status between 100 and 599),
  last_result text not null default 'DISABLED' check (last_result in
    ('DISABLED','IDLE','QUEUED','HTTP_ACCEPTED','HTTP_REJECTED','HTTP_TIMEOUT',
     'HTTP_FAILED','RESPONSE_UNAVAILABLE','AUTH_REJECTED','MISSING_SECRET','SCHEDULER_ERROR'))
);
alter table vector_mail_scheduler.state enable row level security;
alter table vector_mail_scheduler.state owner to postgres;
revoke all on vector_mail_scheduler.state from public, anon, authenticated, service_role;
insert into vector_mail_scheduler.state(singleton,enabled) values(true,false);

-- No SECURITY DEFINER: only its owner can call this routine and decrypt Vault.
-- The target is a fixed allowlisted development alias, never supplied by a caller.
create function vector_mail_scheduler.tick()
returns boolean
language plpgsql security invoker
set search_path = pg_catalog
as $$
declare
  s vector_mail_scheduler.state%rowtype;
  t timestamptz := clock_timestamp();
  worker_secret text;
  protection_secret text;
  response_status integer;
  response_timeout boolean;
  response_failed boolean;
  response_found boolean;
  request_id bigint;
begin
  select * into s from vector_mail_scheduler.state
    where singleton for update skip locked;
  if not found or not s.enabled then return false; end if;
  if s.last_invoked_at is not null and s.last_invoked_at > t - interval '90 seconds' then
    return false;
  end if;

  if s.last_request_id is not null then
    -- Do not select response content, headers or raw errors into logs/results.
    select r.status_code,coalesce(r.timed_out,false),r.error_msg is not null
      into response_status,response_timeout,response_failed
      from net._http_response r where r.id = s.last_request_id;
    response_found := found;
    if response_found then
      update vector_mail_scheduler.state set
        last_http_status = response_status,
        last_result = case
          when response_status in (401,403) then 'AUTH_REJECTED'
          when response_timeout then 'HTTP_TIMEOUT'
          when response_failed then 'HTTP_FAILED'
          when response_status between 200 and 299 then 'HTTP_ACCEPTED'
          else 'HTTP_REJECTED' end
        where singleton;
      if response_status in (401,403) then
        update vector_mail_scheduler.state set enabled = false where singleton;
        return false;
      end if;
    else
      update vector_mail_scheduler.state set last_result = 'RESPONSE_UNAVAILABLE'
        where singleton;
    end if;
  end if;

  -- The durable outbox is the source of truth. pg_net is only a wake-up signal.
  -- Expired sending leases need the existing worker's ambiguity reconciliation.
  if not exists (
    select 1 from public.vector_mail_outbox o where
      (o.status in ('queued','retry') and o.next_attempt_at <= t)
      or (o.status in ('leased','sending') and o.lease_until <= t)
  ) then
    update vector_mail_scheduler.state set last_result = 'IDLE' where singleton;
    return false;
  end if;

  select v.decrypted_secret into worker_secret from vault.decrypted_secrets v
    where v.name = 'vector_web44_worker_secret';
  select v.decrypted_secret into protection_secret from vault.decrypted_secrets v
    where v.name = 'vector_web44_vercel_preview_bypass';
  if worker_secret is null or length(worker_secret) < 32 or length(worker_secret) > 2048
    or worker_secret ~ '[[:cntrl:][:space:]]'
    or protection_secret is null or length(protection_secret) < 16 or length(protection_secret) > 2048
    or protection_secret ~ '[[:cntrl:][:space:]]'
  then
    update vector_mail_scheduler.state set enabled=false,last_result='MISSING_SECRET'
      where singleton;
    return false;
  end if;

  select net.http_post(
    url := 'https://web-30-git-codex-patagonia-52d73e-lizamaclaudio-blips-projects.vercel.app/api/vector/mail/dispatch',
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || worker_secret,
      'x-vercel-protection-bypass',protection_secret),
    timeout_milliseconds := 60000
  ) into request_id;
  update vector_mail_scheduler.state set last_invoked_at=t,last_request_id=request_id,
    last_result='QUEUED' where singleton;
  return true;
exception when others then
  -- A fixed outcome prevents provider errors or secret-bearing HTTP headers from
  -- being copied into cron run output. Existing mail jobs remain unchanged.
  update vector_mail_scheduler.state set enabled=false,last_result='SCHEDULER_ERROR'
    where singleton;
  return false;
end;
$$;
alter function vector_mail_scheduler.tick() owner to postgres;
revoke all on function vector_mail_scheduler.tick() from public, anon, authenticated, service_role;

do $$
declare job_id bigint;
begin
  if exists (select 1 from cron.job where jobname = 'vector-preview-mail-drain') then
    raise exception 'Scheduler name already exists; review before installing';
  end if;
  select cron.schedule('vector-preview-mail-drain','*/2 * * * *',
    'select vector_mail_scheduler.tick();') into job_id;
  -- pg_cron cannot observe this new job until COMMIT, at which point it is false.
  perform cron.alter_job(job_id := job_id,active := false);
end;
$$;

commit;
