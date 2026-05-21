create extension if not exists pgcrypto;

create table if not exists pw3_settings (
  id uuid primary key default gen_random_uuid(),
  airline_code text not null default 'PWG',
  airline_name text not null default 'Patagonia Wings',
  callsign_prefix text not null default 'PWG',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into pw3_settings (airline_code, airline_name, callsign_prefix)
select 'PWG', 'Patagonia Wings', 'PWG'
where not exists (select 1 from pw3_settings);

create or replace function public.pw3_to_numeric(p_value text)
returns numeric
language sql
immutable
as $$
  select case
    when p_value is null then null
    when trim(p_value) = '' then null
    when trim(p_value) ~ '^-?[0-9]+(\.[0-9]+)?$' then trim(p_value)::numeric
    else null
  end;
$$;

create or replace function public.pw3_to_bigint(p_value text)
returns bigint
language sql
immutable
as $$
  select case
    when p_value is null then null
    when trim(p_value) = '' then null
    when trim(p_value) ~ '^-?[0-9]+$' then trim(p_value)::bigint
    else null
  end;
$$;

create or replace function public.pw3_to_integer(p_value text)
returns integer
language sql
immutable
as $$
  select case
    when p_value is null then null
    when trim(p_value) = '' then null
    when trim(p_value) ~ '^-?[0-9]+$' then trim(p_value)::integer
    else null
  end;
$$;
