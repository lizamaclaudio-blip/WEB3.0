import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildAircraftEconomyProfiles,
  buildAirlineSummary,
  buildEconomyEstimates,
  buildEconomyEstimatesByAircraft,
  hasMojibake,
  loadEconomyModel,
} from "./economy-model.mjs";

const { airline, economy } = loadEconomyModel();
const profiles = buildAircraftEconomyProfiles(airline, economy);
const model = buildEconomyEstimates(airline, economy);
const summary = buildAirlineSummary(model.estimates, economy);
const activeAircraft = airline.aircraft.filter((aircraft) => aircraft.active);
const aircraftByCode = new Map(activeAircraft.map((aircraft) => [aircraft.code, aircraft]));
const profileCodes = new Set(profiles.map((profile) => profile.aircraftCode));
const progressionCodes = new Map();

for (const expense of economy.progressionExpenses) {
  progressionCodes.set(expense.code, (progressionCodes.get(expense.code) || 0) + 1);
}

const missingProfiles = activeAircraft.filter((aircraft) => !profileCodes.has(aircraft.code));
const passengerItineraryRoutes = model.passengerRoutes.filter((route) => route.flightType === "itinerary");
const unknownAircraft = model.estimates.filter((estimate) => !aircraftByCode.has(estimate.aircraftCode));
const negativeAmounts = [];
for (const estimate of model.estimates) {
  for (const field of [
    "grossRevenueUsd",
    "fuelCostUsd",
    "airportFeesUsd",
    "maintenanceCostUsd",
    "maintenanceReserveUsd",
    "crewCostUsd",
    "cateringCostUsd",
    "cargoHandlingCostUsd",
    "totalCostUsd",
    "pilotAccrualUsd",
  ]) {
    if (Number(estimate[field]) < 0) negativeAmounts.push(`${estimate.routeId}:${field}`);
  }
}
const cargoCompatibilityErrors = model.cargoEstimates.filter((estimate) => !aircraftByCode.get(estimate.aircraftCode)?.supportsCargo);
const accrualExceedsNet = model.estimates.filter((estimate) => estimate.pilotAccrualUsd > Math.max(0, estimate.netProfitUsd));
const ineligibleRegularRoutes = model.estimates.filter((estimate) => !estimate.economyEligible);
const profitablePassengerRoutes = model.passengerEstimates.filter((estimate) => estimate.airlineNetUsd > 0);
const unprofitablePassengerRoutes = model.passengerEstimates.filter((estimate) => estimate.airlineNetUsd <= 0);
const profitableCargoRoutes = model.cargoEstimates.filter((estimate) => estimate.airlineNetUsd > 0);
const unprofitableCargoRoutes = model.cargoEstimates.filter((estimate) => estimate.airlineNetUsd <= 0);
const passengerProfitabilityPct = model.passengerEstimates.length ? Number(((profitablePassengerRoutes.length / model.passengerEstimates.length) * 100).toFixed(2)) : 0;
const cargoProfitabilityPct = model.cargoEstimates.length ? Number(((profitableCargoRoutes.length / model.cargoEstimates.length) * 100).toFixed(2)) : 0;
const totalPilotAccrualUsd = Number(model.estimates.reduce((sum, estimate) => sum + estimate.pilotAccrualUsd, 0).toFixed(2));
const topRoutes = model.estimates.filter((estimate) => estimate.economyEligible).sort((a, b) => b.airlineNetUsd - a.airlineNetUsd).slice(0, 8);
const topRoutesAllNegative = topRoutes.length > 0 && topRoutes.every((estimate) => estimate.airlineNetUsd <= 0);
const invalidProgressionExpenses = economy.progressionExpenses.filter((expense) => !expense.code || Number(expense.amountUsd) <= 0);
const duplicateProgressionExpenses = Array.from(progressionCodes.entries()).filter(([, count]) => count > 1).map(([code]) => code);
const routesWithZeroAccrual = model.estimates.filter((estimate) => estimate.pilotAccrualUsd <= 0);
const cargoRoutesWithPassengers = model.cargoEstimates.filter((estimate) => estimate.estimatedPassengers > 0);
const cargoRoutesWithTicketRevenue = model.cargoEstimates.filter((estimate) => Number(estimate.estimatePayload?.passengerEconomy?.ticketRevenueUsd || 0) > 0);
const passengerRoutesWithoutTicketRevenue = model.passengerEstimates.filter((estimate) => Number(estimate.estimatePayload?.passengerEconomy?.ticketRevenueUsd || 0) <= 0);
const passengerRoutesWithoutBaggageModel = model.passengerEstimates.filter((estimate) => !estimate.estimatePayload?.passengerEconomy);
const routesWithoutAircraftWear = model.estimates.filter((estimate) => !estimate.estimatePayload?.aircraftWear);
const maintenanceReserveMismatch = model.estimates.filter((estimate) => Math.abs(Number(estimate.estimatePayload?.aircraftWear?.maintenanceReserveUsd || 0) - Number(estimate.maintenanceReserveUsd || 0)) > 0.01);
const checkridesWithoutCost = economy.progressionExpenses.filter((expense) => expense.type === "checkride_fee" && Number(expense.amountUsd) <= 0);
const habilitacionesWithoutCost = economy.progressionExpenses.filter((expense) => /habilitacion|type/i.test(expense.label) && Number(expense.amountUsd) <= 0);
const teoricosWithoutCost = economy.progressionExpenses.filter((expense) => /teori/i.test(expense.label) && Number(expense.amountUsd) <= 0);

