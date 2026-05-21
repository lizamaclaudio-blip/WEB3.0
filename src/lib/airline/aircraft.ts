import catalog from "./catalog.json";

export type AircraftCategory =
  | "single_engine"
  | "piston_twin"
  | "turboprop_single"
  | "turboprop_twin"
  | "regional_turboprop"
  | "light_jet"
  | "regional_jet"
  | "narrow_body"
  | "long_range_narrow_body"
  | "wide_body"
  | "freighter"
  | "cargo_turboprop";

export type AirlineAircraft = {
  code: string;
  aliases?: string[];
  name: string;
  category: AircraftCategory;
  rangeNm: number;
  minRank: string;
  allowedRanks: string[];
  supportsPassenger: boolean;
  supportsCargo: boolean;
  cargoCapacityKg: number;
  passengerCapacity: number;
  active: boolean;
  includedInNetwork?: boolean;
  source?: string[];
};

export const AIRLINE_AIRCRAFT = catalog.aircraft as AirlineAircraft[];

export function getAirlineAircraft(code: string) {
  const normalized = code.trim().toUpperCase();
  return AIRLINE_AIRCRAFT.find((aircraft) => aircraft.code === normalized) ?? null;
}

export function getCargoCapableAircraft() {
  return AIRLINE_AIRCRAFT.filter((aircraft) => aircraft.active && aircraft.supportsCargo);
}

export function getPassengerCapableAircraft() {
  return AIRLINE_AIRCRAFT.filter((aircraft) => aircraft.active && aircraft.supportsPassenger);
}
