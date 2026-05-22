import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { buildAcarsPilotSnapshot } from "@/lib/acars/pilot-snapshot";

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
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Sesion invalida o expirada." },
        { status: 401 },
      );
    }

    const snapshot = await buildAcarsPilotSnapshot(user);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[api/acars/pilot/snapshot] failed", error);
    return NextResponse.json(
      {
        ok: false,
        code: "PILOT_SNAPSHOT_FAILED",
        message: "No se pudo cargar la Sala de Pilotos.",
      },
      { status: 500 },
    );
  }
}
