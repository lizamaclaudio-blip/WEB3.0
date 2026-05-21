# PW3 WEB 01 - Conexion inicial a Neon

## Archivos incluidos

- `src/lib/db/client.ts`
- `src/lib/db/queries/public-stats.ts`
- `src/app/api/public/stats/route.ts`
- `src/app/api/airports/search/route.ts`
- `src/app/api/hubs/route.ts`
- `package.json` sin cambios funcionales; ya contiene `pg`.

## Que conecta

- Landing stats publicos desde Neon.
- Busqueda mundial de aeropuertos usando `pw_search_airports_for_dispatch`.
- Hubs PW3 desde `pw3_airline_hubs` o `airline_hubs`.

## No incluido aun

- Migracion de login/auth.
- Reemplazo de `src/lib/supabase/browser.ts`.
- Reemplazo completo de APIs privadas.

Eso se hara en bloque separado para no romper el flujo de login existente.

## Variable requerida

En `.env.local` o entorno local:

```txt
DATABASE_URL=postgresql://...
```

No subir `.env.local` a git.

## Validar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
