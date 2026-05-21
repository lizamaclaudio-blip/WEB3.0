create table if not exists network_routes (
  id uuid primary key default gen_random_uuid(),
  route_category text not null,
  origin_airport_id uuid not null references airports(id),
  destination_airport_id uuid not null references airports(id),
  requires_oceanic boolean not null default false,
  requires_international boolean not null default false,
  requires_long_range boolean not null default false,
  allows_passenger boolean not null default true,
  allows_cargo boolean not null default true,
  distance_nm numeric,
  unique(route_category, origin_airport_id, destination_airport_id)
);

create or replace function pw3_seed_route(
  p_category text, p_origin text, p_destination text,
  p_requires_oceanic boolean default false,
  p_requires_international boolean default false,
  p_requires_long_range boolean default false,
  p_allows_passenger boolean default true,
  p_allows_cargo boolean default true
) returns void language plpgsql as $$
declare
  v_origin uuid;
  v_destination uuid;
begin
  select id into v_origin from airports where ident = p_origin;
  select id into v_destination from airports where ident = p_destination;
  if v_origin is null or v_destination is null then
    return;
  end if;

  insert into network_routes (
    route_category, origin_airport_id, destination_airport_id, requires_oceanic,
    requires_international, requires_long_range, allows_passenger, allows_cargo, distance_nm
  )
  values (
    p_category, v_origin, v_destination, p_requires_oceanic, p_requires_international,
    p_requires_long_range, p_allows_passenger, p_allows_cargo,
    pw_airport_distance_nm(p_origin, p_destination)
  )
  on conflict do nothing;
end $$;

truncate table network_routes;

do $$
declare r record;
begin
  for r in
    select * from (values
      ('TRAINING','SCPF','SCTE'),('TRAINING','SCPF','SCJO'),('TRAINING','SCPF','SCVD'),('TRAINING','SCPF','SCST'),('TRAINING','SCPF','SCAC'),('TRAINING','SCPF','SCPV'),
      ('TRAINING','SCTB','SCEL'),('TRAINING','SCTB','SCBQ'),('TRAINING','SCTB','SCSN'),('TRAINING','SCTB','SCVM'),
      ('TRAINING','SCIE','SCCH'),('TRAINING','SCIE','SCQP'),('TRAINING','SCIE','SCVD'),('TRAINING','SCIE','SCEL'),('TRAINING','SCIE','SCTE'),
      ('REGIONAL','SCTE','SCVD'),('REGIONAL','SCTE','SCJO'),('REGIONAL','SCTE','SCBA'),('REGIONAL','SCTE','SCIE'),('REGIONAL','SCTE','SCCI'),('REGIONAL','SCTE','SCPF'),
      ('REGIONAL','SCVD','SCJO'),('REGIONAL','SCVD','SCIE'),('REGIONAL','SCBA','SCCI'),('REGIONAL','SCCI','SCNT'),('REGIONAL','SCCI','SCEL'),
      ('REGIONAL','SCEL','SCIE'),('REGIONAL','SCIE','SCQP'),('REGIONAL','SCIE','SCCH'),('REGIONAL','SCEL','SCTB'),
      ('REGIONAL','SCEL','SCSE'),('REGIONAL','SCEL','SCAT'),('REGIONAL','SCEL','SCFA'),('REGIONAL','SCEL','SCDA'),
      ('TRUNK','SCEL','SCTE'),('TRUNK','SCEL','SCIE'),('TRUNK','SCEL','SCCI'),('TRUNK','SCEL','SCFA'),('TRUNK','SCEL','SCDA'),
      ('TRUNK','SCEL','SCSE'),('TRUNK','SCEL','SCAT'),('TRUNK','SCTE','SCCI'),('TRUNK','SCIE','SCFA'),('TRUNK','SCFA','SCDA'),
      ('OCEANIC_NATIONAL','SCEL','SCIP'),
      ('INTERNATIONAL_REGIONAL','SCEL','SAEZ'),('INTERNATIONAL_REGIONAL','SCEL','SABE'),('INTERNATIONAL_REGIONAL','SCEL','SUMU'),
      ('INTERNATIONAL_REGIONAL','SCEL','SPJC'),('INTERNATIONAL_REGIONAL','SCEL','SLLP'),('INTERNATIONAL_REGIONAL','SCEL','SLVR'),('INTERNATIONAL_REGIONAL','SCEL','SGAS'),
      ('INTERNATIONAL_SOUTH_AMERICA','SCEL','SBGR'),('INTERNATIONAL_SOUTH_AMERICA','SCEL','SBGL'),('INTERNATIONAL_SOUTH_AMERICA','SCEL','SBBR'),
      ('INTERNATIONAL_SOUTH_AMERICA','SCEL','SKBO'),('INTERNATIONAL_SOUTH_AMERICA','SCEL','SEQM'),('INTERNATIONAL_SOUTH_AMERICA','SCEL','SEGU'),('INTERNATIONAL_SOUTH_AMERICA','SCEL','SVMI'),
      ('INTERNATIONAL_AMERICAS','SCEL','MPTO'),('INTERNATIONAL_AMERICAS','SCEL','MMMX'),('INTERNATIONAL_AMERICAS','SCEL','KMIA'),
      ('INTERNATIONAL_AMERICAS','SCEL','KJFK'),('INTERNATIONAL_AMERICAS','SCEL','KLAX'),('INTERNATIONAL_AMERICAS','SCEL','CYYZ'),
      ('LONG_HAUL','SCEL','LEMD'),('LONG_HAUL','SCEL','EGLL'),('LONG_HAUL','SCEL','LFPG'),('LONG_HAUL','SCEL','EDDF'),('LONG_HAUL','SCEL','LIRF'),('LONG_HAUL','SCEL','EHAM')
    ) t(category, origin, destination)
  loop
    perform pw3_seed_route(
      r.category, r.origin, r.destination,
      r.category = 'OCEANIC_NATIONAL',
      r.category like 'INTERNATIONAL%',
      r.category in ('OCEANIC_NATIONAL','LONG_HAUL'),
      true, true
    );
    if r.origin <> r.destination then
      perform pw3_seed_route(
        r.category, r.destination, r.origin,
        r.category = 'OCEANIC_NATIONAL',
        r.category like 'INTERNATIONAL%',
        r.category in ('OCEANIC_NATIONAL','LONG_HAUL'),
        true, true
      );
    end if;
  end loop;

  perform pw3_seed_route('TRAINING','SCPF','SCPF', false, false, false, true, false);
  perform pw3_seed_route('TRAINING','SCTB','SCTB', false, false, false, true, false);
  perform pw3_seed_route('TRAINING','SCIE','SCIE', false, false, false, true, false);
end $$;
