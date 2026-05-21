export type FinalizeFlightType = "training" | "itinerary" | "charter" | "cargo";
export type FinalizeStatus = "completed" | "cancelled" | "aborted" | "diverted" | "crashed";

export type AcarsFinalizeEvent = {
  type: string;
  severity?: string;
  at?: string;
  value?: number;
  message?: string;
};

export type AcarsFinalizePlanned = {
  routeId?: string;
  distanceNm?: number;
  passengerCount?: number;
  cargoKg?: number;
  baggageKg?: number;
  fuelPlannedKg?: number;
  payloadKg?: number;
  economySnapshot?: Record<string, unknown>;
};

export type AcarsFinalizeActual = {
  blockTimeMinutes?: number;
  flightTimeMinutes?: number;
  distanceNm?: number;
  passengerCount?: number;
  cargoKg?: number;
  baggageKg?: number;
  fuelUsedKg?: number;
  fuelRemainingKg?: number;
  payloadKg?: number;
  landingAirport?: string;
  touchdownVsFpm?: number;
  touchdownGs?: number;
  maxBankDeg?: number;
  maxPitchDeg?: number;
  overspeedEvents?: number;
  stallEvents?: number;
  hardBrakeEvents?: number;
  damageEvents?: number;
  turbulenceLevel?: "none" | "light" | "moderate" | "severe";
  simRateExceeded?: boolean;
  ticketRevenueUsd?: number;
};

export type AcarsOperationalInputs = {
  touchdownVsFpm?: number;
  hardLanding?: boolean;
  excessiveBankEvents?: number;
  overspeedEvents?: number;
  hardBrakeEvents?: number;
  damageEvents?: number;
  turbulenceLevel?: string;
  actualFuelUsedKg?: number;
  actualPayloadKg?: number;
};

export type AcarsFinalizePayload = {
  payloadVersion: "pw3-acars-finalize-v1";
  reservationId: string;
  dispatchToken?: string;
  pilotCallsign: string;
  aircraftCode: string;
  operationType: string;
  flightType: FinalizeFlightType;
  origin: string;
  destination: string;
  finalStatus: FinalizeStatus;
  startedAt?: string;
  airborneAt?: string;
  landedAt?: string;
  completedAt?: string;
  planned: AcarsFinalizePlanned;
  actual: AcarsFinalizeActual;
  acarsOperationalInputs: AcarsOperationalInputs;
  events?: AcarsFinalizeEvent[];
  raw?: Record<string, unknown>;
};

export type NormalizedFinalizePayload = AcarsFinalizePayload & {
  reservationId: string;
  pilotCallsign: string;
  aircraftCode: string;
  operationType: string;
  origin: string;
  destination: string;
};

export type FinalizeScoreResult = {
  score: number;
  warnings: string[];
  hardLanding: boolean;
};

export type FinalizeEconomyResult = {
  economyEligible: boolean;
  grossRevenueUsd: number;
  totalCostUsd: number;
  netProfitUsd: number;
  maintenanceReserveUsd: number;
  pilotAccrualUsd: number;
  airlineRevenueUsd: number;
  airlineCostUsd: number;
  wearPercent: number;
  ticketRevenueUsd: number;
  cargoRevenueUsd: number;
  notes: string[];
};

export type FinalizeSummary = {
  success: boolean;
  alreadyProcessed: boolean;
  reservationClosed: boolean;
  economyEligible: boolean;
  score: number;
  summaryUrl: string;
  ledgerWritten: boolean;
  pilotAccrualUsd: number;
  finalStatus: FinalizeStatus;
  warnings: string[];
};
