# PW3 E5 ACARS Finalize Plan

## Confirmacion de base
- Endpoints existentes confirmados: /api/acars/status, /api/acars/dispatch/claim, /api/dispatch/training-reservations, /api/dispatch/training-reservations/send-to-acars.
- Endpoint faltante confirmado: /api/acars/finalize.

## Tablas Neon objetivo
- 	raining_dispatch_reservations (cierre/summary/finalize metadata)
- pw3_economy_ledger
- pw3_pilot_wallets (solo pending_accrual_usd, no wallet balance vuelo a vuelo)
- pw3_airline_economy_accounts
- pw3_flight_reports (nueva tabla idempotente para historial/PIREP basico, si no existe equivalente)

## Flujo finalize
1. POST payload ACARS finalize.
2. Validar schema robusto y reglas cargo/pax.
3. Resolver reserva y validar token/hash cuando aplique.
4. Idempotencia por cars_finalize:<reservationId>.
5. Si ya finalizado -> lreadyProcessed=true sin duplicar ledger/accrual.
6. Calcular score basico.
7. Calcular economia real post-vuelo (completed only).
8. Escribir ledger idempotente (airline_revenue/cost/maintenance_reserve/pilot_accrual).
9. Acumular pending_accrual_usd (sin pago wallet).
10. Cerrar reserva y persistir summary/final payload.
11. Actualizar posicion piloto/aeronave y registrar reporte basico.
12. Responder summary estandar.

## Schema payload entrante
- Version: pw3-acars-finalize-v1
- Campos obligatorios: eservationId, pilotCallsign, ircraftCode, lightType, inalStatus, origin, destination.
- Reglas clave:
  - cargo no admite pasajeros > 0
  - cargo no admite revenue de boletos
  - completed requiere datos minimos de cierre
  - crashed/aborted/cancelled => devengo positivo no permitido

## Ledger e idempotencia
- Claves por reserva:
  - light_economy:<reservationId>:airline_revenue
  - light_economy:<reservationId>:airline_cost
  - light_economy:<reservationId>:maintenance_reserve
  - light_economy:<reservationId>:pilot_accrual
- Cierre finalize:
  - cars_finalize:<reservationId>

## Validadores/scripts E5
- scripts/pw3/validate-acars-finalize.mjs
- scripts/pw3/test-acars-finalize-local.mjs
- Integracion en alidate-pw3-master.mjs

## No alcance confirmado
- Sin tocar ACARS desktop.
- Sin tocar globals.css.
- Sin rediseño UI.
- Sin pago wallet vuelo a vuelo.
- Sin Supabase para economia PW3.
