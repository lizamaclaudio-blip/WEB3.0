import type { AcarsFinalizePayload, FinalizeFlightType, FinalizeStatus, NormalizedFinalizePayload } from "@/lib/acars/finalize-types";

const FLIGHT_TYPES = new Set<FinalizeFlightType>(["training", "itinerary", "charter", "cargo"]);
const FINAL_STATUSES = new Set<FinalizeStatus>(["completed", "cancelled", "aborted", "diverted", "crashed"]);

type ValidationResult =
  | { ok: true; payload: NormalizedFinalizePayload }
  | { ok: false; status: number; errors: string[] };

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normUpper(value: unknown): string {
  return asString(value).toUpperCase();
}

function isoLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}

export function validateAcarsFinalizePayload(input: unknown): ValidationResult {
  const body = asObject(input);
  if (!body) return { ok: false, status: 400, errors: ["Payload JSON invalido."] };

  const errors: string[] = [];

  const payloadVersion = asString(body.payloadVersion);
  const reservationId = asString(body.reservationId);
  const dispatchToken = asString(body.dispatchToken) || undefined;
  const pilotCallsign = normUpper(body.pilotCallsign);
  const aircraftCode = normUpper(body.aircraftCode);
  const operationType = normUpper(body.operationType);
  const flightType = asString(body.flightType).toLowerCase() as FinalizeFlightType;
  const origin = normUpper(body.origin);
  const destination = normUpper(body.destination);
  const finalStatus = asString(body.finalStatus).toLowerCase() as FinalizeStatus;

  if (payloadVersion !== "pw3-acars-finalize-v1") errors.push("payloadVersion debe ser pw3-acars-finalize-v1.");
  if (!reservationId) errors.push("reservationId es obligatorio.");
  if (!pilotCallsign) errors.push("pilotCallsign es obligatorio.");
  if (!aircraftCode) errors.push("aircraftCode es obligatorio.");
  if (!operationType) errors.push("operationType es obligatorio.");
  if (!origin) errors.push("origin es obligatorio.");
  if (!destination) errors.push("destination es obligatorio.");
  if (!FLIGHT_TYPES.has(flightType)) errors.push("flightType invalido.");
  if (!FINAL_STATUSES.has(finalStatus)) errors.push("finalStatus invalido.");

  const startedAt = asString(body.startedAt) || undefined;
  const airborneAt = asString(body.airborneAt) || undefined;
  const landedAt = asString(body.landedAt) || undefined;
  const completedAt = asString(body.completedAt) || undefined;

  for (const [field, value] of [["startedAt", startedAt], ["airborneAt", airborneAt], ["landedAt", landedAt], ["completedAt", completedAt]] as const) {
    if (value && !isoLike(value)) errors.push(`${field} no tiene formato ISO valido.`);
  }

  const plannedObj = asObject(body.planned) ?? {};
  const actualObj = asObject(body.actual) ?? {};
  const acarsObj = asObject(body.acarsOperationalInputs) ?? {};

  const planned: AcarsFinalizePayload["planned"] = {
    routeId: asString(plannedObj.routeId) || undefined,
    distanceNm: asNumber(plannedObj.distanceNm),
    passengerCount: asNumber(plannedObj.passengerCount),
    cargoKg: asNumber(plannedObj.cargoKg),
    baggageKg: asNumber(plannedObj.baggageKg),
    fuelPlannedKg: asNumber(plannedObj.fuelPlannedKg),
    payloadKg: asNumber(plannedObj.payloadKg),
    economySnapshot: asObject(plannedObj.economySnapshot) ?? undefined,
  };

  const actual: AcarsFinalizePayload["actual"] = {
    blockTimeMinutes: asNumber(actualObj.blockTimeMinutes),
    flightTimeMinutes: asNumber(actualObj.flightTimeMinutes),
    distanceNm: asNumber(actualObj.distanceNm),
    passengerCount: asNumber(actualObj.passengerCount),
    cargoKg: asNumber(actualObj.cargoKg),
    baggageKg: asNumber(actualObj.baggageKg),
    fuelUsedKg: asNumber(actualObj.fuelUsedKg),
    fuelRemainingKg: asNumber(actualObj.fuelRemainingKg),
    payloadKg: asNumber(actualObj.payloadKg),
    landingAirport: normUpper(actualObj.landingAirport) || undefined,
    touchdownVsFpm: asNumber(actualObj.touchdownVsFpm),
    touchdownGs: asNumber(actualObj.touchdownGs),
    maxBankDeg: asNumber(actualObj.maxBankDeg),
    maxPitchDeg: asNumber(actualObj.maxPitchDeg),
    overspeedEvents: asNumber(actualObj.overspeedEvents),
    stallEvents: asNumber(actualObj.stallEvents),
    hardBrakeEvents: asNumber(actualObj.hardBrakeEvents),
    damageEvents: asNumber(actualObj.damageEvents),
    turbulenceLevel: asString(actualObj.turbulenceLevel) as AcarsFinalizePayload["actual"]["turbulenceLevel"],
    simRateExceeded: asBoolean(actualObj.simRateExceeded),
    ticketRevenueUsd: asNumber(actualObj.ticketRevenueUsd),
  };

  const acarsOperationalInputs: AcarsFinalizePayload["acarsOperationalInputs"] = {
    touchdownVsFpm: asNumber(acarsObj.touchdownVsFpm),
    hardLanding: asBoolean(acarsObj.hardLanding),
    excessiveBankEvents: asNumber(acarsObj.excessiveBankEvents),
    overspeedEvents: asNumber(acarsObj.overspeedEvents),
    hardBrakeEvents: asNumber(acarsObj.hardBrakeEvents),
    damageEvents: asNumber(acarsObj.damageEvents),
    turbulenceLevel: asString(acarsObj.turbulenceLevel) || undefined,
    actualFuelUsedKg: asNumber(acarsObj.actualFuelUsedKg),
    actualPayloadKg: asNumber(acarsObj.actualPayloadKg),
  };

  const rawEvents = Array.isArray(body.events) ? body.events : [];
  const events = rawEvents
    .map((item) => asObject(item))
    .filter(Boolean)
    .map((item) => ({
      type: asString(item!.type),
      severity: asString(item!.severity) || undefined,
      at: asString(item!.at) || undefined,
      value: asNumber(item!.value),
      message: asString(item!.message) || undefined,
    }))
    .filter((item) => item.type);

  if (flightType === "cargo") {
    if ((actual.passengerCount ?? 0) > 0 || (planned.passengerCount ?? 0) > 0) {
      errors.push("Cargo no puede tener passengerCount > 0.");
    }
    if ((actual.ticketRevenueUsd ?? 0) > 0) {
      errors.push("Cargo no puede tener ticketRevenue.");
    }
  }

  if (finalStatus === "completed") {
    if (!completedAt && !landedAt) errors.push("completed requiere landedAt o completedAt.");
    if (!actual.landingAirport && !destination) errors.push("completed requiere landingAirport o destination.");
  }

  if (errors.length > 0) return { ok: false, status: 400, errors };

  return {
    ok: true,
    payload: {
      payloadVersion: "pw3-acars-finalize-v1",
      reservationId,
      dispatchToken,
      pilotCallsign,
      aircraftCode,
      operationType,
      flightType,
      origin,
      destination,
      finalStatus,
      startedAt,
      airborneAt,
      landedAt,
      completedAt,
      planned,
      actual,
      acarsOperationalInputs,
      events,
      raw: asObject(body.raw) ?? undefined,
    },
  };
}

export function normalizeFinalizePayload(payload: NormalizedFinalizePayload) {
  return {
    ...payload,
    pilotCallsign: payload.pilotCallsign.toUpperCase(),
    aircraftCode: payload.aircraftCode.toUpperCase(),
    operationType: payload.operationType.toUpperCase(),
    origin: payload.origin.toUpperCase(),
    destination: payload.destination.toUpperCase(),
  };
}
