import { getAirlineAircraft } from "@/lib/airline/aircraft";
import {
  getCargoRoutes,
  getOperationalRoutes,
  getPassengerRoutes,
} from "@/lib/airline/route-network";
import type { AirlineRoute } from "@/lib/airline/routes";
import { getAircraftTechnicalProfile } from "@/lib/aircraft/technical-profiles";
import {
  getAircraftEconomyProfile,
  getAirportEconomyFeeUsd,
  getProfitabilityFloorConfig,
  getRouteEconomyRate,
} from "./catalog";
import type { FlightEconomyEstimate, EconomySnapshot, ProfitabilityAdjustmentReason } from "./types";

export type FlightEconomyEstimateInput = {
  routeId: string;
  aircraftCode?: string | null;
};

function nonNegativeMoney(value: number) {
  return Number(Math.max(0, value).toFixed(2));
}

function signedMoney(value: number) {
  return Number(value.toFixed(2));
}

function count(value: number) {
  return Math.max(0, Math.round(value));
}

function stableFactor(routeId: string, aircraftCode: string) {
  const seed = `${routeId}:${aircraftCode}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  const normalized = Math.abs(hash % 13) / 100; // 0.00 to 0.12
  return Number((1 + normalized).toFixed(2));
}

function findRoute(routeId: string) {
  const normalized = routeId.trim().toUpperCase();
  return getOperationalRoutes().find((route) => route.routeId === normalized) ?? null;
}

export function getRecommendedAircraftForRoute(route: AirlineRoute) {
  return route.recommendedAircraft[0] ?? route.allowedAircraft[0] ?? "";
}

function emptyEstimate(
  routeId: string,
  aircraftCode: string,
  notes: string[],
): FlightEconomyEstimate {
  return {
    routeId,
    origin: "",
    destination: "",
    flightType: "itinerary",
    aircraftCode,
    distanceNm: 0,
    passengerCapacity: 0,
    estimatedPassengers: 0,
    cargoCapacityKg: 0,
    estimatedCargoKg: 0,
    grossRevenueUsd: 0,
    fuelCostUsd: 0,
    airportFeesUsd: 0,
    maintenanceCostUsd: 0,
    maintenanceReserveUsd: 0,
    crewCostUsd: 0,
    cateringCostUsd: 0,
    cargoHandlingCostUsd: 0,
    totalCostUsd: 0,
    netProfitUsd: 0,
    pilotAccrualUsd: 0,
    airlineNetUsd: 0,
    economyEligible: false,
    notes,
  };
}

export function calculateRouteEconomyEstimate(
  route: AirlineRoute,
  aircraftCode = getRecommendedAircraftForRoute(route),
): FlightEconomyEstimate {
  const normalizedAircraftCode = aircraftCode.trim().toUpperCase();
  if (!normalizedAircraftCode) {
    return emptyEstimate(route.routeId, "", ["Ruta sin aeronave recomendada para economia."]);
  }

  const aircraft = getAirlineAircraft(normalizedAircraftCode);
  const profile = getAircraftEconomyProfile(normalizedAircraftCode);
  if (!aircraft || !profile) {
    return emptyEstimate(route.routeId, normalizedAircraftCode, ["Aeronave no existe en catalogo economico."]);
  }

  const notes: string[] = [];
  if (!route.allowedAircraft.includes(aircraft.code)) notes.push("Aeronave no esta autorizada para esta ruta.");
  if (route.distanceNm > aircraft.rangeNm) notes.push("Ruta excede autonomia de la aeronave.");
  if (route.flightType === "cargo" && !aircraft.supportsCargo) notes.push("Ruta cargo con aeronave sin soporte cargo.");
  if (route.flightType !== "cargo" && !aircraft.supportsPassenger) notes.push("Ruta pasajero con aeronave cargo-only.");
  if (route.flightType === "training") notes.push("Ruta escuela/local separada de la economia comercial principal.");

  const rate = getRouteEconomyRate(route.routeCategory);
  const distance = route.distanceNm;
  const airportFeesUsd = nonNegativeMoney(
    getAirportEconomyFeeUsd(route.origin) +
      getAirportEconomyFeeUsd(route.destination) +
      rate.airportFeeUsd,
  );
  const fuelCostUsd = nonNegativeMoney(distance * profile.fuelCostPerNm * rate.costFactor);
  const maintenanceCostUsd = nonNegativeMoney(
    distance * profile.maintenanceCostPerNm * rate.costFactor + profile.fixedTurnCostUsd,
  );
  const crewCostUsd = nonNegativeMoney(rate.crewCostUsd * profile.crewCostMultiplier);

  const passengerCapacity = aircraft.supportsPassenger ? aircraft.passengerCapacity : 0;
  const cargoCapacityKg = aircraft.supportsCargo ? aircraft.cargoCapacityKg : 0;
  const isCargo = route.flightType === "cargo";
  const estimatedPassengers = isCargo ? 0 : count(passengerCapacity * rate.loadFactor);
  const estimatedCargoKg = isCargo ? count(cargoCapacityKg * rate.cargoLoadFactor) : 0;
  const ticketBaseFareUsd = rate.ticketBaseFareUsd ?? 45;
  const ticketYieldPerNmUsd = rate.ticketYieldPerNmUsd ?? rate.passengerRevenuePerPassengerNm;
  const ticketRevenueUsd = isCargo ? 0 : nonNegativeMoney(estimatedPassengers * (ticketBaseFareUsd + distance * ticketYieldPerNmUsd));
  const baggageIncludedKgPerPassenger = rate.baggageIncludedKgPerPassenger ?? 18;
  const averageBaggageKgPerPassenger = rate.averageBaggageKgPerPassenger ?? 20;
  const excessBaggageProbability = rate.excessBaggageProbability ?? 0.18;
  const excessBaggageFeePerKgUsd = rate.excessBaggageFeePerKgUsd ?? 1.4;
  const estimatedBaggageKg = isCargo ? 0 : nonNegativeMoney(estimatedPassengers * averageBaggageKgPerPassenger * (1 + excessBaggageProbability));
  const baggageIncludedKg = isCargo ? 0 : nonNegativeMoney(estimatedPassengers * baggageIncludedKgPerPassenger);
  const excessBaggageKg = isCargo ? 0 : nonNegativeMoney(Math.max(0, estimatedBaggageKg - baggageIncludedKg));
  const excessBaggageRevenueUsd = isCargo ? 0 : nonNegativeMoney(excessBaggageKg * excessBaggageFeePerKgUsd);
  const onboardSalesUsd = isCargo ? 0 : nonNegativeMoney(estimatedPassengers * (rate.onboardSalesPerPassengerUsd ?? 3.8));
  const serviceRevenueUsd = isCargo ? 0 : nonNegativeMoney(estimatedPassengers * (rate.serviceRevenuePerPassengerUsd ?? 2.2));
  const passengerRevenueUsd = isCargo ? 0 : nonNegativeMoney(ticketRevenueUsd + excessBaggageRevenueUsd + onboardSalesUsd + serviceRevenueUsd);

  const cargoBaseFeeUsd = rate.cargoBaseFeeUsd ?? 180;
  const cargoRatePerKgNmUsd = rate.cargoRatePerKgNmUsd ?? rate.cargoRevenuePerKgNm;
  const cargoRevenueUsd = isCargo ? nonNegativeMoney(estimatedCargoKg * distance * cargoRatePerKgNmUsd + cargoBaseFeeUsd) : 0;
  const cargoHandlingRevenueUsd = isCargo ? nonNegativeMoney(estimatedCargoKg * (rate.cargoHandlingUsdPerKg * 0.9)) : 0;
  const specialCargoFeeUsd = isCargo ? nonNegativeMoney(rate.specialCargoFeeUsd ?? (route.routeCategory === "carga_internacional" ? 420 : 120)) : 0;
  let grossRevenueUsd = nonNegativeMoney(passengerRevenueUsd + cargoRevenueUsd + cargoHandlingRevenueUsd + specialCargoFeeUsd);

  const passengerServiceCostUsd = nonNegativeMoney(estimatedPassengers * (rate.cateringUsdPerPassenger * 0.85));
  const cateringCostUsd = isCargo ? 0 : nonNegativeMoney(estimatedPassengers * rate.cateringUsdPerPassenger);
  const cargoHandlingCostUsd = isCargo ? nonNegativeMoney(estimatedCargoKg * rate.cargoHandlingUsdPerKg) : 0;
  const payloadRatio = isCargo && cargoCapacityKg > 0 ? estimatedCargoKg / cargoCapacityKg : (!isCargo && passengerCapacity > 0 ? estimatedPassengers / passengerCapacity : 0);
  const baseWearPercent = Number((distance / Math.max(aircraft.rangeNm, 1) * 0.65).toFixed(4));
  const cycleWearPercent = 0.12;
  const payloadWearPercent = Number((payloadRatio * 0.18).toFixed(4));
  const landingWearPercent = route.routeCategory.includes("internacional") ? 0.11 : 0.08;
  const maneuverWearPercent = route.routeCategory.includes("patagonia") || route.routeCategory.includes("carga") ? 0.09 : 0.05;
  const simulatedOperationalFactor = stableFactor(route.routeId, aircraft.code);
  const totalWearPercent = Number(((baseWearPercent + cycleWearPercent + payloadWearPercent + landingWearPercent + maneuverWearPercent) * simulatedOperationalFactor).toFixed(4));
  const wearAdjustedReserveUsd = nonNegativeMoney(distance * profile.maintenanceReservePerNm * totalWearPercent);
  const baseMaintenanceReserveUsd = nonNegativeMoney(distance * profile.maintenanceReservePerNm * rate.costFactor);
  const maintenanceReserveUsd = nonNegativeMoney(baseMaintenanceReserveUsd + wearAdjustedReserveUsd);
  const totalCostUsd = nonNegativeMoney(
    fuelCostUsd +
      airportFeesUsd +
      maintenanceCostUsd +
      maintenanceReserveUsd +
      crewCostUsd +
      cateringCostUsd +
      passengerServiceCostUsd +
      cargoHandlingCostUsd,
  );
  // Apply profitability floor - ensure no negative utility
  const floor = getProfitabilityFloorConfig();
  let netProfitUsd = signedMoney(grossRevenueUsd - totalCostUsd);
  
  // Calculate target profit (minimum $25 or 8% of costs)
  const targetProfitUsd = Math.max(
    floor.minimumProfitUsd,
    totalCostUsd * floor.minimumProfitMarginPct
  );
  
  // Determine adjustment reason based on route type
  let profitabilityAdjustmentUsd: number | undefined;
  let profitabilityAdjustmentReason: ProfitabilityAdjustmentReason | undefined;
  
  if (netProfitUsd < targetProfitUsd) {
    profitabilityAdjustmentUsd = nonNegativeMoney(targetProfitUsd - netProfitUsd);
    
    // Select reason based on flight type and route
    if (isCargo && floor.cargoContractPremiumEnabled) {
      profitabilityAdjustmentReason = "CARGO_CONTRACT_PREMIUM";
    } else if (route.routeCategory.includes("regional") && floor.regionalSubsidyEnabled) {
      profitabilityAdjustmentReason = "REGIONAL_SUBSIDY";
    } else if (route.routeCategory.includes("cargo")) {
      profitabilityAdjustmentReason = "OPERATIONAL_CONTRACT_FEE";
    } else {
      profitabilityAdjustmentReason = "MINIMUM_ROUTE_FARE";
    }
    
    grossRevenueUsd = nonNegativeMoney(grossRevenueUsd + profitabilityAdjustmentUsd);
    netProfitUsd = signedMoney(grossRevenueUsd - totalCostUsd);
  }
  const rawPilotAccrual = netProfitUsd > 0
    ? Math.max(rate.pilotAccrualMinimumUsd, netProfitUsd * rate.pilotAccrualRate)
    : 0;
  const pilotAccrualUsd = nonNegativeMoney(Math.min(netProfitUsd, rawPilotAccrual));
  const airlineNetUsd = signedMoney(netProfitUsd - pilotAccrualUsd);
  const economyEligible = notes.length === 0 && grossRevenueUsd > 0;

  return {
    routeId: route.routeId,
    origin: route.origin,
    destination: route.destination,
    flightType: route.flightType,
    aircraftCode: aircraft.code,
    distanceNm: distance,
    passengerCapacity,
    estimatedPassengers,
    cargoCapacityKg,
    estimatedCargoKg,
    grossRevenueUsd,
    fuelCostUsd,
    airportFeesUsd,
    maintenanceCostUsd,
    maintenanceReserveUsd,
    crewCostUsd,
    cateringCostUsd,
    cargoHandlingCostUsd,
    totalCostUsd,
    netProfitUsd,
    profitabilityAdjustmentUsd,
    profitabilityAdjustmentReason,
    pilotAccrualUsd,
    airlineNetUsd,
    economyEligible,
    notes,
    estimatePayload: {
      passengerEconomy: isCargo
        ? undefined
        : {
            passengerCapacity,
            estimatedPassengers,
            loadFactor: rate.loadFactor,
            ticketRevenueUsd,
            baggageIncludedKg,
            estimatedBaggageKg,
            excessBaggageKg,
            excessBaggageRevenueUsd,
            onboardSalesUsd,
            passengerServiceCostUsd,
            profitabilityAdjustmentUsd,
          },
      cargoEconomy: isCargo
        ? {
            cargoCapacityKg,
            estimatedCargoKg,
            cargoLoadFactor: rate.cargoLoadFactor,
            cargoRevenueUsd,
            cargoHandlingRevenueUsd,
            cargoHandlingCostUsd,
            specialCargoFeeUsd,
            passengerCountForcedZero: true,
            profitabilityAdjustmentUsd,
            profitabilityAdjustmentReason,
          }
        : undefined,
      aircraftWear: {
        baseWearPercent,
        cycleWearPercent,
        payloadWearPercent,
        landingWearPercent,
        maneuverWearPercent,
        simulatedOperationalFactor,
        totalWearPercent,
        maintenanceReserveUsd,
        acarsLinked: false,
        wearReason: simulatedOperationalFactor > 1.08 ? "Operacion exigente simulada" : "Operacion regular simulada",
      },
      acarsOperationalInputs: {},
    },
  };
}

export function calculateAircraftWearEstimate(route: AirlineRoute, aircraftCode: string) {
  return calculateRouteEconomyEstimate(route, aircraftCode).estimatePayload?.aircraftWear ?? null;
}

export function calculateAircraftWearFromAcars() {
  return null;
}

export function calculateFlightEconomyEstimate(input: FlightEconomyEstimateInput) {
  const route = findRoute(input.routeId);
  if (!route) {
    return emptyEstimate(
      input.routeId.trim().toUpperCase(),
      input.aircraftCode?.trim().toUpperCase() ?? "",
      ["Ruta no existe en la red operacional local."],
    );
  }
  return calculateRouteEconomyEstimate(route, input.aircraftCode ?? getRecommendedAircraftForRoute(route));
}

export function getPassengerEconomyEstimates() {
  return getPassengerRoutes()
    .filter((route) => route.flightType === "itinerary")
    .map((route) => calculateRouteEconomyEstimate(route));
}

export function getCargoEconomyEstimates() {
  return getCargoRoutes().map((route) => calculateRouteEconomyEstimate(route));
}

export function getOperationalEconomyEstimates() {
  return [...getPassengerEconomyEstimates(), ...getCargoEconomyEstimates()];
}

export type RouteEconomyByAircraftItem = {
  aircraftCode: string;
  aircraftName: string;
  estimate: FlightEconomyEstimate;
  isRecommended: boolean;
  isProfitable: boolean;
  rankAllowed: string;
};

export function calculateRouteEconomyByAircraft(route: AirlineRoute): RouteEconomyByAircraftItem[] {
  const recommended = new Set(route.recommendedAircraft);
  return route.allowedAircraft.map((code) => {
    const aircraft = getAirlineAircraft(code);
    const estimate = calculateRouteEconomyEstimate(route, code);
    return {
      aircraftCode: code,
      aircraftName: aircraft?.name ?? code,
      estimate,
      isRecommended: recommended.has(code),
      isProfitable: estimate.airlineNetUsd > 0,
      rankAllowed: aircraft?.minRank ?? route.minRank,
    };
  });
}

export function getRecommendedEconomyEstimateForRoute(route: AirlineRoute) {
  if (route.flightType !== "itinerary" && route.flightType !== "cargo") return null;
  return calculateRouteEconomyEstimate(route);
}

// Calculate economy snapshot from SimBrief OFP data
export function calculateEconomySnapshotFromOfp(params: {
  routeId?: string;
  origin: string;
  destination: string;
  distanceNm: number;
  aircraftCode: string;
  blockFuelKg: number;
  tripFuelKg: number;
  payloadKg: number;
  passengerCount: number;
  cargoKg: number;
  isCargo: boolean;
  cargoScenario?: { code: string; title: string; revenueMultiplier: number } | null;
}): EconomySnapshot {
  const {
    routeId,
    origin,
    destination,
    distanceNm,
    aircraftCode,
    blockFuelKg,
    tripFuelKg,
    payloadKg,
    passengerCount,
    cargoKg,
    isCargo,
    cargoScenario,
  } = params;

  const techProfile = getAircraftTechnicalProfile(aircraftCode);
  const rate = getRouteEconomyRate("regional"); // Default, could be derived from route

  // Fuel cost based on actual OFP fuel
  const fuelPricePerKgUsd = 0.8; // Jet A-1 avg price
  const fuelCostUsd = nonNegativeMoney(blockFuelKg * fuelPricePerKgUsd);

  // Airport fees
  const airportFeesUsd = nonNegativeMoney(
    getAirportEconomyFeeUsd(origin) + getAirportEconomyFeeUsd(destination) + rate.airportFeeUsd,
  );

  // Maintenance and wear
  const maintenanceReserveUsd = nonNegativeMoney(distanceNm * (techProfile?.economy.maintenanceReserveUsdPerHour ?? 100) * 0.5);
  const wearReserveUsd = nonNegativeMoney(techProfile?.economy.wearReserveUsdPerLanding ?? 25);

  // Revenue calculations
  let passengerRevenueUsd = 0;
  let baggageRevenueUsd = 0;

  if (!isCargo && passengerCount > 0) {
    const ticketBaseFareUsd = rate.ticketBaseFareUsd ?? 45;
    const ticketYieldPerNmUsd = rate.ticketYieldPerNmUsd ?? rate.passengerRevenuePerPassengerNm;
    passengerRevenueUsd = nonNegativeMoney(passengerCount * (ticketBaseFareUsd + distanceNm * ticketYieldPerNmUsd));

    // Baggage revenue
    const baggagePerPax = techProfile?.baggagePerPassengerKg ?? 20;
    const excessBaggageFeePerKgUsd = 1.4;
    const baggageIncludedKgPerPassenger = rate.baggageIncludedKgPerPassenger ?? 18;
    const totalBaggageKg = passengerCount * baggagePerPax;
    const includedBaggageKg = passengerCount * baggageIncludedKgPerPassenger;
    const excessBaggageKg = Math.max(0, totalBaggageKg - includedBaggageKg);
    baggageRevenueUsd = nonNegativeMoney(excessBaggageKg * excessBaggageFeePerKgUsd);
  }

  // Cargo revenue
  let cargoRevenueUsd = 0;
  if (isCargo && cargoKg > 0) {
    const cargoRatePerKgNmUsd = rate.cargoRatePerKgNmUsd ?? rate.cargoRevenuePerKgNm;
    const cargoBaseFeeUsd = rate.cargoBaseFeeUsd ?? 180;
    const baseRevenue = nonNegativeMoney(cargoKg * distanceNm * cargoRatePerKgNmUsd + cargoBaseFeeUsd);
    // Apply scenario multiplier if applicable
    cargoRevenueUsd = cargoScenario ? baseRevenue * cargoScenario.revenueMultiplier : baseRevenue;
  }

  let totalRevenueUsd = nonNegativeMoney(passengerRevenueUsd + baggageRevenueUsd + cargoRevenueUsd);

  // Total costs
  const totalCostUsd = nonNegativeMoney(fuelCostUsd + airportFeesUsd + maintenanceReserveUsd + wearReserveUsd + rate.crewCostUsd);

  // Apply profitability floor - ensure no negative utility
  const floor = getProfitabilityFloorConfig();
  let estimatedProfitUsd = signedMoney(totalRevenueUsd - totalCostUsd);
  
  // Calculate target profit (minimum $25 or 8% of costs)
  const targetProfitUsd = Math.max(
    floor.minimumProfitUsd,
    totalCostUsd * floor.minimumProfitMarginPct
  );
  
  let profitabilityAdjustmentUsd: number | undefined;
  let profitabilityAdjustmentReason: ProfitabilityAdjustmentReason | undefined;
  
  if (estimatedProfitUsd < targetProfitUsd) {
    profitabilityAdjustmentUsd = nonNegativeMoney(targetProfitUsd - estimatedProfitUsd);
    
    // Select reason based on flight type
    if (isCargo && floor.cargoContractPremiumEnabled) {
      profitabilityAdjustmentReason = "CARGO_CONTRACT_PREMIUM";
    } else {
      profitabilityAdjustmentReason = "POST_FLIGHT_MINIMUM_MARGIN";
    }
    
    totalRevenueUsd = nonNegativeMoney(totalRevenueUsd + profitabilityAdjustmentUsd);
    estimatedProfitUsd = signedMoney(totalRevenueUsd - totalCostUsd);
  }
  
  // Pilot accrual
  const rawPilotAccrual = estimatedProfitUsd > 0
    ? Math.max(rate.pilotAccrualMinimumUsd, estimatedProfitUsd * rate.pilotAccrualRate)
    : 0;
  const estimatedPilotAccrualUsd = nonNegativeMoney(Math.min(estimatedProfitUsd, rawPilotAccrual));

  return {
    source: "simbrief_ofp",
    routeId,
    origin,
    destination,
    distanceNm,
    aircraftCode,
    blockFuelKg,
    tripFuelKg,
    payloadKg,
    passengerCount,
    cargoKg,
    passengerRevenueUsd,
    cargoRevenueUsd,
    baggageRevenueUsd,
    totalRevenueUsd,
    fuelCostUsd,
    airportFeesUsd,
    maintenanceReserveUsd,
    wearReserveUsd,
    totalCostUsd,
    estimatedProfitUsd,
    estimatedPilotAccrualUsd,
    profitabilityAdjustmentUsd,
    profitabilityAdjustmentReason,
    cargoScenario: cargoScenario
      ? { code: cargoScenario.code, title: cargoScenario.title, revenueMultiplier: cargoScenario.revenueMultiplier }
      : undefined,
  };
}
