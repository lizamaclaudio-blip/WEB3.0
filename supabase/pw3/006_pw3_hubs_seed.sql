create table if not exists pw3_airline_hubs (
  id uuid primary key default gen_random_uuid(),
  airport_id uuid not null references airports(id),
  hub_code text not null unique,
  hub_name text not null,
  hub_roles text[] not null default '{}',
  is_school_hub boolean not null default false,
  allows_initial_registration boolean not null default false,
  allows_training boolean not null default false,
  allows_dispatch boolean not null default true,
  allows_charter boolean not null default true,
  allows_cargo boolean not null default false,
  allows_maintenance_routine boolean not null default true,
  allows_maintenance_medium boolean not null default false,
  allows_maintenance_major boolean not null default false,
  is_accident_recovery_base boolean not null default false,
  allows_international boolean not null default false,
  allows_oceanic_national boolean not null default false,
  display_order int not null default 100,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

with seed(hub_code, hub_name, hub_roles, is_school_hub, allows_initial_registration, allows_training, allows_cargo, allows_maintenance_medium, allows_maintenance_major, is_accident_recovery_base, allows_international, allows_oceanic_national, display_order) as (
  values
  ('SCPF','La Paloma / Puerto Montt', array['HUB_ESCUELA']::text[], true, true, true, false, false, false, false, false, false, 10),
  ('SCTB','Tobalaba / Santiago', array['HUB_ESCUELA']::text[], true, true, true, false, false, false, false, false, false, 20),
  ('SCIE','Carriel Sur / Concepcion', array['HUB_ESCUELA','HUB_INTERREGIONAL','HUB_CARGA']::text[], true, true, true, true, true, false, false, false, false, 30),
  ('SCTE','El Tepual / Puerto Montt', array['BASE_PRINCIPAL','HUB_INTERREGIONAL','HUB_CARGA']::text[], false, false, true, true, true, true, true, false, false, 40),
  ('SCVD','Valdivia / Pichoy', array['HUB_REGIONAL']::text[], false, false, true, false, false, false, false, false, false, 50),
  ('SCBA','Balmaceda', array['HUB_REGIONAL','HUB_CARGA']::text[], false, false, true, true, false, false, false, false, false, 60),
  ('SCNT','Puerto Natales', array['HUB_REGIONAL']::text[], false, false, true, false, false, false, false, false, false, 70),
  ('SCJO','Osorno / Canal Bajo', array['HUB_REGIONAL']::text[], false, false, true, false, false, false, false, false, false, 80),
  ('SCQP','Temuco / La Araucania', array['HUB_REGIONAL']::text[], false, false, true, false, false, false, false, false, false, 90),
  ('SCCH','Chillan', array['HUB_REGIONAL']::text[], false, false, true, false, false, false, false, false, false, 100),
  ('SCSE','La Serena', array['HUB_REGIONAL']::text[], false, false, true, false, false, false, false, false, false, 110),
  ('SCAT','Atacama / Copiapo', array['HUB_REGIONAL']::text[], false, false, true, false, false, false, false, false, false, 120),
  ('SCDA','Iquique', array['HUB_REGIONAL','HUB_INTERREGIONAL','HUB_CARGA']::text[], false, false, true, true, true, false, false, false, false, 130),
  ('SCEL','Santiago', array['HUB_INTERREGIONAL','HUB_INTERNACIONAL','HUB_OCEANICO_NACIONAL','HUB_CARGA']::text[], false, false, true, true, true, false, false, true, true, 140),
  ('SCFA','Antofagasta', array['HUB_INTERREGIONAL','HUB_CARGA']::text[], false, false, true, true, false, false, false, false, false, 150),
  ('SCCI','Punta Arenas', array['HUB_INTERREGIONAL','HUB_CARGA']::text[], false, false, true, true, true, false, false, false, false, 160),
  ('SCIP','Mataveri / Easter Island', array['HUB_CARGA']::text[], false, false, true, true, false, false, false, false, true, 170)
)
insert into pw3_airline_hubs (
  airport_id, hub_code, hub_name, hub_roles, is_school_hub, allows_initial_registration,
  allows_training, allows_dispatch, allows_charter, allows_cargo, allows_maintenance_routine,
  allows_maintenance_medium, allows_maintenance_major, is_accident_recovery_base,
  allows_international, allows_oceanic_national, display_order
)
select
  a.id, s.hub_code, s.hub_name, s.hub_roles, s.is_school_hub, s.allows_initial_registration,
  s.allows_training, true, true, s.allows_cargo, true, s.allows_maintenance_medium,
  s.allows_maintenance_major, s.is_accident_recovery_base, s.allows_international,
  s.allows_oceanic_national, s.display_order
from seed s
join airports a on a.ident = s.hub_code
on conflict (hub_code) do update set
  airport_id = excluded.airport_id,
  hub_name = excluded.hub_name,
  hub_roles = excluded.hub_roles,
  allows_initial_registration = excluded.allows_initial_registration,
  allows_training = excluded.allows_training,
  allows_cargo = excluded.allows_cargo,
  allows_maintenance_medium = excluded.allows_maintenance_medium,
  allows_maintenance_major = excluded.allows_maintenance_major,
  is_accident_recovery_base = excluded.is_accident_recovery_base,
  allows_international = excluded.allows_international,
  allows_oceanic_national = excluded.allows_oceanic_national,
  updated_at = now();
