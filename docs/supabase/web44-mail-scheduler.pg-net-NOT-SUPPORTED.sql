-- Run as postgres AFTER the disabled migration; no secrets and no HTTP calls.
-- All tests ROLLBACK. Does not activate either scheduler gate or modify outbox.
begin;
set local statement_timeout = '30s';
do $$
declare
  n integer := 0;
  role_name text;
  function_oid oid;
  relation_name text;
  privilege_name text;
  before_requests bigint;
  before_mail bigint;
begin
  if (select enabled from vector_mail_scheduler.state where singleton) is distinct from false then
    raise exception 'Scheduler flag must start disabled';
  end if;
  n := n + 1;
  if (select count(*) from cron.job where jobname='vector-preview-mail-drain'
    and active=false and schedule='*/2 * * * *'
    and command='select vector_mail_scheduler.tick();' and username='postgres') <> 1 then
    raise exception 'Expected one inactive owner cron job with secret-free command';
  end if;
  n := n + 1;
  if (select prosecdef from pg_proc where oid='vector_mail_scheduler.tick()'::regprocedure) then
    raise exception 'Scheduler must remain SECURITY INVOKER';
  end if;
  n := n + 1;
  if (select relrowsecurity from pg_class where oid='vector_mail_scheduler.state'::regclass) is distinct from true then
    raise exception 'Scheduler state must have RLS';
  end if;
  n := n + 1;

  select count(*) into before_requests from net.http_request_queue;
  select count(*) into before_mail from public.vector_mail_outbox;
  if vector_mail_scheduler.tick() is distinct from false then
    raise exception 'Disabled tick must return false';
  end if;
  n := n + 1;
  if (select count(*) from net.http_request_queue) <> before_requests then
    raise exception 'Disabled tick must not enqueue HTTP';
  end if;
  n := n + 1;
  if (select count(*) from public.vector_mail_outbox) <> before_mail then
    raise exception 'Disabled tick must not alter mail jobs';
  end if;
  n := n + 1;

  foreach role_name in array array['anon','authenticated','service_role'] loop
    if has_schema_privilege(role_name,'vector_mail_scheduler','USAGE')
      or has_schema_privilege(role_name,'vector_mail_scheduler','CREATE') then
      raise exception 'Scheduler schema must be owner-only';
    end if;
    n := n + 1;
    if has_function_privilege(role_name,'vector_mail_scheduler.tick()','EXECUTE') then
      raise exception 'Scheduler tick must be owner-only';
    end if;
    n := n + 1;
    foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
      if has_table_privilege(role_name,'vector_mail_scheduler.state',privilege_name) then
        raise exception 'Scheduler state must be owner-only';
      end if;
      n := n + 1;
    end loop;
    if has_schema_privilege(role_name,'net','USAGE')
      or has_schema_privilege(role_name,'net','CREATE') then
      raise exception 'net schema must be inaccessible to app roles';
    end if;
    n := n + 1;
    for function_oid in select p.oid from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
      where ns.nspname='net' loop
      if has_function_privilege(role_name,function_oid,'EXECUTE') then
        raise exception 'net function must be inaccessible to app roles';
      end if;
    end loop;
    n := n + 1;
    foreach relation_name in array array['net.http_request_queue','net._http_response'] loop
      foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
        if has_table_privilege(role_name,relation_name,privilege_name) then
          raise exception 'net request/response tables must be inaccessible to app roles';
        end if;
        n := n + 1;
      end loop;
    end loop;
    execute format('set local role %I',role_name);
    begin
      perform vector_mail_scheduler.tick();
      raise exception 'Application role unexpectedly invoked scheduler';
    exception when insufficient_privilege then
      n := n + 1;
    end;
    reset role;
  end loop;
  -- 7 global + 3 roles * (1 schema + 1 tick + 8 state grants + 1 net schema
  -- + 1 all-net-functions + 16 net table grants + 1 actual invocation) = 94.
  if n <> 94 then raise exception 'Unexpected assertion count: %',n; end if;
  raise notice 'WEB44 scheduler access tests: % assertions passed; zero HTTP requested',n;
end;
$$;
select jsonb_build_object('assertions',94,'result','passed','http_requested',0,'transaction','rollback') as scheduler_access_tests;
rollback;
