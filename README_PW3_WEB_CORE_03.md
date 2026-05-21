# PW3 WEB CORE 03 — Despacho conectado a reglas operativas Neon

## Objetivo
La web deja de depender solo de reglas duras en componentes y comienza a leer la matriz oficial desde Neon:

- `flight_operation_types`
- `pw_flight_operation_rules`
- flags operativos en `pilot_ranks`

## Archivos incluidos

- `src/lib/dispatch/operation-types.ts`
- `src/app/api/dispatch/operation-types/route.ts`
- `src/lib/dispatch/neon-ops.ts`
- `src/lib/dispatch/training-reservations.ts`
- `src/components/dispatch/DispatchPageShell.tsx`
- `src/components/dispatch/DispatchRoomClient.tsx`
- `src/components/dispatch/OperationTypeStep.tsx`
- `src/components/dispatch/RouteSelectionStep.tsx`

## Cambios principales

- Nuevo endpoint: `GET /api/dispatch/operation-types`.
- Devuelve tipos de operación activos desde Neon, permisos por rango y motivo de bloqueo.
- `TRAINING_FREE` toma TTL, score y flags desde `flight_operation_types`.
- La reserva temporal de entrenamiento sigue siendo referencial y no mueve piloto/aeronave.
- `listAvailableRoutes` usa los flags nuevos de rango para decidir rutas escuela, comerciales, charter, carga y traslado de aeronave.
- Se elimina la palabra `ferry` de componentes de despacho antiguos para no confundir conceptos.

## Reglas preservadas

- Entrenamiento libre = práctica referencial.
- Ruta oficial = operación regulada de Patagonia Wings.
- Traslado de aeronave = mover una aeronave real.
- Reposicionamiento del piloto = mover solo al piloto.
- ACARS no se toca en este bloque.

## Validar después de copiar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Pruebas manuales sugeridas

- `GET /api/dispatch/operation-types`
- `/dashboard` → Despachos
- Entrenamiento libre debe seguir permitiendo reserva temporal.
- Charter debe quedar habilitado/bloqueado según `pilot_ranks.allows_charter`.
- Rutas oficiales deben respetar `allows_school_routes` y `allows_commercial_routes`.
