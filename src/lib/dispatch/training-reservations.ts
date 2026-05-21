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

const FALLBACK_DISPATCH_TTL_MINUTES = 15;

type CreateTrainingReservationInput = {
  operationType?: string | null;
  routeId?: string | null;
  aircraftId?: string | null;
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
  pilot_callsign: string | null;
  aircraft_registration: string | null;
  aircraft_model_code: string | null;
  origin_ident: string;
  destination_ident: string;
  operation_type: string;
  score_mode: string;
  status: string;
  dispatch_token_hint: string | null;
  expires_at: string;
  created_at: string;
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
     where status = 'TEMP_RESERVED'
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
  const aircraftId = normalizeText(input.aircraftId);
  const routeId = normalizeText(input.routeId);

  console.info(`[dispatch] createTrainingFreeReservation callsign=${user.callsign} origin=${originIdent} dest=${destinationIdent} aircraft=${aircraftId} route=${routeId}`);

  if (!originIdent) throw new Error("ORIGIN_REQUIRED");
  if (!destinationIdent) throw new Error("DESTINATION_REQUIRED");
  if (!aircraftId) throw new Error("AIRCRAFT_REQUIRED");

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

  const selectedAircraft = availableAircraft.find((aircraft) => {
    return (
      aircraft.id === aircraftId ||
      aircraft.registration === aircraftId ||
      `${aircraft.model_code}-${aircraft.registration}` === aircraftId
    );
  });

  console.info(`[dispatch] selectedAircraft=${selectedAircraft?.id || 'NOT_FOUND'} registration=${selectedAircraft?.registration || 'N/A'}`);

  if (!selectedAircraft) throw new Error("AIRCRAFT_NOT_ALLOWED_FOR_PILOT");

  const activeReservation = await dbOne<{ id: string; status: string }>(
    `select id::text, status
       from public.training_dispatch_reservations
      where pilot_user_id = $1::uuid
        and (
          status in ('ACARS_CLAIMED','RESERVED','DISPATCHED','IN_FLIGHT','LANDED','PENDING_EVALUATION','EVALUATED')
          or (status in ('TEMP_RESERVED','ACARS_READY') and expires_at > now())
        )
      order by updated_at desc nulls last, created_at desc nulls last
      limit 1`,
    [user.userId],
  );

  if (activeReservation) {
    console.warn(`[dispatch] ACTIVE_RESERVATION_EXISTS pilot=${user.callsign} reservation=${activeReservation.id} status=${activeReservation.status}`);
    throw new Error("ACTIVE_RESERVATION_EXISTS");
  }

  const reservationId = randomUUID();
  const dispatchToken = createDispatchToken();
  const dispatchTokenHash = hashDispatchToken(dispatchToken);
  const tokenHint = dispatchToken.slice(0, 8);

  let row: TrainingReservationRow;
  try {
    row = await dbTransaction(async (client) => {
      await client.query(
        `
        update public.training_dispatch_reservations
           set status = 'CANCELLED', updated_at = now()
         where pilot_user_id = $1::uuid
           and status = 'TEMP_RESERVED'
           and expires_at > now()
      `,
        [user.userId],
      );

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
        nullif($9, '')::uuid,
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
        now() + ($28::text || ' minutes')::interval
      ) returning
        id::text,
        pilot_callsign,
        aircraft_registration,
        aircraft_model_code,
        origin_ident,
        destination_ident,
        operation_type,
        score_mode,
        status,
        dispatch_token_hint,
        expires_at::text,
        created_at::text
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
        routeId,
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

  return {
    ...row,
    dispatch_token: dispatchToken,
    ttl_minutes: ttlMinutes,
    rules: {
      operation_type: operationRule.code,
      score_mode: operationRule.score_mode,
      affects_pilot_position: operationRule.affects_pilot_position,
      affects_aircraft_position: operationRule.affects_aircraft_position,
      affects_economy: operationRule.affects_economy,
      affects_ranking: operationRule.affects_ranking,
    },
  };
}

type PrepareTrainingAcarsInput = {
  reservationId: string;
  dispatchToken: string;
};

type TrainingDispatchRow = {
  id: string;
  pilot_user_id: string;
  pilot_callsign: string | null;
  aircraft_id: string | null;
  aircraft_registration: string | null;
  aircraft_model_code: string | null;
  route_id: string | null;
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
  dispatch_token_hash: string;
  dispatch_token_hint: string | null;
  affects_pilot_position: boolean;
  affects_aircraft_position: boolean;
  affects_economy: boolean;
  affects_ranking: boolean;
  expires_at: string;
  created_at: string;
  is_expired: boolean;
};

function assertUuid(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
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
      fuel_policy: normalizeText(row.fuel_policy, "AUTO PW"),
    },
    manifest: {
      passenger: passengerManifest,
      cargo: cargoManifest,
      aircraft_payload: aircraftPayload,
    },
    economy_snapshot: economySnapshot,
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
  const dispatchToken = normalizeText(input.dispatchToken);
  if (!reservationId) throw new Error("RESERVATION_REQUIRED");
  if (!dispatchToken) throw new Error("DISPATCH_TOKEN_REQUIRED");
  assertUuid(reservationId);

  const dispatchTokenHash = hashDispatchToken(dispatchToken);

  const payload = await dbTransaction(async (client) => {
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
    if (row.dispatch_token_hash !== dispatchTokenHash)
      throw new Error("DISPATCH_TOKEN_INVALID");
    if (["CANCELLED", "EXPIRED"].includes(row.status))
      throw new Error("RESERVATION_EXPIRED");
    if (row.is_expired) {
      await client.query(
        `
        update public.training_dispatch_reservations
           set status = 'EXPIRED', updated_at = now()
         where id = $1::uuid
      `,
        [reservationId],
      );
      throw new Error("RESERVATION_EXPIRED");
    }

    const routeIdForEconomy = normalizeText(row.route_id ?? "");
    const aircraftCodeForEconomy = normalizeText(row.aircraft_model_code, "UNKNOWN");
    const economySnapshot = await resolveEconomySnapshot(
      routeIdForEconomy || null,
      aircraftCodeForEconomy,
      row.operation_type,
      row.affects_economy,
    );
    const acarsPayload = buildTrainingAcarsPayload(user, row, dispatchToken, economySnapshot);

    if (row.status === "TEMP_RESERVED") {
      await client.query(
        `
        update public.training_dispatch_reservations
           set status = 'ACARS_READY',
               sent_to_acars_at = now(),
               acars_ready_at = now(),
               prepared_acars_payload = $2::jsonb,
               acars_payload_version = 'pw3-dispatch-v1',
               updated_at = now()
         where id = $1::uuid
      `,
        [reservationId, JSON.stringify(acarsPayload)],
      );
    } else if (row.status === "ACARS_READY") {
      await client.query(
        `
        update public.training_dispatch_reservations
           set prepared_acars_payload = coalesce(prepared_acars_payload, $2::jsonb),
               updated_at = now()
         where id = $1::uuid
      `,
        [reservationId, JSON.stringify(acarsPayload)],
      );
    } else {
      throw new Error("RESERVATION_NOT_READY");
    }

    return acarsPayload;
  });

  console.info(
    `[dispatch] acars payload ready callsign=${user.callsign ?? "N/A"} reservation=${reservationId}`,
  );

  return payload;
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
