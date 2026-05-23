do $$
begin
  if to_regclass('public.training_dispatch_reservations') is not null then
    execute 'create index if not exists idx_tdr_pilot_state_created on public.training_dispatch_reservations(pilot_callsign, acars_state, created_at desc)';
    execute 'create index if not exists idx_tdr_token_state on public.training_dispatch_reservations(dispatch_token_hash, acars_state)';
  end if;

  if to_regclass('public.pireps') is not null then
    execute 'create index if not exists idx_pireps_pilot_created on public.pireps(pilot_callsign, created_at desc)';
  end if;

  if to_regclass('public.acars_live_sessions') is not null then
    execute 'create index if not exists idx_acars_live_pilot_last_seen on public.acars_live_sessions(pilot_callsign, last_seen_at desc)';
  end if;

  if to_regclass('public.aircraft_current_location') is not null then
    execute 'create index if not exists idx_aircraft_location_reg_updated on public.aircraft_current_location(aircraft_registration, updated_at desc)';
  end if;

  if to_regclass('public.pilot_profiles') is not null then
    execute 'create index if not exists idx_pilot_profiles_callsign on public.pilot_profiles(callsign)';
  end if;
end $$;

