import type { NextRequest } from "next/server";
import { canPilotFlyAircraft, canPilotFlyRoute, getPilotPermissions, type PilotPermissions } from "@/lib/rules/pilot-permissions";
import { getUserFromBearer, restSelect, type SupabaseUser } from "@/lib/supabase/rest-server";

type Row = Record<string, unknown>;

const ACTIVE_RESERVATION_STATUSES = [
  "reserved",
  "booked",
  "confirmed",
  "active",
  "in_progress",
  "dispatched",
  "preparing",
  "dispatch_ready",
  "in_flight",
];

const AIRCRAFT_DISPLAY_NAMES: Record<string, string> = {
  C172: "Cessna 172 Skyhawk",
  BE58: "Beechcraft Baron 58",
  C208: "Cessna Grand Caravan",
  B350: "Beechcraft King Air 350",
  TBM9: " Daher TBM 930".trim(),
  AT76: "ATR 72-600",
  ATR72: "ATR 72-600",
  E175: "Embraer 175",
  E190: "Embraer 190",
  A319: "Airbus A319",
  A320: "Airbus A320",
  A20N: "Airbus A320neo",
  A321: "Airbus A321",
  B738: "Boeing 737-800",
  B789: "Boeing 787-9",
};

const AIRCRAFT_RANGE_NM: Record<string, number> = {
  C172: 480,
  BE58: 780,
  C208: 800,
  B350: 1450,
  TBM9: 1300,
  TBM8: 1300,
  AT76: 825,
  ATR72: 825,
  E175: 1800,
  E190: 2100,
  A319: 3300,
  A320: 3150,
  A20N: 3150,
  A321: 3400,
  A21N: 3400,
  B738: 2950,
  B789: 7300,
};

export type CrewCenterPayload = {
  pilot: {
    id: string;
    name: string;
    callsign: string;
    rank: string;
    rankCode: string;
    baseIcao: string;
    status: string;
    baseAirportId?: string | null;
    currentAirportId?: string | null;
    licenses: string[];
    ratings: string[];
    hours: number;
    progress: number;
    avatarUrl: string | null;
  };
  hub: AirportPayload | null;
  airport: AirportPayload | null;
  activeReservation: ReservationPayload | null;
  reservedFlight: ReservationPayload | null;
  recentFlights: PirepPayload[];
  recentPireps: PirepPayload[];
  economy: EconomyPayload | null;
  acars: AcarsPayload | null;
  notices: Row[];
  dispatchSummary: {
    routesAvailable: number;
    aircraftAvailable: number;
    activeReservation: boolean;
  };
  counters: {
    monthPosition: number;
    monthHours: number;
    totalPireps: number;
    totalHours: number;
    score: number;
    coins: number;
  };
  suggestedTrainingRoute?: string | null;
  airportHero?: {
    imageUrl: string | null;
    source: string;
  } | null;
  metar?: {
    station: string;
    raw: string | null;
    observedAt: string | null;
  } | null;
  movements: EconomyMovement[];
  routes: DispatchRoutePayload[];
  fleet: FleetAircraftPayload[];
  pilots: PilotListPayload[];
  permissions: {
    permittedAircraftTypes: string[];
    allowedDispatchAirports: string[];
  } | null;
  source: "supabase" | "neon";
  updatedAt: string;
};

export type AirportPayload = {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  country: string;
  countryCode: string | null;
  flagCountryCode: string | null;
  lat: number;
  lng: number;
  elevationFt: number | null;
  timezone: string | null;
};

export type ReservationPayload = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  aircraft: string;
  aircraftRegistration: string;
  aircraftType: string;
  registration: string;
  status: string;
  scheduledDeparture: string | null;
  simbriefStatus: string;
  acarsStatus: string;
};

export type PirepPayload = {
  aircraft: string;
  origin: string;
  destination: string;
  score: string;
  procedures: string;
  performance: string;
  type: string;
  computes: string;
  date: string;
};

export type EconomyMovement = {
  date: string;
  description: string;
  amount: string;
  balance: string;
};

export type EconomyPayload = {
  balance: number | null;
  accruedMonthlySalary: number | null;
  lastLiquidation: Row | null;
  movements: EconomyMovement[];
};

export type AcarsPayload = {
  version: string;
  status: string;
  lastPirepStatus: string;
  pendingCloseout: boolean;
};

