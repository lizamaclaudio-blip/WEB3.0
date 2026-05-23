import { NextResponse } from "next/server";
import { claimTrainingReservationForAcars } from "@/lib/dispatch/training-reservations";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { claimDirectAcarsDispatch } from "@/lib/acars/direct-dispatch-claim";
import { acarsJson } from "@/lib/acars/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "ACARS_DISPATCH_CLAIM_FAILED";
  const messageByCode: Record<string, string> = {
    RESERVATION_REQUIRED: "Falta el ID de reserva.",
    DISPATCH_TOKEN_REQUIRED: "Falta el token seguro de despacho.",
    RESERVATION_NOT_FOUND: "El despacho no existe.",
    DISPATCH_TOKEN_INVALID: "El token de despacho no es valido.",
    RESERVATION_EXPIRED: "La reserva temporal vencio. Crea una nueva reserva.",
    ACARS_NOT_READY: "El despacho aun no fue preparado para ACARS desde la web.",
    ACARS_PAYLOAD_MISSING: "El payload ACARS no esta preparado. Vuelve a presionar Enviar a ACARS en la web.",
    RESERVATION_NOT_READY: "El despacho no esta disponible para ACARS.",
    NO_ACARS_READY_DISPATCH: "No hay despacho listo para ACARS para este piloto.",
    DISPATCH_NOT_OWNED_BY_PILOT: "El despacho pertenece a otro piloto.",
    UNAUTHENTICATED: "Inicia sesion en ACARS para reclamar el despacho.",
  };

  const statusByCode: Record<string, number> = {
    RESERVATION_NOT_FOUND: 404,
    DISPATCH_TOKEN_INVALID: 403,
    RESERVATION_EXPIRED: 410,
    ACARS_NOT_READY: 409,
    ACARS_PAYLOAD_MISSING: 409,
    NO_ACARS_READY_DISPATCH: 404,
    DISPATCH_NOT_OWNED_BY_PILOT: 403,
    UNAUTHENTICATED: 401,
  };

  return NextResponse.json(
    { ok: false, code, message: messageByCode[code] ?? "No se pudo reclamar el despacho ACARS." },
    { status: statusByCode[code] ?? 400 },
  );
}

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return acarsJson(400, { ok: false, code: "INVALID_BODY", message: "Body JSON invalido." });

    const token = bearerToken(request);
    const user = await getAuthenticatedPilot(token);
    const bodyCallsign = text(body.pilotCallsign ?? body.pilot_callsign ?? body.callsign ?? body.pilotNumber ?? body.pilot_number).toUpperCase();
    const pilotCallsign = (user?.callsign ?? bodyCallsign).toUpperCase();
    const dispatchToken = text(body.dispatchToken ?? body.dispatch_token);
    const reservationId = text(body.reservationId ?? body.reservation_id ?? body.dispatchId ?? body.dispatch_id);
    const acarsVersion = typeof body.acarsVersion === "string" ? body.acarsVersion : typeof body.acars_version === "string" ? body.acars_version : null;
    const clientName = typeof body.clientName === "string" ? body.clientName : typeof body.client_name === "string" ? body.client_name : "PatagoniaWingsACARS";

    if (dispatchToken || pilotCallsign) {
      if (!dispatchToken && !user) {
        throw new Error("UNAUTHENTICATED");
      }

      const direct = await claimDirectAcarsDispatch({
        reservationId,
        dispatchToken,
        pilotCallsign,
        acarsVersion,
        clientName,
      });

      return acarsJson(200, {
        ok: true,
        code: "DISPATCH_CLAIMED",
        message: "Despacho entregado a ACARS.",
        status: "ACARS_CLAIMED",
        evaluationStatus: null,
        extra: {
          claimed: true,
          reservationId: direct.row.id,
          dispatchId: direct.row.id,
          dispatchToken: direct.payload.dispatchToken ?? direct.payload.dispatch_token,
          payloadVersion: direct.payload.payloadVersion ?? direct.payload.payload_version,
          dispatchPayload: direct.payload,
          dispatch: direct.payload,
          flight: direct.payload.flight,
          route: direct.payload.route,
          aircraft: direct.payload.aircraft,
          simbrief: direct.payload.simbrief,
          loading: direct.payload.loading,
          schedule: direct.payload.schedule,
          economySnapshot: direct.payload.economySnapshot ?? direct.payload.economy_snapshot,
        },
      });
    }

    const dispatch = await claimTrainingReservationForAcars({
      reservationId,
      dispatchToken,
      acarsVersion,
      clientName,
    });

    return acarsJson(200, {
      ok: true,
      code: "DISPATCH_CLAIMED",
      message: "Despacho entregado a ACARS.",
      status: "ACARS_CLAIMED",
      extra: { dispatch },
    });
  } catch (error) {
    console.error("[acars] dispatch claim failed", error instanceof Error ? error.message : error);
    return errorResponse(error);
  }
}
