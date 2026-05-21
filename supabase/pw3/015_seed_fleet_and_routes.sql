-- PW3 015: Fleet and routes seed.
-- Compatibility note:
-- The live Neon schema can have aircraft_models.family_id as NOT NULL.
-- For that reason the executable seed is implemented in scripts/pw3/run-pw3-sql-015.mjs,
-- which introspects the live schema and fills compatible columns safely.
--
-- Apply with:
--   node scripts/pw3/run-pw3-sql-015.mjs
-- Validate with:
--   node scripts/pw3/run-pw3-sql-015.mjs --validate-only
--
-- This SQL file intentionally performs only non-destructive compatibility checks.

create extension if not exists pgcrypto;

-- Ensure the optional operation_type column exists for route filtering/validation.
do $$
begin
  if to_regclass('public.network_routes') is not null then
    alter table public.network_routes add column if not exists operation_type text;
    alter table public.network_routes add column if not exists route_category text;
    alter table public.network_routes add column if not exists min_rank_code text;
    alter table public.network_routes add column if not exists distance_nm numeric;
    alter table public.network_routes add column if not exists is_active boolean not null default true;
  end if;
end $$;
