import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const AIRLINE_CATALOG_PATH = path.join(process.cwd(), "src", "lib", "airline", "catalog.json");
export const ECONOMY_CATALOG_PATH = path.join(process.cwd(), "src", "lib", "economy", "catalog.json");

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function loadEconomyModel() {
  const airline = readJson(AIRLINE_CATALOG_PATH);
  const economy = readJson(ECONOMY_CATALOG_PATH);
  return { airline, economy };
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

export function distanceNm(origin, destination, airports) {
  const from = airports.find((airport) => airport.icao === origin);
  const to = airports.find((airport) => airport.icao === destination);
  if (!from || !to) return 0;
  const radiusNm = 3440.065;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return Number((radiusNm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(1));
}

function routeId(link, origin, destination) {
  const prefix = link.flightType === "cargo" ? "PW-CGO" : "PW-PAX";
  return `${prefix}-${origin}-${destination}`;
}

function aircraftByCode(airline) {
  return new Map(airline.aircraft.map((aircraft) => [aircraft.code, aircraft]));
}

function airportByIcao(airline) {
  return new Map(airline.airports.map((airport) => [airport.icao, airport]));
}

function compatibleAircraft(link, origin, destination, airline) {
  const models = aircraftByCode(airline);
  const distance = distanceNm(origin, destination, airline.airports);
  return link.baseAircraft.filter((code) => {
    const aircraft = models.get(code);
    if (!aircraft?.active) return false;
    if (distance > aircraft.rangeNm) return false;
    if (link.flightType === "cargo" && !aircraft.supportsCargo) return false;
    if (link.flightType !== "cargo" && !aircraft.supportsPassenger) return false;
    return true;
  });
}

function expandLink(link, reverse, airline) {
  const origin = reverse ? link.destination : link.origin;
  const destination = reverse ? link.origin : link.destination;
  const allowedAircraft = compatibleAircraft(link, origin, destination, airline);
  const recommendedAircraft = link.recommendedAircraft.filter((code) => allowedAircraft.includes(code));
  return {
    routeId: routeId(link, origin, destination),
    origin,
    destination,
    distanceNm: distanceNm(origin, destination, airline.airports),
    routeCategory: link.routeCategory,
    flightType: link.flightType,
    minRank: link.minRank,
    allowedAircraft,
    recommendedAircraft: recommendedAircraft.length ? recommendedAircraft : allowedAircraft.slice(0, 2),
    returnRouteId: routeId(link, destination, origin),
  };
}

export function expandRoutes(airline) {
  const passengerRoutes = airline.passengerLinks.flatMap((link) => [expandLink(link, false, airline), expandLink(link, true, airline)]);
  const cargoRoutes = airline.cargoLinks.flatMap((link) => [expandLink(link, false, airline), expandLink(link, true, airline)]);
  return { passengerRoutes, cargoRoutes, routes: [...passengerRoutes, ...cargoRoutes] };
}

function nonNegativeMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function signedMoney(value) {
  return Number(value.toFixed(2));
}

function count(value) {
  return Math.max(0, Math.round(value));
}

function stableFactor(routeId, aircraftCode) {
  const seed = `${routeId}:${aircraftCode}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  return Number((1 + (Math.abs(hash % 13) / 100)).toFixed(2));
}

function routeRate(routeCategory, economy) {
  return economy.routeCategoryRates[routeCategory] || {
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
}

function aircraftProfile(aircraft, economy) {
  const profile = economy.aircraftCategoryProfiles[aircraft.category] || {
    fuelCostPerNm: 12,
    maintenanceCostPerNm: 4,
    maintenanceReservePerNm: 1,
    fixedTurnCostUsd: 250,
    crewCostMultiplier: 1,
  };
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

export function buildAircraftEconomyProfiles(airline, economy) {
  return airline.aircraft.filter((aircraft) => aircraft.active).map((aircraft) => aircraftProfile(aircraft, economy));
}

function airportFee(icao, airline, economy) {
  const airports = airportByIcao(airline);
  const airport = airports.get(icao);
  if (!airport) return 0;
  return economy.airportCategoryFeesUsd[airport.airportCategory] || 250;
}

export function calculateRouteEconomy(route, aircraftCode, airline, economy) {
  const models = aircraftByCode(airline);
  const selectedCode = String(aircraftCode || route.recommendedAircraft[0] || route.allowedAircraft[0] || "").toUpperCase();
  const aircraft = models.get(selectedCode);
  if (!aircraft) {
    return {
      routeId: route.routeId,
      origin: route.origin,
      destination: route.destination,
      flightType: route.flightType,
      aircraftCode: selectedCode,
      distanceNm: route.distanceNm,
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
      notes: ["Aeronave no existe en catalogo economico."],
    };
  }

  const profile = aircraftProfile(aircraft, economy);
  const rate = routeRate(route.routeCategory, economy);
  const notes = [];
  if (!route.allowedAircraft.includes(aircraft.code)) notes.push("Aeronave no esta autorizada para esta ruta.");
  if (route.distanceNm > aircraft.rangeNm) notes.push("Ruta excede autonomia de la aeronave.");
  if (route.flightType === "cargo" && !aircraft.supportsCargo) notes.push("Ruta cargo con aeronave sin soporte cargo.");
  if (route.flightType !== "cargo" && !aircraft.supportsPassenger) notes.push("Ruta pasajero con aeronave cargo-only.");
  if (route.flightType === "training") notes.push("Ruta escuela/local separada de la economia comercial principal.");

  const isCargo = route.flightType === "cargo";
  const passengerCapacity = aircraft.supportsPassenger ? aircraft.passengerCapacity : 0;
  const cargoCapacityKg = aircraft.supportsCargo ? aircraft.cargoCapacityKg : 0;
  const estimatedPassengers = isCargo ? 0 : count(passengerCapacity * rate.loadFactor);
  const estimatedCargoKg = isCargo ? count(cargoCapacityKg * rate.cargoLoadFactor) : 0;
  const ticketBaseFareUsd = rate.ticketBaseFareUsd ?? 45;
  const ticketYieldPerNmUsd = rate.ticketYieldPerNmUsd ?? rate.passengerRevenuePerPassengerNm;
  const ticketRevenueUsd = isCargo ? 0 : nonNegativeMoney(estimatedPassengers * (ticketBaseFareUsd + route.distanceNm * ticketYieldPerNmUsd));
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
  const cargoRevenueUsd = isCargo ? nonNegativeMoney(estimatedCargoKg * route.distanceNm * cargoRatePerKgNmUsd + cargoBaseFeeUsd) : 0;
  const cargoHandlingRevenueUsd = isCargo ? nonNegativeMoney(estimatedCargoKg * (rate.cargoHandlingUsdPerKg * 0.9)) : 0;
  const specialCargoFeeUsd = isCargo ? nonNegativeMoney(rate.specialCargoFeeUsd ?? (route.routeCategory === "carga_internacional" ? 420 : 120)) : 0;
  let grossRevenueUsd = nonNegativeMoney(passengerRevenueUsd + cargoRevenueUsd + cargoHandlingRevenueUsd + specialCargoFeeUsd);
  const fuelCostUsd = nonNegativeMoney(route.distanceNm * profile.fuelCostPerNm * rate.costFactor);
  const airportFeesUsd = nonNegativeMoney(airportFee(route.origin, airline, economy) + airportFee(route.destination, airline, economy) + rate.airportFeeUsd);
  const maintenanceCostUsd = nonNegativeMoney(route.distanceNm * profile.maintenanceCostPerNm * rate.costFactor + profile.fixedTurnCostUsd);
  const payloadRatio = isCargo && cargoCapacityKg > 0 ? estimatedCargoKg / cargoCapacityKg : (!isCargo && passengerCapacity > 0 ? estimatedPassengers / passengerCapacity : 0);
  const baseWearPercent = Number((route.distanceNm / Math.max(aircraft.rangeNm, 1) * 0.65).toFixed(4));
  const cycleWearPercent = 0.12;
  const payloadWearPercent = Number((payloadRatio * 0.18).toFixed(4));
  const landingWearPercent = route.routeCategory.includes("internacional") ? 0.11 : 0.08;
  const maneuverWearPercent = route.routeCategory.includes("patagonia") || route.routeCategory.includes("carga") ? 0.09 : 0.05;
  const simulatedOperationalFactor = stableFactor(route.routeId, aircraft.code);
  const totalWearPercent = Number(((baseWearPercent + cycleWearPercent + payloadWearPercent + landingWearPercent + maneuverWearPercent) * simulatedOperationalFactor).toFixed(4));
  const baseMaintenanceReserveUsd = nonNegativeMoney(route.distanceNm * profile.maintenanceReservePerNm * rate.costFactor);
  const wearAdjustedReserveUsd = nonNegativeMoney(route.distanceNm * profile.maintenanceReservePerNm * totalWearPercent);
  const maintenanceReserveUsd = nonNegativeMoney(baseMaintenanceReserveUsd + wearAdjustedReserveUsd);
  const crewCostUsd = nonNegativeMoney(rate.crewCostUsd * profile.crewCostMultiplier);
  const passengerServiceCostUsd = nonNegativeMoney(estimatedPassengers * (rate.cateringUsdPerPassenger * 0.85));
  const cateringCostUsd = nonNegativeMoney(estimatedPassengers * rate.cateringUsdPerPassenger);
  const cargoHandlingCostUsd = isCargo ? nonNegativeMoney(estimatedCargoKg * rate.cargoHandlingUsdPerKg) : 0;
  const totalCostUsd = nonNegativeMoney(fuelCostUsd + airportFeesUsd + maintenanceCostUsd + maintenanceReserveUsd + crewCostUsd + cateringCostUsd + passengerServiceCostUsd + cargoHandlingCostUsd);
  let netProfitUsd = signedMoney(grossRevenueUsd - totalCostUsd);
  const operationalSupportRevenueUsd = !isCargo && netProfitUsd <= 0 ? nonNegativeMoney(Math.abs(netProfitUsd) + 120) : 0;
  if (operationalSupportRevenueUsd > 0) {
    grossRevenueUsd = nonNegativeMoney(grossRevenueUsd + operationalSupportRevenueUsd);
    netProfitUsd = signedMoney(grossRevenueUsd - totalCostUsd);
  }
  const rawPilotAccrual = netProfitUsd > 0 ? Math.max(rate.pilotAccrualMinimumUsd, netProfitUsd * rate.pilotAccrualRate) : 0;
  const pilotAccrualUsd = nonNegativeMoney(Math.min(netProfitUsd, rawPilotAccrual));
  const airlineNetUsd = signedMoney(netProfitUsd - pilotAccrualUsd);

  return {
    routeId: route.routeId,
    origin: route.origin,
    destination: route.destination,
    flightType: route.flightType,
    aircraftCode: aircraft.code,
    distanceNm: route.distanceNm,
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
    pilotAccrualUsd,
    airlineNetUsd,
    economyEligible: notes.length === 0 && grossRevenueUsd > 0,
    notes,
    estimatePayload: {
      passengerEconomy: isCargo ? undefined : {
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
        operationalSupportRevenueUsd,
      },
      cargoEconomy: isCargo ? {
        cargoCapacityKg,
        estimatedCargoKg,
        cargoLoadFactor: rate.cargoLoadFactor,
        cargoRevenueUsd,
        cargoHandlingRevenueUsd,
        cargoHandlingCostUsd,
        specialCargoFeeUsd,
        passengerCountForcedZero: true,
      } : undefined,
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

export function buildEconomyEstimates(airline, economy) {
  const { passengerRoutes, cargoRoutes } = expandRoutes(airline);
  const passengerEstimates = passengerRoutes
    .filter((route) => route.flightType === "itinerary")
    .map((route) => calculateRouteEconomy(route, route.recommendedAircraft[0] ?? route.allowedAircraft[0] ?? null, airline, economy));
  const cargoEstimates = cargoRoutes.map((route) => calculateRouteEconomy(route, route.recommendedAircraft[0] ?? route.allowedAircraft[0] ?? null, airline, economy));
  return {
    passengerRoutes,
    cargoRoutes,
    passengerEstimates,
    cargoEstimates,
    estimates: [...passengerEstimates, ...cargoEstimates],
  };
}

export function buildEconomyEstimatesByAircraft(airline, economy) {
  const { passengerRoutes, cargoRoutes } = expandRoutes(airline);
  const recommended = new Set();
  const passengerCombinations = passengerRoutes
    .filter((route) => route.flightType === "itinerary")
    .flatMap((route) =>
      route.allowedAircraft.map((code) => {
        const isRec = route.recommendedAircraft.includes(code);
        const estimate = calculateRouteEconomy(route, code, airline, economy);
        if (isRec) recommended.add(`${route.routeId}:${code}`);
        return { routeId: route.routeId, aircraftCode: code, isRecommended: isRec, estimate };
      }),
    );
  const cargoCombinations = cargoRoutes.flatMap((route) =>
    route.allowedAircraft.map((code) => {
      const isRec = route.recommendedAircraft.includes(code);
      const estimate = calculateRouteEconomy(route, code, airline, economy);
      if (isRec) recommended.add(`${route.routeId}:${code}`);
      return { routeId: route.routeId, aircraftCode: code, isRecommended: isRec, estimate };
    }),
  );
  return {
    passengerCombinations,
    cargoCombinations,
    allCombinations: [...passengerCombinations, ...cargoCombinations],
  };
}

export function buildAirlineSummary(estimates, economy) {
  const sum = (field, items = estimates) => Number(items.reduce((total, item) => total + Number(item[field] || 0), 0).toFixed(2));
  const passenger = estimates.filter((estimate) => estimate.flightType !== "cargo");
  const cargo = estimates.filter((estimate) => estimate.flightType === "cargo");
  const monthlyRevenueUsd = sum("grossRevenueUsd");
  const monthlyCostUsd = sum("totalCostUsd");
  const pilotAccrualLiabilityUsd = sum("pilotAccrualUsd");
  const maintenanceReserveUsd = sum("maintenanceReserveUsd");
  const monthlyNetUsd = Number((monthlyRevenueUsd - monthlyCostUsd - pilotAccrualLiabilityUsd).toFixed(2));
  return {
    airlineCashUsd: Number((economy.baseAirlineCashUsd + monthlyNetUsd).toFixed(2)),
    monthlyRevenueUsd,
    monthlyCostUsd,
    monthlyNetUsd,
    passengerRevenueUsd: sum("grossRevenueUsd", passenger),
    cargoRevenueUsd: sum("grossRevenueUsd", cargo),
    pilotAccrualLiabilityUsd,
    maintenanceReserveUsd,
  };
}

export function hasMojibake(value) {
  const pattern = new RegExp(`${String.fromCharCode(0xc3)}|${String.fromCharCode(0xc2)}|${String.fromCharCode(0xe2)}[^\\s]|${String.fromCharCode(0xfffd)}`);
  return pattern.test(value);
}
