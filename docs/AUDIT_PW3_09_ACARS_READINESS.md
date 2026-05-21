# AUDIT PW3 09 — ACARS READINESS
**Fecha:** 2026-05-21 | **Solo lectura — no se implementa nada**

---

## Endpoints Web Existentes

| Endpoint | Método | Estado | Propósito |
|---|---|---|---|
| `/api/acars/status` | GET | ✅ Existe | Estado ACARS del piloto autenticado |
| `/api/acars/dispatch/claim` | POST | ✅ Existe | ACARS desktop reclama despacho por token |
| `/api/dispatch/training-reservations` | POST | ✅ Existe | Crear reserva de despacho |
| `/api/dispatch/training-reservations/send-to-acars` | POST | ✅ Existe | Generar payload ACARS v1 |
| `/api/acars/finalize` | — | ❌ NO EXISTE | Pendiente |
| `/api/acars/closeout` | — | ❌ NO EXISTE | Pendiente |
| `/api/acars/live-telemetry` | — | ❌ NO EXISTE | Pendiente |
| `/api/acars/score` | — | ❌ NO EXISTE | Pendiente |

---

## Flujo Actual (Web → ACARS Desktop)

```
1. Piloto crea despacho en web → POST /api/dispatch/training-reservations
   → Reserva guardada en training_dispatch_reservations (status: TEMP_RESERVED)

2. Piloto presiona "Enviar a ACARS" → POST .../send-to-acars
   → resolveEconomySnapshot() [DB → local-fallback]
   → buildTrainingAcarsPayload() → payload v1 completo
   → Guardado en prepared_acars_payload (status: ACARS_READY)

3. ACARS Desktop llama → POST /api/acars/dispatch/claim
   → Valida reservationId + dispatchToken (hash)
   → Devuelve payload v1 completo
   → status: ACARS_CLAIMED

4. ACARS Desktop vuela...
   [CORTE — no hay endpoints post-vuelo]
```

---

## Contrato Payload v1

Documentado en `docs/PW3_PRE_ACARS_PAYLOAD_V1.md`. Incluye:
- Campos: payload_version, operation_type, is_cargo, loading, manifest (passenger + cargo + aircraft_payload), economy_snapshot, rules, pilot, aircraft, route
- economy_snapshot.source: "db" | "local-fallback" | "none"

---

## Qué Falta Para ACARS Desktop

| Item | Estado | Bloquea |
|---|---|---|
| Endpoint `/api/acars/finalize` | ❌ No existe | **SÍ** |
| Validación payload ACARS entrante (schema) | ❌ No existe | **SÍ** |
| Lectura de datos reales de vuelo (fuel, wear, landing) | ❌ No existe | **SÍ** |
| Registro en economy ledger post-vuelo | ❌ No existe | **SÍ** |
| Actualización de posición piloto/aeronave | ❌ No existe | **SÍ** |
| Score engine (landing quality, events) | ❌ No existe | Recomendado |
| PIREPs automáticos | ❌ No existe | Recomendado |
| totalHours/totalPireps en dashboard real | ❌ No existe | Recomendado |
| Liquidación mensual automática (cron) | ⚠️ Parcial | No inmediato |

---

## Qué Falta Para Cierre Económico Real

| Item | Estado |
|---|---|
| acarsOperationalInputs en payload finalize | Pendiente |
| Cálculo wear real vs. estimado pre-vuelo | Pendiente |
| Cargo revenue realizado vs. planificado | Pendiente |
| Passenger revenue realizado vs. planificado | Pendiente |
| Ledger entry por vuelo completado | Pendiente |

---

## Riesgos Antes de Conectar ACARS

1. **Sin finalize endpoint** — ACARS desktop no puede cerrar un vuelo
2. **Sin validación de token ACARS** — el claim usa dispatch_token_hash pero no verifica identidad ACARS
3. **Sin schema validation** — payload entrante del ACARS desktop no se valida contra schema estricto
4. **Reserva TRAINING_FREE** — afecta_economia=false; OK para pruebas, pero cargo_official afecta_economia=true y no hay finalize para registrar
5. **economy_snapshot planificado ≠ real** — el snapshot es una estimación pre-vuelo; el post-vuelo real requiere datos del simulador

---

## Decisión

**NO listo para ACARS desktop en producción.** El flujo web→claim está listo. El flujo claim→finalize→ledger NO existe.


## POST-E5 Update (Codex)
- /api/acars/finalize creado.
- Finalize status endpoint creado.
- Cierre de reserva, score, ledger y pending_accrual implementados en web.

