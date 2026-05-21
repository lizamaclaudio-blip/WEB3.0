-- PW3_ECONOMY_SCHEMA_001.sql
-- Patagonia Wings 3.0 - Economia virtual DB schema.
-- Idempotente, no destructivo, sin DROP/TRUNCATE/DELETE.
-- NO EJECUTAR SIN AUTORIZACION.

create extension if not exists pgcrypto;

create or replace function public.pw3_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.pw3_airline_economy_accounts (
  id uuid primary key default gen_random_uuid(),
  airline_code text not null unique default 'PW3',
  cash_balance_usd numeric(14,2) not null default 0,
  monthly_revenue_usd numeric(14,2) not null default 0,
  monthly_cost_usd numeric(14,2) not null default 0,
  monthly_net_usd numeric(14,2) not null default 0,
  pilot_accrual_liability_usd numeric(14,2) not null default 0,
  maintenance_reserve_usd numeric(14,2) not null default 0,
  currency text not null default 'USD_VIRTUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pw3_pilot_wallets (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid,
  callsign text,
  wallet_balance_usd numeric(14,2) not null default 0,
  pending_accrual_usd numeric(14,2) not null default 0,
  paid_this_month_usd numeric(14,2) not null default 0,
  total_earned_usd numeric(14,2) not null default 0,
  total_spent_usd numeric(14,2) not null default 0,
  currency text not null default 'USD_VIRTUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pw3_pilot_wallets_uidx_pilot_id
  on public.pw3_pilot_wallets (pilot_id)
  where pilot_id is not null;

create unique index if not exists pw3_pilot_wallets_uidx_callsign_lower
  on public.pw3_pilot_wallets (lower(callsign))
  where callsign is not null;

create index if not exists pw3_pilot_wallets_idx_callsign on public.pw3_pilot_wallets (callsign);

create table if not exists public.pw3_economy_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  effective_date date not null default current_date,
  airline_code text not null default 'PW3',
  pilot_id uuid,
  callsign text,
  route_id text,
  reservation_id uuid,
  source text not null default 'manual',
  type text not null,
  category text not null,
  direction text not null check (direction in ('credit','debit','neutral')),
  amount_usd numeric(14,2) not null default 0,
  status text not null default 'posted',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_by text,
  updated_at timestamptz not null default now()
);

create index if not exists pw3_economy_ledger_idx_pilot_id on public.pw3_economy_ledger (pilot_id);
create index if not exists pw3_economy_ledger_idx_callsign on public.pw3_economy_ledger (callsign);
create index if not exists pw3_economy_ledger_idx_route_id on public.pw3_economy_ledger (route_id);
create index if not exists pw3_economy_ledger_idx_reservation_id on public.pw3_economy_ledger (reservation_id);
create index if not exists pw3_economy_ledger_idx_type_category on public.pw3_economy_ledger (type, category);
create index if not exists pw3_economy_ledger_idx_created_at on public.pw3_economy_ledger (created_at desc);

create table if not exists public.pw3_flight_economy_estimates (
  id uuid primary key default gen_random_uuid(),
  route_id text not null,
  flight_type text not null,
  aircraft_code text not null,
  origin text not null,
  destination text not null,
  distance_nm numeric(10,2) not null default 0,
  gross_revenue_usd numeric(14,2) not null default 0,
  total_cost_usd numeric(14,2) not null default 0,
  net_profit_usd numeric(14,2) not null default 0,
  pilot_accrual_usd numeric(14,2) not null default 0,
  maintenance_reserve_usd numeric(14,2) not null default 0,
  economy_eligible boolean not null default true,
  estimate_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(route_id, flight_type, aircraft_code)
);

create index if not exists pw3_flight_estimates_idx_route_id on public.pw3_flight_economy_estimates (route_id);

create table if not exists public.pw3_pilot_monthly_payouts (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid,
  callsign text,
  payout_month text not null,
  gross_accrual_usd numeric(14,2) not null default 0,
  deductions_usd numeric(14,2) not null default 0,
  net_payout_usd numeric(14,2) not null default 0,
  status text not null default 'pending',
  paid_at timestamptz,
  ledger_entry_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pw3_payouts_uidx_pilot_month
  on public.pw3_pilot_monthly_payouts (pilot_id, payout_month)
  where pilot_id is not null;

create unique index if not exists pw3_payouts_uidx_callsign_month
  on public.pw3_pilot_monthly_payouts (lower(callsign), payout_month)
  where pilot_id is null and callsign is not null;

create index if not exists pw3_payouts_idx_callsign_month on public.pw3_pilot_monthly_payouts (callsign, payout_month);

create table if not exists public.pw3_pilot_expense_catalog (
  id uuid primary key default gen_random_uuid(),
  expense_code text not null unique,
  label text not null,
  category text not null,
  amount_usd numeric(14,2) not null default 0,
  currency text not null default 'USD_VIRTUAL',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pw3_pilot_expense_ledger (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid,
  callsign text,
  expense_code text not null,
  amount_usd numeric(14,2) not null default 0,
  status text not null default 'posted',
  wallet_applied boolean not null default false,
  ledger_entry_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  idempotency_key text unique
);

create index if not exists pw3_expenses_idx_callsign on public.pw3_pilot_expense_ledger (callsign);

create table if not exists public.pw3_aircraft_economy_profiles (
  aircraft_code text primary key,
  name text not null,
  category text not null,
  passenger_capacity integer not null default 0,
  cargo_capacity_kg numeric(12,2) not null default 0,
  supports_cargo boolean not null default false,
  range_nm numeric(10,2) not null default 0,
  economy_payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pw3_route_economy_profiles (
  route_id text primary key,
  origin text not null,
  destination text not null,
  flight_type text not null,
  route_category text not null,
  distance_nm numeric(10,2) not null default 0,
  recommended_aircraft text,
  economy_payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pw3_route_profiles_idx_flight_type on public.pw3_route_economy_profiles (flight_type);

create or replace trigger pw3_airline_economy_accounts_set_updated_at
before update on public.pw3_airline_economy_accounts
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_pilot_wallets_set_updated_at
before update on public.pw3_pilot_wallets
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_economy_ledger_set_updated_at
before update on public.pw3_economy_ledger
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_flight_economy_estimates_set_updated_at
before update on public.pw3_flight_economy_estimates
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_pilot_monthly_payouts_set_updated_at
before update on public.pw3_pilot_monthly_payouts
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_pilot_expense_catalog_set_updated_at
before update on public.pw3_pilot_expense_catalog
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_pilot_expense_ledger_set_updated_at
before update on public.pw3_pilot_expense_ledger
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_aircraft_profiles_set_updated_at
before update on public.pw3_aircraft_economy_profiles
for each row execute function public.pw3_set_updated_at();

create or replace trigger pw3_route_profiles_set_updated_at
before update on public.pw3_route_economy_profiles
for each row execute function public.pw3_set_updated_at();
