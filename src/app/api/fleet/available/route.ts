import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { listAvailableAircraft } from "@/lib/dispatch/neon-ops";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

  const aircraft = await listAvailableAircraft(user);
  console.info(`[fleet] available count=${aircraft.length}`);

  return NextResponse.json({ ok: true, aircraft });
}
