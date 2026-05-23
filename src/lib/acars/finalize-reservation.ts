import "server-only";
import { createHash } from "crypto";
import { columnExists, dbOne, dbQuery, dbTransaction } from "@/lib/db/client";

export type DispatchReservationRecord = {
  id: string;
  pilot_user_id: string;
  pilot_callsign: string | null;
  aircraft_id: string | null;
  aircraft_registration: string | null;
  aircraft_model_code: string | null;
  route_id: string | null;
  origin_ident: string;
  destination_ident: string;
  operation_type: string;
  score_mode: string;
  status: string;
  affects_economy: boolean;
  dispatch_token_hash: string | null;
  prepared_acars_payload: Record<string, unknown> | null;
  final_status: string | null;
  finalized_at: string | null;
};

function hashDispatchToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureAcarsFinalizeSchema() {
  await dbQuery(`
    create extension if not exists pgcrypto;
    alter table public.training_dispatch_reservations add column if not exists finalized_at timestamptz;
    alter table public.training_dispatch_reservations add column if not exists final_status text;
    alter table public.training_dispatch_reservations add column if not exists score numeric(6,2);
    alter table public.training_dispatch_reservations add column if not exists acars_finalize_payload jsonb;
    alter table public.training_dispatch_reservations add column if not exists acars_finalize_summary jsonb;
    alter table public.training_dispatch_reservations add column if not exists economy_real_payload jsonb;
    alter table public.training_dispatch_reservations add column if not exists pirep_payload jsonb;
    alter table public.training_dispatch_reservations add column if not exists actual_block_minutes integer;
    alter table public.training_dispatch_reservations add column if not exists actual_flight_minutes integer;
    alter table public.training_dispatch_reservations add column if not exists actual_fuel_used_kg numeric(12,2);
    alter table public.training_dispatch_reservations add column if not exists actual_landing_airport text;
    alter table public.training_dispatch_reservations add column if not exists finalize_idempotency_key text;
    alter table public.training_dispatch_reservations add column if not exists affects_aircraft_position boolean not null default true;
    alter table public.training_dispatch_reservations add column if not exists acars_state text;
    create unique index if not exists idx_training_finalize_idem on public.training_dispatch_reservations(finalize_idempotency_key) where finalize_idempotency_key is not null;

    create table if not exists public.pw3_flight_reports (
      id uuid primary key default gen_random_uuid(),
      reservation_id uuid not null unique,
      pilot_user_id uuid,
      pilot_callsign text,
      aircraft_code text,
      origin_ident text,
      destination_ident text,
      landing_ident text,
      operation_type text,
      flight_type text,
      final_status text,
      score numeric(6,2) not null default 0,
      block_time_minutes integer not null default 0,
      flight_time_minutes integer not null default 0,
      distance_nm numeric(10,2) not null default 0,
      pilot_accrual_usd numeric(14,2) not null default 0,
      net_profit_usd numeric(14,2) not null default 0,
      economy_payload jsonb not null default '{}'::jsonb,
      pirep_payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists idx_pw3_flight_reports_pilot on public.pw3_flight_reports(pilot_user_id, created_at desc);
    create index if not exists idx_pw3_flight_reports_callsign on public.pw3_flight_reports(lower(pilot_callsign), created_at desc);

    create table if not exists public.acars_evaluations (
      id uuid primary key default gen_random_uuid(),
      reservation_id uuid not null unique,
      pilot_user_id uuid null,
      pilot_callsign text null,
      evaluation_status text not null default 'PENDING_EVALUATION',
      economy_status text not null default 'PENDING_EVALUATION',
      operational_score numeric(6,2) not null default 0,
      procedure_score numeric(6,2) not null default 0,
      performance_score numeric(6,2) not null default 0,
      safety_score numeric(6,2) not null default 0,
      economy_score numeric(6,2) not null default 0,
      total_score numeric(6,2) not null default 0,
      observations jsonb not null default '[]'::jsonb,
      penalties_count integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.acars_evaluation_penalties (
      id uuid primary key default gen_random_uuid(),
      reservation_id uuid not null,
      code text not null,
      severity text not null,
      points numeric(6,2) not null default 0,
      message text not null default '',
      created_at timestamptz not null default now()
    );
    create index if not exists idx_acars_eval_penalties_reservation on public.acars_evaluation_penalties(reservation_id);

    create table if not exists public.acars_evaluation_evidence (
      id uuid primary key default gen_random_uuid(),
      reservation_id uuid not null unique,
      evidence jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

export async function getDispatchReservationById(reservationId: string) {
  return dbOne<DispatchReservationRecord>(
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
      affects_economy,
      dispatch_token_hash,
      prepared_acars_payload,
      final_status,
      finalized_at::text
    from public.training_dispatch_reservations
    where id = $1::uuid
    limit 1`,
    [reservationId],
  );
}

