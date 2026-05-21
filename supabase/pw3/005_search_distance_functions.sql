drop function if exists public.pw_airport_distance_nm(text, text);
drop function if exists public.pw_search_airports_for_dispatch(text, integer);

create or replace function public.pw_airport_distance_nm(p_origin_ident text, p_destination_ident text)
returns numeric
language sql
stable
as $$
with p as (
  select
    o.latitude_deg::numeric as o_lat,
    o.longitude_deg::numeric as o_lon,
    d.latitude_deg::numeric as d_lat,
    d.longitude_deg::numeric as d_lon
  from airports o
  join airports d on d.ident = upper(trim(p_destination_ident))
  where o.ident = upper(trim(p_origin_ident))
)
select case
  when p.o_lat is null or p.o_lon is null or p.d_lat is null or p.d_lon is null then null
  else round((
    3440.065 * 2 * asin(sqrt(
      power(sin(radians((p.d_lat - p.o_lat) / 2)), 2) +
      cos(radians(p.o_lat)) * cos(radians(p.d_lat)) * power(sin(radians((p.d_lon - p.o_lon) / 2)), 2)
    ))
  )::numeric, 2)
end
from p;
$$;

create or replace function public.pw_search_airports_for_dispatch(p_query text, p_limit integer default 20)
returns table(
  ident text,
  icao text,
  iata text,
  name text,
  city text,
  country text,
  airport_type text,
  lighting_policy text,
  lighting_warning_only boolean
)
language sql
stable
as $$
with q as (select upper(trim(coalesce(p_query, ''))) as s)
select
  a.ident, a.icao, a.iata, a.name, a.city, a.country, a.airport_type, a.lighting_policy, a.lighting_warning_only
from airports a, q
where a.is_active = true
  and a.airport_type <> 'closed'
  and a.latitude_deg is not null
  and a.longitude_deg is not null
  and (
    a.ident ilike '%' || q.s || '%'
    or coalesce(a.icao, '') ilike '%' || q.s || '%'
    or coalesce(a.iata, '') ilike '%' || q.s || '%'
    or a.name ilike '%' || q.s || '%'
    or coalesce(a.city, '') ilike '%' || q.s || '%'
    or coalesce(a.country, '') ilike '%' || q.s || '%'
  )
order by
  case
    when a.ident = q.s then 0
    when coalesce(a.icao, '') = q.s then 1
    when coalesce(a.iata, '') = q.s then 2
    when a.airport_type = 'large_airport' then 3
    when a.airport_type = 'medium_airport' then 4
    when a.airport_type = 'small_airport' then 5
    else 9
  end,
  a.ident
limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;
