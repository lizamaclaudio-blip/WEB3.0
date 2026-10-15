-- Execute after the versioned migration, as postgres, in a disposable transaction.
-- No row contents are returned. Public probes never intentionally alter a row.
-- service_role performs one synthetic settings insert/update, then ROLLBACK.
-- DELETE/TRUNCATE remain checked through effective grants, without issuing either.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $test$
declare
  role_name text;
  relation_name text;
  operation_name text;
  command_text text;
  denied boolean;
  checks integer := 0;
  before_settings bigint;
  before_hubs bigint;
  changed bigint;
  test_id uuid := gen_random_uuid();
begin
  select count(*) into before_settings from public.pw3_settings;
  select count(*) into before_hubs from public.pw3_airline_hubs;

  foreach relation_name in array array['pw3_settings', 'pw3_airline_hubs'] loop
    if not (select relrowsecurity from pg_class where oid = format('public.%I', relation_name)::regclass) then
      raise exception 'RLS is disabled on %', relation_name;
    end if;
    checks := checks + 1;

    foreach role_name in array array['anon', 'authenticated'] loop
      foreach operation_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'] loop
        if has_table_privilege(role_name, format('public.%I', relation_name), operation_name) then
          raise exception '% still has % on %', role_name, operation_name, relation_name;
        end if;
        checks := checks + 1;
      end loop;

      foreach operation_name in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] loop
        if has_any_column_privilege(role_name, format('public.%I', relation_name), operation_name) then
          raise exception '% still has a column % grant on %', role_name, operation_name, relation_name;
        end if;
        checks := checks + 1;
      end loop;

      foreach operation_name in array array['SELECT', 'INSERT', 'UPDATE'] loop
        command_text := case operation_name
          when 'SELECT' then format('select 1 from public.%I limit 0', relation_name)
          when 'INSERT' then case relation_name
            when 'pw3_settings' then 'insert into public.pw3_settings (id,airline_code,airline_name,callsign_prefix) select gen_random_uuid(),''QA'',''QA'',''QA'' where false'
            else 'insert into public.pw3_airline_hubs (id,airport_id,hub_code,hub_name) select gen_random_uuid(),gen_random_uuid(),''QA'',''QA'' where false'
          end
          when 'UPDATE' then format('update public.%I set updated_at=updated_at where false', relation_name)
        end;
        denied := false;
        execute format('set local role %I', role_name);
        begin
          execute command_text;
        exception when insufficient_privilege then
          denied := true;
        end;
        reset role;
        if not denied then
          raise exception 'Actual % access was not denied for % on %', operation_name, role_name, relation_name;
        end if;
        checks := checks + 1;
      end loop;
    end loop;
  end loop;

  set local role service_role;
  perform count(*) from public.pw3_settings;
  perform count(*) from public.pw3_airline_hubs;
  insert into public.pw3_settings (id,airline_code,airline_name,callsign_prefix)
  values (test_id,'QA','Vector security verification','QA');
  update public.pw3_settings set airline_name='Vector security verification updated' where id=test_id;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'service_role settings update failed'; end if;
  update public.pw3_airline_hubs set updated_at=updated_at where false;
  reset role;
  checks := checks + 5;

  if (select count(*) from public.pw3_settings) <> before_settings + 1
     or (select count(*) from public.pw3_airline_hubs) <> before_hubs then
    raise exception 'Existing row counts changed';
  end if;
  raise notice '% legacy RLS access assertions passed; all test changes will roll back', checks + 1;
end;
$test$;
select jsonb_build_object('assertions',68,'result','passed','transaction','rollback') as legacy_rls_access_tests;
rollback;
