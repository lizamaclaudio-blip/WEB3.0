/**
 * manifest-types.ts
 * PW3 Pre-ACARS E4.0 — Planned dispatch manifest and ACARS v1 payload types.
 * These types are used to build the planned payload before sending to ACARS desktop.
 * No ledger entries are created from these types.
 */

export type PassengerManifest = {
  passengerCount: number;
  baggageKg: number;
  excessBaggageKg: number;
  ticketRevenueUsd: number;
  passengerServiceCostUsd: number;
};

export type CargoManifest = {
  cargoKg: number;
  cargoRevenueUsd: number;
  cargoHandlingCostUsd: number;
  specialCargoFeeUsd: number;
  passengerCountForcedZero: boolean;
};

export type AircraftPayload = {
  aircraftCode: string;
  aircraftName: string;
  payloadKg: number;
  fuelPlannedKg: number;
  zfwEstimateKg: number;
  cargoCapacityKg: number | null;
  passengerCapacity: number | null;
};

export type EconomySnapshot = {
  routeId: string | null;
  flightType: string;
  aircraftCode: string;
  distanceNm: number;
  grossRevenueUsd: number;
  ticketRevenueUsd: number;
  cargoRevenueUsd: number;
  totalCostUsd: number;
  netProfitUsd: number;
  pilotAccrualUsd: number;
  maintenanceReserveUsd: number;
  aircraftWearPercent: number;
  economyEligible: boolean;
  source: "db" | "local-fallback" | "none";
};

export type PlannedManifest = {
  reservationId: string | null;
  pilotCallsign: string;
  flightType: string;
  operationCode: string;
  routeId: string | null;
  origin: string;
  destination: string;
  aircraftCode: string;
  aircraftName: string;
  plannedDistanceNm: number;
  plannedRouteText: string;
  passengerManifest: PassengerManifest;
  cargoManifest: CargoManifest;
  economySnapshot: EconomySnapshot | null;
  aircraftPayload: AircraftPayload;
  economyEligible: boolean;
  createdAt: string;
};

export type AcarsV1Payload = {
  reservationId: string;
  pilotCallsign: string;
  flightType: string;
  operationCode: string;
  routeId: string | null;
  origin: string;
  destination: string;
  aircraftCode: string;
  aircraftName: string;
  plannedDistanceNm: number;
  plannedRouteText: string;
  passengerManifest: PassengerManifest;
  cargoManifest: CargoManifest;
  economySnapshot: EconomySnapshot | null;
  payloadKg: number;
  fuelPlannedKg: number;
  baggageKg: number;
  aircraftWearEstimate: number;
  economyEligible: boolean;
};

export function buildPassengerManifest(opts: {
  passengerCount: number;
  baggageKg?: number;
  excessBaggageKg?: number;
  ticketRevenueUsd?: number;
  passengerServiceCostUsd?: number;
}): PassengerManifest {
  return {
    passengerCount: opts.passengerCount,
    baggageKg: opts.baggageKg ?? 0,
    excessBaggageKg: opts.excessBaggageKg ?? 0,
    ticketRevenueUsd: opts.ticketRevenueUsd ?? 0,
    passengerServiceCostUsd: opts.passengerServiceCostUsd ?? 0,
  };
}

export function buildCargoManifest(opts: {
  cargoKg: number;
  isCargo: boolean;
  cargoRevenueUsd?: number;
  cargoHandlingCostUsd?: number;
  specialCargoFeeUsd?: number;
}): CargoManifest {
  return {
    cargoKg: opts.cargoKg,
    cargoRevenueUsd: opts.cargoRevenueUsd ?? 0,
    cargoHandlingCostUsd: opts.cargoHandlingCostUsd ?? 0,
    specialCargoFeeUsd: opts.specialCargoFeeUsd ?? 0,
    passengerCountForcedZero: opts.isCargo,
  };
}

export function buildAircraftPayload(opts: {
  aircraftCode: string;
  aircraftName: string;
  passengerCount: number;
  cargoKg: number;
  fuelPlannedKg: number;
  cargoCapacityKg?: number | null;
  passengerCapacity?: number | null;
}): AircraftPayload {
  const zfwEstimateKg = Math.round(2800 + opts.passengerCount * 84 + opts.cargoKg);
  return {
    aircraftCode: opts.aircraftCode,
    aircraftName: opts.aircraftName,
    payloadKg: Math.round(opts.passengerCount * 84 + opts.cargoKg),
    fuelPlannedKg: opts.fuelPlannedKg,
    zfwEstimateKg,
    cargoCapacityKg: opts.cargoCapacityKg ?? null,
    passengerCapacity: opts.passengerCapacity ?? null,
  };
}
