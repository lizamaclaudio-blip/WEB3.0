# PW3 Dispatch Route Selection Fix

Fecha: 2026-05-21  
Repo: `web-3.0`  
Objetivo: corregir falso `ROUTE_ID_REQUIRED` en Ruta oficial cuando la ruta ya aparece visible en UI.

## Hallazgo principal

La UI permitia seleccionar una ruta visible, pero la validacion y payload dependian de `selectedRoute.id` de forma estricta.
Si el objeto llegaba con alias (`routeId` o `route_id`) o sin `id` normalizado, el backend recibia `routeId` vacio o inconsistente y devolvia:

`Selecciona una ruta oficial valida para el despacho.`

## Auditoria de flujo

1. La ruta mostrada en tabla de Ruta oficial se renderiza desde `routes` cargadas por `GET /api/routes/available`.
2. El boton `Reservar por 15 minutos` ejecuta `createTemporaryReservation` en `DispatchRoomClient`.
3. Antes del fix, el payload usaba `routeId: selectedRoute?.id || null` y `canCreateReservation` exigia `selectedRoute?.id`.
4. Si la ruta venia con `routeId/route_id` no normalizado, la seleccion visual existia pero el `routeId` enviado podia quedar nulo.
5. Backend `training-reservations` mapea ese caso a `ROUTE_ID_REQUIRED`.

## Cambios aplicados

### Frontend

Archivo: `src/components/dispatch/DispatchRoomClient.tsx`

- Se agrego helper unificado:
  - `getRouteId(route) => route.id ?? route.routeId ?? route.route_id`
  - `getRouteCode(route) => route.route_code`
- `routeKey` ahora usa `getRouteId()` primero para estabilidad de seleccion.
- Normalizacion al cargar rutas:
  - rellena `id`, `routeId`, `route_id` en cada ruta.
- `canCreateReservation` ahora valida con `selectedRouteInternalId` (helper), no solo `selectedRoute.id`.
- En `createTemporaryReservation`:
  - usa `routeId` normalizado.
  - usa `routeCode` normalizado.
  - agrega `console.log` seguro previo al POST para auditar payload.
  - mensaje especifico si no se pudo resolver ID interno de ruta.

### Backend/API de rutas

Archivo: `src/lib/dispatch/neon-ops.ts`

- `listAvailableRoutes` ahora selecciona `nr.route_code` real desde `network_routes`.
- Devuelve compatibilidad explicita:
  - `id`
  - `routeId`
  - `route_id`
  - `route_code` real (fallback a `ORIGEN-DESTINO` solo si falta en DB).

### Backend reserva (fallback)

Archivo ya existente: `src/lib/dispatch/training-reservations.ts`

- Ya contiene fallback seguro:
  - por `routeId` UUID directo.
  - por `routeCode + origin + destination`.
  - por `origin + destination` solo si unica coincidencia.
  - si hay ambiguedad: `ROUTE_ID_REQUIRED`.

## Payload esperado (Ruta oficial)

```json
{
  "operationType": "SCHOOL_OFFICIAL_ROUTE | COMMERCIAL_OFFICIAL_ROUTE",
  "routeId": "<uuid real network_routes>",
  "routeCode": "PWG695",
  "originIdent": "SCTE",
  "destinationIdent": "SCIE",
  "aircraftId": "<uuid fleet o registration fallback>",
  "aircraftCode": "C208",
  "aircraftRegistration": "CC-PGA",
  "passengerCount": 0,
  "cargoKg": 0
}
```

## Estado de no-alcance

No se toco:
- ACARS updater/installer
- ACARS claim/finalize
- economia/wallet/ledger
- HUD
- `globals.css`
- auth/login
- dashboard
- seed global de rutas
