import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { buildAcarsPilotSnapshot } from "@/lib/acars/pilot-snapshot";
import { acarsJson } from "@/lib/acars/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function GET(request: Request) {
  try {
    const token = bearerToken(request);
    const user = await getAuthenticatedPilot(token);

    if (!user) {
      return acarsJson(401, { ok: false, code: "UNAUTHORIZED", message: "Sesion invalida o expirada." });
    }

    const snapshot = await buildAcarsPilotSnapshot(user);
    return acarsJson(200, {
      ok: true,
      code: "PILOT_SNAPSHOT_OK",
      message: "Snapshot cargado.",
      status: "ACARS_READY",
      extra: {
        snapshot,
        pilot: (snapshot as Record<string, unknown>).pilot ?? null,
        recentFlights: (snapshot as Record<string, unknown>).recentFlights ?? [],
        community: (snapshot as Record<string, unknown>).community ?? null,
      },
    });
  } catch (error) {
    console.error("[api/acars/pilot/snapshot] failed", error);
    return acarsJson(500, {
      ok: false,
      code: "PILOT_SNAPSHOT_FAILED",
      message: "No se pudo cargar la Sala de Pilotos.",
    });
  }
}
