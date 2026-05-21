# AUDIT PW3 08 — DISPATCH / PRE-ACARS
**Fecha:** 2026-05-21 | **Fuente:** DispatchPageShell.tsx, DispatchRoomClient.tsx, training-reservations.ts, manifest-types.ts, validate-pre-acars-dispatch.mjs (58/58 ✅)

---

## Modos de Operación

| Modo | Código DB | Estado |
|---|---|---|
| `training_free` | TRAINING_FREE | ✅ Funciona |
| `official_route` | COMMERCIAL_OFFICIAL_ROUTE | ✅ Funciona |
| `charter_official` | CHARTER_OFFICIAL | ✅ Funciona |
| `cargo_official` | CARGO_OFFICIAL | ✅ Integrado (E4.0) |

---

## Dispatch Room (DispatchRoomClient.tsx)

- 4 modos en `DispatchMode` union type
- `normalizeDispatchMode`: mapea strings a tipos seguros incluyendo `cargo_official`
- `operationCodeForMode`: mapea a código DB
- `modeLabel`: "Vuelo de carga" para cargo_official
- `modeHelp`: texto descriptivo por modo
- `isCargoMode(mode)`: helper para cargo_official

---

## Cargo Dispatch

| Validación | Implementación | Estado |
|---|---|---|
| cargo_official visible en UI | DispatchPageShell: CargoOperationRow | ✅ |
| CADET cargo bloqueado | operationTypes.allows_cargo via DB | ✅ |
| FIRST_OFFICER+ desbloquea | pilot_ranks.allows_cargo=true | ✅ |
| Filtra solo rutas cargo | CargoRouteStage con isCargoRouteCategory() | ✅ |
| passenger_count = 0 en WeightFuelStage | isCargo ? 0 : paxCount | ✅ |
| cargoKg obligatorio (>0) | canContinueWeight: cargoKg > 0 para cargo | ✅ |
| No ticketRevenue en cargo | ticketRevenueUsd = 0 para cargo | ✅ |
| operationType no degrada CARGO_OFFICIAL | normalizeOperationType incluye CARGO_OFFICIAL | ✅ |

---

## Manifiestos Separados (manifest-types.ts)

```typescript
PassengerManifest: { passengerCount, baggageKg, excessBaggageKg, ticketRevenueUsd, passengerServiceCostUsd }
CargoManifest: { cargoKg, cargoRevenueUsd, cargoHandlingCostUsd, specialCargoFeeUsd, passengerCountForcedZero }
AircraftPayload: { aircraftCode, payloadKg, fuelPlannedKg, zfwEstimateKg, cargoCapacityKg, passengerCapacity }
EconomySnapshot: { routeId, flightType, aircraftCode, distanceNm, grossRevenueUsd, ticketRevenueUsd, cargoRevenueUsd, totalCostUsd, netProfitUsd, pilotAccrualUsd, maintenanceReserveUsd, aircraftWearPercent, economyEligible, source }
```

---

## Payload ACARS v1 (`training-reservations.ts`)

```json
{
  "payload_version": "pw3-dispatch-v1",
  "source": "WEB_NEON",
  "operation_type": "CARGO_OFFICIAL",
  "is_cargo": true,
  "loading": { "passenger_count": 0, "cargo_kg": 1200, "fuel_kg": 4500 },
  "manifest": {
    "passenger": { "passengerCount": 0, "ticketRevenueUsd": 0, ... },
    "cargo": { "cargoKg": 1200, "cargoRevenueUsd": 850.50, "passengerCountForcedZero": true },
    "aircraft_payload": { ... }
  },
  "economy_snapshot": {
    "source": "local-fallback",
    "grossRevenueUsd": 1240.50,
    "ticketRevenueUsd": 0,
    "cargoRevenueUsd": 850.50,
    "netProfitUsd": 480.20,
    "pilotAccrualUsd": 96.04,
    ...
  }
}
```

---

## Economy Snapshot

| Check | Estado |
|---|---|
| resolveEconomySnapshot() existe | ✅ |
| DB first (getRouteEconomyEstimate) | ✅ |
| Local fallback (calculateFlightEconomyEstimate) | ✅ |
| source: "db" / "local-fallback" / "none" | ✅ |
| Cargo: ticketRevenueUsd = 0 | ✅ |
| Cargo: cargoRevenueUsd > 0 (si ruta existe) | ✅ |
| Pax: ticketRevenueUsd > 0 (si ruta existe) | ✅ |
| aircraftWearPercent presente | ✅ |
| economyEligible correcto | ✅ |
| Snapshot no en cero para rutas conocidas | ✅ (corregido en E4.1) |

---

## Endpoints ACARS

| Endpoint | Existe | Función |
|---|---|---|
| `POST /api/dispatch/training-reservations` | ✅ | Crear reserva |
| `POST /api/dispatch/training-reservations/send-to-acars` | ✅ | Preparar payload ACARS |
| `POST /api/acars/dispatch/claim` | ✅ | ACARS desktop reclama despacho |
| `GET /api/acars/status` | ✅ | Estado ACARS del piloto |
| `POST /api/acars/finalize` | ❌ NO EXISTE | Pendiente ACARS |
| `POST /api/acars/closeout` | ❌ NO EXISTE | Pendiente ACARS |
| `POST /api/acars/live-telemetry` | ❌ NO EXISTE | Pendiente ACARS |

---

## Validate-Pre-ACARS-Dispatch

**58/58 checks ✅** — incluyendo todos los E4.0 y E4.1.

---

## ACARS Desktop / Finalize

- **NO TOCADO** ✅
- No existe `/api/acars/finalize` en el proyecto — correcto por diseño
- El contrato payload v1 está documentado en `docs/PW3_PRE_ACARS_PAYLOAD_V1.md`

---

## Observaciones Críticas

| Item | Impacto | Acción |
|---|---|---|
| economy_snapshot.source="none" para TRAINING_FREE sin routeId | Esperado — training free no tiene ruta | OK por diseño |
| payload ACARS v1 no incluye SimBrief data | SimBrief no integrado aún | Pendiente para vuelos oficiales |
| Claim endpoint no verifica autenticación piloto vs ACARS | Depende del token seguro | Aceptable pre-ACARS |
