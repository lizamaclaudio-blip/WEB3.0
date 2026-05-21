import catalog from "./catalog.json";

export type HubCategory =
  | "none"
  | "main_hub"
  | "regional_hub"
  | "patagonia_hub"
  | "international_hub"
  | "cargo_hub"
  | "mixed_hub";

export type AirportCategory =
  | "local"
  | "regional"
  | "interregional"
  | "national"
  | "international"
  | "remote"
  | "cargo"
  | "mixed"
  | "patagonia_hub";

export type AirlineAirport = {
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  isPassengerHub: boolean;
  isCargoHub: boolean;
  hubCategory: HubCategory;
  airportCategory: AirportCategory;
  cargoCategory: string;
  active: boolean;
};

export const AIRLINE_AIRPORTS = catalog.airports as AirlineAirport[];

export function getAirlineAirport(icao: string) {
  const normalized = icao.trim().toUpperCase();
  return AIRLINE_AIRPORTS.find((airport) => airport.icao === normalized) ?? null;
}

export function getPassengerHubs() {
  return AIRLINE_AIRPORTS.filter((airport) => airport.active && airport.isPassengerHub);
}

export function getCargoHubs() {
  return AIRLINE_AIRPORTS.filter((airport) => airport.active && airport.isCargoHub);
}
