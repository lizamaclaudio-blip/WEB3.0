-- Draft for the generated/versioned migration. Do not execute independently.
-- Audited targets in donguccheqjqyzudowuy: one settings row, 17 hub rows.
-- No remote views/functions reference them. A single FK points from hubs to airports.
-- Public/browser access is not required by the retained server-side airline code.
-- Keep table owner, data, constraints, indexes and service_role privileges intact.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.pw3_settings enable row level security;
alter table public.pw3_airline_hubs enable row level security;

-- RLS alone does not protect TRUNCATE, REFERENCES or TRIGGER permissions.
revoke all privileges on table public.pw3_settings from public, anon, authenticated;
revoke all privileges on table public.pw3_airline_hubs from public, anon, authenticated;

-- No public policies are added: these retained configuration tables are server-only.
-- Existing service_role and owner permissions are deliberately preserved.
-- Audited pg_attribute.attacl is NULL for every column; no separate column grants exist.
