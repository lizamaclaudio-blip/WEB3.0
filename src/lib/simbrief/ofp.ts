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

// Helper para extraer ICAO de objeto o string
function extractAirportIdent(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toUpperCase();
  if (typeof value === "object") {
    const obj = value as AnyObj;
    return upper(first(obj.icao_code, obj.icao, obj.ident, obj.id, obj.name));
  }
  return "";
}

// Helper para normalizar flight level
function normalizeFlightLevel(value: unknown): { altitudeFt: number; flightLevel: string } {
  const str = String(value ?? "").trim().toUpperCase();
  
  // Si ya es FL###
  if (str.startsWith("FL")) {
    const flNum = parseInt(str.replace("FL", ""), 10);
    if (!isNaN(flNum)) {
      return { altitudeFt: flNum * 100, flightLevel: `FL${String(flNum).padStart(3, "0")}` };
    }
  }
  
  // Si es número de altitud en pies
  const altitude = num(value);
  if (altitude > 0) {
    const flNum = Math.round(altitude / 100);
    return { altitudeFt: altitude, flightLevel: `FL${String(flNum).padStart(3, "0")}` };
  }
  
  return { altitudeFt: 0, flightLevel: "" };
}

// Helper para detectar y convertir unidades de combustible
function normalizeFuelKg(value: unknown, unitRaw?: unknown): number {
  const numValue = num(value);
  if (numValue <= 0) return 0;
  
  const unit = String(unitRaw ?? "").trim().toUpperCase();
  
  // SimBrief por defecto usa LBS para usuarios US, KG para internacional
  if (unit === "LBS" || unit === "LB" || unit === "POUNDS") {
    return Math.round(numValue * 0.453592); // LBS → KG
  }
  
  // Si hay unidad KG explícita
  if (unit === "KG" || unit === "KGS" || unit === "KILOGRAMS") {
    return Math.round(numValue);
  }
  
  // Sin unidad especificada, detectar por magnitud típica
  // Valores pequeños (0-100) probablemente son miles de libras
  // SimBrief normalmente reporta en LBS para US
  if (numValue > 100 && numValue < 10000) {
    // Probablemente LBS, convertir
    return Math.round(numValue * 0.453592);
  }
  
  return Math.round(numValue);
}

export function normalizeSimbriefOfp(raw: AnyObj): NormalizedSimbriefOfp {
  const general = (raw.general as AnyObj) ?? {};
  const origin = (raw.origin as AnyObj) ?? {};
  const destination = (raw.destination as AnyObj) ?? {};
  const alternate = (raw.alternate as AnyObj) ?? {};
  const airports = (raw.airports as AnyObj) ?? {};
  const altnAirport = (airports.altn as AnyObj) ?? {};
  const weights = (raw.weights as AnyObj) ?? {};
  const fuel = (raw.fuel as AnyObj) ?? {};
  const params = (raw.params as AnyObj) ?? {};
  const times = (raw.times as AnyObj) ?? {};
  const files = (raw.files as AnyObj) ?? {};
  const aircraft = (raw.aircraft as AnyObj) ?? {};
  const apiParams = (raw.api_params as AnyObj) ?? {};
  const atc = (raw.atc as AnyObj) ?? {};
  const navlog = (raw.navlog as AnyObj) ?? {};

  // Buscar ruta en múltiples campos
  const routeCandidates = [
    general.route,
    general.route_ifps,
    atc.route,
    params.route,
    apiParams.route,
    navlog.route,
    files.navlog,
    raw.route,
  ];
  
  // Si no hay ruta explícita, construir simple
  let routeText = first(...routeCandidates);
  const originIdent = upper(first(origin.icao_code, general.orig_icao, raw.orig));
  const destIdent = upper(first(destination.icao_code, general.dest_icao, raw.dest));
  if (!routeText && originIdent && destIdent) {
    routeText = `${originIdent} DCT ${destIdent}`;
  }

  // Normalizar altitud y flight level
  const cruiseAlt = first(general.initial_altitude, params.initial_altitude, general.cruise_profile, params.cruise_profile);
  const { altitudeFt, flightLevel } = normalizeFlightLevel(cruiseAlt);
  
  // Buscar aeronave en múltiples campos posibles
  const aircraftIcao = upper(first(
    aircraft.icaocode,
    aircraft.icao_code,
    aircraft.icao,
    aircraft.name,
    aircraft.type,
    aircraft.basename,
    general.icao_airline,
    general.aircraft_icao,
    general.icao_type,
    general.aircraft,
    params.aircraft,
    apiParams.aircraft,
    raw.aircraft_icao,
    raw.aircraft,
  ));

  return {
    simbriefId: first(general.ofp_id, general.id, raw.ofp_id),
    generatedAt: first(general.generated_time, general.time_generated, raw.generated_at, new Date().toISOString()),
    origin: upper(first(origin.icao_code, general.orig_icao, raw.orig)),
    destination: upper(first(destination.icao_code, general.dest_icao, raw.dest)),
    alternate: extractAirportIdent(first(general.alternate_icao, altnAirport.icao_code, altnAirport.icao, altnAirport.ident, alternate.icao_code, alternate.icao, alternate.ident, raw.alternate)),
    flightNumber: upper(first(general.flight_number, general.flightnum, raw.flight_number)),
    aircraftIcao,
    route: routeText,
    routeText,
    cruiseAltitude: altitudeFt ? `${altitudeFt} ft` : "",
    flightLevel,
    costIndex: first(general.costindex, params.costindex),
    distanceNm: num(first(general.route_distance, general.air_distance)),
    blockFuelKg: normalizeFuelKg(first(fuel.plan_ramp, fuel.block, fuel.block_fuel, raw.block_fuel), fuel.units),
    tripFuelKg: normalizeFuelKg(first(fuel.enroute_burn, fuel.trip, fuel.trip_burn, raw.trip_fuel), fuel.units),
    taxiFuelKg: normalizeFuelKg(first(fuel.taxi, fuel.taxi_fuel, raw.taxi_fuel), fuel.units),
    reserveFuelKg: normalizeFuelKg(first(fuel.reserve, fuel.reserve_fuel, raw.reserve_fuel), fuel.units),
    contingencyFuelKg: normalizeFuelKg(first(fuel.contingency, fuel.contingency_fuel, raw.contingency_fuel), fuel.units),
    alternateFuelKg: normalizeFuelKg(first(fuel.alternate_burn, fuel.alternate_fuel, raw.alternate_fuel), fuel.units),
    finalReserveFuelKg: normalizeFuelKg(first(fuel.finres, fuel.final_reserve, fuel.final_reserve_fuel, raw.final_reserve_fuel), fuel.units),
    payloadKg: normalizeFuelKg(first(weights.payload, weights.oew_payload, raw.payload), weights.units),
    passengerCount: Math.round(num(first(weights.pax_count_actual, weights.pax_count, weights.pax, raw.passengers))),
    cargoKg: normalizeFuelKg(first(weights.cargo, weights.cargo_baggage, weights.baggage, raw.cargo), weights.units),
    zfwKg: num(first(weights.est_zfw, raw.zfw)),
    towKg: num(first(weights.est_tow, raw.tow)),
    landingWeightKg: num(first(weights.est_ldw, raw.ldw)),
    estBlockTimeMinutes: Math.round(num(first(times.est_time_block, raw.est_block_minutes))),
    estFlightTimeMinutes: Math.round(num(first(times.est_time_enroute, raw.est_flight_minutes))),
    raw,
  };
}
