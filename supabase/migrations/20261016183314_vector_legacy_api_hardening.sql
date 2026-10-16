-- Reviewed: neither view is referenced by src/ or scripts/. Their two
-- pg_rewrite dependents are their own definitions. Server/owner access remains.
-- No table, row, form policy, auth configuration or extension is changed.
begin;
do $$ declare hubs_service boolean; stats_service boolean;
begin
 hubs_service:=has_table_privilege('service_role','public.pw_v_airline_hubs','select');
 stats_service:=has_table_privilege('service_role','public.pw_v_public_stats','select');
 alter view public.pw_v_airline_hubs set (security_invoker=true);
 alter view public.pw_v_public_stats set (security_invoker=true);
 revoke select on public.pw_v_airline_hubs,public.pw_v_public_stats from public,anon,authenticated;
 if hubs_service then grant select on public.pw_v_airline_hubs to service_role; end if;
 if stats_service then grant select on public.pw_v_public_stats to service_role; end if;
end $$;
alter function public.pw_touch_updated_at() set search_path=pg_catalog,public,pg_temp;
alter function public.pw3_to_numeric(text) set search_path=pg_catalog,public,pg_temp;
alter function public.pw3_to_bigint(text) set search_path=pg_catalog,public,pg_temp;
alter function public.pw3_to_integer(text) set search_path=pg_catalog,public,pg_temp;
alter function public.pw_airport_distance_nm(text,text) set search_path=pg_catalog,public,pg_temp;
alter function public.pw_search_airports_for_dispatch(text,integer) set search_path=pg_catalog,public,pg_temp;
commit;
