import { getAirlineAircraft, AIRLINE_AIRCRAFT } from "@/lib/airline/aircraft";
import { getCargoRoutes, getPassengerRoutes } from "@/lib/airline/route-network";
import {
  getCargoEconomyEstimates,
  getOperationalEconomyEstimates,
  getPassengerEconomyEstimates,
} from "./calculator";
import {
  economyCatalog,
  getAircraftEconomyProfiles,
  getProgressionExpenseCatalog,
} from "./catalog";
import { buildAirlineEconomySummary } from "./airline-economy";
import type { EconomyValidationResult, FlightEconomyEstimate } from "./types";

function hasMojibake(value: string) {
  const pattern = new RegExp(`${String.fromCharCode(0xc3)}|${String.fromCharCode(0xc2)}|${String.fromCharCode(0xe2)}[^\\s]|${String.fromCharCode(0xfffd)}`);
  return pattern.test(value);
}

function numericFields(estimate: FlightEconomyEstimate) {
  return [
    ["grossRevenueUsd", estimate.grossRevenueUsd],
    ["fuelCostUsd", estimate.fuelCostUsd],
    ["airportFeesUsd", estimate.airportFeesUsd],
    ["maintenanceCostUsd", estimate.maintenanceCostUsd],
    ["maintenanceReserveUsd", estimate.maintenanceReserveUsd],
    ["crewCostUsd", estimate.crewCostUsd],
    ["cateringCostUsd", estimate.cateringCostUsd],
    ["cargoHandlingCostUsd", estimate.cargoHandlingCostUsd],
    ["totalCostUsd", estimate.totalCostUsd],
    ["pilotAccrualUsd", estimate.pilotAccrualUsd],
  ] as const;
}

