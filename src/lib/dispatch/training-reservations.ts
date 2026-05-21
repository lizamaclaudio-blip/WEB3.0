import "server-only";
import { createHash, randomBytes, randomUUID } from "crypto";
import type { AuthenticatedPilot } from "@/lib/auth/service";
import { dbOne, dbQuery, dbTransaction } from "@/lib/db/client";
import { listAvailableAircraft } from "@/lib/dispatch/neon-ops";
import { getFlightOperationType } from "@/lib/dispatch/operation-types";
import {
  buildPassengerManifest,
  buildCargoManifest,
  buildAircraftPayload,
  type EconomySnapshot,
} from "@/lib/dispatch/manifest-types";
import { getRouteEconomyEstimate, mapDbEstimateToEconomyEstimate } from "@/lib/economy/db";
import { calculateFlightEconomyEstimate } from "@/lib/economy/calculator";
import { extractPwgFlightNumber, buildPwgCallsign } from "@/lib/dispatch/flight-number";

const FALLBACK_DISPATCH_TTL_MINUTES = 15;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMPORARY_RESERVATION_STATUSES = new Set(["TEMP_RESERVED", "ACARS_READY"]);
const BLOCKING_FLIGHT_STATUSES = new Set([
  "ACARS_CLAIMED",
  "RESERVED",
  "DISPATCHED",
  "IN_FLIGHT",
  "LANDED",
  "PENDING_EVALUATION",
  "EVALUATED",
]);
const CLOSED_RESERVATION_STATUSES = new Set(["CANCELLED", "EXPIRED", "FINALIZED"]);

class TrainingReservationError extends Error {
  details?: Record<string, unknown>;

  constructor(code: string, details?: Record<string, unknown>) {
    super(code);
    this.name = "TrainingReservationError";
    this.details = details;
  }
}

export function getTrainingReservationErrorCode(error: unknown) {
  return error instanceof Error ? error.message : "TRAINING_RESERVATION_FAILED";
}

export function getTrainingReservationErrorDetails(error: unknown) {
  return error instanceof TrainingReservationError ? error.details : undefined;
}

function reservationError(code: string, details?: Record<string, unknown>): never {
  throw new TrainingReservationError(code, details);
}

type CreateTrainingReservationInput = {
  operationType?: string | null;
  routeId?: string | null;
  routeCode?: string | null;
  aircraftId?: string | null;
  aircraftCode?: string | null;
  aircraftRegistration?: string | null;
  originIdent: string;
  destinationIdent: string;
  alternateIdent?: string | null;
  departureTime?: string | null;
  flightLevel?: string | null;
  routeText?: string | null;
  passengerCount?: number | null;
  cargoKg?: number | null;
  fuelKg?: number | null;
  fuelPolicy?: string | null;
  simbriefOfp?: Record<string, unknown> | null;
};

type AirportLookup = {
  id: string;
  ident: string | null;
  icao: string | null;
  iata: string | null;
  name: string | null;
};

type TrainingReservationRow = {
  id: string;
  pilot_user_id?: string | null;
  pilot_callsign: string | null;
  aircraft_id: string | null;
  aircraft_registration: string | null;
  aircraft_model_code: string | null;
  route_id: string | null;
  route_code: string | null;
  origin_ident: string;
  destination_ident: string;
  operation_type: string;
  score_mode: string;
  status: string;
  dispatch_token_hash?: string | null;
  dispatch_token_hint: string | null;
  expires_at: string;
  created_at: string;
  updated_at?: string | null;
  is_expired?: boolean;
};

type RouteLookup = {
  id: string;
  route_code: string | null;
  origin_ident: string | null;
  destination_ident: string | null;
  category: string | null;
  distance_nm: number | string | null;
  allows_passenger: boolean | null;
  allows_cargo: boolean | null;
};

type ActiveReservationLookup = TrainingReservationRow & {
  is_expired: boolean;
};

