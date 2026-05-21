import type { AirlineAircraft } from "@/lib/airline/aircraft";
import type { AirlineRoute } from "@/lib/airline/routes";

export type EconomyCurrency = "USD";

export type EconomyLedgerType =
  | "airline_revenue"
  | "airline_cost"
  | "pilot_accrual"
  | "pilot_payout"
  | "pilot_expense"
  | "cargo_revenue"
  | "cargo_cost"
  | "maintenance_reserve"
  | "training_fee"
  | "certification_fee"
  | "checkride_fee"
  | "rank_progression_fee"
  | "pilot_transfer_fee"
  | "operational_penalty"
  | "adjustment";

export type EconomyLedgerDirection = "credit" | "debit";
export type EconomyLedgerStatus = "estimated" | "pending" | "posted" | "paid" | "void";

export type RouteCategoryEconomyRate = {
  ticketBaseFareUsd?: number;
  ticketYieldPerNmUsd?: number;
  passengerRevenuePerPassengerNm: number;
  cargoRevenuePerKgNm: number;
  cargoBaseFeeUsd?: number;
  cargoRatePerKgNmUsd?: number;
  loadFactor: number;
  cargoLoadFactor: number;
  airportFeeUsd: number;
  crewCostUsd: number;
  cateringUsdPerPassenger: number;
  cargoHandlingUsdPerKg: number;
  baggageIncludedKgPerPassenger?: number;
  averageBaggageKgPerPassenger?: number;
  excessBaggageProbability?: number;
  excessBaggageFeePerKgUsd?: number;
  onboardSalesPerPassengerUsd?: number;
  serviceRevenuePerPassengerUsd?: number;
  specialCargoFeeUsd?: number;
  pilotAccrualRate: number;
  pilotAccrualMinimumUsd: number;
  costFactor: number;
};

export type AircraftCategoryEconomyProfile = {
  fuelCostPerNm: number;
  maintenanceCostPerNm: number;
  maintenanceReservePerNm: number;
  fixedTurnCostUsd: number;
  crewCostMultiplier: number;
};

export type AircraftEconomyProfile = AircraftCategoryEconomyProfile & {
  aircraftCode: string;
  aircraftName: string;
  category: AirlineAircraft["category"];
  rangeNm: number;
  passengerCapacity: number;
  cargoCapacityKg: number;
  supportsPassenger: boolean;
  supportsCargo: boolean;
  minRank: string;
  active: boolean;
};

export type ProgressionExpenseCatalogItem = {
  code: string;
  type: Extract<
    EconomyLedgerType,
    | "training_fee"
    | "certification_fee"
    | "checkride_fee"
    | "rank_progression_fee"
    | "pilot_transfer_fee"
    | "operational_penalty"
  >;
  label: string;
  amountUsd: number;
  appliesTo: string;
  metadata?: Record<string, unknown>;
};

export type FlightEconomyEstimate = {
  routeId: string;
  origin: string;
  destination: string;
  flightType: AirlineRoute["flightType"];
  aircraftCode: string;
  distanceNm: number;
  passengerCapacity: number;
  estimatedPassengers: number;
  cargoCapacityKg: number;
  estimatedCargoKg: number;
  grossRevenueUsd: number;
  fuelCostUsd: number;
  airportFeesUsd: number;
  maintenanceCostUsd: number;
  maintenanceReserveUsd: number;
  crewCostUsd: number;
  cateringCostUsd: number;
  cargoHandlingCostUsd: number;
  totalCostUsd: number;
  netProfitUsd: number;
  pilotAccrualUsd: number;
  airlineNetUsd: number;
  economyEligible: boolean;
  notes: string[];
  estimatePayload?: {
    passengerEconomy?: {
      passengerCapacity: number;
      estimatedPassengers: number;
      loadFactor: number;
      ticketRevenueUsd: number;
      baggageIncludedKg: number;
      estimatedBaggageKg: number;
      excessBaggageKg: number;
      excessBaggageRevenueUsd: number;
      onboardSalesUsd: number;
      passengerServiceCostUsd: number;
      operationalSupportRevenueUsd?: number;
    };
    cargoEconomy?: {
      cargoCapacityKg: number;
      estimatedCargoKg: number;
      cargoLoadFactor: number;
      cargoRevenueUsd: number;
      cargoHandlingRevenueUsd: number;
      cargoHandlingCostUsd: number;
      specialCargoFeeUsd: number;
      passengerCountForcedZero: boolean;
    };
    aircraftWear?: {
      baseWearPercent: number;
      cycleWearPercent: number;
      payloadWearPercent: number;
      landingWearPercent: number;
      maneuverWearPercent: number;
      simulatedOperationalFactor: number;
      totalWearPercent: number;
      maintenanceReserveUsd: number;
      acarsLinked: false;
      wearReason: string;
    };
    acarsOperationalInputs?: {
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
  };
};

export type PilotEconomyProfile = {
  pilotId: string;
  callsign: string;
  rank: string;
  walletBalanceUsd: number;
  pendingAccrualUsd: number;
  paidThisMonthUsd: number;
  totalEarnedUsd: number;
  totalSpentUsd: number;
};

export type AirlineEconomySummary = {
  airlineCashUsd: number;
  monthlyRevenueUsd: number;
  monthlyCostUsd: number;
  monthlyNetUsd: number;
  passengerRevenueUsd: number;
  cargoRevenueUsd: number;
  pilotAccrualLiabilityUsd: number;
  maintenanceReserveUsd: number;
};

export type EconomyLedgerEntry = {
  id: string;
  createdAt: string;
  pilotId?: string;
  routeId?: string;
  reservationId?: string;
  type: EconomyLedgerType;
  category: string;
  amountUsd: number;
  direction: EconomyLedgerDirection;
  status: EconomyLedgerStatus;
  description: string;
  metadata: Record<string, unknown>;
};

export type EconomyValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  totals: {
    aircraftProfiles: number;
    activeAircraft: number;
    passengerRoutesEstimated: number;
    cargoRoutesEstimated: number;
    progressionExpenses: number;
    invalidProgressionExpenses: number;
    duplicateProgressionExpenses: number;
    negativeAmounts: number;
    cargoCompatibilityErrors: number;
    accrualExceedsNet: number;
    ineligibleRegularRoutes: number;
    profitablePassengerRoutes: number;
    unprofitablePassengerRoutes: number;
    profitableCargoRoutes: number;
    unprofitableCargoRoutes: number;
    passengerProfitabilityPct: number;
    cargoProfitabilityPct: number;
    totalPilotAccrualUsd: number;
    airlineCashUsd: number;
    monthlyNetUsd: number;
  };
};
