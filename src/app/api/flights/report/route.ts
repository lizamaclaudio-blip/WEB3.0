import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { findActiveReservationForReport } from "@/lib/acars/finalize-reservation";
import { POST as finalizePost } from "@/app/api/acars/finalize/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toIso(value: unknown) {
  const v = text(value);
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function mapLegacyStatus(status: string) {
  const s = status.toLowerCase();
  if (s.includes("abort")) return "aborted";
  if (s.includes("crash")) return "crashed";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("divert")) return "diverted";
  return "completed";
}

function inferFlightType(operationType: string) {
  const op = operationType.toUpperCase();
  if (op.includes("CARGO")) return "cargo";
  if (op.includes("CHARTER")) return "charter";
  if (op.includes("ITINERARY")) return "itinerary";
  return "training";
}

function pickDispatchToken(
  body: Record<string, unknown>,
  reservationPreparedPayload: Record<string, unknown> | null | undefined,
) {
  const fromBody = text(body.dispatchToken || body.DispatchToken);
  if (fromBody) return fromBody;
  const source = reservationPreparedPayload && typeof reservationPreparedPayload === "object"
    ? reservationPreparedPayload
    : {};
  return text((source as Record<string, unknown>).dispatchToken || (source as Record<string, unknown>).dispatch_token);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, code: "INVALID_REPORT_PAYLOAD", message: "Payload de cierre invalido." }, { status: 400 });
    }

    const token = bearerToken(request);
    const user = await getAuthenticatedPilot(token);
    if (!user) {
      return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Sesion ACARS no valida." }, { status: 401 });
    }

    const payloadVersion = text(body.payloadVersion || body.payload_version);
    if (payloadVersion === "pw3-acars-finalize-v1") {
      const response = await finalizePost(new Request(request.url.replace("/api/flights/report", "/api/acars/finalize"), {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(body),
      }));
      return response;
    }

    const reservation = await findActiveReservationForReport({
      pilotCallsign: text(user.callsign),
      reservationId: text(body.reservationId || body.ReservationId),
      dispatchToken: text(body.dispatchToken || body.DispatchToken),
      flightNumber: text(body.flightNumber || body.FlightNumber),
      origin: text(body.departureIcao || body.DepartureIcao),
      destination: text(body.arrivalIcao || body.ArrivalIcao),
      aircraftCode: text(body.aircraftIcao || body.AircraftIcao),
    });
    if (!reservation) {
      return NextResponse.json({
        ok: false,
        code: "NO_ACTIVE_FLIGHT",
        message: "No existe un vuelo activo para cerrar.",
        debug: {
          searchedStates: ["ACARS_CLAIMED", "ACARS_STARTED", "STARTED", "IN_FLIGHT", "REPORT_PENDING", "ACARS_READY"],
          pilotCallsign: text(user.callsign).toUpperCase(),
          flightNumber: text(body.flightNumber || body.FlightNumber),
        },
      }, { status: 404 });
    }

    const userCallsign = text(user.callsign).toUpperCase();
    const reservationCallsign = text(reservation.pilot_callsign).toUpperCase();
    if (!userCallsign || userCallsign !== reservationCallsign) {
      return NextResponse.json({ ok: false, code: "DISPATCH_NOT_OWNED_BY_PILOT", message: "El despacho pertenece a otro piloto." }, { status: 403 });
    }

    const reservationId = reservation.id;
    const finalStatus = mapLegacyStatus(text(body.resultStatus || body.ResultStatus || body.status || body.Status));
    const operationType = text(body.operationType || body.OperationType || reservation.operation_type || "TRAINING_FREE").toUpperCase();
    const flightType = inferFlightType(operationType);
    const origin = text(body.departureIcao || body.DepartureIcao || reservation.origin_ident).toUpperCase();
    const destination = text(body.arrivalIcao || body.ArrivalIcao || reservation.destination_ident).toUpperCase();

    const finalizePayload = {
      payloadVersion: "pw3-acars-finalize-v1",
      reservationId,
      dispatchToken: pickDispatchToken(body, reservation.prepared_acars_payload) || undefined,
      pilotCallsign: userCallsign,
      aircraftCode: text(body.aircraftIcao || body.AircraftIcao || reservation.aircraft_model_code).toUpperCase(),
      operationType,
      flightType,
      origin,
      destination,
      finalStatus,
      startedAt: toIso(body.departureTime || body.DepartureTime || body.blockOutTimeUtc || body.BlockOutTimeUtc),
      airborneAt: toIso(body.takeoffTimeUtc || body.TakeoffTimeUtc),
      landedAt: toIso(body.touchdownTimeUtc || body.TouchdownTimeUtc || body.arrivalTime || body.ArrivalTime),
      completedAt: new Date().toISOString(),
      planned: {
        distanceNm: num(body.distance || body.Distance, 0),
      },
      actual: {
        blockTimeMinutes: Math.max(0, Math.round((new Date(toIso(body.arrivalTime || body.ArrivalTime) || Date.now()).getTime() - new Date(toIso(body.departureTime || body.DepartureTime) || Date.now()).getTime()) / 60000)),
        flightTimeMinutes: Math.max(0, Math.round((new Date(toIso(body.arrivalTime || body.ArrivalTime) || Date.now()).getTime() - new Date(toIso(body.takeoffTimeUtc || body.TakeoffTimeUtc || body.departureTime || body.DepartureTime) || Date.now()).getTime()) / 60000)),
        distanceNm: num(body.distance || body.Distance, 0),
        fuelUsedKg: Math.max(0, num(body.fuelUsed || body.FuelUsed, 0) * 0.45359237),
        landingAirport: text(body.arrivalIcao || body.ArrivalIcao || destination).toUpperCase(),
        touchdownVsFpm: num(body.landingVS || body.LandingVS, 0),
        touchdownGs: num(body.landingG || body.LandingG, 0),
      },
      acarsOperationalInputs: {
        touchdownVsFpm: num(body.landingVS || body.LandingVS, 0),
        hardLanding: Math.abs(num(body.landingVS || body.LandingVS, 0)) >= 450,
      },
      events: [],
      raw: body,
    };

    const response = await finalizePost(new Request(request.url.replace("/api/flights/report", "/api/acars/finalize"), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(finalizePayload),
    }));

    const result = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok || !result) {
      const forwardedCode = text(result?.error || result?.code);
      const forwardedMessage = text(result?.message);
      if (forwardedCode === "DISPATCH_TOKEN_INVALID") {
        return NextResponse.json({
          ok: false,
          code: "DISPATCH_NOT_OWNED_BY_PILOT",
          message: forwardedMessage || "El despacho pertenece a otro piloto.",
        }, { status: 403 });
      }
      if (forwardedCode === "RESERVATION_NOT_FOUND") {
        return NextResponse.json({
          ok: false,
          code: "NO_ACTIVE_FLIGHT",
          message: "No existe un vuelo activo para cerrar.",
        }, { status: 404 });
      }
      return NextResponse.json({
        ok: false,
        code: forwardedCode || "REPORT_FORWARD_FAILED",
        message: forwardedMessage || "No se pudo procesar el cierre del vuelo.",
        details: result ?? null,
      }, { status: response.status || 500 });
    }

    const success = Boolean(result.success);
    const alreadyProcessed = Boolean(result.alreadyProcessed);

    return NextResponse.json({
      ok: success || alreadyProcessed,
      code: alreadyProcessed ? "REPORT_ALREADY_RECEIVED" : "REPORT_RECEIVED",
      message: alreadyProcessed ? "El cierre ya fue recibido anteriormente." : "Cierre recibido correctamente.",
      flightNumber: text(body.flightNumber || body.FlightNumber),
      status: "PENDING_EVALUATION",
      summaryUrl: text(result.summaryUrl),
      score: null,
      finalize: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FLIGHT_REPORT_FAILED";
    return NextResponse.json({ ok: false, code: "FLIGHT_REPORT_FAILED", message: "No se pudo enviar el cierre de vuelo.", details: message }, { status: 500 });
  }
}
