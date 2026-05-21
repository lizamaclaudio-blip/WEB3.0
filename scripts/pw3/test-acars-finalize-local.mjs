import process from "node:process";

const BASE_URL = process.env.PW3_BASE_URL || "http://localhost:3000";
const RESERVATION_ID = process.env.RESERVATION_ID || "";
const DISPATCH_TOKEN = process.env.DISPATCH_TOKEN || "";

if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
  console.error("[error] PW3_CONFIRM_DB_WRITE=YES requerido para test finalize.");
  process.exit(1);
}

if (!RESERVATION_ID || !DISPATCH_TOKEN) {
  console.error("[error] RESERVATION_ID y DISPATCH_TOKEN son requeridos para test finalize local.");
  process.exit(1);
}

function buildPayload(overrides = {}) {
  return {
    payloadVersion: "pw3-acars-finalize-v1",
    reservationId: RESERVATION_ID,
    dispatchToken: DISPATCH_TOKEN,
    pilotCallsign: "PWG001",
    aircraftCode: "A320",
    operationType: "COMMERCIAL_OFFICIAL_ROUTE",
    flightType: "itinerary",
    origin: "SCEL",
    destination: "SCTE",
    finalStatus: "completed",
    startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    airborneAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    landedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    completedAt: new Date().toISOString(),
    planned: { routeId: "PW-PAX-SCEL-SCTE", distanceNm: 510, passengerCount: 120, fuelPlannedKg: 6300 },
    actual: { blockTimeMinutes: 58, flightTimeMinutes: 46, distanceNm: 505, passengerCount: 118, baggageKg: 2200, fuelUsedKg: 2900, landingAirport: "SCTE" },
    acarsOperationalInputs: { touchdownVsFpm: -320, overspeedEvents: 0, hardBrakeEvents: 0, damageEvents: 0, actualFuelUsedKg: 2900, actualPayloadKg: 11100 },
    events: [],
    ...overrides,
  };
}

async function postFinalize(payload) {
  const res = await fetch(`${BASE_URL}/api/acars/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const completed = await postFinalize(buildPayload());
  console.log("[check] completed", completed.status, completed.json?.success, completed.json?.alreadyProcessed, completed.json?.pilotAccrualUsd);

  const duplicate = await postFinalize(buildPayload());
  console.log("[check] duplicate", duplicate.status, duplicate.json?.success, duplicate.json?.alreadyProcessed);

  const cargo = await postFinalize(buildPayload({
    flightType: "cargo",
    operationType: "CARGO_OFFICIAL",
    aircraftCode: "C208",
    planned: { routeId: "PW-CGO-SCTE-SCEL", distanceNm: 510, cargoKg: 1400 },
    actual: { blockTimeMinutes: 62, flightTimeMinutes: 49, distanceNm: 508, passengerCount: 0, cargoKg: 1320, fuelUsedKg: 2400, landingAirport: "SCEL" },
  }));
  console.log("[check] cargo", cargo.status, cargo.json?.success, cargo.json?.finalStatus);

  const hardLanding = await postFinalize(buildPayload({
    actual: { blockTimeMinutes: 60, flightTimeMinutes: 48, passengerCount: 118, fuelUsedKg: 3100, landingAirport: "SCTE", touchdownVsFpm: -980, overspeedEvents: 1 },
    acarsOperationalInputs: { touchdownVsFpm: -980, hardLanding: true, overspeedEvents: 1, damageEvents: 0, hardBrakeEvents: 1 },
  }));
  console.log("[check] hardLanding", hardLanding.status, hardLanding.json?.score, hardLanding.json?.warnings?.length ?? 0);
}

main().catch((err) => {
  console.error("[error] test-acars-finalize-local", err?.message || err);
  process.exit(1);
});
