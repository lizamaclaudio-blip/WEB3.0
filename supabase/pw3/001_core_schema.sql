create table if not exists airports (
  id uuid primary key default gen_random_uuid(),
  ourairports_id bigint,
  ident text not null unique,
  icao text null,
  iata text null,
  airport_type text,
  name text not null,
  city text,
  municipality text,
  country text,
  iso_country text,
  iso_region text,
  continent text,
  latitude_deg numeric,
  longitude_deg numeric,
  elevation_ft numeric,
  scheduled_service boolean,
  gps_code text,
  local_code text,
  home_link text,
  wikipedia_link text,
  keywords text,
  lighting_policy text not null default 'UNKNOWN_ADVISORY',
  lighting_warning_only boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_airports_icao on airports(icao);
create index if not exists idx_airports_iata on airports(iata);
create index if not exists idx_airports_name on airports(name);
create index if not exists idx_airports_active on airports(is_active);

create table if not exists airport_runways (
  id uuid primary key default gen_random_uuid(),
  airport_id uuid not null references airports(id) on delete cascade,
  ourairports_runway_id bigint unique,
  airport_ident text,
  length_ft numeric,
  width_ft numeric,
  surface text,
  lighted boolean,
  closed boolean,
  le_ident text,
  he_ident text,
  created_at timestamptz not null default now()
);

create index if not exists idx_airport_runways_airport_id on airport_runways(airport_id);
