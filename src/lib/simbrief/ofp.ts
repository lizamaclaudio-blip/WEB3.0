type AnyObj = Record<string, unknown>;

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function first(...values: unknown[]) {
  for (const value of values) {
    const v = text(value);
    if (v) return v;
  }
  return "";
}

export type NormalizedSimbriefOfp = {
  simbriefId: string;
  generatedAt: string;
  origin: string;
  destination: string;
  alternate: string;
  flightNumber: string;
  aircraftIcao: string;
  route: string;
  routeText: string;
  cruiseAltitude: string;
  flightLevel: string;
  costIndex: string;
  distanceNm: number;
  blockFuelKg: number;
  tripFuelKg: number;
  taxiFuelKg: number;
  reserveFuelKg: number;
  contingencyFuelKg: number;
  alternateFuelKg: number;
  finalReserveFuelKg: number;
  payloadKg: number;
  passengerCount: number;
  cargoKg: number;
  zfwKg: number;
  towKg: number;
  landingWeightKg: number;
  estBlockTimeMinutes: number;
  estFlightTimeMinutes: number;
  raw: AnyObj;
};

export function normalizeSimbriefOfp(raw: AnyObj): NormalizedSimbriefOfp {
  const general = (raw.general as AnyObj) ?? {};
  const origin = (raw.origin as AnyObj) ?? {};
  const destination = (raw.destination as AnyObj) ?? {};
  const weights = (raw.weights as AnyObj) ?? {};
  const fuel = (raw.fuel as AnyObj) ?? {};
  const params = (raw.params as AnyObj) ?? {};
  const times = (raw.times as AnyObj) ?? {};
  const files = (raw.files as AnyObj) ?? {};

  const routeText = first(general.route, params.route, files.navlog, raw.route);
  const cruise = first(general.initial_altitude, params.initial_altitude, general.cruise_profile);
  const fl = upper(cruise).startsWith("FL") ? upper(cruise) : (cruise ? `FL${cruise}` : "");

  return {
    simbriefId: first(general.ofp_id, general.id, raw.ofp_id),
    generatedAt: first(general.generated_time, general.time_generated, raw.generated_at, new Date().toISOString()),
    origin: upper(first(origin.icao_code, general.orig_icao, raw.orig)),
    destination: upper(first(destination.icao_code, general.dest_icao, raw.dest)),
    alternate: upper(first(general.alternate_icao, raw.alternate)),
    flightNumber: upper(first(general.flight_number, general.flightnum, raw.flight_number)),
    aircraftIcao: upper(first(general.icao_airline, general.aircraft_icao, general.icao_type, raw.aircraft_icao)),
    route: routeText,
    routeText,
    cruiseAltitude: cruise,
    flightLevel: fl,
    costIndex: first(general.costindex, params.costindex),
    distanceNm: num(first(general.route_distance, general.air_distance)),
    blockFuelKg: num(first(fuel.plan_ramp, fuel.block, raw.block_fuel)),
    tripFuelKg: num(first(fuel.enroute_burn, fuel.trip, raw.trip_fuel)),
    taxiFuelKg: num(first(fuel.taxi, raw.taxi_fuel)),
    reserveFuelKg: num(first(fuel.reserve, raw.reserve_fuel)),
    contingencyFuelKg: num(first(fuel.contingency, raw.contingency_fuel)),
    alternateFuelKg: num(first(fuel.alternate_burn, raw.alternate_fuel)),
    finalReserveFuelKg: num(first(fuel.finres, raw.final_reserve_fuel)),
    payloadKg: num(first(weights.payload, raw.payload)),
    passengerCount: Math.round(num(first(weights.pax_count_actual, weights.pax_count, raw.passengers))),
    cargoKg: num(first(weights.cargo, raw.cargo)),
    zfwKg: num(first(weights.est_zfw, raw.zfw)),
    towKg: num(first(weights.est_tow, raw.tow)),
    landingWeightKg: num(first(weights.est_ldw, raw.ldw)),
    estBlockTimeMinutes: Math.round(num(first(times.est_time_block, raw.est_block_minutes))),
    estFlightTimeMinutes: Math.round(num(first(times.est_time_enroute, raw.est_flight_minutes))),
    raw,
  };
}