export type FleetAircraftPayload = {
  id: string;
  registration: string;
  aircraftType: string;
  aircraftTypeCode: string;
  modelDisplayName: string;
  variant: string;
  status: string;
  locationAirport: string;
  rangeNm: number | null;
  rankRequired: string;
  licenseRequired: string;
  enabled: boolean;
  image: string | null;
  blockedReason: string | null;
};

export type DispatchRoutePayload = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  distanceNm: number | null;
  aircraftTypeRequired: string;
  estimatedTime: string;
  routeType: string;
  active: boolean;
  rankRequired: string | null;
  licenseRequired: string | null;
  blockedReason: string | null;
};

export type PilotListPayload = {
  callsign: string;
  name: string;
  rank: string;
  hours: string;
  pireps: string;
  score: string;
};

function bearer(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

export function n(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function upper(value: unknown, fallback = "") {
  return text(value, fallback).toUpperCase();
}

function dateLabel(value: unknown) {
  const raw = text(value);
  if (!raw) return "No registrado";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("es-CL", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

function timeLabel(minutes: unknown) {
  const total = Math.round(n(minutes));
  if (!total) return "No disponible";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function moneyLabel(value: unknown, signed = false) {
  const amount = n(value);
  if (!amount) return "$ 0";
  const sign = signed && amount > 0 ? "+ " : amount < 0 ? "- " : "";
  return `${sign}$ ${Math.round(Math.abs(amount)).toLocaleString("es-CL")}`;
}

function rankLabel(code: string) {
  if (!code) return "No registrado";
  const map: Record<string, string> = {
    CADET: "Cadet",
    SECOND_OFFICER: "Second Officer",
    JUNIOR_OFFICER: "Junior Officer",
    FIRST_OFFICER: "First Officer",
    SENIOR_FIRST_OFFICER: "Senior First Officer",
    CAPTAIN: "Captain",
    COMMANDER: "Commander",
  };
  return map[code] ?? code.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function flightStatus(value: unknown) {
  const raw = text(value).toLowerCase();
  if (["reserved", "booked", "confirmed"].includes(raw)) return "Confirmado";
  if (["active", "in_progress", "dispatched", "dispatch_ready", "in_flight", "preparing"].includes(raw)) return "Activo";
  if (raw === "completed") return "Completado";
  if (raw === "cancelled" || raw === "canceled") return "Cancelado";
  if (!raw) return "No registrado";
  return raw.replaceAll("_", " ");
}

function scoreFrom(row: Row) {
  return n(row.procedure_score) || n(row.mission_score) || n(row.performance_score) || n(row.score);
}

function blockMinutes(row: Row) {
  return n(row.actual_block_minutes) || n(row.block_minutes) || n(row.block_time_minutes) || n(row.estimated_block_minutes) || n(row.planned_scheduled_block_min);
}

function aircraftTypeCode(row: Row) {
  return upper(row.aircraft_model_code || row.aircraft_type_code || row.icao_code || row.airframe_code || row.aircraft_code);
}

function aircraftDisplayName(code: string, row?: Row) {
  return (
    text(row?.aircraft_display_name) ||
    text(row?.display_name) ||
    text(row?.fleet_name) ||
    text(row?.aircraft_name) ||
    AIRCRAFT_DISPLAY_NAMES[code] ||
    code.replaceAll("_", " ")
  );
}

function parseCompatibleTypes(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => upper(item)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map((item) => upper(item)).filter(Boolean);
    } catch {
      return value.split(/[,\s|;]+/).map((item) => upper(item)).filter(Boolean);
    }
  }
  return [];
}

function monthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function requireUserContext(request: NextRequest) {
  const token = bearer(request);
  if (!token) throw new Error("No autenticado.");
  const user = await getUserFromBearer(token);
  const profile = await restSelect<Row>(
    "pilot_profiles",
    `select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { bearer: token },
  );
  return { token, user, profile: profile[0] ?? null };
}

function profileName(user: SupabaseUser, profile: Row | null) {
  const first = text(profile?.first_name, text(user.user_metadata?.first_name));
  const last = text(profile?.last_name, text(user.user_metadata?.last_name));
  const display = text(profile?.display_name);
  return display || `${first} ${last}`.trim() || text(user.email, "Piloto");
}

function profileCallsign(user: SupabaseUser, profile: Row | null) {
  return upper(profile?.callsign, upper(user.user_metadata?.callsign, "No registrado"));
}

function profileRank(profile: Row | null) {
  return upper(profile?.career_rank_code ?? profile?.rank_code);
}

export async function loadAirportByIcao(icao: string): Promise<AirportPayload | null> {
  const code = upper(icao);
  if (!code) return null;
  const row = await restSelect<Row>(
    "airports",
    `select=*&or=(ident.eq.${encodeURIComponent(code)},icao_code.eq.${encodeURIComponent(code)},gps_code.eq.${encodeURIComponent(code)})&limit=1`,
    { preferAdmin: true },
  );
  const airport = row[0] ?? null;
  if (!airport) return null;
  const airportIcao = upper(airport.ident || airport.icao_code || code);
  return {
    icao: airportIcao,
    iata: text(airport.iata_code) || null,
    name: text(airport.name, "Aeropuerto no configurado"),
    city: text(airport.municipality, "No registrado"),
    country: text(airport.country_name, text(airport.iso_country, "No registrado")),
    countryCode: text(airport.iso_country) || null,
    flagCountryCode: text(airport.iso_country) || null,
    lat: n(airport.latitude_deg),
    lng: n(airport.longitude_deg),
    elevationFt: airport.elevation_ft == null ? null : n(airport.elevation_ft),
    timezone: text(airport.timezone) || null,
  };
}

async function loadPrimaryHubAirport() {
  const hubs = await restSelect<Row>(
    "hubs",
    "select=*&is_active=eq.true&order=sort_order.asc&limit=1",
    { preferAdmin: true },
  );
  const hub = hubs[0] ?? null;
  if (!hub) return null;
  const airport = await loadAirportByIcao(text(hub.code));
  if (airport) return airport;
  return {
    icao: upper(hub.code),
    iata: null,
    name: text(hub.name, "Aeropuerto no configurado"),
    city: text(hub.city, "No registrado"),
    country: text(hub.country_name, text(hub.country_code, "No registrado")),
    countryCode: text(hub.country_code) || null,
    flagCountryCode: text(hub.country_code) || null,
    lat: 0,
    lng: 0,
    elevationFt: null,
    timezone: null,
  } satisfies AirportPayload;
}

function mapReservation(row: Row | null): ReservationPayload | null {
  if (!row) return null;
  const typeCode = upper(row.aircraft_type_code);
  const registration = upper(row.aircraft_registration, "No registrado");
  return {
    id: text(row.id),
    flightNumber: upper(row.flight_number || row.route_code || row.reservation_code, "No registrado"),
    origin: upper(row.origin_ident || row.origin_icao, "No registrado"),
    destination: upper(row.destination_ident || row.destination_icao || row.planned_destination_ident, "No registrado"),
    aircraft: typeCode || registration,
    aircraftRegistration: registration,
    aircraftType: typeCode || "No registrado",
    registration,
    status: flightStatus(row.status),
    scheduledDeparture: text(row.scheduled_departure || row.reserved_at) || null,
    simbriefStatus: text(row.ofp_status || row.simbrief_status, "No disponible"),
    acarsStatus: text(row.acars_status, "No conectado"),
  };
}

async function loadActiveReservation(user: SupabaseUser, profile: Row | null, token: string) {
  const callsign = profileCallsign(user, profile);
  const byCallsign = callsign && callsign !== "NO REGISTRADO"
    ? await restSelect<Row>(
        "flight_reservations",
        `select=*&pilot_callsign=eq.${encodeURIComponent(callsign)}&status=in.(${ACTIVE_RESERVATION_STATUSES.join(",")})&order=updated_at.desc&limit=1`,
        { bearer: token },
      )
    : [];
  if (byCallsign[0]) return mapReservation(byCallsign[0]);

  const byId = await restSelect<Row>(
    "flight_reservations",
    `select=*&pilot_id=eq.${encodeURIComponent(user.id)}&status=in.(${ACTIVE_RESERVATION_STATUSES.join(",")})&order=updated_at.desc&limit=1`,
    { bearer: token },
  );
  return mapReservation(byId[0] ?? null);
}

async function loadRecentReservations(user: SupabaseUser, profile: Row | null, token: string) {
  const callsign = profileCallsign(user, profile);
  const query = callsign && callsign !== "NO REGISTRADO"
    ? `select=*&pilot_callsign=eq.${encodeURIComponent(callsign)}&status=eq.completed&order=completed_at.desc&limit=10`
    : `select=*&pilot_id=eq.${encodeURIComponent(user.id)}&status=eq.completed&order=completed_at.desc&limit=10`;
  return await restSelect<Row>("flight_reservations", query, { bearer: token });
}

function mapPirep(row: Row): PirepPayload {
  const scoringStatus = text(row.scoring_status).toLowerCase();
  const nonEvaluable = ["pending_server_closeout", "incomplete_closeout", "no_evaluable"].includes(scoringStatus);
  const score = nonEvaluable ? "N/D" : `${Math.round(scoreFrom(row)) || "N/D"} pts`;
  const typeCode = upper(row.aircraft_type_code || row.aircraft_type);
  const registration = upper(row.aircraft_registration);
  return {
    aircraft: [typeCode || "No registrado", registration].filter(Boolean).join(" - "),
    origin: upper(row.origin_ident || row.origin_icao, "No registrado"),
    destination: upper(row.destination_ident || row.destination_icao, "No registrado"),
    score,
    procedures: nonEvaluable ? "N/D" : `${Math.round(n(row.procedure_score)) || "N/D"} pts`,
    performance: nonEvaluable ? "N/D" : `${Math.round(n(row.performance_score) || n(row.mission_score)) || "N/D"} pts`,
    type: text(row.flight_mode_code || row.operation_type, "No registrado"),
    computes: nonEvaluable ? "No computa" : "Computa",
    date: dateLabel(row.completed_at || row.updated_at || row.created_at),
  };
}

async function loadFleet(permissions: PilotPermissions | null, token: string, hubIcao: string) {
  const airports = permissions?.allowedDispatchAirports.length ? permissions.allowedDispatchAirports : hubIcao ? [hubIcao] : [];
  const airportFilter = airports.length ? `&current_airport_code=in.(${airports.map(encodeURIComponent).join(",")})` : "";
  const rows = await restSelect<Row>(
    "aircraft",
    `select=*&is_active=eq.true${airportFilter}&order=aircraft_type_code.asc&order=registration.asc&limit=80`,
    { bearer: token },
  );

  return rows.map((row) => {
    const code = aircraftTypeCode(row);
    const check = canPilotFlyAircraft(permissions, row);
    const status = check.allowed ? "Habilitada" : text(row.status).toLowerCase() === "available" ? "Disponible" : "No disponible";
    return {
      id: text(row.id, text(row.registration)),
      registration: upper(row.registration || row.tail_number, "No registrado"),
      aircraftType: code || "No registrado",
      aircraftTypeCode: code || "No registrado",
      modelDisplayName: aircraftDisplayName(code, row),
      variant: text(row.aircraft_variant_code || row.variant_name, "No registrado"),
      status,
      locationAirport: upper(row.current_airport_code || row.current_airport_icao, "No registrado"),
      rangeNm: AIRCRAFT_RANGE_NM[code] ?? null,
      rankRequired: "No registrado",
      licenseRequired: check.allowed ? "Registrada" : check.reason || "No disponible",
      enabled: check.allowed,
      image: text(row.image_url) || null,
      blockedReason: check.reason,
    } satisfies FleetAircraftPayload;
  });
}

async function loadRoutes(permissions: PilotPermissions | null, fleet: FleetAircraftPayload[], token: string, hubIcao: string) {
  const origins = permissions?.allowedDispatchAirports.length ? permissions.allowedDispatchAirports : hubIcao ? [hubIcao] : [];
  const originFilter = origins.length ? `&origin_ident=in.(${origins.map(encodeURIComponent).join(",")})` : "";
  const rows = await restSelect<Row>(
    "pw_v_route_catalog_v2",
    `select=*&is_active=eq.true${originFilter}&order=flight_number.asc&limit=80`,
    { bearer: token },
  );
  const enabledFleetTypes = new Set(fleet.filter((item) => item.enabled).map((item) => item.aircraftTypeCode));

  return rows.map((row) => {
    const check = canPilotFlyRoute(permissions, row);
    const compatible = parseCompatibleTypes(row.compatible_aircraft_types || row.aircraft_type_code);
    const routeRange = n(row.distance_nm);
    const hasCompatibleFleet = compatible.length === 0
      ? fleet.some((item) => item.enabled && (!routeRange || !item.rangeNm || item.rangeNm >= routeRange))
      : compatible.some((type) => enabledFleetTypes.has(type));
    const blockedReason = check.reason || (!hasCompatibleFleet ? "No hay aeronaves disponibles" : null);
    const flightNumber = upper(row.flight_number || row.simbrief_flight_number || row.route_key || row.route_code, "No registrado");
    return {
      id: text(row.route_id || row.id || row.route_key, flightNumber),
      flightNumber,
      origin: upper(row.origin_ident || row.origin_icao, "No registrado"),
      destination: upper(row.destination_ident || row.destination_icao, "No registrado"),
      originAirport: text(row.origin_city || row.origin_ident, "No registrado"),
      destinationAirport: text(row.destination_city || row.destination_ident, "No registrado"),
      distanceNm: row.distance_nm == null ? null : n(row.distance_nm),
      aircraftTypeRequired: compatible.length ? compatible.join(" / ") : "Multi-fleet",
      estimatedTime: timeLabel(row.expected_block_p50 || row.block_minutes),
      routeType: text(row.route_category || row.service_type || row.operation_type, "No registrado"),
      active: row.is_active !== false && !blockedReason,
      rankRequired: text(row.min_rank_code || row.rank_required) || null,
      licenseRequired: compatible.length ? compatible.join(" / ") : null,
      blockedReason,
    } satisfies DispatchRoutePayload;
  });
}

async function loadEconomy(user: SupabaseUser, profile: Row | null, recentFlights: Row[], token: string) {
  const callsign = profileCallsign(user, profile);
  const wallet = profile?.wallet_balance == null ? null : n(profile.wallet_balance);
  const { start, end } = monthRange();
  const salaryRows = await restSelect<Row>(
    "pilot_salary_ledger",
    `select=*&pilot_id=eq.${encodeURIComponent(user.id)}&order=period_year.desc&order=period_month.desc&limit=12`,
    { bearer: token },
  );
  const expenses = callsign && callsign !== "NO REGISTRADO"
    ? await restSelect<Row>(
        "pilot_expense_ledger",
        `select=*&or=(pilot_id.eq.${encodeURIComponent(user.id)},pilot_callsign.eq.${encodeURIComponent(callsign)})&order=created_at.desc&limit=20`,
        { bearer: token },
      )
    : [];

  const monthFlights = recentFlights.filter((row) => {
    const date = new Date(text(row.completed_at));
    return !Number.isNaN(date.getTime()) && date.toISOString() >= start && date.toISOString() < end;
  });
  const accruedMonthlySalary = monthFlights.reduce((sum, row) => sum + n(row.commission_usd), 0);
  const ledgerBalance = n(salaryRows[0]?.net_paid_usd);
  const baseBalance = wallet ?? (ledgerBalance || null);
  const movements = [
    ...recentFlights.slice(0, 8).map((row) => ({
      date: dateLabel(row.completed_at || row.updated_at),
      description: `Vuelo ${upper(row.flight_number || row.route_code, "No registrado")}`,
      amount: moneyLabel(row.commission_usd, true),
      balance: baseBalance == null ? "No disponible" : moneyLabel(baseBalance),
    })),
    ...expenses.slice(0, 8).map((row) => ({
      date: dateLabel(row.created_at),
      description: text(row.description || row.expense_code, "Gasto piloto"),
      amount: moneyLabel(-Math.abs(n(row.amount_usd)), true),
      balance: baseBalance == null ? "No disponible" : moneyLabel(baseBalance),
    })),
  ].slice(0, 12);

  return {
    balance: baseBalance,
    accruedMonthlySalary,
    lastLiquidation: salaryRows[0] ?? null,
    movements,
  } satisfies EconomyPayload;
}

async function loadAcars(user: SupabaseUser, profile: Row | null, token: string) {
  const callsign = profileCallsign(user, profile);
  const rows = callsign && callsign !== "NO REGISTRADO"
    ? await restSelect<Row>(
        "dispatch_packages",
        `select=*&pilot_callsign=eq.${encodeURIComponent(callsign)}&order=updated_at.desc&limit=1`,
        { bearer: token },
      )
    : [];
  const latest = rows[0] ?? null;
  return {
    version: "No disponible",
    status: latest ? text(latest.dispatch_status, "Sin actividad reciente") : "ACARS sin actividad reciente",
    lastPirepStatus: text(latest?.dispatch_status, "Sin actividad reciente"),
    pendingCloseout: false,
  } satisfies AcarsPayload;
}

async function loadPilots(token: string) {
  const rows = await restSelect<Row>(
    "pilot_profiles",
    "select=*&status=eq.active&order=callsign.asc&limit=25",
    { bearer: token },
  );
  return rows.map((row) => ({
    callsign: upper(row.callsign, "No registrado"),
    name: text(row.display_name) || `${text(row.first_name)} ${text(row.last_name)}`.trim() || "No registrado",
    rank: rankLabel(upper(row.career_rank_code || row.rank_code)),
    hours: String(Math.round((n(row.total_hours) || n(row.career_hours) || n(row.transferred_hours)) * 10) / 10 || "Sin datos"),
    pireps: String(n(row.total_pireps) || "Sin datos"),
    score: String(n(row.pw_score) || n(row.score) || "Sin datos"),
  })) satisfies PilotListPayload[];
}

export async function loadCrewCenterData(request: NextRequest): Promise<CrewCenterPayload> {
  const { token, user, profile } = await requireUserContext(request);
  const callsign = profileCallsign(user, profile);
  const rankCode = profileRank(profile);
  const totalHours = n(profile?.total_hours) || n(profile?.career_hours) || n(profile?.transferred_hours);
  const permissions = profile ? await getPilotPermissions(user.id, token, profile) : null;
  const activeReservation = await loadActiveReservation(user, profile, token);
  const airportIcao =
    activeReservation?.origin ||
    upper(profile?.current_airport_icao || profile?.current_airport_code || profile?.base_hub);
  const airport = airportIcao ? await loadAirportByIcao(airportIcao) : await loadPrimaryHubAirport();
  const hub = airport ?? (await loadPrimaryHubAirport());
  const recentFlightRows = await loadRecentReservations(user, profile, token);
  const recentFlights = recentFlightRows.map(mapPirep);
  const fleet = await loadFleet(permissions, token, hub?.icao ?? "");
  const routes = await loadRoutes(permissions, fleet, token, hub?.icao ?? "");
  const economy = await loadEconomy(user, profile, recentFlightRows, token);
  const acars = await loadAcars(user, profile, token);
  const pilots = await loadPilots(token);
  const scores = recentFlightRows.map(scoreFrom).filter(Boolean);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const monthHours = recentFlightRows.reduce((sum, row) => sum + blockMinutes(row) / 60, 0);

  return {
    pilot: {
      id: user.id,
      name: profileName(user, profile),
      callsign,
      rankCode,
      rank: profile ? rankLabel(rankCode) : "Perfil pendiente",
      baseIcao: upper(profile?.base_hub, "No registrado"),
      status: text(profile?.status, profile ? "Pendiente" : "Perfil pendiente"),
      licenses: permissions?.pilot.licenses ?? [],
      ratings: permissions?.pilot.ratings ?? [],
      hours: Math.round(totalHours * 10) / 10,
      progress: avgScore,
      avatarUrl: text(profile?.avatar_url) || null,
    },
    hub,
    airport: hub,
    activeReservation,
    reservedFlight: activeReservation,
    recentFlights,
    recentPireps: recentFlights,
    economy,
    acars,
    notices: [],
    dispatchSummary: {
      routesAvailable: routes.filter((route) => route.active).length,
      aircraftAvailable: fleet.filter((aircraft) => aircraft.enabled).length,
      activeReservation: Boolean(activeReservation),
    },
    counters: {
      monthPosition: 0,
      monthHours: Math.round(monthHours * 10) / 10,
      totalPireps: recentFlights.length,
      totalHours: Math.round(totalHours * 10) / 10,
      score: avgScore,
      coins: Math.round(economy?.balance ?? 0),
    },
    movements: economy?.movements ?? [],
    routes,
    fleet,
    pilots,
    permissions: permissions
      ? {
          permittedAircraftTypes: permissions.permittedAircraftTypes,
          allowedDispatchAirports: permissions.allowedDispatchAirports,
        }
      : null,
    source: "supabase",
    updatedAt: new Date().toISOString(),
  };
}

export async function loadPublicHubs() {
  const hubs = await restSelect<Row>(
    "hubs",
    "select=*&is_active=eq.true&order=sort_order.asc",
    { preferAdmin: true },
  );
  const enriched = await Promise.all(
    hubs.map(async (hub) => {
      const airport = await loadAirportByIcao(text(hub.code));
      return {
        code: upper(hub.code),
        name: text(hub.name, airport?.name ?? "No configurado"),
        city: text(hub.city, airport?.city ?? "No configurado"),
        country: text(hub.country_name, airport?.country ?? "No configurado"),
        countryCode: text(hub.country_code, airport?.countryCode ?? ""),
        isActive: hub.is_active !== false,
        airport,
      };
    }),
  );
  return enriched;
}
