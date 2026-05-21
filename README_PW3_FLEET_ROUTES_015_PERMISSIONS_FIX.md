# PW3 Fleet/Routes 015 — permissions schema hotfix

Corrige el seeder `scripts/pw3/run-pw3-sql-015.mjs` para no asumir que `rank_aircraft_permissions.updated_at` existe.

## Causa
El seed ya logró crear/actualizar modelos, performance profiles y flota, pero falló al asegurar permisos porque tu tabla `rank_aircraft_permissions` no tiene columna `updated_at`.

## Corrección
- Si el permiso ya existe, solo actualiza columnas opcionales que realmente existan (`updated_at`, `is_allowed`, `allowed`, `can_fly`).
- Si no existe, inserta solo columnas presentes en el schema real.
- No toca ACARS, economía, scoring ni reservas.

## Ejecutar

```powershell
node scripts/pw3/run-pw3-sql-015.mjs
node scripts/pw3/run-pw3-sql-015.mjs --validate-only
```
