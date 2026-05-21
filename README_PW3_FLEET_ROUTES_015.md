# PW3 Fleet + Routes 015 Patch

## Incluye

- `supabase/pw3/015_seed_fleet_and_routes.sql`
- `supabase/pw3/015_validation_fleet_and_routes.sql`
- `scripts/pw3/run-pw3-sql-015.mjs`
- `src/components/dispatch/DispatchPageShell.tsx`
- `docs/PW3_FLEET_AND_ROUTES_SEED.md`

## Qué hace

1. Corrige el `Failed to fetch` de Despachos para que la UI no se caiga si un endpoint falla.
2. Carga modelos de aeronave, performance, flota inicial completa y permisos por rango.
3. Carga rutas base oficiales, escuela, regionales, Patagonia, carga y oceánicas.
4. Agrega validación SQL de conteos.

## Aplicar

Copiar los archivos en la raíz de `web-3.0`.

Luego ejecutar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Para cargar la base:

```powershell
node scripts/pw3/run-pw3-sql-015.mjs
```

## No toca

- ACARS
- scoring
- economía
- wallet
- db-master
- import-airports
- diseño global
