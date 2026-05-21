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
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  blockTimeMinutes: number;
  flightTimeMinutes: number;
  estimatedBlockDisplay: string;
  mtowLimited: boolean;
  warnings: string[];
  raw: AnyObj;
};

function parseDurationToMinutes(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const raw = text(value);
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Math.max(0, Number(raw));
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Math.max(0, Number(match[1]) * 60 + Number(match[2]));
}

function formatBlockDisplay(minutes: number) {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function collectTextWarnings(raw: AnyObj) {
  const warningText = [
    text((raw.text as AnyObj)?.plan),
    text((raw.text as AnyObj)?.route),
    text((raw.general as AnyObj)?.remarks),
    text((raw.atc as AnyObj)?.remarks),
    text((raw as AnyObj)?.remarks),
  ]
    .join(" ")
    .toLowerCase();
  const patterns = [
    "payload limited by mtow",
    "cargo limited by mtow",
    "limited by mtow",
    "mtow limited",
    "payload limited",
    "cargo limited",
  ];
  return patterns.filter((p) => warningText.includes(p));
}

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

  // EXTRAER RUTA IFR: Buscar en múltiples campos con prioridad
  // SimBrief puede entregar la ruta en diferentes campos según el tipo de OFP
  const textPlan = (raw.text as AnyObj) ?? {};
  const fms = (raw.fms as AnyObj) ?? {};
  const selectedRoute = (raw.selected_route as AnyObj) ?? {};
  const selectedRouteCamel = (raw.selectedRoute as AnyObj) ?? {};
  
  const routeCandidates = [
    // Prioridad 1: Campos oficiales de ruta
    general.route,
    general.route_ifps,
    general.route_navigraph,
    atc.route,
    params.route,
    apiParams.route,
    selectedRoute.route,
    selectedRouteCamel.route,
    textPlan.plan,
    textPlan.route,
    // Prioridad 3: Navlog/FMS
    navlog.route,
    fms.route,
    files.navlog,
    raw.route,
  ];
  
  // Debug: Log para encontrar campo exacto de ruta (seguro, no imprime tokens)
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[simbrief-ofp] route candidates", {
      generalRoute: general.route,
      atcRoute: atc.route,
      navlogRoute: navlog.route,
      textRoute: textPlan.plan || textPlan.route,
      paramsRoute: params.route,
      apiParamsRoute: apiParams.route,
      fmsRoute: fms.route,
      selectedRoute: selectedRoute.route,
      rawRoute: raw.route,
      origin: origin.icao_code,
      destination: destination.icao_code,
    });
  }
  
  let routeText = first(...routeCandidates);
  const originIdent = upper(first(origin.icao_code, general.orig_icao, raw.orig));
  const destIdent = upper(first(destination.icao_code, general.dest_icao, raw.dest));

  if (!routeText) {
    const navlogArray = Array.isArray((navlog as AnyObj).fix) ? ((navlog as AnyObj).fix as AnyObj[]) : [];
    const built = navlogArray
      .map((f) => upper(first(f.ident, f.name, f.fix, f.wpt)))
      .filter((token) => token && !/^\d{2,4}[NS]\d{3,5}[EW]$/.test(token));
    const dedup = built.filter((token, idx) => token !== built[idx - 1]);
    const useful = dedup.filter((token) => token !== originIdent && token !== destIdent);
    if (useful.length > 0) routeText = useful.join(" ");
  }
  
  // NO construir fallback automático - eso oculta problemas de ruta
  // La web NO debe inventar rutas, debe usar la ruta real del OFP SimBrief

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

  const blockTimeMinutes = parseDurationToMinutes(first(times.est_time_block, times.block, raw.est_block_minutes));
  const flightTimeMinutes = parseDurationToMinutes(first(times.est_time_enroute, times.enroute, raw.est_flight_minutes));
  const warnings = collectTextWarnings(raw);

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
    departureTimeUtc: first(times.est_out, times.dep_time, times.off, raw.departure_time_utc),
    arrivalTimeUtc: first(times.est_in, times.arr_time, times.on, raw.arrival_time_utc),
    blockTimeMinutes,
    flightTimeMinutes,
    estimatedBlockDisplay: formatBlockDisplay(blockTimeMinutes || Math.round(num(first(times.est_time_block, raw.est_block_minutes)))),
    mtowLimited: warnings.length > 0,
    warnings,
    raw,
  };
}

