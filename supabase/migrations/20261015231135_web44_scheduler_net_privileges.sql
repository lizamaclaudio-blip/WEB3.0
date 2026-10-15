-- Security hold for hosted Supabase: pg_net grants are platform-owned and cannot
-- be restricted by postgres. No credential may enter its public SQL queue.
-- Remove ONLY the extension installed by WEB44, after proving it is unused.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if current_user <> 'postgres' then raise exception 'Run as postgres owner'; end if;
  if (select enabled from vector_mail_scheduler.state where singleton) is distinct from false
    or (select count(*) from cron.job where jobname='vector-preview-mail-drain' and active=false) <> 1
  then raise exception 'Scheduler must already be inactive'; end if;
  if not exists (select 1 from pg_extension where extname='pg_net') then
    raise exception 'Expected newly installed WEB44 pg_net';
  end if;
  if exists (select 1 from net.http_request_queue) or exists (select 1 from net._http_response) then
    raise exception 'Do not remove pg_net with requests or responses';
  end if;
  if exists (select 1 from pg_trigger where not tgisinternal
      and tgfoid=to_regprocedure('supabase_functions.http_request()')) then
    raise exception 'Do not remove pg_net used by Database Webhooks';
  end if;
end;
$$;

-- Explicit safe hold: even accidental enablement cannot decrypt or transmit.
create or replace function vector_mail_scheduler.tick()
returns boolean language plpgsql security invoker set search_path=pg_catalog
as $$
begin
  update vector_mail_scheduler.state set enabled=false,last_result='DISABLED' where singleton;
  return false;
end;
$$;
alter function vector_mail_scheduler.tick() owner to postgres;
revoke all on function vector_mail_scheduler.tick() from public,anon,authenticated,service_role;

-- RESTRICT (the default), never CASCADE: unexpected dependencies abort everything.
drop extension pg_net;
do $$
begin
  if exists (select 1 from pg_extension where extname='pg_net')
    or exists (select 1 from pg_namespace where nspname='net') then
    raise exception 'pg_net removal incomplete';
  end if;
end;
$$;
commit;
