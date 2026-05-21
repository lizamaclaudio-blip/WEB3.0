create table if not exists ourairports_airports_import (
  id text,
  ident text,
  type text,
  name text,
  latitude_deg text,
  longitude_deg text,
  elevation_ft text,
  continent text,
  iso_country text,
  iso_region text,
  municipality text,
  city text,
  country text,
  scheduled_service text,
  gps_code text,
  icao_code text,
  iata text,
  iata_code text,
  local_code text,
  home_link text,
  wikipedia_link text,
  keywords text
);

create table if not exists ourairports_runways_import (
  id text,
  airport_ref text,
  airport_ident text,
  length_ft text,
  width_ft text,
  surface text,
  lighted text,
  closed text,
  le_ident text,
  le_latitude_deg text,
  le_longitude_deg text,
  le_elevation_ft text,
  "le_heading_degT" text,
  le_displaced_threshold_ft text,
  he_ident text,
  he_latitude_deg text,
  he_longitude_deg text,
  he_elevation_ft text,
  "he_heading_degT" text,
  he_displaced_threshold_ft text
);

create table if not exists ourairports_countries_import (
  id text,
  code text,
  name text,
  continent text,
  wikipedia_link text,
  keywords text
);

create table if not exists ourairports_regions_import (
  id text,
  code text,
  local_code text,
  name text,
  continent text,
  iso_country text,
  wikipedia_link text,
  keywords text
);

alter table ourairports_airports_import alter column id type text using id::text;
alter table ourairports_airports_import alter column latitude_deg type text using latitude_deg::text;
alter table ourairports_airports_import alter column longitude_deg type text using longitude_deg::text;
alter table ourairports_airports_import alter column elevation_ft type text using elevation_ft::text;
alter table ourairports_airports_import add column if not exists icao_code text;
alter table ourairports_airports_import add column if not exists iata text;
alter table ourairports_airports_import add column if not exists city text;
alter table ourairports_airports_import add column if not exists country text;

alter table ourairports_runways_import alter column id type text using id::text;
alter table ourairports_runways_import alter column airport_ref type text using airport_ref::text;
alter table ourairports_runways_import alter column length_ft type text using length_ft::text;
alter table ourairports_runways_import alter column width_ft type text using width_ft::text;
alter table ourairports_runways_import alter column lighted type text using lighted::text;
alter table ourairports_runways_import alter column closed type text using closed::text;
alter table ourairports_runways_import alter column le_latitude_deg type text using le_latitude_deg::text;
alter table ourairports_runways_import alter column le_longitude_deg type text using le_longitude_deg::text;
alter table ourairports_runways_import alter column le_elevation_ft type text using le_elevation_ft::text;
alter table ourairports_runways_import alter column "le_heading_degT" type text using "le_heading_degT"::text;
alter table ourairports_runways_import alter column le_displaced_threshold_ft type text using le_displaced_threshold_ft::text;
alter table ourairports_runways_import alter column he_latitude_deg type text using he_latitude_deg::text;
alter table ourairports_runways_import alter column he_longitude_deg type text using he_longitude_deg::text;
alter table ourairports_runways_import alter column he_elevation_ft type text using he_elevation_ft::text;
alter table ourairports_runways_import alter column "he_heading_degT" type text using "he_heading_degT"::text;
alter table ourairports_runways_import alter column he_displaced_threshold_ft type text using he_displaced_threshold_ft::text;

alter table ourairports_countries_import alter column id type text using id::text;
alter table ourairports_regions_import alter column id type text using id::text;