const byAircraft = buildEconomyEstimatesByAircraft(airline, economy);
const paxCombinations = byAircraft.passengerCombinations;
const cargoCombinations = byAircraft.cargoCombinations;
const unprofitablePaxCombinations = paxCombinations.filter((c) => c.estimate.airlineNetUsd <= 0);
const unprofitableCargoCombinations = cargoCombinations.filter((c) => c.estimate.airlineNetUsd <= 0);
const zeroAccrualCombinations = byAircraft.allCombinations.filter((c) => c.estimate.pilotAccrualUsd <= 0);
const cargoWithPassengersCombinations = cargoCombinations.filter((c) => c.estimate.estimatedPassengers > 0);
const cargoWithTicketRevenueCombinations = cargoCombinations.filter((c) => Number(c.estimate.estimatePayload?.passengerEconomy?.ticketRevenueUsd || 0) > 0);
const missingAircraftCodeCombinations = byAircraft.allCombinations.filter((c) => !c.aircraftCode || !c.estimate.aircraftCode);

const initialGrantUsd = economy.initialPilotWalletGrantUsd ?? 0;
const transferCodes = economy.progressionExpenses.filter((e) => e.appliesTo === "pilot_transfer");
const penaltyCodes = economy.progressionExpenses.filter((e) => e.appliesTo === "penalty");

const mojibakeFiles = [
  "docs/PW3_ECONOMY_AUDIT.md",
  "docs/PW3_ECONOMY_CHANGELOG.md",
  "docs/sql/PW3_ECONOMY_SCHEMA_001.sql",
  "src/app/economy/page.tsx",
  "src/app/api/economy/estimate/route.ts",
  "src/app/api/economy/airline-summary/route.ts",
  "src/app/api/economy/pilot-summary/route.ts",
  "src/app/api/economy/routes/route.ts",
  "src/app/api/economy/expenses/route.ts",
  "src/components/economy/EconomyDashboard.tsx",
  "src/components/economy/EconomyDashboard.module.css",
  "src/components/airline/RegularFlightsView.tsx",
  "src/components/airline/RegularFlightsView.module.css",
  "src/lib/economy/catalog.json",
  "src/lib/economy/types.ts",
  "src/lib/economy/catalog.ts",
  "src/lib/economy/calculator.ts",
  "src/lib/economy/ledger.ts",
  "src/lib/economy/pilot-economy.ts",
  "src/lib/economy/airline-economy.ts",
  "src/lib/economy/monthly-payout.ts",
  "src/lib/economy/validation.ts",
  "src/lib/economy/index.ts",
  "scripts/pw3/economy-model.mjs",
  "scripts/pw3/validate-economy.mjs",
  "scripts/pw3/export-economy-excel.mjs",
  "src/lib/economy/training-expense.ts",
  "src/app/api/economy/progression-expense/route.ts",
  "src/components/dashboard/sur/tabs/TrainingTab.tsx",
].filter((relativePath) => fs.existsSync(path.join(process.cwd(), relativePath)));

