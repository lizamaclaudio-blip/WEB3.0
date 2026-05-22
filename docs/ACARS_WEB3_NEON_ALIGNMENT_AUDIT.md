# ACARS Web 3.0 Neon Alignment Audit

## Snapshot

- Fecha: 2026-05-22
- Version ACARS visible esperada: 7.1.3
- Web commit base auditado: 6e5b81b
- Endpoint Web directo: `/api/dispatch/send-to-acars`
- Estado DB esperado para handoff: `ACARS_READY`
- Payload esperado: `pw3-dispatch-v1`
- Problema visual actual: ACARS desktop muestra que no hay reserva/despacho aunque Web 3.0 ya dejo un despacho listo para ACARS.

## Auditoria Neon

- Tabla: `public.training_dispatch_reservations`
- Ultimo despacho PWG001 encontrado: SI
- `status`: `ACARS_READY`
- `acars_state`: `ACARS_READY`
- `payload_version`: `pw3-dispatch-v1`
- Payload presente: `dispatch_payload`, `acars_payload`, `prepared_acars_payload`
- Aeronave: `C208` / `CC-PCD`
- Callsign asignado: `PWG695`

## Diagnostico

El endpoint Web `/api/acars/dispatch/claim` seguia delegado al flujo legacy `claimTrainingReservationForAcars`, que exigia:

- `reservationId`
- `dispatchToken`
- `expires_at` vigente
- `status` legacy compatible con reserva temporal

El flujo ACARS directo ya no entrega un token local al desktop antes del claim. El desktop debe reclamar el ultimo despacho `ACARS_READY` del piloto autenticado desde la Web API.

## Regla De Arquitectura

- ACARS desktop no conecta directo a Neon.
- Web 3.0 es la unica capa que lee/escribe Neon.
- ACARS desktop consume endpoints Web 3.0.

## Cierre Tecnico

- Claim Web 3.0 acepta despacho directo `ACARS_READY` por piloto autenticado.
- Claim Web 3.0 acepta `dispatchToken` cuando ACARS ya tiene un despacho local.
- Claim ya no exige `expires_at` ni reserva temporal.
- Payload claim normalizado devuelve `flight`, `route`, `aircraft`, `simbrief`, `loading`, `schedule` y `economySnapshot`.
- ACARS desktop queda alineado a `/api/acars/dispatch/claim` y a `pw3-dispatch-v1`.
