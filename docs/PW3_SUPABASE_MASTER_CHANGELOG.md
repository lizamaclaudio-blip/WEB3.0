# PW3 Supabase Master Changelog

## 2026-05-16
- Se creó flujo automatizado PW3 para poblar Supabase por scripts y SQL (sin Table Editor).
- Se agregaron scripts Node:
  - `scripts/pw3/download-ourairports.mjs`
  - `scripts/pw3/import-ourairports.mjs`
  - `scripts/pw3/run-pw3-supabase-master.mjs`
  - `scripts/pw3/validate-pw3-master.mjs`
- Se agregaron bloques SQL `supabase/pw3/000` a `012`.
- Se agregaron comandos npm:
  - `pw3:download-airports`
  - `pw3:import-airports`
  - `pw3:db-master`
  - `pw3:validate-master`
- Se agregaron dependencias:
  - `pg`
  - `csv-parse`

## Seguridad
- Los scripts leen conexión desde `SUPABASE_DB_URL` o `DATABASE_URL`.
- No se escribe service role en el repositorio.
- No se agregan archivos `.env*` al control de versiones.
