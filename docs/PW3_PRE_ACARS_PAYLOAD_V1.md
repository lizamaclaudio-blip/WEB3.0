# PW3 Pre-ACARS — Payload ACARS v1 Contract

## Objetivo

Este documento define el contrato de payload que la web genera antes de enviar un despacho a ACARS desktop.
No conecta el cierre real. No genera ledger por vuelo. Solo prepara datos planificados.

## Tipos fuente

`src/lib/dispatch/manifest-types.ts`

---

## AcarsV1Payload

```typescript
{
  reservationId: string;        // ID de reserva temporal (uuid)
  pilotCallsign: string;        // ej: "PWG001"
  flightType: string;           // "passenger" | "cargo"
  operationCode: string;        // "COMMERCIAL_OFFICIAL_ROUTE" | "CARGO_OFFICIAL" | "TRAINING_FREE" | "CHARTER_OFFICIAL"
  routeId: string | null;       // ID de ruta de network_routes, null si training libre
  origin: string;               // ICAO origen, ej: "SCEL"
  destination: string;          // ICAO destino, ej: "SCTE"
  aircraftCode: string;         // Código modelo, ej: "B738"
  aircraftName: string;         // Nombre display, ej: "Boeing 737-800"
  plannedDistanceNm: number;    // Distancia planificada en NM
  plannedRouteText: string;     // Ej: "SCEL DCT SCTE"
  passengerManifest: PassengerManifest;
  cargoManifest: CargoManifest;
  economySnapshot: EconomySnapshot | null;
  payloadKg: number;            // pax*84 + cargoKg
  fuelPlannedKg: number;        // combustible planificado
  baggageKg: number;            // equipaje total estimado
  aircraftWearEstimate: number; // % desgaste estimado post-vuelo (0-100)
  economyEligible: boolean;     // si el vuelo genera economía virtual
}
```

---

## PassengerManifest

```typescript
{
  passengerCount: number;           // 0 para cargo
  baggageKg: number;
  excessBaggageKg: number;
  ticketRevenueUsd: number;         // 0 para cargo
  passengerServiceCostUsd: number;  // 0 para cargo
}
```

## CargoManifest

```typescript
{
  cargoKg: number;                   // > 0 para cargo; puede ser 0 para pax
  cargoRevenueUsd: number;           // 0 para pax puro
  cargoHandlingCostUsd: number;      // 0 para pax puro
  specialCargoFeeUsd: number;        // 0 para pax puro
  passengerCountForcedZero: boolean; // true si operationCode === "CARGO_OFFICIAL"
}
```

## EconomySnapshot

```typescript
{
  routeId: string | null;
  flightType: string;
  aircraftCode: string;
  distanceNm: number;
  grossRevenueUsd: number;
  totalCostUsd: number;
  netProfitUsd: number;
  pilotAccrualUsd: number;
  maintenanceReserveUsd: number;
  aircraftWearPercent: number;
  economyEligible: boolean;
}
```

---

## Reglas

| Condición | Valor forzado |
|---|---|
| `operationCode === "CARGO_OFFICIAL"` | `passengerCount = 0`, `ticketRevenueUsd = 0`, `cargoKg > 0` obligatorio |
| `operationCode === "TRAINING_FREE"` | `economyEligible = false` |
| `cargoKg = 0` y modo cargo | Error de validación — no permite dispatch |
| `passengerCount > 0` y modo cargo | Ignorado — forzado a 0 en cliente y servidor |

---

## Endpoint reserva temporal

`POST /api/dispatch/training-reservations`

Body enviado desde el cliente:
```json
{
  "operationType": "CARGO_OFFICIAL",
  "aircraftId": "uuid-o-registro",
  "routeId": "uuid-ruta",
  "originIdent": "SCEL",
  "destinationIdent": "SCTE",
  "alternateIdent": "SAZS",
  "departureTime": "14:00",
  "flightLevel": "FL090",
  "routeText": "SCEL DCT SCTE",
  "passengerCount": 0,
  "cargoKg": 1200,
  "fuelKg": 2800,
  "fuelPolicy": "AUTO PW",
  "isCargo": true
}
```

---

## Endpoint send-to-acars

`POST /api/dispatch/training-reservations/send-to-acars`

Body:
```json
{
  "reservationId": "uuid",
  "dispatchToken": "token-seguro"
}
```

Respuesta esperada (cuando ACARS desktop esté conectado):
```json
{
  "ok": true,
  "acarsPayload": { ...AcarsV1Payload }
}
```

---

## Estado actual

- Payload planificado: **preparado** (tipos en `manifest-types.ts`)
- Envío a ACARS desktop: **pendiente** (bloque ACARS siguiente)
- Finalize: **NO tocado**
- Ledger real por vuelo: **NO creado aquí**

---
*Documento: PW3 Pre-ACARS E4.0*
