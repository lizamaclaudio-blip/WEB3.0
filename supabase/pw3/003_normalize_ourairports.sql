insert into airports (
  ourairports_id, ident, icao, iata, airport_type, name, city, municipality, country,
  iso_country, iso_region, continent, latitude_deg, longitude_deg, elevation_ft,
  scheduled_service, gps_code, local_code, home_link, wikipedia_link, keywords, is_active
)
select
  public.pw3_to_bigint(a.id),
  upper(trim(a.ident)),
  case when upper(trim(a.ident)) ~ '^[A-Z]{4}$' then upper(trim(a.ident)) else null end as icao,
  nullif(upper(trim(a.iata_code)), ''),
  nullif(trim(a.type), ''),
  coalesce(nullif(trim(a.name), ''), upper(trim(a.ident))),
  nullif(trim(a.municipality), ''),
  nullif(trim(a.municipality), ''),
  c.name,
  nullif(trim(a.iso_country), ''),
  nullif(trim(a.iso_region), ''),
  nullif(trim(a.continent), ''),
  public.pw3_to_numeric(a.latitude_deg),
  public.pw3_to_numeric(a.longitude_deg),
  public.pw3_to_numeric(a.elevation_ft),
  case when lower(coalesce(a.scheduled_service, '')) = 'yes' then true else false end,
  nullif(trim(a.gps_code), ''),
  nullif(trim(a.local_code), ''),
  nullif(trim(a.home_link), ''),
  nullif(trim(a.wikipedia_link), ''),
  nullif(trim(a.keywords), ''),
  case when a.type = 'closed' then false else true end
from ourairports_airports_import a
left join ourairports_countries_import c on c.code = a.iso_country
where coalesce(trim(a.ident), '') <> ''
on conflict (ident) do update set
  ourairports_id = excluded.ourairports_id,
  icao = excluded.icao,
  iata = excluded.iata,
  airport_type = excluded.airport_type,
  name = excluded.name,
  city = excluded.city,
  municipality = excluded.municipality,
  country = excluded.country,
  iso_country = excluded.iso_country,
  iso_region = excluded.iso_region,
  continent = excluded.continent,
  latitude_deg = excluded.latitude_deg,
  longitude_deg = excluded.longitude_deg,
  elevation_ft = excluded.elevation_ft,
  scheduled_service = excluded.scheduled_service,
  gps_code = excluded.gps_code,
  local_code = excluded.local_code,
  home_link = excluded.home_link,
  wikipedia_link = excluded.wikipedia_link,
  keywords = excluded.keywords,
  is_active = excluded.is_active,
  updated_at = now();

delete from airport_runways;

insert into airport_runways (
  airport_id, ourairports_runway_id, airport_ident, length_ft, width_ft, surface, lighted, closed, le_ident, he_ident
)
select
  ap.id,
  public.pw3_to_bigint(r.id),
  upper(trim(r.airport_ident)),
  public.pw3_to_numeric(r.length_ft),
  public.pw3_to_numeric(r.width_ft),
  nullif(trim(r.surface), ''),
  case
    when coalesce(public.pw3_to_integer(r.lighted), 0) = 1 then true
    when lower(coalesce(r.lighted, '')) in ('true', 'yes') then true
    else false
  end,
  case
    when coalesce(public.pw3_to_integer(r.closed), 0) = 1 then true
    when lower(coalesce(r.closed, '')) in ('true', 'yes') then true
    else false
  end,
  nullif(trim(r.le_ident), ''),
  nullif(trim(r.he_ident), '')
from ourairports_runways_import r
join airports ap on ap.ident = upper(trim(r.airport_ident));
