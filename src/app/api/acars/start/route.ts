import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { claimDirectAcarsDispatch } from "@/lib/acars/direct-dispatch-claim";

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
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHENTICATED",
          message: "Inicia sesion en ACARS antes de iniciar el vuelo.",
          latestVersion: LATEST_VERSION,
          downloadUrl: DOWNLOAD_URL,
        },
        { status: 401 },
      );
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

    return NextResponse.json({
      ok: true,
      started: true,
      status: "ACARS_CLAIMED",
      message: "Vuelo ACARS iniciado con despacho Web 3.0.",
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
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ACARS_START_FAILED";
    if (code === "NO_ACARS_READY_DISPATCH") {
      return NextResponse.json(
        {
          ok: false,
          code: "NO_ACTIVE_DISPATCH",
          message: "No existe un despacho activo para iniciar vuelo ACARS.",
          latestVersion: LATEST_VERSION,
          downloadUrl: DOWNLOAD_URL,
        },
        { status: 404 },
      );
    }

    if (code === "DISPATCH_NOT_OWNED_BY_PILOT") {
      return NextResponse.json(
        {
          ok: false,
          code,
          message: "El despacho pertenece a otro piloto.",
          latestVersion: LATEST_VERSION,
          downloadUrl: DOWNLOAD_URL,
        },
        { status: 403 },
      );
    }

    if (code === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          ok: false,
          code,
          message: "Inicia sesion en ACARS para iniciar el vuelo.",
          latestVersion: LATEST_VERSION,
          downloadUrl: DOWNLOAD_URL,
        },
        { status: 401 },
      );
    }

    console.error("[acars] start legacy failed", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        ok: false,
        code: "ACARS_START_FAILED",
        message: "No se pudo iniciar el vuelo ACARS.",
        latestVersion: LATEST_VERSION,
        downloadUrl: DOWNLOAD_URL,
      },
      { status: 500 },
    );
  }
}
