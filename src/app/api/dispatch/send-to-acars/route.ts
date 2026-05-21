import { createHash, randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { dbOne, dbQuery } from "@/lib/db/client";
import { getSessionTokenFromCookies } from "@/lib/session/server";
import { getSimbriefFlightNumber } from "@/lib/dispatch/flight-number";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    if (!originIdent || !destinationIdent || !aircraftRegistration || !aircraftCode) {
      return NextResponse.json({ ok: false, error: "DISPATCH_DATA_REQUIRED" }, { status: 400 });
    }

    const [originAirportId, destinationAirportId] = await Promise.all([
      getAirportIdByIdent(originIdent),
      getAirportIdByIdent(destinationIdent),
    ]);
    if (!originAirportId || !destinationAirportId) {
      return NextResponse.json({ ok: false, error: "AIRPORT_NOT_FOUND" }, { status: 400 });
    }

    const previewFlight = getSimbriefFlightNumber(routeCodeInput || null, originIdent, destinationIdent);
    const assignedFlight = {
      airlineIcao: text((body.flight as Record<string, unknown> | null)?.airlineIcao) || "PWG",
      flightNumber: text((body.flight as Record<string, unknown> | null)?.flightNumber) || previewFlight.flightNumber,
      callsign: text((body.flight as Record<string, unknown> | null)?.callsign) || previewFlight.callsign,
      routeCode: routeCodeInput || previewFlight.routeCode,
    };

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
        route_id: routeId,
        route_code: assignedFlight.routeCode,
        origin_ident: originIdent,
        destination_ident: destinationIdent,
        route_text: text(simbrief.route) || `${originIdent} DCT ${destinationIdent}`,
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
        routeId ?? "",
        assignedFlight.routeCode,
        originIdent,
        destinationIdent,
        departureLocalTime,
        text(simbrief.route) || `${originIdent} DCT ${destinationIdent}`,
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
    console.error("[dispatch] direct send-to-acars failed", error);
    return NextResponse.json({ ok: false, error: "SEND_TO_ACARS_FAILED" }, { status: 500 });
  }
}
