# PW3 Economy Audit

Base revisada: `web-3.0` local, sobre la red operacional completa ya corregida.

Fecha de auditoria: 2026-05-20.

## Archivos encontrados relacionados con economia

- `src/app/economy/page.tsx`: pagina cliente existente de economia virtual. Mostraba resumen piloto/aerolinea basico y tenia mojibake visible en textos.
- `src/app/api/economy/pilot-summary/route.ts`: endpoint existente que devuelve `economy` desde `loadCrewCenterData()`.
- `src/components/dashboard/EconomySummaryCard.tsx`: tarjeta de dashboard con estado "No disponible".
- `src/types/dashboard.ts`: tipos de resumen economico para dashboard.
- `src/lib/crew/server-data.ts`: carga legacy de `wallet_balance`, `pilot_salary_ledger` y `pilot_expense_ledger` para resumen piloto.
- `src/lib/db/queries/public-stats.ts`: menciona `flight_economy_snapshots` para estadisticas publicas.
- `src/lib/dispatch/operation-types.ts`: define operaciones con flag `affects_economy`.
- `src/lib/dispatch/training-reservations.ts`: crea reservas temporales con `affects_economy`, pero no debe tocarse para este bloque.
- `src/lib/dispatch/neon-ops.ts`: carga rutas/fleet desde Neon y devuelve `economy: null` en payload operacional.
- `supabase/pw3/014_flight_operation_types_and_reservation_flags.sql`: tabla `flight_operation_types` y flags de economia.
- `scripts/pw3/apply-airline-routes-to-neon.mjs`: inserta `CARGO_OFFICIAL` con `affects_economy=false` en la fase de rutas.

## Wallet o balance piloto

Existe lectura de balance desde `pilot_profiles.wallet_balance` dentro de `src/lib/crew/server-data.ts`.

No se encontro un motor local nuevo de wallet para PW3. La regla de esta fase es no pagar vuelo a vuelo: los vuelos generan devengo pendiente y el wallet se incrementa solo por liquidacion mensual futura.

## Ledger

Se encontraron referencias a:

- `pilot_salary_ledger`
- `pilot_expense_ledger`
- `flight_economy_snapshots`

No se encontro un ledger economico PW3 unificado y trazable para aerolinea, piloto, carga, gastos y reserva de mantenimiento. En esta fase se crea un modelo local y SQL idempotente documental, sin ejecutar contra produccion.

## Rutas y catalogos de rutas

La fuente operacional corregida esta en:

- `src/lib/airline/catalog.json`
- `src/lib/airline/routes.ts`
- `src/lib/airline/cargo-routes.ts`
- `src/lib/airline/route-network.ts`

Totales de red local:

- 60 rutas pasajeros totales.
- 50 rutas itinerary/regulares visibles en la vista principal.
- 10 rutas escuela/local separadas.
- 28 rutas cargo.
- 88 rutas operacionales totales.

## Aeronaves, capacidad y carga

La fuente local incluye 34 aeronaves activas en `src/lib/airline/catalog.json`.

Cada aeronave contiene:

- `code`
- `category`
- `rangeNm`
- `minRank`
- `allowedRanks`
- `supportsPassenger`
- `supportsCargo`
- `cargoCapacityKg`
- `passengerCapacity`

Regla auditada: si `supportsCargo=false`, `cargoCapacityKg=0`.

## Rangos y permisos

La fuente local incluye 10 rangos en `src/lib/airline/catalog.json`, expuestos por `src/lib/airline/ranks.ts`.

Cada rango contiene aeronaves permitidas, categoria maxima de ruta y flags de carga, internacional y largo radio.

## Reservas

Existen reservas operacionales en:

- `flight_reservations`
- `training_dispatch_reservations`

El bloque actual no toca endpoints ACARS/finalize ni cierre real de vuelos. La economia post-vuelo queda preparada por tipos y helpers, no conectada a finalize.

## Operacion de carga

La red local ya contiene `flightType="cargo"` y rutas `PW-CGO-*`.

El tipo de operacion `CARGO_OFFICIAL` existe en scripts de rutas, con `affects_economy=false` en esa fase para no mover dinero real. En esta fase se crea estimacion virtual de carga separada, sin escribir wallet ni ledger real.

## Datos reales que puede usar el motor

- Distancia NM desde `src/lib/airline/route-network.ts`.
- Flight type, categoria y rango minimo desde rutas locales.
- Capacidad pasajeros/carga, autonomia y soporte cargo desde flota local.
- Hubs pasajeros/carga desde aeropuertos locales.
- Rangos y permisos desde catalogo local.
- Lectura legacy de resumen piloto existente, solo como compatibilidad de API.

## Faltante a crear

- Motor de estimacion virtual de pasajeros y carga.
- Catalogo economico versionado.
- Perfil economico para las 34 aeronaves.
- Ledger virtual tipado y helpers de trazabilidad.
- Devengo piloto separado del wallet.
- Liquidacion mensual pura/no invasiva.
- Catalogo de gastos de progresion.
- APIs GET de economia local.
- Vista de economia integrada al estilo actual.
- Estimaciones en Vuelos Regulares.
- SQL idempotente documental para futura base.
- Validador y Excel economico.

## Que NO se debe tocar

- `src/app/globals.css`
- Landing
- Oficina
- Entrenamiento
- Certificaciones
- Dashboard, salvo integracion minima documentada
- ACARS
- finalize y endpoints ACARS
- Supabase/Neon productivo
- Economia antigua de Patagonia Wings 2.0
- Wallet/ledger productivo con escrituras reales
