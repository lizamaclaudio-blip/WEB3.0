import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { claimDirectAcarsDispatch } from "@/lib/acars/direct-dispatch-claim";
import { dbQuery } from "@/lib/db/client";
import { acarsJson } from "@/lib/acars/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOWNLOAD_URL = "https://www.patagoniaw.com/downloads/acars/PatagoniaWingsACARSSetup.exe";
const LATEST_VERSION = "7.1.5";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function resolveStartPayload(body: Record<string, unknown> | null) {
  const flight = (body?.flight as Record<string, unknown> | undefined) ?? {};
  const prepared = (body?.preparedDispatch as Record<string, unknown> | undefined) ?? {};

  return {
    reservationId:
      text(prepared.reservationId ?? prepared.dispatchId ?? body?.reservationId ?? body?.dispatchId) || undefined,
    dispatchToken:
      text(prepared.dispatchToken ?? body?.dispatchToken ?? body?.dispatch_token) || undefined,
    pilotCallsign:
      text(
        body?.pilotCallsign ??
          body?.pilot_callsign ??
          body?.callsign ??
          flight.pilotCallsign ??
          flight.pilotCallsign,
      )
        .toUpperCase() || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const token = bearerToken(request);
    const user = await getAuthenticatedPilot(token);
    if (!user) {
      return acarsJson(401, {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Inicia sesion en ACARS antes de iniciar el vuelo.",
        extra: { latestVersion: LATEST_VERSION, downloadUrl: DOWNLOAD_URL },
      });
    }

    const payload = resolveStartPayload(body);
    const dispatchToken = payload.dispatchToken;
    const reservationId = payload.reservationId;
    const pilotCallsign = user.callsign?.toUpperCase() || payload.pilotCallsign || "";

    const direct = await claimDirectAcarsDispatch({
      reservationId,
      dispatchToken,
      pilotCallsign,
      acarsVersion: text(body?.acarsVersion ?? body?.acars_version) || "legacy",
      clientName: text(body?.clientName ?? body?.client_name) || "PatagoniaWingsACARS",
    });

    await dbQuery(
      `update public.training_dispatch_reservations
          set status = 'ACARS_STARTED',
              acars_state = 'ACARS_STARTED',
              acars_status = 'ACARS_STARTED',
              acars_claim_last_at = now(),
              updated_at = now()
        where id = $1::uuid
          and upper(coalesce(pilot_callsign, '')) = $2
          and upper(coalesce(status,'')) in ('ACARS_READY','ACARS_CLAIMED','ACARS_STARTED','IN_FLIGHT')`,
      [direct.row.id, pilotCallsign],
    ).catch(() => null);

    return acarsJson(200, {
      ok: true,
      code: "FLIGHT_STARTED",
      message: "Vuelo ACARS iniciado con despacho Web 3.0.",
      status: "ACARS_STARTED",
      extra: {
        started: true,
        reservationId: direct.row.id,
        dispatchId: direct.row.id,
        dispatchToken: direct.payload.dispatchToken ?? direct.payload.dispatch_token,
        payloadVersion: direct.payload.payloadVersion ?? direct.payload.payload_version,
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
  } catch (error) {
    const code = error instanceof Error ? error.message : "ACARS_START_FAILED";
    if (code === "NO_ACARS_READY_DISPATCH") {
      return acarsJson(404, {
        ok: false,
        code: "NO_ACTIVE_DISPATCH",
        message: "No existe un despacho activo para iniciar vuelo ACARS.",
        extra: { latestVersion: LATEST_VERSION, downloadUrl: DOWNLOAD_URL },
      });
    }

    if (code === "DISPATCH_NOT_OWNED_BY_PILOT") {
      return acarsJson(403, {
        ok: false,
        code,
        message: "El despacho pertenece a otro piloto.",
        extra: { latestVersion: LATEST_VERSION, downloadUrl: DOWNLOAD_URL },
      });
    }

    if (code === "UNAUTHENTICATED") {
      return acarsJson(401, {
        ok: false,
        code,
        message: "Inicia sesion en ACARS para iniciar el vuelo.",
        extra: { latestVersion: LATEST_VERSION, downloadUrl: DOWNLOAD_URL },
      });
    }

    console.error("[acars] start legacy failed", error instanceof Error ? error.message : error);
    return acarsJson(500, {
      ok: false,
      code: "ACARS_START_FAILED",
      message: "No se pudo iniciar el vuelo ACARS.",
      extra: { latestVersion: LATEST_VERSION, downloadUrl: DOWNLOAD_URL },
    });
  }
}
