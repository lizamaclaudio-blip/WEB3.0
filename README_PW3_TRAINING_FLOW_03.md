# PW3 TRAINING FLOW 03 — Endpoint ACARS claim

Este parche deja la web lista para que ACARS consuma de forma segura un despacho `TRAINING_FREE` ya preparado desde la Sala de Despacho.

## Archivos

- `src/lib/dispatch/training-reservations.ts`
- `src/app/api/acars/dispatch/claim/route.ts`

## Endpoint nuevo

`POST /api/acars/dispatch/claim`

Body aceptado:

```json
{
  "reservationId": "uuid",
  "dispatchToken": "token entregado por la web",
  "acarsVersion": "7.x.x",
  "clientName": "PatagoniaWingsACARS"
}
```

También acepta nombres snake_case:

```json
{
  "reservation_id": "uuid",
  "dispatch_token": "token",
  "acars_version": "7.x.x",
  "client_name": "PatagoniaWingsACARS"
}
```

## Validaciones server-side

- La reserva debe existir.
- El token debe coincidir con el hash guardado en Neon.
- `operation_type` debe ser `TRAINING_FREE`.
- `score_mode` debe ser `REFERENCE_ONLY`.
- El estado debe ser `ACARS_READY` o `ACARS_CLAIMED`.
- La reserva no debe estar vencida.
- El payload preparado debe existir.

## Estados

Al consumir correctamente:

- `status = ACARS_CLAIMED`
- `acars_status = CLAIMED`
- `acars_claimed_at` se marca una sola vez.
- `acars_claim_last_at` se actualiza en cada claim.
- `acars_claim_count` aumenta.

## Reglas preservadas

Entrenamiento libre:

- no mueve piloto;
- no mueve aeronave;
- no genera economía;
- no afecta ranking;
- score referencial;
- ACARS solo consume evidencia, no evalúa oficialmente.

## Validación

Después de copiar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Prueba manual técnica

Después de crear reserva y presionar “Enviar a ACARS”, probar con el `reservationId` y `dispatchToken` reales:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/acars/dispatch/claim" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"reservationId":"UUID","dispatchToken":"TOKEN","acarsVersion":"local-test","clientName":"ManualTest"}'
```

Debe devolver:

```json
{
  "ok": true,
  "status": "ACARS_CLAIMED",
  "dispatch": {
    "operation_type": "TRAINING_FREE",
    "score_mode": "REFERENCE_ONLY"
  }
}
```

No toca ACARS desktop, no ejecuta `db-master`, no ejecuta `import-airports`.
