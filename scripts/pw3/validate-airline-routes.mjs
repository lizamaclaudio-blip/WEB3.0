import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const EXPECTED_AIRCRAFT = 34;
const catalogPath = path.join(process.cwd(), "src", "lib", "airline", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function airport(icao) {
  return catalog.airports.find((item) => item.icao === icao) ?? null;
}

function aircraft(code) {
  return catalog.aircraft.find((item) => item.code === code) ?? null;
}

function rank(rankCode) {
  return catalog.ranks.find((item) => item.rankCode === rankCode) ?? null;
}

function rankMeetsMinimum(rankCode, minRankCode) {
  const current = rank(rankCode);
  const minimum = rank(minRankCode);
  return Boolean(current && minimum && current.level >= minimum.level);
}

function distanceNm(origin, destination) {
  const from = airport(origin);
  const to = airport(destination);
  if (!from || !to) return 0;
  const earthRadiusNm = 3440.065;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) ** 2;
  return Number((earthRadiusNm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(1));
}

function routeId(link, origin = link.origin, destination = link.destination) {
  const prefix = link.flightType === "cargo" ? "PW-CGO" : "PW-PAX";
  return `${prefix}-${origin}-${destination}`;
}

function compatibleAircraft(link, origin, destination) {
  const distance = distanceNm(origin, destination);
  return link.baseAircraft.filter((code) => {
    const model = aircraft(code);
    if (!model?.active) return false;
    if (distance > model.rangeNm) return false;
    if (link.flightType === "cargo" && !model.supportsCargo) return false;
    if (link.flightType !== "cargo" && !model.supportsPassenger) return false;
    return true;
  });
}

function routeFromLink(link, reverse = false) {
  const origin = reverse ? link.destination : link.origin;
  const destination = reverse ? link.origin : link.destination;
  return {
    routeId: routeId(link, origin, destination),
    origin,
    destination,
    distanceNm: distanceNm(origin, destination),
    routeCategory: link.routeCategory,
    flightType: link.flightType,
    minRank: link.minRank,
    allowedAircraft: compatibleAircraft(link, origin, destination),
    returnRouteId: routeId(link, destination, origin),
  };
}

function expand(links) {
  return links.flatMap((link) => [routeFromLink(link), routeFromLink(link, true)]);
}

const activeAircraft = catalog.aircraft.filter((item) => item.active);
const aircraftCodes = new Set(activeAircraft.map((item) => item.code));
const allLinks = [...catalog.passengerLinks, ...catalog.cargoLinks];
const referencedAircraft = new Set(allLinks.flatMap((link) => link.baseAircraft));
const passengerRoutes = expand(catalog.passengerLinks);
const cargoRoutes = expand(catalog.cargoLinks);
const routes = [...passengerRoutes, ...cargoRoutes];
const routeIds = new Set(routes.map((route) => route.routeId));
const airportsInNetwork = new Set(routes.flatMap((route) => [route.origin, route.destination]));
const outbound = new Set(routes.map((route) => route.origin));
const inbound = new Set(routes.map((route) => route.destination));

const missingReturnRoutes = routes.filter((route) => !routeIds.has(route.returnRouteId));
const airportsWithoutOutboundRoutes = Array.from(airportsInNetwork).filter((icao) => !outbound.has(icao));
const airportsWithoutInboundRoutes = Array.from(airportsInNetwork).filter((icao) => !inbound.has(icao));
const routesWithoutCompatibleAircraft = routes.filter((route) => route.allowedAircraft.length === 0);
const routesExceedingAircraftRange = routes.flatMap((route) =>
  route.allowedAircraft
    .map((code) => ({ route, model: aircraft(code) }))
    .filter((item) => item.model && route.distanceNm > item.model.rangeNm),
);
const cargoRoutesWithoutCargoAircraft = cargoRoutes.filter((route) =>
  route.allowedAircraft.length === 0 ||
  route.allowedAircraft.some((code) => !aircraft(code)?.supportsCargo),
);
const passengerRoutesUsingCargoOnlyAircraft = passengerRoutes.filter((route) =>
  route.allowedAircraft.some((code) => {
    const model = aircraft(code);
    return model?.supportsCargo && !model.supportsPassenger;
  }),
);
const invalidFlightTypeRoutes = routes.filter((route) => !catalog.flightTypes.includes(route.flightType));
const checkrideRoutes = routes.filter((route) => /checkride|licen|cert/i.test(route.routeId) || /checkride|licen|cert/i.test(route.routeCategory));
const unknownAircraftReferences = Array.from(referencedAircraft).filter((code) => !aircraftCodes.has(code)).sort();
const aircraftNotReferencedByRoutes = activeAircraft.filter((item) => !referencedAircraft.has(item.code));
const cargoCapacityMismatches = activeAircraft.filter((item) => !item.supportsCargo && Number(item.cargoCapacityKg) > 0);
const cargoAircraftWithoutCapacity = activeAircraft.filter((item) => item.supportsCargo && Number(item.cargoCapacityKg) <= 0);
const routeWithoutMinRank = routes.filter((route) => !rank(route.minRank));
const routesWithUnauthorizableAircraft = routes.filter((route) =>
  route.allowedAircraft.some((code) =>
    !catalog.ranks.some((item) => rankMeetsMinimum(item.rankCode, route.minRank) && item.allowedAircraft.includes(code)),
  ),
);
const duplicateKeys = new Map();
for (const route of routes) {
  const key = `${route.flightType}:${route.origin}:${route.destination}`;
  duplicateKeys.set(key, (duplicateKeys.get(key) ?? 0) + 1);
}
const duplicateRoutes = routes.filter((route) => duplicateKeys.get(`${route.flightType}:${route.origin}:${route.destination}`) > 1);

const errors = [
  ...(activeAircraft.length !== EXPECTED_AIRCRAFT ? [`[error] aircraft_total_expected=${EXPECTED_AIRCRAFT} actual=${activeAircraft.length}`] : []),
  ...missingReturnRoutes.map((route) => `[error] missing_return=${route.routeId}`),
  ...airportsWithoutOutboundRoutes.map((icao) => `[error] airport_without_outbound=${icao}`),
  ...airportsWithoutInboundRoutes.map((icao) => `[error] airport_without_inbound=${icao}`),
  ...routesWithoutCompatibleAircraft.map((route) => `[error] route_without_compatible_aircraft=${route.routeId}`),
  ...routesExceedingAircraftRange.map((item) => `[error] route_exceeds_range=${item.route.routeId}:${item.model.code}`),
  ...cargoRoutesWithoutCargoAircraft.map((route) => `[error] cargo_without_cargo_aircraft=${route.routeId}`),
  ...passengerRoutesUsingCargoOnlyAircraft.map((route) => `[error] passenger_uses_cargo_only_aircraft=${route.routeId}`),
  ...invalidFlightTypeRoutes.map((route) => `[error] invalid_flight_type=${route.routeId}`),
  ...checkrideRoutes.map((route) => `[error] checkride_in_operational_network=${route.routeId}`),
  ...duplicateRoutes.map((route) => `[error] duplicate_route=${route.routeId}`),
  ...unknownAircraftReferences.map((code) => `[error] unknown_aircraft_reference=${code}`),
  ...aircraftNotReferencedByRoutes.map((item) => `[error] active_aircraft_not_in_routes=${item.code}`),
  ...cargoCapacityMismatches.map((item) => `[error] cargo_capacity_mismatch=${item.code}`),
  ...cargoAircraftWithoutCapacity.map((item) => `[error] cargo_aircraft_without_capacity=${item.code}`),
  ...routeWithoutMinRank.map((route) => `[error] route_without_valid_min_rank=${route.routeId}`),
  ...routesWithUnauthorizableAircraft.map((route) => `[error] route_aircraft_not_authorizable_by_rank=${route.routeId}`),
];

console.log(`[check] total_airports=${catalog.airports.filter((item) => item.active).length}`);
console.log(`[check] passenger_hubs=${catalog.airports.filter((item) => item.active && item.isPassengerHub).length}`);
console.log(`[check] cargo_hubs=${catalog.airports.filter((item) => item.active && item.isCargoHub).length}`);
console.log(`[check] expected_aircraft=${EXPECTED_AIRCRAFT}`);
console.log(`[check] total_aircraft=${activeAircraft.length}`);
console.log(`[check] aircraft_referenced_in_routes=${referencedAircraft.size}`);
console.log(`[check] passenger_routes=${passengerRoutes.length}`);
console.log(`[check] cargo_routes=${cargoRoutes.length}`);
console.log(`[check] return_validated_routes=${routes.length - missingReturnRoutes.length}`);
console.log(`[check] missing_return_routes=${missingReturnRoutes.length}`);
console.log(`[check] routes_exceeding_aircraft_range=${routesExceedingAircraftRange.length}`);
console.log(`[check] airports_without_outbound=${airportsWithoutOutboundRoutes.length}`);
console.log(`[check] routes_without_compatible_aircraft=${routesWithoutCompatibleAircraft.length}`);
console.log(`[check] cargo_routes_without_cargo_aircraft=${cargoRoutesWithoutCargoAircraft.length}`);
console.log(`[check] passenger_routes_using_cargo_only_aircraft=${passengerRoutesUsingCargoOnlyAircraft.length}`);
console.log(`[check] invalid_flight_type_routes=${invalidFlightTypeRoutes.length}`);
console.log(`[check] unknown_aircraft_references=${unknownAircraftReferences.length}`);
console.log(`[check] aircraft_not_referenced_by_routes=${aircraftNotReferencedByRoutes.length}`);
console.log(`[check] cargo_capacity_mismatches=${cargoCapacityMismatches.length}`);
console.log(`[check] routes_with_unauthorizable_aircraft=${routesWithUnauthorizableAircraft.length}`);

for (const error of errors) console.log(error);

if (errors.length) {
  console.log("[fail] airline_route_network=FAIL");
  process.exit(1);
}

console.log("[ok] airline_route_network=OK");
