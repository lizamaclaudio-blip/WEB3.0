import { AIRLINE_AIRCRAFT, getAirlineAircraft } from "@/lib/airline/aircraft";
import { getAirlineAirport } from "@/lib/airline/airports";
import rawCatalog from "./catalog.json";
import type {
  AircraftCategoryEconomyProfile,
  AircraftEconomyProfile,
  EconomyCurrency,
  ProfitabilityFloorConfig,
  ProgressionExpenseCatalogItem,
  RouteCategoryEconomyRate,
} from "./types";

export const ECONOMY_CURRENCY: EconomyCurrency = "USD";

export const economyCatalog = rawCatalog as {
  version: string;
  currency: EconomyCurrency;
  virtualOnly: boolean;
  baseAirlineCashUsd: number;
  initialPilotWalletGrantUsd: number;
  routeCategoryRates: Record<string, RouteCategoryEconomyRate>;
  aircraftCategoryProfiles: Record<string, AircraftCategoryEconomyProfile>;
  airportCategoryFeesUsd: Record<string, number>;
  profitabilityFloor: ProfitabilityFloorConfig;
  progressionExpenses: ProgressionExpenseCatalogItem[];
};

const fallbackRouteRate: RouteCategoryEconomyRate = {
  passengerRevenuePerPassengerNm: 0.2,
  cargoRevenuePerKgNm: 0.001,
  loadFactor: 0.65,
  cargoLoadFactor: 0.55,
  airportFeeUsd: 500,
  crewCostUsd: 400,
  cateringUsdPerPassenger: 4,
  cargoHandlingUsdPerKg: 0.14,
  pilotAccrualRate: 0.05,
  pilotAccrualMinimumUsd: 40,
  costFactor: 1,
};

const fallbackAircraftProfile: AircraftCategoryEconomyProfile = {
  fuelCostPerNm: 12,
  maintenanceCostPerNm: 4,
  maintenanceReservePerNm: 1,
  fixedTurnCostUsd: 250,
  crewCostMultiplier: 1,
};

export function getRouteEconomyRate(routeCategory: string) {
  return economyCatalog.routeCategoryRates[routeCategory] ?? fallbackRouteRate;
}

export function getAircraftCategoryEconomyProfile(category: string) {
  return economyCatalog.aircraftCategoryProfiles[category] ?? fallbackAircraftProfile;
}

export function getAircraftEconomyProfile(aircraftCode: string): AircraftEconomyProfile | null {
  const aircraft = getAirlineAircraft(aircraftCode);
  if (!aircraft) return null;
  const profile = getAircraftCategoryEconomyProfile(aircraft.category);
  return {
    ...profile,
    aircraftCode: aircraft.code,
    aircraftName: aircraft.name,
    category: aircraft.category,
    rangeNm: aircraft.rangeNm,
    passengerCapacity: aircraft.passengerCapacity,
    cargoCapacityKg: aircraft.supportsCargo ? aircraft.cargoCapacityKg : 0,
    supportsPassenger: aircraft.supportsPassenger,
    supportsCargo: aircraft.supportsCargo,
    minRank: aircraft.minRank,
    active: aircraft.active,
  };
}

export function getAircraftEconomyProfiles() {
  return AIRLINE_AIRCRAFT.filter((aircraft) => aircraft.active)
    .map((aircraft) => getAircraftEconomyProfile(aircraft.code))
    .filter(Boolean) as AircraftEconomyProfile[];
}

export function getAirportEconomyFeeUsd(icao: string) {
  const airport = getAirlineAirport(icao);
  if (!airport) return 0;
  return economyCatalog.airportCategoryFeesUsd[airport.airportCategory] ?? 250;
}

export function getProgressionExpenseCatalog() {
  return economyCatalog.progressionExpenses;
}

export function getEconomyCatalogVersion() {
  return economyCatalog.version;
}

export function getInitialPilotWalletGrant() {
  return economyCatalog.initialPilotWalletGrantUsd ?? 25000;
}

export function getProfitabilityFloorConfig(): ProfitabilityFloorConfig {
  return economyCatalog.profitabilityFloor ?? {
    minimumProfitUsd: 25,
    minimumProfitMarginPct: 0.08,
    remoteRegionalMinimumMarginPct: 0.12,
    cargoMinimumMarginPct: 0.15,
    charterMinimumMarginPct: 0.18,
    regionalSubsidyEnabled: true,
    cargoContractPremiumEnabled: true,
  };
}
