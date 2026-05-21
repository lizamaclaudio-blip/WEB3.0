-- PW3 015 validation: fleet inventory and route network.
-- Read-only SELECTs. No data changes. Uses to_jsonb to avoid failing if optional columns are missing.

select 'fleet_total' as check_name, count(*)::text as value
from public.fleet_aircraft;

select
  'fleet_by_model' as check_name,
  coalesce(to_jsonb(fa)->>'model_code', 'SIN_MODELO') as model_code,
  count(*) as total
from public.fleet_aircraft fa
group by coalesce(to_jsonb(fa)->>'model_code', 'SIN_MODELO')
order by model_code;

select
  'fleet_by_status' as check_name,
  coalesce(to_jsonb(fa)->>'aircraft_status', to_jsonb(fa)->>'status', 'SIN_ESTADO') as aircraft_status,
  count(*) as total
from public.fleet_aircraft fa
group by coalesce(to_jsonb(fa)->>'aircraft_status', to_jsonb(fa)->>'status', 'SIN_ESTADO')
order by aircraft_status;

select
  'fleet_by_airport' as check_name,
  coalesce(a.ident, 'NO_AIRPORT') as current_airport,
  count(*) as total
from public.fleet_aircraft fa
left join public.airports a on a.id = nullif(to_jsonb(fa)->>'current_airport_id', '')::uuid
group by coalesce(a.ident, 'NO_AIRPORT')
order by current_airport;

select 'aircraft_models_total' as check_name, count(*)::text as value
from public.aircraft_models;

select
  'rank_aircraft_permissions' as check_name,
  coalesce(to_jsonb(rap)->>'rank_code', 'SIN_RANGO') as rank_code,
  string_agg(coalesce(to_jsonb(rap)->>'model_code', 'SIN_MODELO'), ', ' order by coalesce(to_jsonb(rap)->>'model_code', 'SIN_MODELO')) as models,
  count(*) as total
from public.rank_aircraft_permissions rap
group by coalesce(to_jsonb(rap)->>'rank_code', 'SIN_RANGO')
order by rank_code;

select 'network_routes_total' as check_name, count(*)::text as value
from public.network_routes;

select
  'routes_by_category' as check_name,
  coalesce(to_jsonb(nr)->>'route_category', to_jsonb(nr)->>'category', 'SIN_CATEGORIA') as route_category,
  coalesce(to_jsonb(nr)->>'operation_type', 'N/D') as operation_type,
  count(*) as total
from public.network_routes nr
group by
  coalesce(to_jsonb(nr)->>'route_category', to_jsonb(nr)->>'category', 'SIN_CATEGORIA'),
  coalesce(to_jsonb(nr)->>'operation_type', 'N/D')
order by route_category, operation_type;

select
  'routes_loaded' as check_name,
  coalesce(to_jsonb(nr)->>'route_code', 'SIN_CODIGO') as route_code,
  coalesce(to_jsonb(nr)->>'route_category', to_jsonb(nr)->>'category', 'SIN_CATEGORIA') as route_category,
  coalesce(to_jsonb(nr)->>'operation_type', 'N/D') as operation_type,
  round(coalesce(nullif(to_jsonb(nr)->>'distance_nm', '')::numeric, 0), 1) as distance_nm,
  coalesce(to_jsonb(nr)->>'min_rank_code', 'N/D') as min_rank_code,
  coalesce(nullif(to_jsonb(nr)->>'is_active', '')::boolean, true) as is_active
from public.network_routes nr
order by route_category, route_code
limit 80;

select
  'fleet_overview_sample' as check_name,
  coalesce(to_jsonb(fa)->>'registration', 'SIN_MATRICULA') as registration,
  coalesce(to_jsonb(fa)->>'model_code', am.model_code, 'SIN_MODELO') as model_code,
  coalesce(am.model_name, am.display_name, 'Modelo sin nombre') as model_name,
  coalesce(to_jsonb(fa)->>'aircraft_status', to_jsonb(fa)->>'status', 'SIN_ESTADO') as aircraft_status,
  coalesce(a.ident, 'NO_AIRPORT') as current_airport_ident,
  coalesce(h.ident, 'NO_HUB') as home_airport_ident,
  coalesce(to_jsonb(fa)->>'required_rank_code', 'N/D') as required_rank_code
from public.fleet_aircraft fa
left join public.aircraft_models am
  on am.model_code = coalesce(to_jsonb(fa)->>'model_code', '')
left join public.airports a
  on a.id = nullif(to_jsonb(fa)->>'current_airport_id', '')::uuid
left join public.airports h
  on h.id = coalesce(
    nullif(to_jsonb(fa)->>'home_airport_id', '')::uuid,
    nullif(to_jsonb(fa)->>'hub_airport_id', '')::uuid
  )
order by model_code, registration
limit 80;
