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

export function validateFinalizeToken(row: DispatchReservationRecord, dispatchToken?: string) {
  if (!row.dispatch_token_hash) return true;
  if (!dispatchToken) return false;
  return hashDispatchToken(dispatchToken) === row.dispatch_token_hash;
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
}

export async function updatePilotAndAircraftPosition(input: {
  pilotUserId: string;
  aircraftId?: string | null;
  landingIdent: string;
}) {
  const airport = await dbOne<{ id: string }>(
    `select id::text from public.airports
      where upper(coalesce(ident,icao,iata,'')) = upper($1)
      limit 1`,
    [input.landingIdent],
  );
  if (!airport?.id) return false;

  await dbTransaction(async (client) => {
    if (await columnExists("pilot_profiles", "current_airport_id")) {
      await client.query(
        `update public.pilot_profiles set current_airport_id = $2::uuid where id = $1::uuid`,
        [input.pilotUserId, airport.id],
      );
    }
    if (await columnExists("app_users", "current_airport_id")) {
      await client.query(
        `update public.app_users set current_airport_id = $2::uuid where id = $1::uuid`,
        [input.pilotUserId, airport.id],
      );
    }
    if (input.aircraftId && await columnExists("fleet_aircraft", "current_airport_id")) {
      await client.query(
        `update public.fleet_aircraft
            set current_airport_id = $2::uuid,
                updated_at = now()
          where id = $1::uuid`,
        [input.aircraftId, airport.id],
      );
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
