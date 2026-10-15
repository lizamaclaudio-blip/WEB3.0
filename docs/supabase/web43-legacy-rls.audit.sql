-- Read-only, metadata/counts only; no credentials, personal data or table contents.
begin read only;
select jsonb_build_object(
  'tables', (select jsonb_agg(to_jsonb(t)) from (
    select c.relname, c.relrowsecurity, c.relforcerowsecurity,
           pg_get_userbyid(c.relowner) as owner, c.relacl
    from pg_class c where c.oid in ('public.pw3_settings'::regclass,'public.pw3_airline_hubs'::regclass)
  ) t),
  'counts', (select jsonb_object_agg(table_name,n) from (
    select 'pw3_settings' as table_name,count(*) as n from public.pw3_settings
    union all select 'pw3_airline_hubs',count(*) from public.pw3_airline_hubs
  ) t),
  'policies', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select * from pg_policies where schemaname='public' and tablename in ('pw3_settings','pw3_airline_hubs')
  ) t),
  'effective_grants', (select jsonb_agg(to_jsonb(t)) from (
    select r.rolname,c.relname,p.privilege,
           has_table_privilege(r.rolname,c.oid,p.privilege) as allowed
    from pg_roles r cross join pg_class c
    cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
    where r.rolname in ('anon','authenticated','service_role')
      and c.oid in ('public.pw3_settings'::regclass,'public.pw3_airline_hubs'::regclass)
  ) t),
  'explicit_column_acls', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select attrelid::regclass as relation,attname,attacl from pg_attribute
    where attrelid in ('public.pw3_settings'::regclass,'public.pw3_airline_hubs'::regclass)
      and attnum>0 and not attisdropped and attacl is not null
  ) t),
  'dependencies', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select pg_describe_object(d.classid,d.objid,d.objsubid) as dependent,
           pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) as referenced,d.deptype
    from pg_depend d where d.refobjid in ('public.pw3_settings'::regclass,'public.pw3_airline_hubs'::regclass)
  ) t),
  'functions_referencing_targets', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select n.nspname,p.proname,p.prosecdef,
           has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,
           has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_exec
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.prokind='f' and (pg_get_functiondef(p.oid) ilike '%pw3_settings%' or pg_get_functiondef(p.oid) ilike '%pw3_airline_hubs%')
  ) t)
) as legacy_rls_audit;
rollback;
