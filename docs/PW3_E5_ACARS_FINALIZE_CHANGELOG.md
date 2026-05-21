# PW3 E5 ACARS Finalize Changelog

## Nuevos archivos
- src/app/api/acars/finalize/route.ts
- src/app/api/acars/finalize/status/route.ts
- src/lib/acars/finalize-types.ts
- src/lib/acars/finalize-schema.ts
- src/lib/acars/finalize-economy.ts
- src/lib/acars/finalize-score.ts
- src/lib/acars/finalize-ledger.ts
- src/lib/acars/finalize-reservation.ts
- src/lib/acars/finalize-summary.ts
- scripts/pw3/validate-acars-finalize.mjs
- scripts/pw3/test-acars-finalize-local.mjs
- docs/sql/PW3_ACARS_FINALIZE_SCHEMA_001.sql
- scripts/pw3/apply-acars-finalize-schema-to-neon.mjs

## Cambios
- Finalize web end-to-end con schema validation.
- Cierre de reserva con idempotencia.
- Ledger post-vuelo idempotente.
- Pending accrual (sin pago wallet vuelo a vuelo).
- Posicion piloto/aeronave post-vuelo.
- Score basico por eventos operacionales.
- Historial/PIREP basico en `pw3_flight_reports`.
- Dashboard counters (`totalPireps`, `totalHours`, `score`) DB-real.

## Validaciones ejecutadas
- validate-acars-finalize: OK
- validate-pre-acars-dispatch: OK
- validate-airline-routes: OK
- validate-economy: OK
- validate-economy-db: OK
- export-economy-excel: OK
- export-airline-routes-excel: OK
- tsc: OK
- lint: OK (0 errores, warnings preexistentes)
- build: OK
