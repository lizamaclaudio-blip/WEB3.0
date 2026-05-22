import "server-only";
import { createHash } from "node:crypto";
import { dbTransaction } from "@/lib/db/client";

type ClaimDirectDispatchInput = {
  reservationId?: string | null;
  dispatchToken?: string | null;
  pilotCallsign?: string | null;
  acarsVersion?: string | null;
  clientName?: string | null;
};

type DirectDispatchRow = {
  id: string;
  pilot_callsign: string | null;
  operation_type: string | null;
  score_mode: string | null;
  status: string | null;
  acars_state: string | null;
  payload_version: string | null;
  route_code: string | null;
  assigned_flight_number: string | null;
  assigned_callsign: string | null;
  airline_icao: string | null;
  aircraft_model_code: string | null;
  aircraft_registration: string | null;
  origin_ident: string | null;
  destination_ident: string | null;
  route_text: string | null;
  dispatch_token_hash: string | null;
  dispatch_payload: Record<string, unknown> | null;
  acars_payload: Record<string, unknown> | null;
  prepared_acars_payload: Record<string, unknown> | null;
  flight_payload: Record<string, unknown> | null;
  simbrief_ofp_json: Record<string, unknown> | null;
  acars_claim_count: number | string | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function upper(value: unknown) {
  return clean(value).toUpperCase();
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function nonEmptyObject(value: unknown): Record<string, unknown> | null {
  const object = asObject(value);
  return Object.keys(object).length > 0 ? object : null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function hashDispatchToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function pickPayload(row: DirectDispatchRow) {
  return nonEmptyObject(row.dispatch_payload)
    ?? nonEmptyObject(row.acars_payload)
    ?? nonEmptyObject(row.prepared_acars_payload)
    ?? {};
}

function normalizeFlightRouteCode(routeCode: string, callsign: string) {
  if (/^PWG\d{3,4}$/i.test(routeCode)) return routeCode.toUpperCase();
  if (/^PWG\d{3,4}$/i.test(callsign)) return callsign.toUpperCase();
  return routeCode || callsign;
}

function buildClaimPayload(row: DirectDispatchRow, inputDispatchToken: string, claimCount: number, acarsVersion: string, clientName: string) {
  const base = pickPayload(row);
  const baseFlight = asObject(base.flight);
  const baseRoute = asObject(base.route);
  const baseAircraft = asObject(base.aircraft);
  const baseSimbrief = asObject(base.simbrief);
  const baseLoading = asObject(base.loading);
  const baseSchedule = asObject(base.schedule);
  const economySnapshot = asObject(base.economySnapshot ?? base.economy_snapshot);
  const flightPayload = asObject(row.flight_payload);
  const flightPayloadFlight = asObject(flightPayload.flight);
  const dispatchToken = firstText(inputDispatchToken, base.dispatchToken, base.dispatch_token);
  const payloadVersion = firstText(base.payloadVersion, base.payload_version, row.payload_version, "pw3-dispatch-v1");
  const airlineIcao = firstText(baseFlight.airlineIcao, baseFlight.airline_icao, row.airline_icao, "PWG");
  const flightNumber = firstText(baseFlight.flightNumber, baseFlight.flight_number, flightPayloadFlight.flightNumber, row.assigned_flight_number);
  const callsign = firstText(baseFlight.callsign, row.assigned_callsign, flightNumber ? `${airlineIcao}${flightNumber}` : "");
  const routeCode = normalizeFlightRouteCode(firstText(baseFlight.routeCode, baseFlight.route_code, row.route_code, callsign), callsign);

  const flight: Record<string, unknown> = {
    airlineIcao,
    airline_icao: airlineIcao,
    flightNumber,
    flight_number: flightNumber,
    callsign,
    routeCode,
    route_code: routeCode,
  };

  const route: Record<string, unknown> = {
    ...baseRoute,
    routeId: firstText(baseRoute.routeId, baseRoute.route_id),
    route_id: firstText(baseRoute.route_id, baseRoute.routeId),
    routeCode: firstText(baseRoute.routeCode, baseRoute.route_code, routeCode),
    route_code: firstText(baseRoute.route_code, baseRoute.routeCode, routeCode),
    origin: firstText(baseRoute.origin, baseRoute.origin_ident, row.origin_ident),
    destination: firstText(baseRoute.destination, baseRoute.destination_ident, row.destination_ident),
    origin_ident: firstText(baseRoute.origin_ident, baseRoute.origin, row.origin_ident),
    destination_ident: firstText(baseRoute.destination_ident, baseRoute.destination, row.destination_ident),
    route_text: firstText(baseRoute.route_text, baseSimbrief.route, row.route_text),
  };

  const aircraftCode = firstText(baseAircraft.aircraftCode, baseAircraft.model_code, row.aircraft_model_code);
  const aircraft: Record<string, unknown> = {
    ...baseAircraft,
    aircraftCode,
    model_code: firstText(baseAircraft.model_code, baseAircraft.aircraftCode, aircraftCode),
    registration: firstText(baseAircraft.registration, row.aircraft_registration),
  };

  const simbrief: Record<string, unknown> = {
    ...baseSimbrief,
    route: firstText(baseSimbrief.route, route.route_text),
  };

  const loading: Record<string, unknown> = {
    ...baseLoading,
    passengerCount: baseLoading.passengerCount ?? baseLoading.passenger_count ?? simbrief.passengerCount ?? simbrief.passenger_count ?? 0,
    passenger_count: baseLoading.passenger_count ?? baseLoading.passengerCount ?? simbrief.passenger_count ?? simbrief.passengerCount ?? 0,
    cargoKg: baseLoading.cargoKg ?? baseLoading.cargo_kg ?? simbrief.cargoKg ?? simbrief.cargo_kg ?? 0,
    cargo_kg: baseLoading.cargo_kg ?? baseLoading.cargoKg ?? simbrief.cargo_kg ?? simbrief.cargoKg ?? 0,
    fuelPlannedKg: baseLoading.fuelPlannedKg ?? baseLoading.fuel_kg ?? simbrief.blockFuelKg ?? simbrief.block_fuel_kg ?? 0,
    fuel_kg: baseLoading.fuel_kg ?? baseLoading.fuelPlannedKg ?? simbrief.block_fuel_kg ?? simbrief.blockFuelKg ?? 0,
    payloadKg: baseLoading.payloadKg ?? baseLoading.payload_kg ?? simbrief.payloadKg ?? simbrief.payload_kg ?? 0,
    payload_kg: baseLoading.payload_kg ?? baseLoading.payloadKg ?? simbrief.payload_kg ?? simbrief.payloadKg ?? 0,
  };

  const schedule: Record<string, unknown> = {
    ...baseSchedule,
    departureLocalTime: firstText(baseSchedule.departureLocalTime, baseSchedule.departure_local_time),
    departure_local_time: firstText(baseSchedule.departure_local_time, baseSchedule.departureLocalTime),
    estimatedArrivalLocalTime: firstText(baseSchedule.estimatedArrivalLocalTime, baseSchedule.estimated_arrival_local_time),
    estimated_arrival_local_time: firstText(baseSchedule.estimated_arrival_local_time, baseSchedule.estimatedArrivalLocalTime),
    estimatedBlockMinutes: baseSchedule.estimatedBlockMinutes ?? baseSchedule.estimated_block_minutes ?? simbrief.blockTimeMinutes ?? simbrief.block_time_minutes ?? null,
    estimated_block_minutes: baseSchedule.estimated_block_minutes ?? baseSchedule.estimatedBlockMinutes ?? simbrief.block_time_minutes ?? simbrief.blockTimeMinutes ?? null,
  };

  return {
    ...base,
    payloadVersion,
    payload_version: payloadVersion,
    reservationId: row.id,
    reservation_id: row.id,
    dispatchId: row.id,
    dispatch_id: row.id,
    dispatchToken,
    dispatch_token: dispatchToken,
    operationType: firstText(base.operationType, base.operation_type, row.operation_type),
    operation_type: firstText(base.operation_type, base.operationType, row.operation_type),
    scoreMode: firstText(base.scoreMode, base.score_mode, row.score_mode),
    score_mode: firstText(base.score_mode, base.scoreMode, row.score_mode),
    reservationStatus: "ACARS_CLAIMED",
    reservation_status: "ACARS_CLAIMED",
    claimedAt: new Date().toISOString(),
    claimed_at: new Date().toISOString(),
    flight,
    route,
    aircraft,
    simbrief,
    loading,
    schedule,
    economySnapshot,
    economy_snapshot: economySnapshot,
    claim: {
      status: "ACARS_CLAIMED",
      acarsState: "CLAIMED",
      claimCount: claimCount + 1,
      acarsVersion,
      source: clientName,
    },
  };
}

export async function claimDirectAcarsDispatch(input: ClaimDirectDispatchInput) {
  const reservationId = clean(input.reservationId);
  const dispatchToken = clean(input.dispatchToken);
  const pilotCallsign = upper(input.pilotCallsign);
  const acarsVersion = clean(input.acarsVersion) || "unknown";
  const clientName = clean(input.clientName) || "PatagoniaWingsACARS";

  if (!dispatchToken && !pilotCallsign) {
    throw new Error("NO_ACARS_READY_DISPATCH");
  }

  return dbTransaction(async (client) => {
    const params: unknown[] = [];
    let where = "";

    if (dispatchToken) {
      params.push(hashDispatchToken(dispatchToken));
      where = "dispatch_token_hash = $1";
      if (reservationId) {
        params.push(reservationId);
        where += " and id = $2::uuid";
      }
    } else {
      params.push(pilotCallsign);
      where = `
        upper(coalesce(pilot_callsign, '')) = $1
        and coalesce(payload_version, acars_payload_version, '') = 'pw3-dispatch-v1'
        and (
          upper(coalesce(acars_state, '')) = 'ACARS_READY'
          or upper(coalesce(status, '')) = 'ACARS_READY'
        )
      `;
    }

    const result = await client.query<DirectDispatchRow>(
      `
      select
        id::text,
        pilot_callsign,
        operation_type,
        score_mode,
        status,
        acars_state,
        payload_version,
        route_code,
        assigned_flight_number,
        assigned_callsign,
        airline_icao,
        aircraft_model_code,
        aircraft_registration,
        origin_ident,
        destination_ident,
        route_text,
        dispatch_token_hash,
        dispatch_payload,
        acars_payload,
        prepared_acars_payload,
        flight_payload,
        simbrief_ofp_json,
        acars_claim_count
      from public.training_dispatch_reservations
      where ${where}
        and upper(coalesce(status, '')) not in ('CANCELLED','EXPIRED','FINALIZED')
      order by coalesce(sent_to_acars_at, acars_ready_at, created_at) desc
      limit 1
      for update
      `,
      params,
    );

    const row = result.rows[0];
    if (!row) throw new Error("NO_ACARS_READY_DISPATCH");

    const claimCount = Math.max(0, Number(row.acars_claim_count ?? 0));
    const payload = buildClaimPayload(row, dispatchToken, claimCount, acarsVersion, clientName);
    if (!payload.dispatchToken && !payload.dispatch_token) throw new Error("ACARS_PAYLOAD_MISSING");

    await client.query(
      `
      update public.training_dispatch_reservations
         set status = 'ACARS_CLAIMED',
             acars_state = 'CLAIMED',
             acars_status = 'CLAIMED',
             acars_claimed_at = coalesce(acars_claimed_at, now()),
             acars_claim_last_at = now(),
             acars_claim_count = coalesce(acars_claim_count, 0) + 1,
             acars_claim_source = $2,
             prepared_acars_payload = $3::jsonb,
             dispatch_payload = coalesce(dispatch_payload, $3::jsonb),
             acars_payload = coalesce(acars_payload, $3::jsonb),
             updated_at = now()
       where id = $1::uuid
      `,
      [row.id, `${clientName}/${acarsVersion}`.slice(0, 120), JSON.stringify(payload)],
    );

    return {
      row,
      payload,
    };
  });
}
