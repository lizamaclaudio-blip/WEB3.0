-- PW3_ACARS_FINALIZE_SCHEMA_001.sql
-- Idempotente, no destructivo.

create extension if not exists pgcrypto;

alter table public.training_dispatch_reservations add column if not exists finalized_at timestamptz;
alter table public.training_dispatch_reservations add column if not exists final_status text;
alter table public.training_dispatch_reservations add column if not exists score numeric(6,2);
alter table public.training_dispatch_reservations add column if not exists acars_finalize_payload jsonb;
alter table public.training_dispatch_reservations add column if not exists acars_finalize_summary jsonb;
alter table public.training_dispatch_reservations add column if not exists economy_real_payload jsonb;
alter table public.training_dispatch_reservations add column if not exists pirep_payload jsonb;
alter table public.training_dispatch_reservations add column if not exists actual_block_minutes integer;
alter table public.training_dispatch_reservations add column if not exists actual_flight_minutes integer;
alter table public.training_dispatch_reservations add column if not exists actual_fuel_used_kg numeric(12,2);
alter table public.training_dispatch_reservations add column if not exists actual_landing_airport text;
alter table public.training_dispatch_reservations add column if not exists finalize_idempotency_key text;
create unique index if not exists idx_training_finalize_idem on public.training_dispatch_reservations(finalize_idempotency_key) where finalize_idempotency_key is not null;

create table if not exists public.pw3_flight_reports (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique,
  pilot_user_id uuid,
  pilot_callsign text,
  aircraft_code text,
  origin_ident text,
  destination_ident text,
  landing_ident text,
  operation_type text,
  flight_type text,
  final_status text,
  score numeric(6,2) not null default 0,
  block_time_minutes integer not null default 0,
  flight_time_minutes integer not null default 0,
  distance_nm numeric(10,2) not null default 0,
  pilot_accrual_usd numeric(14,2) not null default 0,
  net_profit_usd numeric(14,2) not null default 0,
  economy_payload jsonb not null default '{}'::jsonb,
  pirep_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pw3_flight_reports_pilot on public.pw3_flight_reports(pilot_user_id, created_at desc);
create index if not exists idx_pw3_flight_reports_callsign on public.pw3_flight_reports(lower(pilot_callsign), created_at desc);
