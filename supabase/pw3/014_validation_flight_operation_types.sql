-- PW3 014 validation queries (read-only)

select count(*) as operation_types_total
from public.flight_operation_types;

select
  code,
  label,
  score_mode,
  affects_pilot_position,
  affects_aircraft_position,
  affects_economy,
  affects_ranking,
  affects_progression,
  requires_real_aircraft_lock,
  requires_route,
  requires_aircraft,
  requires_payload,
  requires_simbrief,
  reservation_expires_minutes,
  is_active,
  sort_order
from public.flight_operation_types
order by sort_order, code;

select
  rank_code,
  allows_training_free,
  allows_school_routes,
  allows_commercial_routes,
  allows_charter,
  allows_cargo,
  allows_aircraft_transfer,
  allows_pilot_reposition,
  allows_international,
  allows_oceanic,
  allows_long_range,
  allows_widebody
from public.pilot_ranks
where rank_code in ('CADET','SECOND_OFFICER')
order by rank_code;

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pilot_ranks'
  and column_name in (
    'allows_training_free','allows_school_routes','allows_commercial_routes','allows_charter','allows_cargo',
    'allows_aircraft_transfer','allows_pilot_reposition','allows_international','allows_oceanic','allows_long_range',
    'allows_widebody','allows_instructor','allows_admin'
  )
order by column_name;

select to_regclass('public.flight_reservation_status_log') as flight_reservation_status_log_table;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'flight_reservation_status_log'
order by indexname;

select to_regclass('public.pw_flight_operation_rules') as pw_flight_operation_rules_view;

select *
from public.pw_flight_operation_rules
order by sort_order, code;