const mojibakeHits = mojibakeFiles.filter((relativePath) => hasMojibake(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")));

const errors = [
  ...missingProfiles.map((aircraft) => `[error] aircraft_without_economy_profile=${aircraft.code}`),
  ...(model.passengerEstimates.length !== passengerItineraryRoutes.length
    ? [`[error] passenger_estimates_mismatch=${model.passengerEstimates.length}/${passengerItineraryRoutes.length}`]
    : []),
  ...(model.cargoEstimates.length !== model.cargoRoutes.length
    ? [`[error] cargo_estimates_mismatch=${model.cargoEstimates.length}/${model.cargoRoutes.length}`]
    : []),
  ...unknownAircraft.map((estimate) => `[error] estimate_unknown_aircraft=${estimate.routeId}:${estimate.aircraftCode}`),
  ...negativeAmounts.map((item) => `[error] negative_amount=${item}`),
  ...cargoCompatibilityErrors.map((estimate) => `[error] cargo_without_cargo_aircraft=${estimate.routeId}:${estimate.aircraftCode}`),
  ...accrualExceedsNet.map((estimate) => `[error] accrual_exceeds_net=${estimate.routeId}`),
  ...ineligibleRegularRoutes.map((estimate) => `[error] ineligible_regular_route=${estimate.routeId}:${estimate.notes.join(";")}`),
  ...invalidProgressionExpenses.map((expense) => `[error] invalid_progression_expense=${expense.code}`),
  ...duplicateProgressionExpenses.map((code) => `[error] duplicate_progression_expense=${code}`),
  ...(profitablePassengerRoutes.length !== model.passengerEstimates.length ? [`[error] itinerary_positive_mismatch=${profitablePassengerRoutes.length}/${model.passengerEstimates.length}`] : []),
  ...(unprofitablePassengerRoutes.length !== 0 ? [`[error] itinerary_negative_count=${unprofitablePassengerRoutes.length}`] : []),
  ...(profitableCargoRoutes.length !== model.cargoEstimates.length ? [`[error] cargo_positive_mismatch=${profitableCargoRoutes.length}/${model.cargoEstimates.length}`] : []),
  ...(unprofitableCargoRoutes.length !== 0 ? [`[error] cargo_negative_count=${unprofitableCargoRoutes.length}`] : []),
  ...(routesWithZeroAccrual.length > 0 ? [`[error] routes_with_zero_accrual=${routesWithZeroAccrual.length}`] : []),
  ...(cargoRoutesWithPassengers.length > 0 ? [`[error] cargo_routes_with_passengers=${cargoRoutesWithPassengers.length}`] : []),
  ...(cargoRoutesWithTicketRevenue.length > 0 ? [`[error] cargo_routes_with_ticket_revenue=${cargoRoutesWithTicketRevenue.length}`] : []),
  ...(passengerRoutesWithoutTicketRevenue.length > 0 ? [`[error] passenger_routes_without_ticket_revenue=${passengerRoutesWithoutTicketRevenue.length}`] : []),
  ...(passengerRoutesWithoutBaggageModel.length > 0 ? [`[error] passenger_routes_without_baggage_model=${passengerRoutesWithoutBaggageModel.length}`] : []),
  ...(routesWithoutAircraftWear.length > 0 ? [`[error] routes_without_aircraft_wear=${routesWithoutAircraftWear.length}`] : []),
  ...(maintenanceReserveMismatch.length > 0 ? [`[error] maintenance_reserve_mismatch=${maintenanceReserveMismatch.length}`] : []),
  ...(checkridesWithoutCost.length > 0 ? [`[error] checkrides_without_cost=${checkridesWithoutCost.length}`] : []),
  ...(habilitacionesWithoutCost.length > 0 ? [`[error] habilitaciones_without_cost=${habilitacionesWithoutCost.length}`] : []),
  ...(teoricosWithoutCost.length > 0 ? [`[error] teoricos_without_cost=${teoricosWithoutCost.length}`] : []),
  ...(model.estimates.every((estimate) => estimate.airlineNetUsd < 0) ? ["[error] all_routes_negative=true"] : []),
  ...(totalPilotAccrualUsd <= 0 ? ["[error] pilot_accrual_total_zero=true"] : []),
  ...(summary.airlineCashUsd < 0 ? [`[error] airline_cash_negative=${summary.airlineCashUsd}`] : []),
  ...(summary.monthlyNetUsd < 0 ? [`[error] monthly_net_negative=${summary.monthlyNetUsd}`] : []),
  ...(topRoutesAllNegative ? ["[error] top_routes_all_negative=true"] : []),
  ...(unprofitablePaxCombinations.length > 0 ? [`[error] unprofitable_pax_aircraft_combinations=${unprofitablePaxCombinations.length}`] : []),
  ...(unprofitableCargoCombinations.length > 0 ? [`[error] unprofitable_cargo_aircraft_combinations=${unprofitableCargoCombinations.length}`] : []),
  ...(zeroAccrualCombinations.length > 0 ? [`[error] zero_accrual_aircraft_combinations=${zeroAccrualCombinations.length}`] : []),
  ...(cargoWithPassengersCombinations.length > 0 ? [`[error] cargo_aircraft_combinations_with_passengers=${cargoWithPassengersCombinations.length}`] : []),
  ...(cargoWithTicketRevenueCombinations.length > 0 ? [`[error] cargo_aircraft_combinations_with_ticket_revenue=${cargoWithTicketRevenueCombinations.length}`] : []),
  ...(missingAircraftCodeCombinations.length > 0 ? [`[error] combinations_missing_aircraft_code=${missingAircraftCodeCombinations.length}`] : []),
  ...(initialGrantUsd !== 25000 ? [`[error] initial_wallet_grant_usd=${initialGrantUsd} (expected 25000)`] : []),
  ...(transferCodes.length === 0 ? ["[error] missing_transfer_expense_codes=true"] : []),
  ...(penaltyCodes.length === 0 ? ["[error] missing_penalty_expense_codes=true"] : []),
  ...mojibakeHits.map((relativePath) => `[error] mojibake=${relativePath}`),
];

console.log(`[check] economy_catalog_version=${economy.version}`);
console.log(`[check] active_aircraft=${activeAircraft.length}`);
console.log(`[check] aircraft_economy_profiles=${profiles.length}`);
console.log(`[check] passenger_routes_estimated=${model.passengerEstimates.length}`);
console.log(`[check] cargo_routes_estimated=${model.cargoEstimates.length}`);
console.log(`[check] progression_expenses=${economy.progressionExpenses.length}`);
console.log(`[check] passenger_routes_profitable=${profitablePassengerRoutes.length}`);
console.log(`[check] passenger_routes_unprofitable=${unprofitablePassengerRoutes.length}`);
console.log(`[check] passenger_profitability_pct=${passengerProfitabilityPct}`);
console.log(`[check] cargo_routes_profitable=${profitableCargoRoutes.length}`);
console.log(`[check] cargo_routes_unprofitable=${unprofitableCargoRoutes.length}`);
console.log(`[check] cargo_profitability_pct=${cargoProfitabilityPct}`);
console.log(`[check] pilot_accrual_total_usd=${totalPilotAccrualUsd}`);
console.log(`[check] airline_cash_usd=${summary.airlineCashUsd}`);
console.log(`[check] monthly_net_usd=${summary.monthlyNetUsd}`);
console.log(`[check] negative_amounts=${negativeAmounts.length}`);
console.log(`[check] cargo_compatibility_errors=${cargoCompatibilityErrors.length}`);
console.log(`[check] accrual_exceeds_net=${accrualExceedsNet.length}`);
console.log(`[check] ineligible_regular_routes=${ineligibleRegularRoutes.length}`);
console.log(`[check] duplicate_progression_expenses=${duplicateProgressionExpenses.length}`);
console.log(`[check] routes_with_zero_accrual=${routesWithZeroAccrual.length}`);
console.log(`[check] cargo_routes_with_passengers=${cargoRoutesWithPassengers.length}`);
console.log(`[check] cargo_routes_with_ticket_revenue=${cargoRoutesWithTicketRevenue.length}`);
console.log(`[check] passenger_routes_without_ticket_revenue=${passengerRoutesWithoutTicketRevenue.length}`);
console.log(`[check] passenger_routes_without_baggage_model=${passengerRoutesWithoutBaggageModel.length}`);
console.log(`[check] routes_without_aircraft_wear=${routesWithoutAircraftWear.length}`);
console.log(`[check] maintenance_reserve_mismatch=${maintenanceReserveMismatch.length}`);
console.log(`[check] checkrides_without_cost=${checkridesWithoutCost.length}`);
console.log(`[check] habilitaciones_without_cost=${habilitacionesWithoutCost.length}`);
console.log(`[check] teoricos_without_cost=${teoricosWithoutCost.length}`);
console.log(`[check] pax_aircraft_combinations=${paxCombinations.length}`);
console.log(`[check] pax_combinations_profitable=${paxCombinations.length - unprofitablePaxCombinations.length}`);
console.log(`[check] pax_combinations_unprofitable=${unprofitablePaxCombinations.length}`);
console.log(`[check] cargo_aircraft_combinations=${cargoCombinations.length}`);
console.log(`[check] cargo_combinations_profitable=${cargoCombinations.length - unprofitableCargoCombinations.length}`);
console.log(`[check] cargo_combinations_unprofitable=${unprofitableCargoCombinations.length}`);
console.log(`[check] zero_accrual_combinations=${zeroAccrualCombinations.length}`);
console.log(`[check] initial_wallet_grant_usd=${initialGrantUsd}`);
console.log(`[check] transfer_expense_codes=${transferCodes.length}`);
console.log(`[check] penalty_expense_codes=${penaltyCodes.length}`);
console.log(`[check] mojibake_hits=${mojibakeHits.length}`);

for (const error of errors) console.log(error);

if (errors.length) {
  console.log("[fail] economy_model=FAIL");
  process.exit(1);
}

console.log("[ok] economy_model=OK");
