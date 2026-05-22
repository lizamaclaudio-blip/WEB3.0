import { createHash, randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { dbOne, dbQuery } from "@/lib/db/client";
import { getSessionTokenFromCookies } from "@/lib/session/server";
import { getSimbriefFlightNumber } from "@/lib/dispatch/flight-number";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function numeric(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fail(code: string, error: string, details?: Record<string, unknown>, status = 400) {
  return NextResponse.json({ ok: false, code, error, details }, { status });
}

function hashDispatchToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createDispatchToken() {
  return randomBytes(40).toString("base64url");
}

type AirportRow = { id: string };

async function getAirportIdByIdent(ident: string) {
  const row = await dbOne<AirportRow>(
    `select id::text as id
       from public.airports
      where upper(coalesce(ident, icao, iata, '')) = upper($1)
      limit 1`,
    [ident],
  );
  return row?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const sessionToken = await getSessionTokenFromCookies();
    const user = await getAuthenticatedPilot(sessionToken);
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const originIdent = upper(body.originIdent);
    const destinationIdent = upper(body.destinationIdent);
    const routeId = text(body.routeId) || null;
    const routeCodeInput = upper(body.routeCode);
    const aircraftCode = upper(body.aircraftCode);
    const aircraftRegistration = upper(body.aircraftRegistration);
    const operationType = upper(body.operationType || "TRAINING_FREE");
    const scoreMode = upper(body.scoreMode || "SERVER_CONTROLLED");
    const departureLocalTime = text(body.departureLocalTime || body.departureTime || "00:00");
    const simbrief = (body.simbrief && typeof body.simbrief === "object" ? body.simbrief : {}) as Record<string, unknown>;
    const loading = (body.loading && typeof body.loading === "object" ? body.loading : {}) as Record<string, unknown>;
    const schedule = (body.schedule && typeof body.schedule === "object" ? body.schedule : {}) as Record<string, unknown>;
    const economySnapshot =
      body.economySnapshot && typeof body.economySnapshot === "object"
        ? (body.economySnapshot as Record<string, unknown>)
        : null;

    const simbriefRoute = text(simbrief.route);
    const invalidRoute =
      !simbriefRoute ||
      simbriefRoute.toUpperCase() === destinationIdent ||
      simbriefRoute.toUpperCase() === originIdent;
    if (!originIdent || !destinationIdent) return fail("MISSING_ROUTE", "Missing origin/destination");
    if (!aircraftRegistration || !aircraftCode) return fail("MISSING_AIRCRAFT", "Missing aircraft code/registration");
    if (!simbrief || Object.keys(simbrief).length === 0 || invalidRoute)
      return fail("MISSING_SIMBRIEF", "Missing or invalid SimBrief OFP", { simbriefRoute, destinationIdent, originIdent });
    if (!loading || Object.keys(loading).length === 0) return fail("MISSING_LOADING", "Missing loading block");
    if (!schedule || Object.keys(schedule).length === 0) return fail("MISSING_SCHEDULE", "Missing schedule block");
    if (!economySnapshot) return fail("MISSING_ECONOMY_SNAPSHOT", "Missing economy snapshot");

    const [originAirportId, destinationAirportId] = await Promise.all([
      getAirportIdByIdent(originIdent),
      getAirportIdByIdent(destinationIdent),
    ]);
    if (!originAirportId || !destinationAirportId) return fail("MISSING_ROUTE", "Airport not found", { originIdent, destinationIdent });

    const previewFlight = getSimbriefFlightNumber(routeCodeInput || null, originIdent, destinationIdent);
    const assignedFlight = {
      airlineIcao: text((body.flight as Record<string, unknown> | null)?.airlineIcao) || "PWG",
      flightNumber: text((body.flight as Record<string, unknown> | null)?.flightNumber) || previewFlight.flightNumber,
      callsign: text((body.flight as Record<string, unknown> | null)?.callsign) || previewFlight.callsign,
      routeCode: routeCodeInput || previewFlight.routeCode,
    };
    if (!assignedFlight.flightNumber || !assignedFlight.callsign)
      return fail("MISSING_FLIGHT", "Missing flight number/callsign");
    const normalizedRouteId = routeId && UUID_PATTERN.test(routeId) ? routeId : null;

    console.info("[send-to-acars] request", {
      pilot: user.callsign,
      routeId: normalizedRouteId,
      routeCodeInput,
      originIdent,
      destinationIdent,
      aircraftCode,
      aircraftRegistration,
      hasSimbrief: Boolean(simbrief),
      simbriefRoute: simbriefRoute.slice(0, 120),
      hasLoading: Boolean(loading),
      hasSchedule: Boolean(schedule),
      hasEconomySnapshot: Boolean(economySnapshot),
    });

    const dispatchId = randomUUID();
    const dispatchToken = createDispatchToken();
    const dispatchTokenHash = hashDispatchToken(dispatchToken);
    const tokenHint = dispatchToken.slice(0, 8);

    const acarsPayload = {
      payload_version: "pw3-dispatch-v1",
      generated_at: new Date().toISOString(),
      source: "WEB_DIRECT_ACARS",
      dispatch_id: dispatchId,
      dispatch_token: dispatchToken,
      reservation_id: dispatchId,
      operation_type: operationType,
      score_mode: scoreMode,
      reservation_status: "ACARS_READY",
      flight: {
        airline_icao: assignedFlight.airlineIcao,
        flight_number: assignedFlight.flightNumber,
        callsign: assignedFlight.callsign,
        route_code: assignedFlight.routeCode,
      },
      route: {
        route_id: normalizedRouteId,
        route_code: assignedFlight.routeCode,
        origin_ident: originIdent,
        destination_ident: destinationIdent,
        route_text: simbriefRoute || `${originIdent} DCT ${destinationIdent}`,
      },
      aircraft: {
        model_code: aircraftCode,
        registration: aircraftRegistration,
      },
      simbrief,
      loading,
      schedule: {
        departureLocalTime,
        estimatedArrivalLocalTime: text(schedule.estimatedArrivalLocalTime) || null,
        estimatedBlockMinutes: numeric(schedule.estimatedBlockMinutes) || null,
        estimatedFlightMinutes: numeric(schedule.estimatedFlightMinutes) || null,
        source: "simbrief_ofp",
      },
      economy_snapshot: economySnapshot,
    };

    await dbQuery(
      `insert into public.training_dispatch_reservations (
         id,
         pilot_user_id,
         pilot_callsign,
         aircraft_registration,
         aircraft_model_code,
         origin_airport_id,
         destination_airport_id,
         route_id,
         route_code,
         origin_ident,
         destination_ident,
         departure_time,
         route_text,
         operation_type,
         score_mode,
         status,
         acars_status,
         dispatch_token_hash,
         dispatch_token_hint,
         assigned_flight_number,
         assigned_callsign,
         airline_icao,
         flight_payload,
         simbrief_ofp_json,
         prepared_acars_payload,
         acars_payload_version,
         sent_to_acars_at,
         acars_ready_at,
         expires_at
       ) values (
         $1::uuid,
         $2::uuid,
         $3,
         $4,
         $5,
         $6::uuid,
         $7::uuid,
         case when $8 = '' then null else $8::uuid end,
         $9,
         $10,
         $11,
         $12,
         $13,
         $14,
         $15,
         'ACARS_READY',
         'READY',
         $16,
         $17,
         $18,
         $19,
         $20,
         $21::jsonb,
         $22::jsonb,
         $23::jsonb,
         'pw3-dispatch-v1',
         now(),
         now(),
         now() + interval '24 hours'
       )`,
      [
        dispatchId,
        user.userId,
        user.callsign,
        aircraftRegistration,
        aircraftCode,
        originAirportId,
        destinationAirportId,
        normalizedRouteId ?? "",
        assignedFlight.routeCode,
        originIdent,
        destinationIdent,
        departureLocalTime,
        simbriefRoute || `${originIdent} DCT ${destinationIdent}`,
        operationType,
        scoreMode,
        dispatchTokenHash,
        tokenHint,
        assignedFlight.flightNumber,
        assignedFlight.callsign,
        assignedFlight.airlineIcao,
        JSON.stringify({ flight: assignedFlight }),
        JSON.stringify(simbrief),
        JSON.stringify(acarsPayload),
      ],
    );

    return NextResponse.json({
      ok: true,
      status: "READY_FOR_ACARS",
      dispatchId,
      dispatchToken,
      payloadVersion: "pw3-dispatch-v1",
      acarsPayload,
    });
  } catch (error) {
    console.error("[dispatch] direct send-to-acars failed", error instanceof Error ? error.message : error);
    return fail("ACARS_DISPATCH_INSERT_FAILED", "Failed to insert ACARS dispatch", {
      reason: error instanceof Error ? error.message : "unknown",
    }, 500);
  }
}
