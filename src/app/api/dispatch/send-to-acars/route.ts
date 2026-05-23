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
const ACARS_PAYLOAD_VERSION = "pw3-dispatch-v1";
const ACARS_DIRECT_SCHEMA_MIGRATION = "20260521_training_dispatch_reservations_acars_direct_columns.sql";

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

function getMissingColumn(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const maybe = error as { code?: unknown; column?: unknown; message?: unknown };
  if (typeof maybe.column === "string" && maybe.column.trim()) return maybe.column.trim();
  const message = typeof maybe.message === "string" ? maybe.message : "";
  return message.match(/column "([^"]+)"/)?.[1] || "";
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
    const flightInput = (body.flight && typeof body.flight === "object" ? body.flight : {}) as Record<string, unknown>;
    const flightRouteCodeInput = upper(flightInput.routeCode ?? flightInput.route_code);
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
    // REGLA: Ruta directa válida cuando route === destination (SimBrief vuelo DCT)
    // Solo inválida si: vacía, o solo el origen sin destino
    const isDirectRoute = simbriefRoute && destinationIdent &&
      simbriefRoute.toUpperCase() === destinationIdent.toUpperCase();
    const invalidRoute =
      !simbriefRoute ||
      (!isDirectRoute && simbriefRoute.toUpperCase() === originIdent);
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

    const previewFlight = getSimbriefFlightNumber(flightRouteCodeInput || routeCodeInput || null, originIdent, destinationIdent);
    const assignedFlight = {
      airlineIcao: text(flightInput.airlineIcao ?? flightInput.airline_icao) || "PWG",
      flightNumber: text(flightInput.flightNumber ?? flightInput.flight_number) || previewFlight.flightNumber,
      callsign: text(flightInput.callsign) || previewFlight.callsign,
      routeCode: previewFlight.routeCode,
    };
    if (!assignedFlight.flightNumber || !assignedFlight.callsign)
      return fail("MISSING_FLIGHT", "Missing flight number/callsign");
    const normalizedRouteId = routeId && UUID_PATTERN.test(routeId) ? routeId : null;
    // Normalizar ruta directa: si SimBrief entrega solo el destino, construir "ORIGIN DCT DESTINATION"
    const normalizedSimbriefRoute = isDirectRoute
      ? `${originIdent} DCT ${destinationIdent}`
      : simbriefRoute;

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
      payloadVersion: ACARS_PAYLOAD_VERSION,
      payload_version: ACARS_PAYLOAD_VERSION,
      generated_at: new Date().toISOString(),
      source: "WEB_DIRECT_ACARS",
      dispatch_id: dispatchId,
      dispatch_token: dispatchToken,
      reservation_id: dispatchId,
      operation_type: operationType,
      score_mode: scoreMode,
      reservation_status: "ACARS_READY",
      flight: {
        airlineIcao: assignedFlight.airlineIcao,
        flightNumber: assignedFlight.flightNumber,
        routeCode: assignedFlight.routeCode,
        airline_icao: assignedFlight.airlineIcao,
        flight_number: assignedFlight.flightNumber,
        callsign: assignedFlight.callsign,
        route_code: assignedFlight.routeCode,
      },
      route: {
        routeId: normalizedRouteId,
        routeCode: assignedFlight.routeCode,
        origin: originIdent,
        destination: destinationIdent,
        route_id: normalizedRouteId,
        route_code: assignedFlight.routeCode,
        origin_ident: originIdent,
        destination_ident: destinationIdent,
        route_text: normalizedSimbriefRoute || `${originIdent} DCT ${destinationIdent}`,
      },
      aircraft: {
        aircraftCode,
        model_code: aircraftCode,
        registration: aircraftRegistration,
      },
      simbrief,
      loading: {
        ...loading,
        fuelPlannedKg: numeric(loading.fuelPlannedKg) || numeric(loading.fuelKg) || numeric(simbrief.blockFuelKg),
      },
      schedule: {
        departureLocalTime,
        estimatedArrivalLocalTime: text(schedule.estimatedArrivalLocalTime) || null,
        estimatedBlockMinutes: numeric(schedule.estimatedBlockMinutes) || null,
        estimatedFlightMinutes: numeric(schedule.estimatedFlightMinutes) || null,
        source: "simbrief_ofp",
      },
      economySnapshot,
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
         payload_version,
         dispatch_payload,
         acars_payload,
         acars_state,
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
         '${ACARS_PAYLOAD_VERSION}',
         $21::jsonb,
         $22::jsonb,
         'ACARS_READY',
         $23::jsonb,
         $24::jsonb,
         $25::jsonb,
         '${ACARS_PAYLOAD_VERSION}',
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
        JSON.stringify(acarsPayload),
        JSON.stringify(acarsPayload),
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
      payloadVersion: ACARS_PAYLOAD_VERSION,
      acarsPayload,
    });
  } catch (error) {
    console.error("[dispatch] direct send-to-acars failed", error instanceof Error ? error.message : error);
    if (error && typeof error === "object" && (error as { code?: unknown }).code === "42703") {
      return fail("ACARS_SCHEMA_MISSING_COLUMN", "ACARS direct dispatch schema missing column", {
        missingColumn: getMissingColumn(error),
        table: "public.training_dispatch_reservations",
        migrationName: ACARS_DIRECT_SCHEMA_MIGRATION,
      }, 500);
    }
    return fail("ACARS_DISPATCH_INSERT_FAILED", "Failed to insert ACARS dispatch", {
      reason: error instanceof Error ? error.message : "unknown",
    }, 500);
  }
}
