import { AIRLINE_AIRCRAFT, getAirlineAircraft } from "./aircraft";
import { AIRLINE_AIRPORTS, getAirlineAirport } from "./airports";
import { AIRLINE_RANKS, getAirlineRank, rankMeetsMinimum } from "./ranks";
import {
  CARGO_ROUTE_LINKS,
  FLIGHT_TYPES,
  PASSENGER_ROUTE_LINKS,
  type AirlineRoute,
  type AirlineRouteLink,
  type FlightType,
} from "./routes";

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceNm(origin: string, destination: string) {
  const from = getAirlineAirport(origin);
  const to = getAirlineAirport(destination);
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

function routePrefix(link: AirlineRouteLink) {
  return link.flightType === "cargo" ? "PW-CGO" : "PW-PAX";
}

function routeId(link: AirlineRouteLink, origin = link.origin, destination = link.destination) {
  return `${routePrefix(link)}-${origin}-${destination}`;
}

function isCargoRoute(link: AirlineRouteLink) {
  return link.flightType === "cargo";
}

function compatibleAircraftForLink(link: AirlineRouteLink, origin: string, destination: string) {
  const distance = distanceNm(origin, destination);
  return link.baseAircraft.filter((code) => {
    const aircraft = getAirlineAircraft(code);
    if (!aircraft?.active) return false;
    if (distance > aircraft.rangeNm) return false;
    if (isCargoRoute(link) && !aircraft.supportsCargo) return false;
    if (!isCargoRoute(link) && !aircraft.supportsPassenger) return false;
    return rankMeetsMinimum(aircraft.minRank, aircraft.minRank);
  });
}

function allRouteLinks() {
  return [...PASSENGER_ROUTE_LINKS, ...CARGO_ROUTE_LINKS];
}

function buildRoute(link: AirlineRouteLink, reverse = false): AirlineRoute {
  const origin = reverse ? link.destination : link.origin;
  const destination = reverse ? link.origin : link.destination;
  const originAirport = getAirlineAirport(origin);
  const destinationAirport = getAirlineAirport(destination);
  const allowedAircraft = compatibleAircraftForLink(link, origin, destination);
  const recommendedAircraft = link.recommendedAircraft.filter((code) => allowedAircraft.includes(code));

  return {
    routeId: routeId(link, origin, destination),
    origin,
    destination,
    originName: originAirport?.name ?? origin,
    destinationName: destinationAirport?.name ?? destination,
    distanceNm: distanceNm(origin, destination),
    routeCategory: link.routeCategory,
    flightType: link.flightType,
    minRank: link.minRank,
    allowedAircraft,
    recommendedAircraft: recommendedAircraft.length ? recommendedAircraft : allowedAircraft.slice(0, 2),
    isPassengerRoute: !isCargoRoute(link),
    isCargoRoute: isCargoRoute(link),
    isHubConnector: Boolean(originAirport?.isPassengerHub || originAirport?.isCargoHub || destinationAirport?.isPassengerHub || destinationAirport?.isCargoHub),
    isReturnRoute: reverse,
    returnRouteId: routeId(link, destination, origin),
    active: Boolean(originAirport?.active && destinationAirport?.active),
  };
}

function expandRouteLinks(links: AirlineRouteLink[]) {
  return links.flatMap((link) => [buildRoute(link), buildRoute(link, true)]);
}

export function getPassengerRoutes() {
  return expandRouteLinks(PASSENGER_ROUTE_LINKS);
}

export function getCargoRoutes() {
  return expandRouteLinks(CARGO_ROUTE_LINKS);
}

export function getOperationalRoutes() {
  return [...getPassengerRoutes(), ...getCargoRoutes()].filter((route) => route.active);
}

export function getRoutesByRank(rank: string) {
  const pilotRank = getAirlineRank(rank);
  if (!pilotRank) return [];
  return getOperationalRoutes().filter((route) =>
    rankMeetsMinimum(pilotRank.rankCode, route.minRank) &&
    route.allowedAircraft.some((code) => pilotRank.allowedAircraft.includes(code)),
  );
}

export function getRoutesByAircraft(aircraftCode: string) {
  const normalized = aircraftCode.trim().toUpperCase();
  return getOperationalRoutes().filter((route) => route.allowedAircraft.includes(normalized));
}

export function getRoutesByFlightType(flightType: FlightType) {
  return getOperationalRoutes().filter((route) => route.flightType === flightType);
}

export function getMissingReturnRoutes() {
  const routes = getOperationalRoutes();
  const routeIds = new Set(routes.map((route) => route.routeId));
  return routes.filter((route) => !routeIds.has(route.returnRouteId));
}

export function getAirportsWithoutOutboundRoutes() {
  const routes = getOperationalRoutes();
  const airportsInNetwork = new Set(routes.flatMap((route) => [route.origin, route.destination]));
  const outbound = new Set(routes.map((route) => route.origin));
  return Array.from(airportsInNetwork)
    .filter((icao) => !outbound.has(icao))
    .sort();
}

export function getAirportsWithoutInboundRoutes() {
  const routes = getOperationalRoutes();
  const airportsInNetwork = new Set(routes.flatMap((route) => [route.origin, route.destination]));
  const inbound = new Set(routes.map((route) => route.destination));
  return Array.from(airportsInNetwork)
    .filter((icao) => !inbound.has(icao))
    .sort();
}

export function getRoutesExceedingAircraftRange() {
  return getOperationalRoutes().flatMap((route) =>
    route.allowedAircraft
      .map((code) => ({ route, aircraft: getAirlineAircraft(code) }))
      .filter((item) => item.aircraft && route.distanceNm > item.aircraft.rangeNm)
      .map((item) => ({ routeId: route.routeId, aircraftCode: item.aircraft?.code ?? "", distanceNm: route.distanceNm, rangeNm: item.aircraft?.rangeNm ?? 0 })),
  );
}

export function getRoutesWithoutCompatibleAircraft() {
  return getOperationalRoutes().filter((route) => route.allowedAircraft.length === 0);
}

export function getCargoRoutesWithoutCargoAircraft() {
  return getCargoRoutes().filter((route) =>
    route.allowedAircraft.length === 0 ||
    route.allowedAircraft.some((code) => !getAirlineAircraft(code)?.supportsCargo),
  );
}

export function getPassengerRoutesUsingCargoOnlyAircraft() {
  return getPassengerRoutes().filter((route) =>
    route.allowedAircraft.some((code) => {
      const aircraft = getAirlineAircraft(code);
      return aircraft?.supportsCargo && !aircraft.supportsPassenger;
    }),
  );
}

export function getDuplicateRoutes() {
  const seen = new Map<string, AirlineRoute[]>();
  for (const route of getOperationalRoutes()) {
    const key = `${route.flightType}:${route.origin}:${route.destination}`;
    seen.set(key, [...(seen.get(key) ?? []), route]);
  }
  return Array.from(seen.values()).filter((items) => items.length > 1).flat();
}

export function validateRouteNetwork() {
  const routes = getOperationalRoutes();
  const activeAircraft = AIRLINE_AIRCRAFT.filter((aircraft) => aircraft.active);
  const aircraftCodes = new Set(activeAircraft.map((aircraft) => aircraft.code));
  const referencedAircraft = new Set(allRouteLinks().flatMap((link) => link.baseAircraft));
  const missingReturnRoutes = getMissingReturnRoutes();
  const airportsWithoutOutboundRoutes = getAirportsWithoutOutboundRoutes();
  const airportsWithoutInboundRoutes = getAirportsWithoutInboundRoutes();
  const routesExceedingAircraftRange = getRoutesExceedingAircraftRange();
  const routesWithoutCompatibleAircraft = getRoutesWithoutCompatibleAircraft();
  const cargoRoutesWithoutCargoAircraft = getCargoRoutesWithoutCargoAircraft();
  const passengerRoutesUsingCargoOnlyAircraft = getPassengerRoutesUsingCargoOnlyAircraft();
  const duplicateRoutes = getDuplicateRoutes();
  const invalidFlightTypeRoutes = routes.filter((route) => !FLIGHT_TYPES.includes(route.flightType));
  const routesWithoutMinRank = routes.filter((route) => !route.minRank || !getAirlineRank(route.minRank));
  const checkrideRoutes = routes.filter((route) => /checkride|licen|cert/i.test(route.routeCategory) || /checkride|licen|cert/i.test(route.routeId));
  const unknownAircraftReferences = Array.from(referencedAircraft).filter((code) => !aircraftCodes.has(code)).sort();
  const aircraftNotReferencedByRoutes = activeAircraft.filter((aircraft) => !referencedAircraft.has(aircraft.code));
  const cargoCapacityMismatches = activeAircraft.filter((aircraft) => !aircraft.supportsCargo && aircraft.cargoCapacityKg > 0);
  const cargoAircraftWithoutCapacity = activeAircraft.filter((aircraft) => aircraft.supportsCargo && aircraft.cargoCapacityKg <= 0);
  const routesWithUnauthorizableAircraft = routes.filter((route) =>
    route.allowedAircraft.some((code) =>
      !AIRLINE_RANKS.some((rank) => rankMeetsMinimum(rank.rankCode, route.minRank) && rank.allowedAircraft.includes(code)),
    ),
  );
  const hubsWithoutConnectivity = AIRLINE_AIRPORTS.filter((airport) => airport.active && (airport.isPassengerHub || airport.isCargoHub)).filter((airport) => {
    const inbound = routes.filter((route) => route.destination === airport.icao).length;
    const outbound = routes.filter((route) => route.origin === airport.icao).length;
    return inbound === 0 || outbound === 0;
  });

  const errors = [
    ...(activeAircraft.length !== 34 ? [`Total de aeronaves esperado 34, actual ${activeAircraft.length}`] : []),
    ...missingReturnRoutes.map((route) => `Ruta sin retorno: ${route.routeId}`),
    ...airportsWithoutOutboundRoutes.map((icao) => `Aeropuerto sin salida: ${icao}`),
    ...airportsWithoutInboundRoutes.map((icao) => `Aeropuerto sin llegada: ${icao}`),
    ...routesExceedingAircraftRange.map((item) => `Ruta fuera de autonomia: ${item.routeId} ${item.aircraftCode}`),
    ...routesWithoutCompatibleAircraft.map((route) => `Ruta sin aeronave compatible: ${route.routeId}`),
    ...cargoRoutesWithoutCargoAircraft.map((route) => `Ruta de carga sin aeronave cargo: ${route.routeId}`),
    ...passengerRoutesUsingCargoOnlyAircraft.map((route) => `Ruta pasajero usa cargo-only: ${route.routeId}`),
    ...duplicateRoutes.map((route) => `Ruta duplicada: ${route.routeId}`),
    ...invalidFlightTypeRoutes.map((route) => `flightType invalido: ${route.routeId}`),
    ...routesWithoutMinRank.map((route) => `Ruta sin rango minimo valido: ${route.routeId}`),
    ...checkrideRoutes.map((route) => `Checkride mezclado en red operacional: ${route.routeId}`),
    ...unknownAircraftReferences.map((code) => `Aeronave referenciada no existe: ${code}`),
    ...aircraftNotReferencedByRoutes.map((aircraft) => `Aeronave activa fuera de red: ${aircraft.code}`),
    ...cargoCapacityMismatches.map((aircraft) => `Aeronave sin cargo con capacidad positiva: ${aircraft.code}`),
    ...cargoAircraftWithoutCapacity.map((aircraft) => `Aeronave cargo sin capacidad: ${aircraft.code}`),
    ...routesWithUnauthorizableAircraft.map((route) => `Ruta con aeronave no autorizable por rango: ${route.routeId}`),
    ...hubsWithoutConnectivity.map((airport) => `Hub sin conectividad suficiente: ${airport.icao}`),
  ];

  return {
    ok: errors.length === 0,
    errors,
    totals: {
      airports: AIRLINE_AIRPORTS.filter((airport) => airport.active).length,
      ranks: AIRLINE_RANKS.length,
      aircraft: AIRLINE_AIRCRAFT.filter((aircraft) => aircraft.active).length,
      expectedAircraft: 34,
      passengerHubs: AIRLINE_AIRPORTS.filter((airport) => airport.active && airport.isPassengerHub).length,
      cargoHubs: AIRLINE_AIRPORTS.filter((airport) => airport.active && airport.isCargoHub).length,
      passengerRoutes: getPassengerRoutes().length,
      cargoRoutes: getCargoRoutes().length,
      returnValidatedRoutes: routes.length - missingReturnRoutes.length,
      destinations: new Set(routes.flatMap((route) => [route.origin, route.destination])).size,
    },
    missingReturnRoutes,
    airportsWithoutOutboundRoutes,
    airportsWithoutInboundRoutes,
    routesExceedingAircraftRange,
    routesWithoutCompatibleAircraft,
    cargoRoutesWithoutCargoAircraft,
    passengerRoutesUsingCargoOnlyAircraft,
    duplicateRoutes,
    invalidFlightTypeRoutes,
    routesWithoutMinRank,
    checkrideRoutes,
    unknownAircraftReferences,
    aircraftNotReferencedByRoutes,
    cargoCapacityMismatches,
    cargoAircraftWithoutCapacity,
    routesWithUnauthorizableAircraft,
    hubsWithoutConnectivity,
  };
}
