create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_callsign_sequence (
  id int primary key default 1,
  last_number int not null default 0
);
insert into pilot_callsign_sequence(id, last_number) values (1,0) on conflict (id) do nothing;

create table if not exists pilot_profiles (
  id uuid primary key,
  callsign text unique not null,
  callsign_number int unique not null,
  rank_code text not null references pilot_ranks(rank_code) default 'CADET',
  pilot_status text not null default 'PENDING_APPROVAL',
  founder_badge boolean not null default false,
  founder_number int,
  base_airport_id uuid references airports(id),
  current_airport_id uuid references airports(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_rank_history (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid not null references pilot_profiles(id) on delete cascade,
  rank_code text not null references pilot_ranks(rank_code),
  changed_at timestamptz not null default now()
);

create table if not exists pilot_progression_status (
  pilot_id uuid primary key references pilot_profiles(id) on delete cascade,
  current_rank_code text not null references pilot_ranks(rank_code),
  hours_in_rank numeric not null default 0,
  flights_in_rank int not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.pw_create_pilot_profile_for_user(
  p_user_id uuid,
  p_email text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_next int;
  v_profile_id uuid;
begin
  insert into app_users(id, email, display_name)
  values (p_user_id, p_email, p_display_name)
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now();

  update pilot_callsign_sequence set last_number = last_number + 1 where id = 1 returning last_number into v_next;

  insert into pilot_profiles (
    id, callsign, callsign_number, rank_code, pilot_status,
    founder_badge, founder_number, base_airport_id, current_airport_id
  )
  values (
    p_user_id,
    'PWG' || lpad(v_next::text, 3, '0'),
    v_next,
    'CADET',
    'PENDING_APPROVAL',
    v_next <= 100,
    case when v_next <= 100 then v_next else null end,
    null,
    null
  )
  on conflict (id) do update set
    rank_code = excluded.rank_code,
    pilot_status = excluded.pilot_status,
    founder_badge = excluded.founder_badge,
    founder_number = excluded.founder_number,
    updated_at = now()
  returning id into v_profile_id;

  insert into pilot_rank_history(pilot_id, rank_code) values (p_user_id, 'CADET');
  insert into pilot_progression_status(pilot_id, current_rank_code)
  values (p_user_id, 'CADET')
  on conflict (pilot_id) do update set
    current_rank_code = excluded.current_rank_code,
    updated_at = now();

  return v_profile_id;
end;
$$;

create or replace function public.pw_select_initial_training_hub(
  p_user_id uuid,
  p_hub_ident text
)
returns void
language plpgsql
security definer
as $$
declare
  v_airport_id uuid;
begin
  if upper(trim(p_hub_ident)) not in ('SCPF','SCTB','SCIE') then
    raise exception 'Hub inicial invalido';
  end if;

  select h.airport_id into v_airport_id
  from pw3_airline_hubs h
  where h.hub_code = upper(trim(p_hub_ident))
    and h.allows_initial_registration = true;

  if v_airport_id is null then
    raise exception 'Hub no habilitado para registro inicial';
  end if;

  update pilot_profiles
  set base_airport_id = v_airport_id,
      current_airport_id = v_airport_id,
      updated_at = now()
  where id = p_user_id;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'auth') then
    execute '
      create or replace function public.pw_create_pilot_profile_from_auth_trigger()
      returns trigger
      language plpgsql
      security definer
      as $inner$
      begin
        perform public.pw_create_pilot_profile_for_user(new.id, new.email, null);
        return new;
      end;
      $inner$;
    ';
    execute 'drop trigger if exists trg_pw_create_pilot_profile on auth.users';
    execute '
      create trigger trg_pw_create_pilot_profile
      after insert on auth.users
      for each row execute function public.pw_create_pilot_profile_from_auth_trigger()
    ';
  end if;
exception
  when others then
    null;
end $$;

alter table airports enable row level security;
alter table pw3_airline_hubs enable row level security;
alter table pilot_ranks enable row level security;
alter table aircraft_models enable row level security;
alter table aircraft_performance_profiles enable row level security;
alter table network_routes enable row level security;
alter table pilot_profiles enable row level security;

drop policy if exists airports_public_read on airports;
create policy airports_public_read on airports for select using (is_active = true);

drop policy if exists hubs_auth_read on pw3_airline_hubs;
create policy hubs_auth_read on pw3_airline_hubs for select using (true);

drop policy if exists ranks_auth_read on pilot_ranks;
create policy ranks_auth_read on pilot_ranks for select using (true);

drop policy if exists models_auth_read on aircraft_models;
create policy models_auth_read on aircraft_models for select using (true);

drop policy if exists perf_auth_read on aircraft_performance_profiles;
create policy perf_auth_read on aircraft_performance_profiles for select using (true);

drop policy if exists routes_auth_read on network_routes;
create policy routes_auth_read on network_routes for select using (true);

drop policy if exists pilot_self_read on pilot_profiles;
create policy pilot_self_read on pilot_profiles for select using (true);

drop policy if exists pilot_self_update on pilot_profiles;
create policy pilot_self_update on pilot_profiles for update using (true) with check (true);
