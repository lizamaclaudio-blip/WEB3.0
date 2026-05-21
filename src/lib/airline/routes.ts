import catalog from "./catalog.json";

export type FlightType = "itinerary" | "charter" | "training" | "cargo";

export type RouteCategory =
  | "escuela_local"
  | "regional"
  | "interregional"
  | "patagonia"
  | "nacional"
  | "internacional_regional"
  | "largo_radio"
  | "carga_regional"
  | "carga_interregional"
  | "carga_nacional"
  | "carga_internacional";

export type AirlineRouteLink = {
  origin: string;
  destination: string;
  routeCategory: RouteCategory;
  flightType: FlightType;
  minRank: string;
  baseAircraft: string[];
  recommendedAircraft: string[];
};

export type AirlineRoute = {
  routeId: string;
  origin: string;
  destination: string;
  originName: string;
  destinationName: string;
  distanceNm: number;
  routeCategory: RouteCategory;
  flightType: FlightType;
  minRank: string;
  allowedAircraft: string[];
  recommendedAircraft: string[];
  isPassengerRoute: boolean;
  isCargoRoute: boolean;
  isHubConnector: boolean;
  isReturnRoute: boolean;
  returnRouteId: string;
  active: boolean;
};

export const PASSENGER_ROUTE_LINKS = catalog.passengerLinks as AirlineRouteLink[];
export const CARGO_ROUTE_LINKS = catalog.cargoLinks as AirlineRouteLink[];
export const FLIGHT_TYPES = catalog.flightTypes as FlightType[];
