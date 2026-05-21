# PW3 Economy DB Changelog

## Base
- Proyecto: web-3.0 (base corregida actual)
- Bloque: E1+E2 persistencia DB economia virtual

## SQL y ejecucion
- SQL: docs/sql/PW3_ECONOMY_SCHEMA_001.sql
- Aplicador: scripts/pw3/apply-economy-schema-to-neon.mjs
- Validacion DB: scripts/pw3/validate-economy-db.mjs
- Log aplicacion: docs/PW3_ECONOMY_DB_APPLY_LOG.md

## Tablas creadas/verificadas
- pw3_airline_economy_accounts
- pw3_pilot_wallets
- pw3_economy_ledger
- pw3_flight_economy_estimates
- pw3_pilot_monthly_payouts
- pw3_pilot_expense_catalog
- pw3_pilot_expense_ledger
- pw3_aircraft_economy_profiles
- pw3_route_economy_profiles

## Seeds idempotentes aplicados
- Cuenta PW3: 1
- Aeronaves activas: 34
- Rutas economia activas: 78 (50 itinerary + 28 cargo)
- Gastos progresion activos: 11

## API y capa DB
- DB layer:
  - src/lib/economy/db.ts
  - src/lib/economy/wallet-db.ts
  - src/lib/economy/ledger-db.ts
  - src/lib/economy/seed-db.ts
- APIs DB-first read-only:
  - src/app/api/economy/airline-summary/route.ts
  - src/app/api/economy/pilot-summary/route.ts
  - src/app/api/economy/routes/route.ts
  - src/app/api/economy/expenses/route.ts
  - src/app/api/economy/ledger/route.ts
  - src/app/api/economy/estimates/route.ts

## UI economia
- src/components/economy/EconomyDashboard.tsx
- Ajuste: summary DB-first via /api/economy/airline-summary con fallback local.
- Sin rediseño global.

## Validaciones ejecutadas
- node scripts/pw3/apply-economy-schema-to-neon.mjs (PW3_CONFIRM_DB_WRITE=YES)
- node scripts/pw3/validate-economy-db.mjs
- node scripts/pw3/validate-airline-routes.mjs
- node scripts/pw3/validate-economy.mjs
- node scripts/pw3/export-economy-excel.mjs
- npm run build
- npx tsc --noEmit
- npm run lint (warnings preexistentes, sin errores)

## No tocado
- globals.css (no modificado por este bloque)
- ACARS/finalize/endpoints ACARS
- landing/oficina/entrenamiento/certificaciones (sin cambios en este bloque)
- wallet/ledger con POST publico (no habilitado)

## Pendientes reales
- Conectar devengo automatico desde cierre real ACARS/finalize (fuera de alcance)
- Liquidacion mensual real con control admin
- Ejecucion de gastos progresion desde UI con permisos

## Bloque adicional realista (pasajeros/carga/equipaje/desgaste)
- Motor actualizado con ticket revenue, equipaje y sobrepeso por ruta pasajera.
- Rutas cargo forzadas a 0 pasajeros y 0 ticket revenue.
- Modelo de desgaste aeronave deterministico por routeId+aircraftCode en estimatePayload.aircraftWear.
- Reserva de mantenimiento ligada al desgaste sin doble conteo.
- Catalogo de gastos de progresion ampliado a 14 items (teoricos/checkrides/habilitaciones/certificaciones/recurrente/reintento).
- Seed DB idempotente actualizado para dejar solo codigos activos vigentes.
- Excel ampliado con hojas 'Desgaste aeronave' y 'Equipaje y sobrepeso'.
