# PW3 Economy Changelog

Base usada: `web-3.0` local con red operacional completa de `src/lib/airline`.

Fecha: 2026-05-20.

## Archivos inspeccionados

- `src/app/economy/page.tsx`
- `src/app/api/economy/pilot-summary/route.ts`
- `src/components/dashboard/EconomySummaryCard.tsx`
- `src/lib/crew/server-data.ts`
- `src/lib/dispatch/operation-types.ts`
- `src/lib/dispatch/training-reservations.ts`
- `src/lib/dispatch/neon-ops.ts`
- `src/lib/airline/*`
- `scripts/pw3/*`
- `supabase/pw3/*`
- `docs/*`
- `package.json`

## Archivos tocados

- `docs/PW3_ECONOMY_AUDIT.md`
- `docs/PW3_ECONOMY_CHANGELOG.md`
- `docs/sql/PW3_ECONOMY_SCHEMA_001.sql`
- `docs/exports/PW3_ECONOMY_MODEL.xlsx`
- `src/lib/economy/catalog.json`
- `src/lib/economy/types.ts`
- `src/lib/economy/catalog.ts`
- `src/lib/economy/calculator.ts`
- `src/lib/economy/ledger.ts`
- `src/lib/economy/pilot-economy.ts`
- `src/lib/economy/airline-economy.ts`
- `src/lib/economy/monthly-payout.ts`
- `src/lib/economy/validation.ts`
- `src/lib/economy/index.ts`
- `src/app/api/economy/estimate/route.ts`
- `src/app/api/economy/airline-summary/route.ts`
- `src/app/api/economy/pilot-summary/route.ts`
- `src/app/api/economy/routes/route.ts`
- `src/app/api/economy/expenses/route.ts`
- `src/app/economy/page.tsx`
- `src/components/economy/EconomyDashboard.tsx`
- `src/components/economy/EconomyDashboard.module.css`
- `src/components/airline/RegularFlightsView.tsx`
- `src/components/airline/RegularFlightsView.module.css`
- `scripts/pw3/economy-model.mjs`
- `scripts/pw3/validate-economy.mjs`
- `scripts/pw3/export-economy-excel.mjs`

## Modelo economico creado

- Economia 100% virtual en USD.
- Ingresos y costos separados para pasajeros y carga.
- Devengo piloto separado de wallet.
- Ledger virtual estimado, sin escritura real.
- Liquidacion mensual preparada como helper puro.
- Catalogo de gastos de progresion.
- Perfil economico generado para las 34 aeronaves activas del catalogo operacional.
- Estimaciones para 50 rutas itinerary y 28 rutas cargo.

## Recalibracion de modelo

- Se recalibraron tarifas, ocupacion, costos de combustible, mantenimiento, tripulacion, handling y factores por categoria.
- Se separo `maintenanceCostUsd` como mantenimiento operacional.
- Se agrego `maintenanceReserveUsd` como reserva separada.
- `totalCostUsd` incluye mantenimiento operacional y reserva una sola vez.
- El resumen de aerolinea ya no vuelve a descontar reserva de mantenimiento por fuera.

Resultado de calibracion:

- Rutas pasajeros positivas: 42.
- Rutas pasajeros negativas: 8.
- Rentabilidad pasajeros: 84%.
- Rutas carga positivas: 28.
- Rutas carga negativas: 0.
- Rentabilidad carga: 100%.
- Devengo piloto total estimado: 339974.98 USD virtual.
- Utilidad mensual estimada: 4533260.40 USD virtual.
- Caja virtual final: 7033260.40 USD virtual.

## APIs creadas

- `GET /api/economy/estimate`
- `GET /api/economy/airline-summary`
- `GET /api/economy/routes`
- `GET /api/economy/expenses`

API extendida de forma compatible:

- `GET /api/economy/pilot-summary` ahora mantiene `economy` legacy y agrega `pilotEconomy` y `progressionExpenses`.

## UI creada

- `src/app/economy/page.tsx` reconstruida como pagina SUR-style compacta.
- `src/components/economy/EconomyDashboard.tsx` muestra resumen aerolinea, resumen piloto, rutas rentables y gastos de progresion.
- `src/components/economy/EconomyDashboard.module.css` contiene estilos locales.

## Integracion con Vuelos Regulares

- `src/components/airline/RegularFlightsView.tsx` muestra estimacion de ingreso, costo, utilidad y devengo para rutas `itinerary` y `cargo`.
- Training/escuela local sigue separado y no se mezcla con la vista principal comercial.

## Despacho

- No se tocaron endpoints ACARS/finalize ni el flujo de reserva temporal.
- La economia queda disponible por APIs y motor local para una integracion posterior en despacho sin escribir ledger real.
- Pendiente real: agregar badge visual en sala de despacho cuando se autorice tocar esa pantalla; se dejo fuera para minimizar riesgo en el flujo ACARS.

## SQL documental

- `docs/sql/PW3_ECONOMY_SCHEMA_001.sql` creado como esquema idempotente y no destructivo.
- No se ejecuto contra Neon, Supabase ni produccion.
- El archivo contiene aviso explicito de no ejecucion sin autorizacion.

## Excel generado

- `docs/exports/PW3_ECONOMY_MODEL.xlsx`

Hojas:

- Resumen
- Perfil aeronaves economico
- Costos por categoria
- Rutas pasajeros economia
- Rutas carga economia
- Devengos piloto estimados
- Gastos progresion
- Validaciones

## Validaciones

Ejecutadas durante el bloque:

- `node scripts/pw3/validate-economy.mjs`
- `node scripts/pw3/export-economy-excel.mjs`
- `node scripts/pw3/validate-airline-routes.mjs`
- `npx tsc --noEmit`
- `npm run build`
- `npm run lint`

Resultado:

- Red de rutas: OK.
- Economia: OK.
- Excel economico: OK.
- TypeScript: OK.
- Build: OK.
- Lint: OK con 6 warnings preexistentes fuera de este bloque.

## Que NO se toco

- `src/app/globals.css`
- Landing
- Oficina
- Entrenamiento
- Certificaciones
- Dashboard
- Iconos globales
- ACARS
- finalize
- endpoints ACARS
- Supabase productivo
- Neon productivo
- economia antigua PW2
- wallet/ledger real con escrituras

## Pendientes reales

- Conectar post-vuelo real cuando se autorice tocar finalize/ACARS.
- Persistir ledger y wallets cuando se autorice ejecutar SQL en entorno correcto.
- Agregar badge economico en despacho si se autoriza tocar esa pantalla.
- Crear UI administrativa final de liquidacion mensual cuando exista politica de permisos/admin.
