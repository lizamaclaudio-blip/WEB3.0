alter table public.training_dispatch_reservations
add column if not exists route_code text;

alter table public.training_dispatch_reservations
add column if not exists assigned_flight_number text;

alter table public.training_dispatch_reservations
add column if not exists assigned_callsign text;

alter table public.training_dispatch_reservations
add column if not exists airline_icao text default 'PWG';

alter table public.training_dispatch_reservations
add column if not exists payload_version text;

alter table public.training_dispatch_reservations
add column if not exists dispatch_payload jsonb;

alter table public.training_dispatch_reservations
add column if not exists acars_payload jsonb;

alter table public.training_dispatch_reservations
add column if not exists acars_state text;

alter table public.training_dispatch_reservations
add column if not exists sent_to_acars_at timestamptz;

create index if not exists idx_training_dispatch_reservations_dispatch_token
on public.training_dispatch_reservations(dispatch_token_hash);

create index if not exists idx_training_dispatch_reservations_route_code
on public.training_dispatch_reservations(route_code);

create index if not exists idx_training_dispatch_reservations_acars_state
on public.training_dispatch_reservations(acars_state);
