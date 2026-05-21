import { getCargoEconomyEstimates, getOperationalEconomyEstimates, getPassengerEconomyEstimates } from "./calculator";
import { economyCatalog } from "./catalog";
import type { AirlineEconomySummary, FlightEconomyEstimate } from "./types";

function sum(estimates: FlightEconomyEstimate[], field: keyof FlightEconomyEstimate) {
  return Number(estimates.reduce((total, estimate) => {
    const value = estimate[field];
    return total + (typeof value === "number" ? value : 0);
  }, 0).toFixed(2));
}

export function buildAirlineEconomySummary(
  estimates = getOperationalEconomyEstimates(),
): AirlineEconomySummary {
  const passengerEstimates = estimates.filter((estimate) => estimate.flightType !== "cargo");
  const cargoEstimates = estimates.filter((estimate) => estimate.flightType === "cargo");
  const monthlyRevenueUsd = sum(estimates, "grossRevenueUsd");
  const monthlyCostUsd = sum(estimates, "totalCostUsd");
  const pilotAccrualLiabilityUsd = sum(estimates, "pilotAccrualUsd");
  const maintenanceReserve = sum(estimates, "maintenanceReserveUsd");
  const monthlyNetUsd = Number((monthlyRevenueUsd - monthlyCostUsd - pilotAccrualLiabilityUsd).toFixed(2));

  return {
    airlineCashUsd: Number((economyCatalog.baseAirlineCashUsd + monthlyNetUsd).toFixed(2)),
    monthlyRevenueUsd,
    monthlyCostUsd,
    monthlyNetUsd,
    passengerRevenueUsd: sum(passengerEstimates, "grossRevenueUsd"),
    cargoRevenueUsd: sum(cargoEstimates, "grossRevenueUsd"),
    pilotAccrualLiabilityUsd,
    maintenanceReserveUsd: maintenanceReserve,
  };
}

export function getMostProfitableRoutes(limit = 8) {
  return getOperationalEconomyEstimates()
    .filter((estimate) => estimate.economyEligible)
    .sort((a, b) => b.airlineNetUsd - a.airlineNetUsd)
    .slice(0, limit);
}

export function getEconomyDashboardData() {
  const passengerRoutes = getPassengerEconomyEstimates();
  const cargoRoutes = getCargoEconomyEstimates();
  const estimates = [...passengerRoutes, ...cargoRoutes];
  return {
    summary: buildAirlineEconomySummary(estimates),
    topRoutes: getMostProfitableRoutes(8),
    passengerRoutes,
    cargoRoutes,
  };
}
