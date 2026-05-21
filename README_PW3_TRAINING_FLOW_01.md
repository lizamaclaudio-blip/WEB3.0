# PW3 TRAINING FLOW 01 — Reserva temporal entrenamiento libre

## Archivos incluidos

- `src/lib/dispatch/training-reservations.ts`
- `src/app/api/dispatch/training-reservations/route.ts`
- `src/components/dispatch/DispatchRoomClient.tsx`
- `src/components/dispatch/DispatchRoom.module.css`

## Qué implementa

- Crea reserva temporal `TRAINING_FREE` en Neon.
- Duración: 15 minutos.
- Estado: `TEMP_RESERVED`.
- `score_mode`: `REFERENCE_ONLY`.
- No mueve piloto.
- No mueve aeronave.
- No genera economía.
- No afecta ranking.
- No bloquea la aeronave real.
- Crea un token seguro de despacho para usar después con ACARS.
- Expira reservas temporales vencidas cuando se llama al endpoint.
- Si el piloto crea una nueva reserva temporal, la anterior activa se cancela.

## Endpoint nuevo

`POST /api/dispatch/training-reservations`

Body esperado:

```json
{
  "aircraftId": "uuid-o-matricula",
  "originIdent": "SCPF",
  "destinationIdent": "SCTE",
  "alternateIdent": "SAZS",
  "departureTime": "21:00",
  "flightLevel": "FL070",
  "routeText": "SCPF DCT SCTE",
  "passengerCount": 0,
  "cargoKg": 0,
  "fuelKg": 1200,
  "fuelPolicy": "AUTO PW"
}
```

## Validaciones de servidor

- Sesión cookie obligatoria.
- Origen y destino deben existir en `airports`.
- La aeronave debe venir desde `listAvailableAircraft(user)`, o sea disponible para el rango/ubicación del piloto.
- Solo implementa entrenamiento libre.

## Validar después de copiar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Próximo bloque

- Habilitar `Enviar a ACARS` usando `reservation.id` + `dispatch_token`.
- ACARS debe usar el token para iniciar una sesión válida.
- El servidor debe evaluar como `REFERENCE_ONLY`.