// Tipo para resultado de validación de ruta IFR
export type IfrRouteValidationResult = {
  valid: boolean;
  errorCode?: "SIMBRIEF_IFR_ROUTE_MISSING" | "SIMBRIEF_IFR_ROUTE_INVALID";
  errorMessage?: string;
  route?: string;
  origin?: string;
  destination?: string;
};

/**
 * Valida que una ruta sea una ruta IFR válida (no solo destino u origen-destino sin puntos)
 * 
 * Reglas de validación:
 * - Debe contener waypoints, airways, SID o STAR (mínimo 2 segmentos útiles)
 * - NO es válida si es solo el destino (ej: "SCIE")
 * - NO es válida si es solo origen-destino sin puntos intermedios (ej: "SCTE DCT SCIE")
 * - NO es válida si está vacía o null
 */
export function validateIfrRoute(
  route: string | null | undefined,
  origin?: string,
  destination?: string
): IfrRouteValidationResult {
  const routeClean = text(route);
  
  // REGLA: Bloquear solo si ruta es null, vacía, o exactamente igual al destino
  if (!routeClean) {
    return {
      valid: false,
      errorCode: "SIMBRIEF_IFR_ROUTE_MISSING",
      errorMessage: "El OFP no contiene una ruta. Genera el plan en SimBrief y vuelve a cargar.",
      route: routeClean,
      origin,
      destination,
    };
  }
  
  // REGLA: Rechazar SOLO si la ruta es exactamente el destino (ej: "SCIE")
  // Esto indica que SimBrief no generó una ruta válida
  if (destination && routeClean.toUpperCase() === destination.toUpperCase()) {
    return {
      valid: false,
      errorCode: "SIMBRIEF_IFR_ROUTE_INVALID",
      errorMessage: `El OFP no tiene ruta definida (solo muestra destino ${destination}). Selecciona una ruta sugerida en SimBrief.`,
      route: routeClean,
      origin,
      destination,
    };
  }
  
  // REGLA: Aceptar rutas que contienen origen + destino
  // Ejemplos válidos:
  // - SCTE DCT SCIE (directo, aceptado si viene de SimBrief)
  // - SCTE/35 N0180F080 SCIE/02 (ruta con procedimientos)
  // - VOVK4A VOVKI V551 NIA V103 ANGOL ANG05A (ruta con airways)
  
  const hasOrigin = origin ? routeClean.toUpperCase().includes(origin) : false;
  const hasDest = destination ? routeClean.toUpperCase().includes(destination) : false;
  
  // Si tiene origen y destino, considerarla válida
  // SimBrief genera diferentes formatos según la ruta seleccionada
  if (hasOrigin && hasDest) {
    return {
      valid: true,
      route: routeClean,
      origin,
      destination,
    };
  }
  
  // Si no tiene origen/destino claros pero tiene contenido válido (waypoints, airways)
  // también aceptar - puede ser una ruta parcial o diferente
  const segments = routeClean.split(/\s+/).filter(s => s.length >= 2);
  const hasWaypoints = segments.some(s => 
    /^[A-Z]{5}$/.test(s) || // Fixes (VOVKI, ANGOL)
    /^[A-Z]{3}\d[A-Z]?$/.test(s) || // SIDs/STARs (VOVK4A, ANG05A)
    /^V\d{2,4}$/.test(s) || // Airways (V551, V103)
    /^[A-Z]\d{2,4}$/.test(s) || // Airways variantes
    s.includes("/") // Procedimientos con pista (SCTE/35)
  );
  
  if (hasWaypoints) {
    return {
      valid: true,
      route: routeClean,
      origin,
      destination,
    };
  }
  
  // Si no cumple ninguna regla, rechazar
  return {
    valid: false,
    errorCode: "SIMBRIEF_IFR_ROUTE_INVALID",
    errorMessage: "La ruta del OFP no es reconocida como válida.",
    route: routeClean,
    origin,
    destination,
  };
}
