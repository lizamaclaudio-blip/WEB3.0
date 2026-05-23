-- Patagonia Wings ACARS 8.0 - server-side evaluation/evidence persistence
-- Idempotent migration. Safe to run multiple times in Neon SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.acars_evaluations (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique,
  pilot_user_id uuid null,
  pilot_callsign text null,
  evaluation_status text not null default 'PENDING_EVALUATION',
  economy_status text not null default 'PENDING_EVALUATION',
  operational_score numeric(6,2) not null default 0,
  procedure_score numeric(6,2) not null default 0,
  performance_score numeric(6,2) not null default 0,
  safety_score numeric(6,2) not null default 0,
  economy_score numeric(6,2) not null default 0,
  total_score numeric(6,2) not null default 0,
  observations jsonb not null default '[]'::jsonb,
  penalties_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.acars_evaluation_penalties (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null,
  code text not null,
  severity text not null,
  points numeric(6,2) not null default 0,
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.acars_evaluation_evidence (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_acars_evaluations_reservation on public.acars_evaluations(reservation_id);
create index if not exists idx_acars_evaluations_pilot_callsign on public.acars_evaluations(lower(pilot_callsign), updated_at desc);
create index if not exists idx_acars_eval_penalties_reservation on public.acars_evaluation_penalties(reservation_id);
create index if not exists idx_acars_eval_evidence_reservation on public.acars_evaluation_evidence(reservation_id);
