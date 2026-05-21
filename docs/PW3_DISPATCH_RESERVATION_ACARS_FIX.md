# PW3 Dispatch Temporary Reservation + ACARS Fix

## Snapshot inicial

- Fecha: 2026-05-21
- Repo: Patagonia Wings Web 3.0
- Rama inicial: main
- Commit inicial: 9280724af2b30c7e2b387cb6fd5d1c893405489a
- Usuario de prueba: PWG001
- Ubicacion operacional esperada: SCTE
- Ruta de prueba: SCTE -> SCPF
- Aeronave de prueba: BE58 / CC-PBA
- Endpoint de reserva: POST /api/dispatch/training-reservations
- Endpoint send-to-acars: POST /api/dispatch/training-reservations/send-to-acars
- Endpoint claim ACARS: POST /api/acars/dispatch/claim

## Tablas involucradas

- public.app_users
- public.pilot_profiles
- public.app_sessions (solo sesion temporal de validacion)
- public.airports
- public.network_routes
- public.fleet_aircraft
- public.aircraft_models
- public.aircraft_performance_profiles
- public.rank_aircraft_permissions
- public.pw_flight_operation_rules
- public.training_dispatch_reservations

## Archivos tocados

- src/app/api/dispatch/training-reservations/route.ts
- src/app/api/dispatch/training-reservations/send-to-acars/route.ts
- src/lib/dispatch/training-reservations.ts
- src/lib/dispatch/operation-types.ts
- src/components/dispatch/DispatchRoomClient.tsx
- scripts/pw3/validate-dispatch-temporary-reservation.mjs
- docs/PW3_DISPATCH_RESERVATION_ACARS_FIX.md

## Archivos que no se tocaron

- ACARS updater
- ACARS installer
- ACARS claim/finalize desktop
- economia
- wallet
- ledger
- finalize Web
- auth/login
- HUD
- globals.css
- landing
- rutas globales
- seed de rutas

## Auditoria del flujo actual

1. El boton Reservar por 15 minutos llama a POST /api/dispatch/training-reservations desde DispatchRoomClient.tsx.
2. Payload frontend antes del fix: operationType, aircraftId, routeId, originIdent, destinationIdent, alternateIdent, departureTime, flightLevel, routeText, passengerCount, cargoKg, fuelKg, fuelPolicy, isCargo.
3. Payload frontend despues del fix: agrega aircraftCode, aircraftRegistration y routeCode, manteniendo routeId real y aircraftId real.
4. El backend recibe el body en src/app/api/dispatch/training-reservations/route.ts.
5. La funcion central que crea reserva es createTrainingFreeReservation en src/lib/dispatch/training-reservations.ts.
6. La tabla escrita es public.training_dispatch_reservations.
7. El estado inicial creado es TEMP_RESERVED.
8. El dispatchToken se genera en createDispatchToken(), se guarda como dispatch_token_hash y se devuelve como dispatch_token solo al cliente.
9. Enviar a ACARS llama POST /api/dispatch/training-reservations/send-to-acars.
10. Antes, el boton Enviar a ACARS dependia de estado local ready con reserva; ahora exige reservation.id + dispatch_token.
11. Antes, el panel lateral mostraba Avion reservado con solo aeronave seleccionada; ahora dice Aeronave seleccionada hasta que exista reserva valida.
12. Causa probable de fallo visible: el endpoint de reglas de operacion consultaba description en public.pw_flight_operation_rules, pero Neon no tiene esa columna. Log observado: column "description" does not exist.
13. Riesgo adicional corregido: la funcion cancelaba reservas temporales vigentes antes de crear una nueva, en vez de reutilizarlas.
14. Riesgo adicional corregido: no habia respuesta plana garantizada con reservationId + dispatchToken + expiresAt.

## Auditoria Neon PWG001

### Perfil piloto

- pilot_id/user_id: 94301e6f-1a8a-41eb-9b79-322bc1bc9c89
- email: lizamaclaudio@gmail.com
- callsign: PWG001
- rank_code: CADET
- pilot_status: ACTIVE
- current_airport_id: b6fa4a23-826d-4c35-bb06-4256761c819d
- current_airport_ident: SCTE
- base_airport_ident: SCPF

### Ruta SCTE -> SCPF

- route_id activo: bf7d1bde-7ff9-41ab-99df-ba4c015736ce
- route_code: PW-PAX-SCTE-SCPF
- category: ESCUELA_LOCAL
- min_rank_code: CADET
- distance_nm: 7.9
- allows_passenger: true
- allows_cargo: false
- is_active: true

### Aeronave BE58 / CC-PBA

- Tabla real de flota: public.fleet_aircraft
- aircraft_id: e2e58a7e-8129-45a0-afc7-21654f411b3a
- registration: CC-PBA
- model_code: BE58
- model_name: Beechcraft Baron 58
- aircraft_status: AVAILABLE
- current_airport_ident: SCTE
- rank permission CADET/BE58: existe

### Reservas recientes

- No habia reservas activas/candidatas para PWG001 antes de la prueba controlada.
- No habia reservas activas/candidatas para CC-PBA antes de la prueba controlada.
- Reservas recientes previas estaban FINALIZED y no bloqueaban.

## Status real permitido

- public.training_dispatch_reservations no tiene CHECK constraint para status.
- Estados usados por el codigo actual: TEMP_RESERVED, ACARS_READY, ACARS_CLAIMED, RESERVED, DISPATCHED, IN_FLIGHT, LANDED, PENDING_EVALUATION, EVALUATED, CANCELLED, EXPIRED, FINALIZED.
- Estado nuevo de reserva temporal: TEMP_RESERVED.
- Estado listo para ACARS: ACARS_READY.
- Estado cleanup test: CANCELLED.

