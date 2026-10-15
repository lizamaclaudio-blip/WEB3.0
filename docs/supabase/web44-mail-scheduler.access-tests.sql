-- Final safe-hold verification AFTER the pg_net withdrawal migration.
-- No HTTP, SMTP, secret read, activation, outbox change or deletion. ROLLBACK.
begin;
set local statement_timeout='30s';
do $$
declare
  n integer:=0; role_name text; privilege_name text; before_mail bigint;
begin
  if (select enabled from vector_mail_scheduler.state where singleton) is distinct from false
    then raise exception 'Scheduler must remain disabled'; end if;
  n:=n+1;
  if (select count(*) from cron.job where jobname='vector-preview-mail-drain'
    and active=false and schedule='*/2 * * * *'
    and command='select vector_mail_scheduler.tick();' and username='postgres')<>1
    then raise exception 'Expected one inactive owner job'; end if;
  n:=n+1;
  if (select prosecdef from pg_proc where oid='vector_mail_scheduler.tick()'::regprocedure)
    then raise exception 'Tick must remain SECURITY INVOKER'; end if;
  n:=n+1;
  if (select relrowsecurity from pg_class where oid='vector_mail_scheduler.state'::regclass) is distinct from true
    then raise exception 'Private state must retain RLS'; end if;
  n:=n+1;
  if exists(select 1 from pg_extension where extname='pg_net')
    then raise exception 'Unsupported HTTP extension must be absent'; end if;
  n:=n+1;
  if exists(select 1 from pg_namespace where nspname='net')
    then raise exception 'Unsupported HTTP schema must be absent'; end if;
  n:=n+1;
  select count(*) into before_mail from public.vector_mail_outbox;
  if vector_mail_scheduler.tick() is distinct from false
    then raise exception 'Safe-hold tick must return false'; end if;
  n:=n+1;
  if (select count(*) from public.vector_mail_outbox)<>before_mail
    then raise exception 'Tick must not modify mail'; end if;
  n:=n+1;
  if (select prosrc from pg_proc where oid='vector_mail_scheduler.tick()'::regprocedure) ~* '(vault|http_post|http_get)'
    then raise exception 'Safe-hold tick must not decrypt or send HTTP'; end if;
  n:=n+1;
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if has_schema_privilege(role_name,'vector_mail_scheduler','USAGE')
      or has_schema_privilege(role_name,'vector_mail_scheduler','CREATE')
      then raise exception 'Scheduler schema must be owner-only'; end if;
    n:=n+1;
    if has_function_privilege(role_name,'vector_mail_scheduler.tick()','EXECUTE')
      then raise exception 'Tick must be owner-only'; end if;
    n:=n+1;
    foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
      if has_table_privilege(role_name,'vector_mail_scheduler.state',privilege_name)
        then raise exception 'State must be owner-only'; end if;
      n:=n+1;
    end loop;
    execute format('set local role %I',role_name);
    begin
      perform vector_mail_scheduler.tick();
      raise exception 'Application role invoked scheduler';
    exception when insufficient_privilege then n:=n+1;
    end;
    reset role;
  end loop;
  if n<>42 then raise exception 'Unexpected assertion count: %',n; end if;
end;
$$;
select jsonb_build_object('assertions',42,'result','passed','http_requested',0,'transaction','rollback') as scheduler_safe_hold_tests;
rollback;