export function validateEconomyModel(): EconomyValidationResult {
  const activeAircraft = AIRLINE_AIRCRAFT.filter((aircraft) => aircraft.active);
  const aircraftProfiles = getAircraftEconomyProfiles();
  const passengerRoutes = getPassengerRoutes().filter((route) => route.flightType === "itinerary");
  const cargoRoutes = getCargoRoutes();
  const passengerEstimates = getPassengerEconomyEstimates();
  const cargoEstimates = getCargoEconomyEstimates();
  const estimates = getOperationalEconomyEstimates();
  const summary = buildAirlineEconomySummary(estimates);
  const progressionExpenses = getProgressionExpenseCatalog();
  const progressionCodes = new Map<string, number>();

  for (const expense of progressionExpenses) {
    progressionCodes.set(expense.code, (progressionCodes.get(expense.code) ?? 0) + 1);
  }

  const missingAircraftProfiles = activeAircraft.filter((aircraft) =>
    !aircraftProfiles.some((profile) => profile.aircraftCode === aircraft.code),
  );
  const unknownAircraftInEstimates = estimates.filter((estimate) => !getAirlineAircraft(estimate.aircraftCode));
  const negativeAmounts = estimates.flatMap((estimate) =>
    numericFields(estimate)
      .filter(([, value]) => value < 0)
      .map(([field]) => `${estimate.routeId}:${field}`),
  );
  const cargoCompatibilityErrors = cargoEstimates.filter((estimate) =>
    !getAirlineAircraft(estimate.aircraftCode)?.supportsCargo,
  );
  const accrualExceedsNet = estimates.filter((estimate) =>
    estimate.pilotAccrualUsd > Math.max(0, estimate.netProfitUsd),
  );
  const ineligibleRegularRoutes = [...passengerEstimates, ...cargoEstimates].filter((estimate) =>
    !estimate.economyEligible,
  );
  const profitablePassengerRoutes = passengerEstimates.filter((estimate) => estimate.airlineNetUsd > 0);
  const unprofitablePassengerRoutes = passengerEstimates.filter((estimate) => estimate.airlineNetUsd <= 0);
  const profitableCargoRoutes = cargoEstimates.filter((estimate) => estimate.airlineNetUsd > 0);
  const unprofitableCargoRoutes = cargoEstimates.filter((estimate) => estimate.airlineNetUsd <= 0);
  const passengerProfitabilityPct = passengerEstimates.length
    ? Number(((profitablePassengerRoutes.length / passengerEstimates.length) * 100).toFixed(2))
    : 0;
  const cargoProfitabilityPct = cargoEstimates.length
    ? Number(((profitableCargoRoutes.length / cargoEstimates.length) * 100).toFixed(2))
    : 0;
  const totalPilotAccrualUsd = Number(estimates.reduce((sum, estimate) => sum + estimate.pilotAccrualUsd, 0).toFixed(2));
  const routesWithZeroAccrual = estimates.filter((estimate) => estimate.pilotAccrualUsd <= 0);
  const cargoRoutesWithPassengers = cargoEstimates.filter((estimate) => estimate.estimatedPassengers > 0);
  const cargoRoutesWithTicketRevenue = cargoEstimates.filter((estimate) => (estimate.estimatePayload?.passengerEconomy?.ticketRevenueUsd ?? 0) > 0);
  const passengerRoutesWithoutTicketRevenue = passengerEstimates.filter((estimate) => (estimate.estimatePayload?.passengerEconomy?.ticketRevenueUsd ?? 0) <= 0);
  const passengerRoutesWithoutBaggageModel = passengerEstimates.filter((estimate) => !estimate.estimatePayload?.passengerEconomy);
  const routesWithoutAircraftWear = estimates.filter((estimate) => !estimate.estimatePayload?.aircraftWear);
  const maintenanceReserveMismatch = estimates.filter((estimate) =>
    Math.abs((estimate.estimatePayload?.aircraftWear?.maintenanceReserveUsd ?? estimate.maintenanceReserveUsd) - estimate.maintenanceReserveUsd) > 0.01,
  );
  const checkridesWithoutCost = progressionExpenses.filter((expense) => expense.type === "checkride_fee" && expense.amountUsd <= 0);
  const habilitacionesWithoutCost = progressionExpenses.filter((expense) => /habilitacion|type/i.test(expense.label) && expense.amountUsd <= 0);
  const teoricosWithoutCost = progressionExpenses.filter((expense) => /teori/i.test(expense.label) && expense.amountUsd <= 0);
  const topRoutes = estimates.filter((estimate) => estimate.economyEligible).sort((a, b) => b.airlineNetUsd - a.airlineNetUsd).slice(0, 8);
  const topRoutesAllNegative = topRoutes.length > 0 && topRoutes.every((estimate) => estimate.airlineNetUsd <= 0);
  const invalidProgressionExpenses = progressionExpenses.filter((expense) =>
    !expense.code || expense.amountUsd <= 0,
  );
  const duplicateProgressionExpenses = Array.from(progressionCodes.entries())
    .filter(([, count]) => count > 1)
    .map(([code]) => code);
  const catalogMojibake = hasMojibake(JSON.stringify(economyCatalog));

  const errors = [
    ...missingAircraftProfiles.map((aircraft) => `Aeronave sin perfil economico: ${aircraft.code}`),
    ...(passengerEstimates.length !== passengerRoutes.length
      ? [`Rutas pasajeros estimadas ${passengerEstimates.length} no coinciden con itinerary ${passengerRoutes.length}`]
      : []),
    ...(cargoEstimates.length !== cargoRoutes.length
      ? [`Rutas carga estimadas ${cargoEstimates.length} no coinciden con rutas cargo ${cargoRoutes.length}`]
      : []),
    ...unknownAircraftInEstimates.map((estimate) => `Estimacion usa aeronave inexistente: ${estimate.routeId}:${estimate.aircraftCode}`),
    ...negativeAmounts.map((item) => `Monto negativo no permitido: ${item}`),
    ...cargoCompatibilityErrors.map((estimate) => `Ruta cargo con aeronave sin cargo: ${estimate.routeId}:${estimate.aircraftCode}`),
    ...accrualExceedsNet.map((estimate) => `Devengo supera utilidad neta: ${estimate.routeId}`),
    ...ineligibleRegularRoutes.map((estimate) => `Ruta regular no elegible economia: ${estimate.routeId} ${estimate.notes.join("; ")}`),
    ...invalidProgressionExpenses.map((expense) => `Gasto progresion invalido: ${expense.code}`),
    ...duplicateProgressionExpenses.map((code) => `Gasto progresion duplicado: ${code}`),
    ...(profitablePassengerRoutes.length !== passengerEstimates.length ? [`Rutas itinerary positivas insuficientes: ${profitablePassengerRoutes.length}/${passengerEstimates.length}`] : []),
    ...(profitableCargoRoutes.length !== cargoEstimates.length ? [`Rutas cargo positivas insuficientes: ${profitableCargoRoutes.length}/${cargoEstimates.length}`] : []),
    ...(routesWithZeroAccrual.length > 0 ? [`Rutas con devengo cero: ${routesWithZeroAccrual.length}`] : []),
    ...(cargoRoutesWithPassengers.length > 0 ? [`Rutas cargo con pasajeros: ${cargoRoutesWithPassengers.length}`] : []),
    ...(cargoRoutesWithTicketRevenue.length > 0 ? [`Rutas cargo con ticket revenue: ${cargoRoutesWithTicketRevenue.length}`] : []),
    ...(passengerRoutesWithoutTicketRevenue.length > 0 ? [`Rutas pasajeros sin ticket revenue: ${passengerRoutesWithoutTicketRevenue.length}`] : []),
    ...(passengerRoutesWithoutBaggageModel.length > 0 ? [`Rutas pasajeros sin modelo equipaje: ${passengerRoutesWithoutBaggageModel.length}`] : []),
    ...(routesWithoutAircraftWear.length > 0 ? [`Rutas sin aircraftWear: ${routesWithoutAircraftWear.length}`] : []),
    ...(maintenanceReserveMismatch.length > 0 ? [`Rutas con maintenanceReserve inconsistente: ${maintenanceReserveMismatch.length}`] : []),
    ...(checkridesWithoutCost.length > 0 ? [`Checkrides sin costo: ${checkridesWithoutCost.length}`] : []),
    ...(habilitacionesWithoutCost.length > 0 ? [`Habilitaciones sin costo: ${habilitacionesWithoutCost.length}`] : []),
    ...(teoricosWithoutCost.length > 0 ? [`Teoricos sin costo: ${teoricosWithoutCost.length}`] : []),
    ...(estimates.every((estimate) => estimate.airlineNetUsd < 0) ? ["Todas las rutas tienen utilidad negativa"] : []),
    ...(totalPilotAccrualUsd <= 0 ? ["Devengo piloto total es cero"] : []),
    ...(summary.airlineCashUsd < 0 ? [`Caja virtual negativa: ${summary.airlineCashUsd}`] : []),
    ...(summary.monthlyNetUsd < 0 ? [`Utilidad mensual negativa: ${summary.monthlyNetUsd}`] : []),
    ...(topRoutesAllNegative ? ["Rutas mas rentables son todas negativas"] : []),
    ...(catalogMojibake ? ["Catalogo economico contiene mojibake"] : []),
  ];

  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
    totals: {
      aircraftProfiles: aircraftProfiles.length,
      activeAircraft: activeAircraft.length,
      passengerRoutesEstimated: passengerEstimates.length,
      cargoRoutesEstimated: cargoEstimates.length,
      progressionExpenses: progressionExpenses.length,
      invalidProgressionExpenses: invalidProgressionExpenses.length,
      duplicateProgressionExpenses: duplicateProgressionExpenses.length,
      negativeAmounts: negativeAmounts.length,
      cargoCompatibilityErrors: cargoCompatibilityErrors.length,
      accrualExceedsNet: accrualExceedsNet.length,
      ineligibleRegularRoutes: ineligibleRegularRoutes.length,
      profitablePassengerRoutes: profitablePassengerRoutes.length,
      unprofitablePassengerRoutes: unprofitablePassengerRoutes.length,
      profitableCargoRoutes: profitableCargoRoutes.length,
      unprofitableCargoRoutes: unprofitableCargoRoutes.length,
      passengerProfitabilityPct,
      cargoProfitabilityPct,
      totalPilotAccrualUsd,
      airlineCashUsd: summary.airlineCashUsd,
      monthlyNetUsd: summary.monthlyNetUsd,
    },
  };
}