## Definicion de reserva valida

Una reserva es valida para Enviar a ACARS si:

- pertenece al piloto autenticado.
- tiene route_id valido.
- tiene aircraft_id y aircraft_registration validos.
- tiene dispatch_token_hash persistido.
- el frontend tiene dispatchToken plano devuelto por la API.
- expires_at > now().
- status es TEMP_RESERVED o ACARS_READY.
- no esta CANCELLED, EXPIRED ni FINALIZED.

## Cambios aplicados

- createTrainingFreeReservation ahora resuelve routeId real o routeCode/origin/destination si es seguro.
- createTrainingFreeReservation ahora resuelve aeronave por aircraftId, registration o model_code unico disponible.
- Si existe reserva TEMP_RESERVED/ACARS_READY valida para la misma ruta/aeronave, reutiliza la misma fila.
- Al reutilizar, rota y devuelve un dispatchToken fresco para que el cliente pueda enviarlo a ACARS.
- Si existe reserva temporal vencida, se marca EXPIRED.
- Si existe reserva temporal corrupta sin route_id, aircraft_id o token hash, se marca CANCELLED.
- Si existe reserva temporal para otra ruta/aeronave, devuelve ACTIVE_RESERVATION_EXISTS con activeReservationId.
- Si la aeronave esta reservada por otro piloto, devuelve AIRCRAFT_RESERVED_BY_OTHER.
- La respuesta de reserva ahora incluye reservationId, dispatchToken, expiresAt, status, reusedExistingReservation, aircraft y route.
- send-to-acars valida pertenencia, token, expiracion y status.
- send-to-acars puede regenerar token si no llega dispatchToken y la reserva sigue valida.
- send-to-acars actualiza prepared_acars_payload y acars_payload_version pw3-dispatch-v1.
- send-to-acars devuelve reservationId, dispatchToken, claimUrl, payloadVersion, expiresAt y acarsPayload.
- DispatchRoomClient habilita Enviar a ACARS solo con reservation.id + dispatch_token.
- DispatchRoomClient muestra mensaje especifico para reserva nueva o reutilizada.
- DispatchRoomClient no muestra Avion reservado antes de tener una reserva valida.
- operation-types usa null::text as description para compatibilidad con el esquema real de Neon sin tocar SQL.

## Validacion local/Neon

Comando:

```bash
node scripts/pw3/validate-dispatch-temporary-reservation.mjs
```

Resultado:

- PWG001 existe y esta ACTIVE.
- PWG001 current_airport = SCTE.
- Ruta SCTE -> SCPF activa existe.
- BE58 / CC-PBA existe, esta AVAILABLE y esta en SCTE.
- No habia reserva activa previa que bloqueara la prueba.
- POST /api/dispatch/training-reservations respondio OK.
- reservationId devuelto: si.
- dispatchToken devuelto: si.
- route_id coincide: si.
- aircraft CC-PBA coincide: si.
- expiresAt queda aproximadamente 15 minutos en el futuro.
- Segunda llamada reutilizo la misma reserva.
- reusedExistingReservation=true confirmado.
- send-to-acars respondio OK.
- payloadVersion = pw3-dispatch-v1.
- claimUrl devuelto.
- DB quedo temporalmente en ACARS_READY.
- Cleanup marco la reserva de prueba como CANCELLED.

Reserva de prueba limpiada:

- 0a853c86-f3b1-4be2-968b-1438bc322ce5 -> CANCELLED

## Validacion operation-types

- GET /api/dispatch/operation-types con sesion temporal respondio 200.
- ok=true.
- operation_types count=8.
- Primer tipo: TRAINING_FREE.

## Validadores ejecutados

- npm run build -> OK.
- npx tsc --noEmit -> OK.
- node scripts/pw3/validate-dispatch-temporary-reservation.mjs -> OK contra servidor local production build en http://localhost:3000.

## Cleanup DB de pruebas

- Reserva 0a853c86-f3b1-4be2-968b-1438bc322ce5 -> CANCELLED.
- Reserva dc4f6e7b-79fa-4bc6-8a11-1d211f10d13d -> CANCELLED.
- Reservas activas PWG001 despues del cleanup: 0.

## Deploy Vercel

- Primer deploy Git para commit ddae567: READY.
- Produccion fallo inicialmente por env faltante: DATABASE_URL no esta configurada.
- Se agregaron env vars de .env.local a Vercel Production sin imprimir secretos.
- Redeploy remoto desde Vercel: READY.
- Alias productivo validado: https://web-30-ashen.vercel.app.

## Validacion produccion

Comando:

```bash
PW3_VALIDATE_BASE_URL=https://web-30-ashen.vercel.app node scripts/pw3/validate-dispatch-temporary-reservation.mjs
```

Resultado:

- PWG001 existe y esta ACTIVE.
- PWG001 current_airport = SCTE.
- Ruta SCTE -> SCPF activa existe.
- BE58 / CC-PBA existe, esta AVAILABLE y esta en SCTE.
- POST /api/dispatch/training-reservations respondio OK en produccion.
- reservationId devuelto: si.
- dispatchToken devuelto: si.
- expiresAt aproximadamente 15 minutos: si.
- Segunda llamada reutilizo la misma reserva: si.
- send-to-acars respondio OK en produccion.
- payloadVersion = pw3-dispatch-v1.
- claimUrl devuelto.
- DB quedo temporalmente en ACARS_READY y luego cleanup marco CANCELLED.

Reserva de prueba produccion limpiada:

- 1ca61227-b913-4cef-b990-2628f864cbd0 -> CANCELLED