function normalizeIdent(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeStatus(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function toInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function toNumeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function hashDispatchToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createDispatchToken() {
  return randomBytes(40).toString("base64url");
}

function normalizeOperationType(value: unknown) {
  const code = normalizeText(value, "TRAINING_FREE").toUpperCase();
  const allowed = new Set([
    "TRAINING_FREE",
    "SCHOOL_OFFICIAL_ROUTE",
    "COMMERCIAL_OFFICIAL_ROUTE",
    "CHARTER_OFFICIAL",
    "CARGO_OFFICIAL",
  ]);
  return allowed.has(code) ? code : "TRAINING_FREE";
}

function isCargoOperation(operationType: string) {
  return operationType === "CARGO_OFFICIAL";
}

async function resolveEconomySnapshot(
  routeId: string | null,
  aircraftCode: string,
  operationType: string,
  affectsEconomy: boolean,
): Promise<EconomySnapshot> {
  const isCargo = isCargoOperation(operationType);
  const flightType = isCargo ? "cargo" : operationType === "TRAINING_FREE" ? "training" : "itinerary";
  const noRoute: EconomySnapshot = {
    routeId: null,
    flightType,
    aircraftCode,
    distanceNm: 0,
    grossRevenueUsd: 0,
    ticketRevenueUsd: 0,
    cargoRevenueUsd: 0,
    totalCostUsd: 0,
    netProfitUsd: 0,
    pilotAccrualUsd: 0,
    maintenanceReserveUsd: 0,
    aircraftWearPercent: 0,
    economyEligible: false,
    source: "none",
  };

  if (!routeId || !routeId.trim()) return noRoute;

  // 1. Try DB estimate
  try {
    const dbRow = await getRouteEconomyEstimate(routeId, flightType, aircraftCode);
    if (dbRow) {
      const est = mapDbEstimateToEconomyEstimate(dbRow);
      const payload = est.estimatePayload;
      const wearPct = Number(((payload?.aircraftWear?.totalWearPercent ?? 0) * 100).toFixed(2));
      const ticketRev = isCargo ? 0 : Number(payload?.passengerEconomy?.ticketRevenueUsd ?? 0);
      const cargoRev = isCargo ? Number(payload?.cargoEconomy?.cargoRevenueUsd ?? 0) : 0;
      return {
        routeId: est.routeId,
        flightType: est.flightType,
        aircraftCode: est.aircraftCode,
        distanceNm: est.distanceNm,
        grossRevenueUsd: est.grossRevenueUsd,
        ticketRevenueUsd: ticketRev,
        cargoRevenueUsd: cargoRev,
        totalCostUsd: est.totalCostUsd,
        netProfitUsd: est.netProfitUsd,
        pilotAccrualUsd: est.pilotAccrualUsd,
        maintenanceReserveUsd: est.maintenanceReserveUsd,
        aircraftWearPercent: wearPct,
        economyEligible: est.economyEligible && affectsEconomy,
        source: "db",
      };
    }
  } catch {
    // fall through to local calculator
  }

  // 2. Local fallback
  try {
    const est = calculateFlightEconomyEstimate({ routeId, aircraftCode });
    const payload = est.estimatePayload;
    const wearPct = Number(((payload?.aircraftWear?.totalWearPercent ?? 0) * 100).toFixed(2));
    const ticketRev = isCargo ? 0 : Number(payload?.passengerEconomy?.ticketRevenueUsd ?? 0);
    const cargoRev = isCargo ? Number(payload?.cargoEconomy?.cargoRevenueUsd ?? 0) : 0;
    return {
      routeId: est.routeId,
      flightType: est.flightType,
      aircraftCode: est.aircraftCode,
      distanceNm: est.distanceNm,
      grossRevenueUsd: est.grossRevenueUsd,
      ticketRevenueUsd: ticketRev,
      cargoRevenueUsd: cargoRev,
      totalCostUsd: est.totalCostUsd,
      netProfitUsd: est.netProfitUsd,
      pilotAccrualUsd: est.pilotAccrualUsd,
      maintenanceReserveUsd: est.maintenanceReserveUsd,
      aircraftWearPercent: wearPct,
      economyEligible: est.economyEligible && affectsEconomy,
      source: "local-fallback",
    };
  } catch {
    return noRoute;
  }
}

function isReferenceOnlyOperation(operationType: string, scoreMode: string) {
  return operationType === "TRAINING_FREE" && scoreMode === "REFERENCE_ONLY";
}

export async function ensureTrainingReservationSchema() {
  await dbQuery(`
    create table if not exists public.training_dispatch_reservations (
      id uuid primary key,
      pilot_user_id uuid not null references public.app_users(id) on delete cascade,
      pilot_callsign text,
      aircraft_id uuid null,
      aircraft_registration text,
      aircraft_model_code text,
      origin_airport_id uuid not null references public.airports(id),
      destination_airport_id uuid not null references public.airports(id),
      route_id uuid null,
      origin_ident text not null,
      destination_ident text not null,
      alternate_ident text,
      departure_time text,
      flight_level text,
      route_text text,
      passenger_count integer not null default 0,
      cargo_kg numeric not null default 0,
      fuel_kg numeric not null default 0,
      fuel_policy text,
      operation_type text not null default 'TRAINING_FREE',
      score_mode text not null default 'REFERENCE_ONLY',
      status text not null default 'TEMP_RESERVED',
      affects_pilot_position boolean not null default false,
      affects_aircraft_position boolean not null default false,
      affects_economy boolean not null default false,
      affects_ranking boolean not null default false,
      dispatch_token_hash text unique not null,
      dispatch_token_hint text,
      expires_at timestamptz not null,
      sent_to_acars_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists route_id uuid",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists acars_ready_at timestamptz",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists prepared_acars_payload jsonb",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists acars_payload_version text not null default 'pw3-training-v1'",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists acars_claimed_at timestamptz",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists acars_claim_last_at timestamptz",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists acars_claim_count integer not null default 0",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists acars_claim_source text",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists acars_status text",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists simbrief_ofp_id text",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists simbrief_generated_at timestamptz",
  );
  await dbQuery(
    "alter table public.training_dispatch_reservations add column if not exists simbrief_ofp_json jsonb",
  );

  await dbQuery(
    "create index if not exists idx_training_dispatch_pilot_status on public.training_dispatch_reservations(pilot_user_id, status)",
  );
  await dbQuery(
    "create index if not exists idx_training_dispatch_expires_at on public.training_dispatch_reservations(expires_at)",
  );
  await dbQuery(
    "create index if not exists idx_training_dispatch_aircraft on public.training_dispatch_reservations(aircraft_id)",
  );
}

export async function expireTrainingReservations() {
  await ensureTrainingReservationSchema();
  await dbQuery(`
    update public.training_dispatch_reservations
       set status = 'EXPIRED', updated_at = now()
     where status in ('TEMP_RESERVED', 'ACARS_READY')
       and expires_at <= now()
  `);
}

async function findAirport(ident: string) {
  return await dbOne<AirportLookup>(
    `select id::text as id, ident, icao, iata, name
       from public.airports
      where coalesce(is_active, true) = true
        and upper(coalesce(ident, icao, iata, '')) = upper($1)
      limit 1`,
    [ident],
  );
}

async function findRouteById(routeId: string, originIdent: string, destinationIdent: string) {
  return await dbOne<RouteLookup>(
    `select
       nr.id::text,
       nr.route_code,
       oa.ident as origin_ident,
       da.ident as destination_ident,
       nr.route_category as category,
       nr.distance_nm,
       nr.allows_passenger,
       nr.allows_cargo
     from public.network_routes nr
     join public.airports oa on oa.id = nr.origin_airport_id
     join public.airports da on da.id = nr.destination_airport_id
     where nr.id = $1::uuid
       and upper(coalesce(oa.ident, oa.icao, '')) = upper($2)
       and upper(coalesce(da.ident, da.icao, '')) = upper($3)
       and coalesce(nr.is_active, true) = true
     limit 1`,
    [routeId, originIdent, destinationIdent],
  );
}

async function findRoutesByCode(routeCode: string, originIdent: string, destinationIdent: string) {
  const result = await dbQuery<RouteLookup>(
    `select
       nr.id::text,
       nr.route_code,
       oa.ident as origin_ident,
       da.ident as destination_ident,
       nr.route_category as category,
       nr.distance_nm,
       nr.allows_passenger,
       nr.allows_cargo
     from public.network_routes nr
     join public.airports oa on oa.id = nr.origin_airport_id
     join public.airports da on da.id = nr.destination_airport_id
     where upper(coalesce(nr.route_code, '')) = upper($1)
       and upper(coalesce(oa.ident, oa.icao, '')) = upper($2)
       and upper(coalesce(da.ident, da.icao, '')) = upper($3)
       and coalesce(nr.is_active, true) = true
     order by nr.route_code nulls last
     limit 5`,
    [routeCode, originIdent, destinationIdent],
  );
  return result.rows;
}

async function findRoutesByEndpoints(originIdent: string, destinationIdent: string) {
  const result = await dbQuery<RouteLookup>(
    `select
       nr.id::text,
       nr.route_code,
       oa.ident as origin_ident,
       da.ident as destination_ident,
       nr.route_category as category,
       nr.distance_nm,
       nr.allows_passenger,
       nr.allows_cargo
     from public.network_routes nr
     join public.airports oa on oa.id = nr.origin_airport_id
     join public.airports da on da.id = nr.destination_airport_id
     where upper(coalesce(oa.ident, oa.icao, '')) = upper($1)
       and upper(coalesce(da.ident, da.icao, '')) = upper($2)
       and coalesce(nr.is_active, true) = true
     order by nr.route_code nulls last
     limit 5`,
    [originIdent, destinationIdent],
  );
  return result.rows;
}

async function resolveRouteForReservation(input: {
  routeId: string;
  routeCode: string;
  originIdent: string;
  destinationIdent: string;
}) {
  if (input.routeId && isUuid(input.routeId)) {
    const route = await findRouteById(
      input.routeId,
      input.originIdent,
      input.destinationIdent,
    );
    if (!route) reservationError("ROUTE_ID_REQUIRED");
    return route;
  }

  const routeCode = input.routeCode || input.routeId;
  if (routeCode) {
    const routes = await findRoutesByCode(
      routeCode,
      input.originIdent,
      input.destinationIdent,
    );
    if (routes.length === 1) return routes[0];
    if (routes.length > 1) {
      reservationError("ROUTE_ID_REQUIRED", {
        candidates: routes.map((route) => route.id),
      });
    }
  }

  const endpointRoutes = await findRoutesByEndpoints(
    input.originIdent,
    input.destinationIdent,
  );
  if (endpointRoutes.length === 1) return endpointRoutes[0];
  if (endpointRoutes.length > 1) {
    reservationError("ROUTE_ID_REQUIRED", {
      candidates: endpointRoutes.map((route) => route.id),
    });
  }

  reservationError("ROUTE_ID_REQUIRED");
}

function selectAircraftForReservation(
  availableAircraft: Awaited<ReturnType<typeof listAvailableAircraft>>,
  input: CreateTrainingReservationInput,
) {
  const aircraftId = normalizeText(input.aircraftId);
  const aircraftRegistration = normalizeIdent(input.aircraftRegistration);
  const aircraftCode = normalizeIdent(input.aircraftCode);

  if (!aircraftId && !aircraftRegistration && !aircraftCode)
    reservationError("AIRCRAFT_ID_REQUIRED");

  const directMatch = availableAircraft.find((aircraft) => {
    const value = `${aircraft.model_code}-${aircraft.registration}`;
    return (
      aircraft.id === aircraftId ||
      aircraft.registration === aircraftId ||
      value === aircraftId ||
      (aircraftRegistration && aircraft.registration === aircraftRegistration)
    );
  });

  if (directMatch) return directMatch;

  if (aircraftCode) {
    const modelMatches = availableAircraft.filter(
      (aircraft) => aircraft.model_code === aircraftCode,
    );
    if (modelMatches.length === 1) return modelMatches[0];
  }

  reservationError("AIRCRAFT_NOT_ALLOWED_FOR_PILOT");
}

function reservationMatchesSelection(
  row: ActiveReservationLookup,
  route: RouteLookup,
  aircraft: Awaited<ReturnType<typeof listAvailableAircraft>>[number],
) {
  const rowRouteId = normalizeText(row.route_id);
  const rowAircraftId = normalizeText(row.aircraft_id);
  const rowRegistration = normalizeIdent(row.aircraft_registration);

  return (
    rowRouteId === route.id &&
    (rowAircraftId === aircraft.id || rowRegistration === aircraft.registration)
  );
}

async function closeReservation(id: string, status: "CANCELLED" | "EXPIRED") {
  await dbQuery(
    `update public.training_dispatch_reservations
        set status = $2,
            acars_status = $2,
            updated_at = now()
      where id = $1::uuid`,
    [id, status],
  );
}

async function findActiveReservationsForPilot(userId: string) {
  const result = await dbQuery<ActiveReservationLookup>(
    `select
       id::text,
       pilot_user_id::text,
       pilot_callsign,
       aircraft_id::text,
       aircraft_registration,
       aircraft_model_code,
       route_id::text,
       origin_ident,
       destination_ident,
       operation_type,
       score_mode,
       status,
       dispatch_token_hash,
       dispatch_token_hint,
       expires_at::text,
       created_at::text,
       updated_at::text,
       (expires_at <= now()) as is_expired
     from public.training_dispatch_reservations
     where pilot_user_id = $1::uuid
       and upper(status) <> all($2::text[])
     order by updated_at desc nulls last, created_at desc nulls last`,
    [userId, Array.from(CLOSED_RESERVATION_STATUSES)],
  );

  return result.rows;
}

async function findActiveAircraftReservationByOtherPilot(
  userId: string,
  aircraft: Awaited<ReturnType<typeof listAvailableAircraft>>[number],
) {
  return await dbOne<ActiveReservationLookup>(
    `select
       id::text,
       pilot_user_id::text,
       pilot_callsign,
       aircraft_id::text,
       aircraft_registration,
       aircraft_model_code,
       route_id::text,
       origin_ident,
       destination_ident,
       operation_type,
       score_mode,
       status,
       dispatch_token_hash,
       dispatch_token_hint,
       expires_at::text,
       created_at::text,
       updated_at::text,
       (expires_at <= now()) as is_expired
     from public.training_dispatch_reservations
     where pilot_user_id <> $1::uuid
       and (aircraft_id = $2::uuid or upper(coalesce(aircraft_registration, '')) = upper($3))
       and (
         status in ('ACARS_CLAIMED','RESERVED','DISPATCHED','IN_FLIGHT','LANDED','PENDING_EVALUATION','EVALUATED')
         or (status in ('TEMP_RESERVED','ACARS_READY') and expires_at > now())
       )
     order by updated_at desc nulls last, created_at desc nulls last
     limit 1`,
    [userId, aircraft.id, aircraft.registration],
  );
}

async function rotateReservationToken(reservationId: string) {
  const dispatchToken = createDispatchToken();
  const dispatchTokenHash = hashDispatchToken(dispatchToken);
  const tokenHint = dispatchToken.slice(0, 8);

  const row = await dbOne<TrainingReservationRow>(
    `update public.training_dispatch_reservations
        set dispatch_token_hash = $2,
            dispatch_token_hint = $3,
            updated_at = now()
      where id = $1::uuid
      returning
        id::text,
        pilot_user_id::text,
        pilot_callsign,
        aircraft_id::text,
        aircraft_registration,
        aircraft_model_code,
        route_id::text,
        route_code,
        origin_ident,
        destination_ident,
        operation_type,
        score_mode,
        status,
        dispatch_token_hash,
        dispatch_token_hint,
        expires_at::text,
        created_at::text,
        updated_at::text`,
    [reservationId, dispatchTokenHash, tokenHint],
  );

  if (!row) reservationError("RESERVATION_NOT_FOUND");
  return { row, dispatchToken };
}

function buildReservationResult(input: {
  row: TrainingReservationRow;
  dispatchToken: string;
  ttlMinutes: number;
  operationRule: Awaited<ReturnType<typeof getFlightOperationType>>;
  aircraft: Awaited<ReturnType<typeof listAvailableAircraft>>[number];
  route: RouteLookup;
  reusedExistingReservation: boolean;
}) {
  return {
    ...input.row,
    dispatch_token: input.dispatchToken,
    ttl_minutes: input.ttlMinutes,
    reusedExistingReservation: input.reusedExistingReservation,
    aircraft: {
      id: input.aircraft.id,
      registration: input.aircraft.registration,
      model_code: input.aircraft.model_code,
      display_name: input.aircraft.display_name,
    },
    route: {
      id: input.route.id,
      route_code: input.route.route_code,
      origin_ident: normalizeIdent(input.route.origin_ident),
      destination_ident: normalizeIdent(input.route.destination_ident),
      category: input.route.category,
      distance_nm: input.route.distance_nm,
    },
    rules: {
      operation_type: input.operationRule.code,
      score_mode: input.operationRule.score_mode,
      affects_pilot_position: input.operationRule.affects_pilot_position,
      affects_aircraft_position: input.operationRule.affects_aircraft_position,
      affects_economy: input.operationRule.affects_economy,
      affects_ranking: input.operationRule.affects_ranking,
    },
  };
}

export async function createTrainingFreeReservation(
  user: AuthenticatedPilot,
  input: CreateTrainingReservationInput,
) {
  await ensureTrainingReservationSchema();
  await expireTrainingReservations();

  const operationType = normalizeOperationType(input.operationType);
  const isCargo = isCargoOperation(operationType);
  const originIdent = normalizeIdent(input.originIdent);
  const destinationIdent = normalizeIdent(input.destinationIdent);
  const requestedRouteId = normalizeText(input.routeId);
  const requestedRouteCode = normalizeText(input.routeCode);
  const requestedAircraft =
    normalizeText(input.aircraftId) ||
    normalizeIdent(input.aircraftRegistration) ||
    normalizeIdent(input.aircraftCode);

  console.info(
    `[dispatch] createTrainingFreeReservation callsign=${user.callsign} origin=${originIdent} dest=${destinationIdent} aircraft=${requestedAircraft} route=${requestedRouteId || requestedRouteCode}`,
  );

  if (!originIdent) throw new Error("ORIGIN_REQUIRED");
  if (!destinationIdent) throw new Error("DESTINATION_REQUIRED");

  const [originAirport, destinationAirport, availableAircraft, operationRule] =
    await Promise.all([
      findAirport(originIdent),
      findAirport(destinationIdent),
      listAvailableAircraft(user),
      getFlightOperationType(operationType),
    ]);

  const ttlMinutes =
    operationRule.reservation_expires_minutes ?? FALLBACK_DISPATCH_TTL_MINUTES;

  console.info(`[dispatch] airports origin=${originAirport?.id || 'NOT_FOUND'} dest=${destinationAirport?.id || 'NOT_FOUND'} aircraft_available=${availableAircraft.length}`);

  if (!originAirport) throw new Error("ORIGIN_NOT_FOUND");
  if (!destinationAirport) throw new Error("DESTINATION_NOT_FOUND");

  const selectedAircraft = selectAircraftForReservation(availableAircraft, input);
  const selectedRoute = await resolveRouteForReservation({
    routeId: requestedRouteId,
    routeCode: requestedRouteCode,
    originIdent,
    destinationIdent,
  });

  console.info(
    `[dispatch] selectedAircraft=${selectedAircraft.id} registration=${selectedAircraft.registration} route=${selectedRoute.id}`,
  );

  const activeReservations = await findActiveReservationsForPilot(user.userId);
  for (const activeReservation of activeReservations) {
    const status = normalizeStatus(activeReservation.status);

    if (BLOCKING_FLIGHT_STATUSES.has(status)) {
      console.warn(
        `[dispatch] FLIGHT_ACTIVE_BLOCKS_RESERVATION pilot=${user.callsign} reservation=${activeReservation.id} status=${status}`,
      );
      reservationError("ACTIVE_FLIGHT_IN_PROGRESS", {
        activeReservationId: activeReservation.id,
        status,
      });
    }

    if (!TEMPORARY_RESERVATION_STATUSES.has(status)) continue;

    if (activeReservation.is_expired) {
      console.info(
        `[dispatch] expiring stale reservation pilot=${user.callsign} reservation=${activeReservation.id}`,
      );
      await closeReservation(activeReservation.id, "EXPIRED");
      continue;
    }

    if (
      !activeReservation.dispatch_token_hash ||
      !activeReservation.route_id ||
      !activeReservation.aircraft_id
    ) {
      console.warn(
        `[dispatch] cancelling corrupt reservation pilot=${user.callsign} reservation=${activeReservation.id}`,
      );
      await closeReservation(activeReservation.id, "CANCELLED");
      continue;
    }

    if (reservationMatchesSelection(activeReservation, selectedRoute, selectedAircraft)) {
      const refreshed = await rotateReservationToken(activeReservation.id);
      console.info(
        `[dispatch] reused temp reservation callsign=${user.callsign ?? "N/A"} id=${refreshed.row.id} expires=${refreshed.row.expires_at}`,
      );

      return buildReservationResult({
        row: refreshed.row,
        dispatchToken: refreshed.dispatchToken,
        ttlMinutes,
        operationRule,
        aircraft: selectedAircraft,
        route: selectedRoute,
        reusedExistingReservation: true,
      });
    }

    reservationError("ACTIVE_RESERVATION_EXISTS", {
      activeReservationId: activeReservation.id,
      status,
      routeId: activeReservation.route_id,
      aircraftId: activeReservation.aircraft_id,
      message: "Ya tienes una reserva activa para otra ruta. Cancelala o enviala a ACARS.",
    });
  }

  const aircraftBlocked = await findActiveAircraftReservationByOtherPilot(
    user.userId,
    selectedAircraft,
  );
  if (aircraftBlocked) {
    reservationError("AIRCRAFT_RESERVED_BY_OTHER", {
      activeReservationId: aircraftBlocked.id,
      pilotCallsign: aircraftBlocked.pilot_callsign,
      status: aircraftBlocked.status,
    });
  }

  const reservationId = randomUUID();
  const dispatchToken = createDispatchToken();
  const dispatchTokenHash = hashDispatchToken(dispatchToken);
  const tokenHint = dispatchToken.slice(0, 8);
  const simbriefOfp = input.simbriefOfp && typeof input.simbriefOfp === "object" ? input.simbriefOfp : null;
  const simbriefOfpId = normalizeText(simbriefOfp?.simbriefId ?? "");
  const simbriefGeneratedAt = normalizeText(simbriefOfp?.generatedAt ?? "");

  let row: TrainingReservationRow;
  try {
    row = await dbTransaction(async (client) => {
      const result = await client.query<TrainingReservationRow>(
      `
      insert into public.training_dispatch_reservations (
        id,
        pilot_user_id,
        pilot_callsign,
        aircraft_id,
        aircraft_registration,
        aircraft_model_code,
        origin_airport_id,
        destination_airport_id,
        route_id,
        origin_ident,
        destination_ident,
        alternate_ident,
        departure_time,
        flight_level,
        route_text,
        passenger_count,
        cargo_kg,
        fuel_kg,
        fuel_policy,
        operation_type,
        score_mode,
        status,
        affects_pilot_position,
        affects_aircraft_position,
        affects_economy,
        affects_ranking,
        dispatch_token_hash,
        dispatch_token_hint,
        simbrief_ofp_id,
        simbrief_generated_at,
        simbrief_ofp_json,
        expires_at
      ) values (
        $1::uuid,
        $2::uuid,
        $3,
        $4::uuid,
        $5,
        $6,
        $7::uuid,
        $8::uuid,
        $9::uuid,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21,
        'TEMP_RESERVED',
        $22,
        $23,
        $24,
        $25,
        $26,
        $27,
        $28,
        case when $29 = '' then null else $29::timestamptz end,
        $30::jsonb,
        now() + ($31::text || ' minutes')::interval
      ) returning
        id::text,
        pilot_user_id::text,
        pilot_callsign,
        aircraft_id::text,
        aircraft_registration,
        aircraft_model_code,
        route_id::text,
        route_code,
        origin_ident,
        destination_ident,
        operation_type,
        score_mode,
        status,
        dispatch_token_hash,
        dispatch_token_hint,
        expires_at::text,
        created_at::text,
        updated_at::text
        `,
      [
        reservationId,
        user.userId,
        user.callsign,
        selectedAircraft.id,
        selectedAircraft.registration,
        selectedAircraft.model_code,
        originAirport.id,
        destinationAirport.id,
        selectedRoute.id,
        originAirport.ident || originAirport.icao || originIdent,
        destinationAirport.ident || destinationAirport.icao || destinationIdent,
        normalizeIdent(input.alternateIdent),
        normalizeText(input.departureTime, "Ahora"),
        normalizeText(input.flightLevel, "FL070"),
        normalizeText(
          input.routeText,
          `${originIdent} DCT ${destinationIdent}`,
        ),
        isCargo ? 0 : toInteger(input.passengerCount, 0),
        toNumeric(input.cargoKg, 0),
        toNumeric(input.fuelKg, 0),
        normalizeText(input.fuelPolicy, "AUTO PW"),
        operationRule.code,
        operationRule.score_mode,
        operationRule.affects_pilot_position,
        operationRule.affects_aircraft_position,
        operationRule.affects_economy,
        operationRule.affects_ranking,
        dispatchTokenHash,
        tokenHint,
        simbriefOfpId || null,
        simbriefGeneratedAt,
        simbriefOfp ? JSON.stringify(simbriefOfp) : null,
        ttlMinutes,
      ],
    );

    return result.rows[0];
    });
  } catch (dbError) {
    console.error(`[dispatch] DB transaction failed pilot=${user.callsign}:`, dbError);
    throw new Error("TRAINING_RESERVATION_FAILED");
  }

  console.info(
    `[dispatch] temp reservation ok callsign=${user.callsign ?? "N/A"} id=${row.id} expires=${row.expires_at}`,
  );

  return buildReservationResult({
    row,
    dispatchToken,
    ttlMinutes,
    operationRule,
    aircraft: selectedAircraft,
    route: selectedRoute,
    reusedExistingReservation: false,
  });
}

type PrepareTrainingAcarsInput = {
  reservationId: string;
  dispatchToken?: string | null;
};

type TrainingDispatchRow = {
  id: string;
  pilot_user_id: string;
  pilot_callsign: string | null;
  aircraft_id: string | null;
  aircraft_registration: string | null;
  aircraft_model_code: string | null;
  route_id: string | null;
  route_code: string | null;
  origin_ident: string;
  destination_ident: string;
  origin_name: string | null;
  destination_name: string | null;
  alternate_ident: string | null;
  departure_time: string | null;
  flight_level: string | null;
  route_text: string | null;
  passenger_count: number | string | null;
  cargo_kg: number | string | null;
  fuel_kg: number | string | null;
  fuel_policy: string | null;
  operation_type: string;
  score_mode: string;
  status: string;
  dispatch_token_hash: string | null;
  dispatch_token_hint: string | null;
  simbrief_ofp_id: string | null;
  simbrief_generated_at: string | null;
  simbrief_ofp_json: unknown | null;
  affects_pilot_position: boolean;
  affects_aircraft_position: boolean;
  affects_economy: boolean;
  affects_ranking: boolean;
  expires_at: string;
  created_at: string;
  is_expired: boolean;
};

function assertUuid(value: string) {
  if (!UUID_PATTERN.test(value)) {
    throw new Error("RESERVATION_NOT_FOUND");
  }
}

function buildTrainingAcarsPayload(
  user: AuthenticatedPilot,
  row: TrainingDispatchRow,
  dispatchToken: string,
  economySnapshot: EconomySnapshot,
) {
  const isCargo = isCargoOperation(row.operation_type);
  const rawPax = toInteger(row.passenger_count, 0);
  const effectivePax = isCargo ? 0 : rawPax;
  const cargoKg = toNumeric(row.cargo_kg, 0);
  const fuelKg = toNumeric(row.fuel_kg, 0);
  const aircraftCode = normalizeText(row.aircraft_model_code, "UNKNOWN");

  const passengerManifest = buildPassengerManifest({
    passengerCount: effectivePax,
    baggageKg: effectivePax * 15,
    ticketRevenueUsd: isCargo ? 0 : economySnapshot.ticketRevenueUsd,
    passengerServiceCostUsd: 0,
  });

  const cargoManifest = buildCargoManifest({
    cargoKg,
    isCargo,
    cargoRevenueUsd: isCargo ? economySnapshot.cargoRevenueUsd : 0,
    cargoHandlingCostUsd: 0,
  });

  const aircraftPayload = buildAircraftPayload({
    aircraftCode,
    aircraftName: aircraftCode,
    passengerCount: effectivePax,
    cargoKg,
    fuelPlannedKg: fuelKg,
  });
  const simbriefRaw =
    row.simbrief_ofp_json && typeof row.simbrief_ofp_json === "object"
      ? (row.simbrief_ofp_json as Record<string, unknown>)
      : null;

  // Construir flight info desde route_code si existe
  const flightNumber = extractPwgFlightNumber(row.route_code) || "000";
  const callsign = buildPwgCallsign(flightNumber);

  return {
    payload_version: "pw3-dispatch-v1",
    generated_at: new Date().toISOString(),
    source: "WEB_NEON",
    reservation_id: row.id,
    dispatch_token: dispatchToken,
    operation_type: row.operation_type,
    score_mode: row.score_mode,
    is_cargo: isCargo,
    reservation_status: "ACARS_READY",
    expires_at: row.expires_at,
    flight: {
      airline_icao: "PWG",
      airline_iata: null,
      flight_number: flightNumber,
      callsign: callsign,
      route_code: row.route_code || callsign,
    },
    pilot: {
      user_id: user.userId,
      callsign: row.pilot_callsign ?? user.callsign,
      display_name: user.displayName,
      rank_code: user.rankCode,
      pilot_status: user.pilotStatus,
    },
    aircraft: {
      id: row.aircraft_id,
      registration: row.aircraft_registration,
      model_code: row.aircraft_model_code,
    },
    route: {
      origin_ident: row.origin_ident,
      origin_name: row.origin_name,
      destination_ident: row.destination_ident,
      destination_name: row.destination_name,
      alternate_ident: row.alternate_ident,
      route_text: normalizeText(
        row.route_text,
        `${row.origin_ident} DCT ${row.destination_ident}`,
      ),
      flight_level: normalizeText(row.flight_level, "FL070"),
      departure_time: normalizeText(row.departure_time, "Ahora"),
    },
    loading: {
      passenger_count: effectivePax,
      cargo_kg: cargoKg,
      fuel_kg: fuelKg,
      fuel_planned_kg: Number(simbriefRaw?.blockFuelKg ?? fuelKg),
      fuel_policy: normalizeText(row.fuel_policy, "AUTO PW"),
    },
    manifest: {
      passenger: passengerManifest,
      cargo: cargoManifest,
      aircraft_payload: aircraftPayload,
    },
    economy_snapshot: economySnapshot,
    simbrief: simbriefRaw
      ? {
          ofpId: normalizeText(simbriefRaw.simbriefId ?? row.simbrief_ofp_id),
          generatedAt: normalizeText(simbriefRaw.generatedAt ?? row.simbrief_generated_at),
          origin: normalizeText(simbriefRaw.origin ?? row.origin_ident),
          destination: normalizeText(simbriefRaw.destination ?? row.destination_ident),
          alternate: normalizeText(simbriefRaw.alternate),
          route: normalizeText(simbriefRaw.route ?? row.route_text),
          flightLevel: normalizeText(simbriefRaw.flightLevel ?? row.flight_level),
          cruiseAltitude: normalizeText(simbriefRaw.cruiseAltitude),
          blockFuelKg: Number(simbriefRaw.blockFuelKg ?? 0),
          tripFuelKg: Number(simbriefRaw.tripFuelKg ?? 0),
          payloadKg: Number(simbriefRaw.payloadKg ?? 0),
          passengerCount: Number(simbriefRaw.passengerCount ?? effectivePax),
          cargoKg: Number(simbriefRaw.cargoKg ?? cargoKg),
          rawSummary: {
            flightNumber: normalizeText(simbriefRaw.flightNumber),
            aircraftIcao: normalizeText(simbriefRaw.aircraftIcao),
          },
        }
      : null,
    rules: {
      affects_pilot_position: row.affects_pilot_position,
      affects_aircraft_position: row.affects_aircraft_position,
      affects_economy: row.affects_economy,
      affects_ranking: row.affects_ranking,
      official_score: !isReferenceOnlyOperation(row.operation_type, row.score_mode),
      reference_only: isReferenceOnlyOperation(row.operation_type, row.score_mode),
      movement_mode: row.affects_aircraft_position || row.affects_pilot_position ? "SERVER_CONTROLLED_MOVEMENT" : "NO_REAL_MOVEMENT",
      acars_role: "BLACKBOX_EVIDENCE_ONLY",
      server_evaluation: true,
    },
  };
}

export async function prepareTrainingReservationForAcars(
  user: AuthenticatedPilot,
  input: PrepareTrainingAcarsInput,
) {
  await ensureTrainingReservationSchema();
  await expireTrainingReservations();

  const reservationId = normalizeText(input.reservationId);
  const inputDispatchToken = normalizeText(input.dispatchToken);
  if (!reservationId) throw new Error("RESERVATION_REQUIRED");
  assertUuid(reservationId);

  const prepared = await dbTransaction(async (client) => {
    const result = await client.query<TrainingDispatchRow>(
      `
      select
        r.id::text,
        r.pilot_user_id::text,
        r.pilot_callsign,
        r.aircraft_id::text,
        r.aircraft_registration,
        r.aircraft_model_code,
        r.route_id::text,
        r.route_code,
        r.origin_ident,
        r.destination_ident,
        origin.name as origin_name,
        destination.name as destination_name,
        r.alternate_ident,
        r.departure_time,
        r.flight_level,
        r.route_text,
        r.passenger_count,
        r.cargo_kg,
        r.fuel_kg,
        r.fuel_policy,
        r.operation_type,
        r.score_mode,
        r.status,
        r.dispatch_token_hash,
        r.dispatch_token_hint,
        r.simbrief_ofp_id,
        r.simbrief_generated_at::text,
        r.simbrief_ofp_json,
        r.affects_pilot_position,
        r.affects_aircraft_position,
        r.affects_economy,
        r.affects_ranking,
        r.expires_at::text,
        r.created_at::text,
        (r.expires_at <= now()) as is_expired
      from public.training_dispatch_reservations r
      left join public.airports origin on origin.id = r.origin_airport_id
      left join public.airports destination on destination.id = r.destination_airport_id
      where r.id = $1::uuid
        and r.pilot_user_id = $2::uuid
      limit 1
    `,
      [reservationId, user.userId],
    );

    const row = result.rows[0];
    if (!row) throw new Error("RESERVATION_NOT_FOUND");

    const status = normalizeStatus(row.status);
    if (["CANCELLED", "EXPIRED", "FINALIZED"].includes(status))
      throw new Error("RESERVATION_EXPIRED");
    if (row.is_expired) {
      await client.query(
        `
        update public.training_dispatch_reservations
           set status = 'EXPIRED',
               acars_status = 'EXPIRED',
               updated_at = now()
          where id = $1::uuid
      `,
        [reservationId],
      );
      throw new Error("RESERVATION_EXPIRED");
    }

    let effectiveDispatchToken = inputDispatchToken;
    if (effectiveDispatchToken) {
      const dispatchTokenHash = hashDispatchToken(effectiveDispatchToken);
      if (row.dispatch_token_hash !== dispatchTokenHash)
        throw new Error("DISPATCH_TOKEN_INVALID");
    } else {
      effectiveDispatchToken = createDispatchToken();
      row.dispatch_token_hash = hashDispatchToken(effectiveDispatchToken);
      row.dispatch_token_hint = effectiveDispatchToken.slice(0, 8);
      await client.query(
        `update public.training_dispatch_reservations
            set dispatch_token_hash = $2,
                dispatch_token_hint = $3,
                updated_at = now()
          where id = $1::uuid`,
        [reservationId, row.dispatch_token_hash, row.dispatch_token_hint],
      );
    }

    const routeIdForEconomy = normalizeText(row.route_id ?? "");
    const aircraftCodeForEconomy = normalizeText(row.aircraft_model_code, "UNKNOWN");
    const economySnapshot = await resolveEconomySnapshot(
      routeIdForEconomy || null,
      aircraftCodeForEconomy,
      row.operation_type,
      row.affects_economy,
    );
    const acarsPayload = buildTrainingAcarsPayload(
      user,
      row,
      effectiveDispatchToken,
      economySnapshot,
    );

    if (status === "TEMP_RESERVED") {
      await client.query(
        `
        update public.training_dispatch_reservations
           set status = 'ACARS_READY',
               acars_status = 'READY',
               sent_to_acars_at = now(),
               acars_ready_at = now(),
               prepared_acars_payload = $2::jsonb,
               acars_payload_version = 'pw3-dispatch-v1',
               updated_at = now()
         where id = $1::uuid
      `,
        [reservationId, JSON.stringify(acarsPayload)],
      );
    } else if (status === "ACARS_READY") {
      await client.query(
        `
        update public.training_dispatch_reservations
           set sent_to_acars_at = coalesce(sent_to_acars_at, now()),
               acars_ready_at = coalesce(acars_ready_at, now()),
               acars_status = 'READY',
               prepared_acars_payload = $2::jsonb,
               acars_payload_version = 'pw3-dispatch-v1',
               updated_at = now()
          where id = $1::uuid
      `,
        [reservationId, JSON.stringify(acarsPayload)],
      );
    } else {
      throw new Error("RESERVATION_NOT_READY");
    }

    return {
      reservationId: row.id,
      dispatchToken: effectiveDispatchToken,
      payloadVersion: acarsPayload.payload_version,
      expiresAt: row.expires_at,
      acarsPayload,
    };
  });

  console.info(
    `[dispatch] acars payload ready callsign=${user.callsign ?? "N/A"} reservation=${reservationId}`,
  );

  return prepared;
}

type ClaimTrainingAcarsInput = {
  reservationId: string;
  dispatchToken: string;
  acarsVersion?: string | null;
  clientName?: string | null;
};

type TrainingClaimRow = {
  id: string;
  pilot_user_id: string;
  pilot_callsign: string | null;
  operation_type: string;
  score_mode: string;
  status: string;
  dispatch_token_hash: string;
  expires_at: string;
  is_expired: boolean;
  prepared_acars_payload: unknown | null;
  acars_claim_count: number | string | null;
};

function asPlainObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function claimTrainingReservationForAcars(
  input: ClaimTrainingAcarsInput,
) {
  await ensureTrainingReservationSchema();
  await expireTrainingReservations();

  const reservationId = normalizeText(input.reservationId);
  const dispatchToken = normalizeText(input.dispatchToken);
  if (!reservationId) throw new Error("RESERVATION_REQUIRED");
  if (!dispatchToken) throw new Error("DISPATCH_TOKEN_REQUIRED");
  assertUuid(reservationId);

  const dispatchTokenHash = hashDispatchToken(dispatchToken);
  const claimSource =
    normalizeText(input.clientName, "ACARS")
      .slice(0, 80)
      .replace(/[^A-Za-z0-9_. -]/g, "") || "ACARS";
  const version = normalizeText(input.acarsVersion, "unknown").slice(0, 40);

  const resultPayload = await dbTransaction(async (client) => {
    const result = await client.query<TrainingClaimRow>(
      `
      select
        id::text,
        pilot_user_id::text,
        pilot_callsign,
        operation_type,
        score_mode,
        status,
        dispatch_token_hash,
        expires_at::text,
        (expires_at <= now()) as is_expired,
        prepared_acars_payload,
        acars_claim_count
      from public.training_dispatch_reservations
      where id = $1::uuid
      limit 1
      for update
    `,
      [reservationId],
    );

    const row = result.rows[0];
    if (!row) throw new Error("RESERVATION_NOT_FOUND");
    if (row.dispatch_token_hash !== dispatchTokenHash)
      throw new Error("DISPATCH_TOKEN_INVALID");
    if (["CANCELLED", "EXPIRED"].includes(row.status))
      throw new Error("RESERVATION_EXPIRED");
    if (row.is_expired) {
      await client.query(
        `
        update public.training_dispatch_reservations
           set status = 'EXPIRED',
               acars_status = 'EXPIRED_BEFORE_CLAIM',
               updated_at = now()
         where id = $1::uuid
      `,
        [reservationId],
      );
      throw new Error("RESERVATION_EXPIRED");
    }
    if (row.status === "TEMP_RESERVED") throw new Error("ACARS_NOT_READY");
    if (!["ACARS_READY", "ACARS_CLAIMED"].includes(row.status))
      throw new Error("RESERVATION_NOT_READY");

    const preparedPayload = asPlainObject(row.prepared_acars_payload);
    if (!preparedPayload) throw new Error("ACARS_PAYLOAD_MISSING");

    const claimCount = Math.max(0, Number(row.acars_claim_count ?? 0));
    const responsePayload = {
      ...preparedPayload,
      reservation_status: "ACARS_CLAIMED",
      claimed_at: new Date().toISOString(),
      claim: {
        status: "ACARS_CLAIMED",
        claim_count: claimCount + 1,
        acars_version: version,
        source: claimSource,
      },
    };

    await client.query(
      `
      update public.training_dispatch_reservations
         set status = 'ACARS_CLAIMED',
             acars_status = 'CLAIMED',
             acars_claimed_at = coalesce(acars_claimed_at, now()),
             acars_claim_last_at = now(),
             acars_claim_count = coalesce(acars_claim_count, 0) + 1,
             acars_claim_source = $2,
             prepared_acars_payload = $3::jsonb,
             updated_at = now()
       where id = $1::uuid
    `,
      [
        reservationId,
        `${claimSource}/${version}`,
        JSON.stringify(responsePayload),
      ],
    );

    return responsePayload;
  });

  console.info(
    `[dispatch] acars dispatch claimed reservation=${reservationId}`,
  );

  return resultPayload;
}
