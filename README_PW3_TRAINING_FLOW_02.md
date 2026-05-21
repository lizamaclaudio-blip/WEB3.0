# PW3 TRAINING FLOW 02 — Preparar envio seguro a ACARS

## Incluye

- `src/lib/dispatch/training-reservations.ts`
- `src/app/api/dispatch/training-reservations/send-to-acars/route.ts`
- `src/components/dispatch/DispatchRoomClient.tsx`
- `src/components/dispatch/DispatchRoom.module.css`

## Que implementa

- Endpoint `POST /api/dispatch/training-reservations/send-to-acars`.
- Valida sesion cookie del piloto.
- Valida reserva temporal `TRAINING_FREE`.
- Valida `dispatch_token` con hash server-side.
- Rechaza reservas vencidas, canceladas o no pertenecientes al piloto.
- Cambia estado a `ACARS_READY`.
- Guarda `prepared_acars_payload` en Neon.
- Devuelve payload seguro para ACARS.
- El boton `Enviar a ACARS` ahora prepara el despacho en servidor.

## Reglas preservadas

- Entrenamiento libre no mueve piloto.
- Entrenamiento libre no mueve aeronave.
- No genera economia.
- No afecta ranking.
- Score futuro: `REFERENCE_ONLY`.
- ACARS sigue siendo caja negra; no calcula score oficial.

## Validar despues de copiar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Prueba manual

1. Crear reserva temporal por 15 minutos.
2. Presionar `Enviar a ACARS`.
3. Debe quedar `Listo para ACARS`.
4. Si la reserva expiro, debe pedir volver a reservar.

## No toca

- ACARS desktop.
- db-master.
- import-airports.
- Flota real.
- Movimiento de piloto/aeronave.
