# PW3 DISPATCH FLOW 04 — Flujo por tipo de operación

## Cambios

- La página principal de Despachos ya no muestra una selección independiente de aeronaves.
- Entrenamiento, Ruta oficial y Charter abren su flujo propio en `/dispatch/room`.
- Ruta oficial ahora funciona como:
  1. Seleccionar ruta oficial disponible.
  2. Seleccionar aeronave compatible con esa ruta.
  3. Plan de vuelo.
  4. Peso y combustible.
  5. Reserva temporal 15 minutos / Enviar a ACARS.
- Entrenamiento libre mantiene:
  1. Origen/destino libre.
  2. Aeronave.
  3. Plan de vuelo.
  4. Peso y combustible.
  5. Reserva temporal 15 minutos / Enviar a ACARS.
- Charter mantiene:
  1. Origen/destino.
  2. Aeronave autorizada.
  3. Plan de vuelo.
  4. Peso y combustible.
  5. Reserva temporal 15 minutos / Enviar a ACARS.

## Backend

- La reserva temporal ya acepta `operationType`:
  - `TRAINING_FREE`
  - `SCHOOL_OFFICIAL_ROUTE`
  - `COMMERCIAL_OFFICIAL_ROUTE`
  - `CHARTER_OFFICIAL`
- La reserva usa los flags desde `flight_operation_types` en Neon.
- El endpoint de preparación ACARS ya no fuerza únicamente `TRAINING_FREE`.
- El endpoint claim queda compatible con cualquier operación preparada.

## No toca

- No toca ACARS desktop.
- No toca diseño global.
- No ejecuta SQL.
- No ejecuta db-master ni import-airports.
- No cambia íconos.
