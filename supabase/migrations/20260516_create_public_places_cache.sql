create table if not exists public.public_places_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists public_places_cache_expires_at_idx
  on public.public_places_cache (expires_at);

alter table public.public_places_cache enable row level security;

-- lectura publica opcional para consumo web (sin sesion)
drop policy if exists "public read places cache" on public.public_places_cache;
create policy "public read places cache"
  on public.public_places_cache
  for select
  to anon, authenticated
  using (true);

-- escrituras solo con service role desde el backend
-- (service_role bypass RLS; no policy de insert/update para anon)
