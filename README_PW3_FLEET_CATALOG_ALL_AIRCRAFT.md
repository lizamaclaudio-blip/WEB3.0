# PW3 Fleet Catalog — Flota completa

## Objetivo

Corrige la pestaña **Flota / Hangar** para que muestre el inventario completo de Patagonia Wings, separado de la disponibilidad operacional del despacho.

## Regla aplicada

- **Flota / Hangar**: muestra todas las aeronaves cargadas en `fleet_aircraft`.
- **Despacho**: mantiene los filtros por aeropuerto actual, rango, ruta, estado y compatibilidad.

## Archivos incluidos

- `src/lib/fleet/catalog.ts`
- `src/app/api/fleet/catalog/route.ts`
- `src/components/dashboard/sur/tabs/FleetTab.tsx`
- `src/app/globals.css`

## Cambios

- Crea `GET /api/fleet/catalog`.
- La pestaña Flota deja de depender de `/api/fleet/available` como fuente principal.
- Muestra ubicación actual, hub/base, rango requerido, estado, autonomía y permiso del piloto.
- Agrega filtros visuales: Todas, Disponibles, Mantenimiento, Reservadas/En vuelo, Habilitadas, No habilitadas.
- Si Neon solo tiene 4 aeronaves cargadas en `fleet_aircraft`, la UI mostrará esas 4 porque no inventa registros.

## Validación

Después de copiar, ejecutar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Confirmaciones

- No toca ACARS.
- No toca SQL/Neon migrations.
- No toca reservas, economía ni scoring.
- No cambia el flujo de despacho.