export async function findActiveReservationForReport(input: {
  pilotCallsign: string;
  reservationId?: string | null;
  dispatchToken?: string | null;
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  aircraftCode?: string | null;
}) {
  const pilotCallsign = String(input.pilotCallsign ?? "").trim().toUpperCase();
  if (!pilotCallsign) return null;

  const reservationId = String(input.reservationId ?? "").trim();
  if (reservationId) {
    const byId = await getDispatchReservationById(reservationId);
    if (byId && String(byId.pilot_callsign ?? "").trim().toUpperCase() === pilotCallsign) return byId;
  }

  const dispatchToken = String(input.dispatchToken ?? "").trim();
  if (dispatchToken) {
    const byToken = await dbOne<DispatchReservationRecord>(
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
        affects_economy,
        dispatch_token_hash,
        prepared_acars_payload,
        final_status,
        finalized_at::text
      from public.training_dispatch_reservations
      where dispatch_token_hash = $1
        and upper(coalesce(pilot_callsign, '')) = $2
        and upper(coalesce(status, '')) in ('ACARS_CLAIMED','STARTED','IN_FLIGHT','ACARS_STARTED','REPORT_PENDING','ACARS_READY','REPORT_RECEIVED','PENDING_EVALUATION')
      order by coalesce(updated_at, created_at) desc
      limit 1`,
      [hashDispatchToken(dispatchToken), pilotCallsign],
    );
    if (byToken) return byToken;
  }

  const flightNumber = String(input.flightNumber ?? "").trim().toUpperCase();
  const origin = String(input.origin ?? "").trim().toUpperCase();
  const destination = String(input.destination ?? "").trim().toUpperCase();
  const aircraftCode = String(input.aircraftCode ?? "").trim().toUpperCase();

  const byPilotAndFlight = await dbOne<DispatchReservationRecord>(
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
      affects_economy,
      dispatch_token_hash,
      prepared_acars_payload,
      final_status,
      finalized_at::text
    from public.training_dispatch_reservations
    where upper(coalesce(pilot_callsign, '')) = $1
      and upper(coalesce(status, '')) in ('ACARS_CLAIMED','STARTED','IN_FLIGHT','ACARS_STARTED','REPORT_PENDING','ACARS_READY','REPORT_RECEIVED','PENDING_EVALUATION')
      and ($2 = '' or upper(coalesce(assigned_callsign,'')) = $2 or upper(coalesce(route_code,'')) = $2)
      and ($3 = '' or upper(coalesce(origin_ident,'')) = $3)
      and ($4 = '' or upper(coalesce(destination_ident,'')) = $4)
      and ($5 = '' or upper(coalesce(aircraft_model_code,'')) = $5)
    order by coalesce(updated_at, created_at) desc
    limit 1`,
    [pilotCallsign, flightNumber, origin, destination, aircraftCode],
  );
  if (byPilotAndFlight) return byPilotAndFlight;

  return dbOne<DispatchReservationRecord>(
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
      affects_economy,
      dispatch_token_hash,
      prepared_acars_payload,
      final_status,
      finalized_at::text
    from public.training_dispatch_reservations
    where upper(coalesce(pilot_callsign, '')) = $1
      and upper(coalesce(status, '')) in ('ACARS_CLAIMED','STARTED','IN_FLIGHT','ACARS_STARTED','REPORT_PENDING','ACARS_READY','REPORT_RECEIVED','PENDING_EVALUATION')
    order by coalesce(updated_at, created_at) desc
    limit 1`,
    [pilotCallsign],
  );
}

/**
 * Lookup dispatch reservation by pilot callsign + multiple identifiers for finalize.
 * Used when reservationId is present but not found — fallback via token or pilot+aircraft.
 */
export async function findDispatchForFinalize(input: {
  pilotCallsign: string;
  reservationId?: string | null;
  dispatchToken?: string | null;
  aircraftCode?: string | null;
  aircraftRegistration?: string | null;
  origin?: string | null;
  destination?: string | null;
  flightNumber?: string | null;
}) {
  const pilotCallsign = String(input.pilotCallsign ?? '').trim().toUpperCase();
  if (!pilotCallsign) return null;

  // 1. By reservationId (already tried upstream, but try again here for completeness)
  if (input.reservationId) {
    const byId = await getDispatchReservationById(input.reservationId);
    if (byId && String(byId.pilot_callsign ?? '').trim().toUpperCase() === pilotCallsign) return byId;
  }

  // 2. By dispatchToken hash
  if (input.dispatchToken) {
    const byToken = await dbOne<DispatchReservationRecord>(
      `select
        id::text, pilot_user_id::text, pilot_callsign, aircraft_id::text, aircraft_registration,
        aircraft_model_code, route_id::text, origin_ident, destination_ident, operation_type,
        score_mode, status, affects_economy, dispatch_token_hash, prepared_acars_payload,
        final_status, finalized_at::text
      from public.training_dispatch_reservations
      where dispatch_token_hash = $1
        and upper(coalesce(pilot_callsign, '')) = $2
      order by coalesce(updated_at, created_at) desc limit 1`,
      [hashDispatchToken(input.dispatchToken), pilotCallsign],
    );
    if (byToken) return byToken;
  }

  // 3. By pilot + aircraft registration (most reliable for ACARS closeout)
  if (input.aircraftRegistration) {
    const byReg = await dbOne<DispatchReservationRecord>(
      `select
        id::text, pilot_user_id::text, pilot_callsign, aircraft_id::text, aircraft_registration,
        aircraft_model_code, route_id::text, origin_ident, destination_ident, operation_type,
        score_mode, status, affects_economy, dispatch_token_hash, prepared_acars_payload,
        final_status, finalized_at::text
      from public.training_dispatch_reservations
      where upper(coalesce(pilot_callsign, '')) = $1
        and upper(coalesce(aircraft_registration, '')) = upper($2)
        and upper(coalesce(status, '')) not in ('CANCELLED', 'EXPIRED', 'TEMP_RESERVED')
      order by coalesce(updated_at, created_at) desc limit 1`,
      [pilotCallsign, input.aircraftRegistration],
    );
    if (byReg) return byReg;
  }

  // 4. By pilot + aircraft model + origin + destination
  const ac = String(input.aircraftCode ?? '').trim().toUpperCase();
  const orig = String(input.origin ?? '').trim().toUpperCase();
  const dest = String(input.destination ?? '').trim().toUpperCase();
  if (ac || orig || dest) {
    const byFlight = await dbOne<DispatchReservationRecord>(
      `select
        id::text, pilot_user_id::text, pilot_callsign, aircraft_id::text, aircraft_registration,
        aircraft_model_code, route_id::text, origin_ident, destination_ident, operation_type,
        score_mode, status, affects_economy, dispatch_token_hash, prepared_acars_payload,
        final_status, finalized_at::text
      from public.training_dispatch_reservations
      where upper(coalesce(pilot_callsign, '')) = $1
        and ($2 = '' or upper(coalesce(aircraft_model_code, '')) = $2)
        and ($3 = '' or upper(coalesce(origin_ident, '')) = $3)
        and ($4 = '' or upper(coalesce(destination_ident, '')) = $4)
        and upper(coalesce(status, '')) not in ('CANCELLED', 'EXPIRED', 'TEMP_RESERVED')
      order by coalesce(updated_at, created_at) desc limit 1`,
      [pilotCallsign, ac, orig, dest],
    );
    if (byFlight) return byFlight;
  }

  // 5. Last resort: most recent non-expired non-cancelled dispatch for this pilot
  return dbOne<DispatchReservationRecord>(
    `select
      id::text, pilot_user_id::text, pilot_callsign, aircraft_id::text, aircraft_registration,
      aircraft_model_code, route_id::text, origin_ident, destination_ident, operation_type,
      score_mode, status, affects_economy, dispatch_token_hash, prepared_acars_payload,
      final_status, finalized_at::text
    from public.training_dispatch_reservations
    where upper(coalesce(pilot_callsign, '')) = $1
      and upper(coalesce(status, '')) not in ('CANCELLED', 'EXPIRED', 'TEMP_RESERVED')
    order by coalesce(updated_at, created_at) desc limit 1`,
    [pilotCallsign],
  );
}

export function validateFinalizeToken(row: DispatchReservationRecord, dispatchToken?: string | null) {
  // Sin hash en DB → sin restricción de token
  if (!row.dispatch_token_hash) return true;
  // Token presente en payload → verificar
  if (dispatchToken) return hashDispatchToken(dispatchToken) === row.dispatch_token_hash;
  // Token no enviado por ACARS pero el dispatch tiene hash → permitir si fue fallback lookup
  // (la propiedad del piloto ya fue verificada antes de llamar a validateFinalizeToken)
  return true;
}

export function isAlreadyFinalized(row: DispatchReservationRecord) {
  const finalStatuses = new Set(["FINALIZED", "EVALUATED", "COMPLETED"]);
  return Boolean(row.finalized_at || row.final_status || finalStatuses.has(String(row.status || "").toUpperCase()));
}

export async function acquireFinalizeLock(reservationId: string, finalizeIdempotencyKey: string) {
  const row = await dbOne<{ id: string }>(
    `update public.training_dispatch_reservations
        set finalize_idempotency_key = $2,
            updated_at = now()
      where id = $1::uuid
        and finalize_idempotency_key is null
      returning id::text`,
    [reservationId, finalizeIdempotencyKey],
  );
  return Boolean(row?.id);
}

export async function closeDispatchReservation(input: {
  reservationId: string;
  finalStatus: string;
  score: number;
  finalizeIdempotencyKey: string;
  payload: Record<string, unknown>;
  summary: Record<string, unknown>;
  economyPayload: Record<string, unknown>;
  pirepPayload: Record<string, unknown>;
  actualBlockMinutes: number;
  actualFlightMinutes: number;
  actualFuelUsedKg: number;
  actualLandingAirport: string | null;
}) {
  await dbQuery(
    `update public.training_dispatch_reservations
       set status = 'FINALIZED',
           acars_status = 'FINALIZED',
           acars_state = 'COMPLETED',
           affects_aircraft_position = true,
           finalized_at = now(),
           final_status = $2,
           score = $3,
           finalize_idempotency_key = $4,
           acars_finalize_payload = $5::jsonb,
           acars_finalize_summary = $6::jsonb,
           economy_real_payload = $7::jsonb,
           pirep_payload = $8::jsonb,
           actual_block_minutes = $9,
           actual_flight_minutes = $10,
           actual_fuel_used_kg = $11,
           actual_landing_airport = $12,
           updated_at = now()
     where id = $1::uuid`,
    [
      input.reservationId,
      input.finalStatus,
      input.score,
      input.finalizeIdempotencyKey,
      JSON.stringify(input.payload),
      JSON.stringify(input.summary),
      JSON.stringify(input.economyPayload),
      JSON.stringify(input.pirepPayload),
      input.actualBlockMinutes,
      input.actualFlightMinutes,
      input.actualFuelUsedKg,
      input.actualLandingAirport,
    ],
  );

  const landingIdent = String(input.actualLandingAirport ?? "").trim().toUpperCase();
  if (!landingIdent) return;

  const reservation = await getDispatchReservationById(input.reservationId);
  if (!reservation) return;

  await updatePilotAndAircraftPosition({
    pilotUserId: reservation.pilot_user_id,
    pilotCallsign: reservation.pilot_callsign,
    aircraftId: reservation.aircraft_id,
    aircraftRegistration: reservation.aircraft_registration,
    landingIdent,
  });
}

export async function updatePilotAndAircraftPosition(input: {
  pilotUserId?: string | null;
  pilotCallsign?: string | null;
  aircraftId?: string | null;
  aircraftRegistration?: string | null;
  landingIdent: string;
}) {
  const landingIdent = String(input.landingIdent ?? "").trim().toUpperCase();
  if (!landingIdent) return false;

  const airport = await dbOne<{ id: string }>(
    `select id::text
       from public.airports
      where upper(coalesce(ident, icao, iata, '')) = upper($1)
         or upper(coalesce(icao, ident, iata, '')) = upper($1)
      limit 1`,
    [landingIdent],
  );
  if (!airport?.id) return false;

  const pilotUserId = String(input.pilotUserId ?? "").trim();
  const pilotCallsign = String(input.pilotCallsign ?? "").trim().toUpperCase();
  const aircraftId = String(input.aircraftId ?? "").trim();
  const aircraftRegistration = String(input.aircraftRegistration ?? "").trim().toUpperCase();

  await dbTransaction(async (client) => {
    if (await columnExists("pilot_profiles", "current_airport_id")) {
      if (pilotUserId) {
        await client.query(
          `update public.pilot_profiles
              set current_airport_id = $2::uuid
            where id = $1::uuid`,
          [pilotUserId, airport.id],
        );
      }

      if (pilotCallsign && await columnExists("pilot_profiles", "callsign")) {
        await client.query(
          `update public.pilot_profiles
              set current_airport_id = $2::uuid
            where upper(callsign::text) = $1`,
          [pilotCallsign, airport.id],
        );
      }
    }

    if (await columnExists("app_users", "current_airport_id")) {
      if (pilotUserId) {
        await client.query(
          `update public.app_users
              set current_airport_id = $2::uuid
            where id = $1::uuid`,
          [pilotUserId, airport.id],
        );
      }

      if (pilotCallsign && await columnExists("app_users", "callsign")) {
        await client.query(
          `update public.app_users
              set current_airport_id = $2::uuid
            where upper(callsign::text) = $1`,
          [pilotCallsign, airport.id],
        );
      }
    }

    if (await columnExists("fleet_aircraft", "current_airport_id")) {
      if (aircraftId) {
        await client.query(
          `update public.fleet_aircraft
              set current_airport_id = $2::uuid,
                  updated_at = now()
            where id = $1::uuid`,
          [aircraftId, airport.id],
        );
      }

      if (aircraftRegistration && await columnExists("fleet_aircraft", "registration")) {
        await client.query(
          `update public.fleet_aircraft
              set current_airport_id = $2::uuid,
                  updated_at = now()
            where upper(registration::text) = $1`,
          [aircraftRegistration, airport.id],
        );
      }

      if (await columnExists("fleet_aircraft", "aircraft_status")) {
        if (aircraftId) {
          await client.query(
            `update public.fleet_aircraft
                set aircraft_status = 'AVAILABLE',
                    updated_at = now()
              where id = $1::uuid`,
            [aircraftId],
          );
        }

        if (aircraftRegistration && await columnExists("fleet_aircraft", "registration")) {
          await client.query(
            `update public.fleet_aircraft
                set aircraft_status = 'AVAILABLE',
                    updated_at = now()
              where upper(registration::text) = $1`,
            [aircraftRegistration],
          );
        }
      }
    }
  });

  return true;
}

export async function upsertFlightReport(input: {
  reservationId: string;
  pilotUserId: string;
  pilotCallsign: string;
  aircraftCode: string;
  origin: string;
  destination: string;
  landing: string;
  operationType: string;
  flightType: string;
  finalStatus: string;
  score: number;
  blockMinutes: number;
  flightMinutes: number;
  distanceNm: number;
  pilotAccrualUsd: number;
  netProfitUsd: number;
  economyPayload: Record<string, unknown>;
  pirepPayload: Record<string, unknown>;
}) {
  await dbQuery(
    `insert into public.pw3_flight_reports (
      reservation_id, pilot_user_id, pilot_callsign, aircraft_code,
      origin_ident, destination_ident, landing_ident, operation_type, flight_type,
      final_status, score, block_time_minutes, flight_time_minutes, distance_nm,
      pilot_accrual_usd, net_profit_usd, economy_payload, pirep_payload
    ) values (
      $1::uuid, $2::uuid, $3, $4,
      $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14,
      $15, $16, $17::jsonb, $18::jsonb
    ) on conflict (reservation_id) do update set
      final_status = excluded.final_status,
      score = excluded.score,
      landing_ident = excluded.landing_ident,
      block_time_minutes = excluded.block_time_minutes,
      flight_time_minutes = excluded.flight_time_minutes,
      distance_nm = excluded.distance_nm,
      pilot_accrual_usd = excluded.pilot_accrual_usd,
      net_profit_usd = excluded.net_profit_usd,
      economy_payload = excluded.economy_payload,
      pirep_payload = excluded.pirep_payload,
      updated_at = now()`,
    [
      input.reservationId,
      input.pilotUserId,
      input.pilotCallsign,
      input.aircraftCode,
      input.origin,
      input.destination,
      input.landing,
      input.operationType,
      input.flightType,
      input.finalStatus,
      input.score,
      input.blockMinutes,
      input.flightMinutes,
      input.distanceNm,
      input.pilotAccrualUsd,
      input.netProfitUsd,
      JSON.stringify(input.economyPayload),
      JSON.stringify(input.pirepPayload),
    ],
  );
}

export async function upsertAcarsEvaluation(input: {
  reservationId: string;
  pilotUserId?: string | null;
  pilotCallsign?: string | null;
  evaluationStatus: string;
  economyStatus: string;
  operationalScore: number;
  procedureScore: number;
  performanceScore: number;
  safetyScore: number;
  economyScore: number;
  totalScore: number;
  observations: string[];
  penalties: Array<{ code: string; severity: string; points: number; message: string }>;
  evidence: Record<string, unknown>;
}) {
  await dbQuery(
    `insert into public.acars_evaluations (
      reservation_id, pilot_user_id, pilot_callsign,
      evaluation_status, economy_status,
      operational_score, procedure_score, performance_score, safety_score, economy_score, total_score,
      observations, penalties_count
    ) values (
      $1::uuid, $2::uuid, $3,
      $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12::jsonb, $13
    ) on conflict (reservation_id) do update set
      pilot_user_id = excluded.pilot_user_id,
      pilot_callsign = excluded.pilot_callsign,
      evaluation_status = excluded.evaluation_status,
      economy_status = excluded.economy_status,
      operational_score = excluded.operational_score,
      procedure_score = excluded.procedure_score,
      performance_score = excluded.performance_score,
      safety_score = excluded.safety_score,
      economy_score = excluded.economy_score,
      total_score = excluded.total_score,
      observations = excluded.observations,
      penalties_count = excluded.penalties_count,
      updated_at = now()`,
    [
      input.reservationId,
      input.pilotUserId ?? null,
      input.pilotCallsign ?? null,
      input.evaluationStatus,
      input.economyStatus,
      input.operationalScore,
      input.procedureScore,
      input.performanceScore,
      input.safetyScore,
      input.economyScore,
      input.totalScore,
      JSON.stringify(input.observations ?? []),
      input.penalties?.length ?? 0,
    ],
  );

  await dbQuery("delete from public.acars_evaluation_penalties where reservation_id = $1::uuid", [input.reservationId]);
  for (const p of input.penalties ?? []) {
    await dbQuery(
      `insert into public.acars_evaluation_penalties (reservation_id, code, severity, points, message)
       values ($1::uuid, $2, $3, $4, $5)`,
      [input.reservationId, p.code, p.severity, p.points, p.message],
    );
  }

  await dbQuery(
    `insert into public.acars_evaluation_evidence (reservation_id, evidence)
     values ($1::uuid, $2::jsonb)
     on conflict (reservation_id) do update set evidence = excluded.evidence, updated_at = now()`,
    [input.reservationId, JSON.stringify(input.evidence ?? {})],
  );
}
