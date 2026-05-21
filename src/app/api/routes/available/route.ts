import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { listAvailableAircraft, listAvailableRoutes } from "@/lib/dispatch/neon-ops";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

  const aircraft = await listAvailableAircraft(user);
  const { origin, routes } = await listAvailableRoutes(user, aircraft);

  const availableCount = routes.filter((route) => route.blocked_reasons.length === 0).length;
  console.info(`[routes] available count=${availableCount}`);

  return NextResponse.json({ ok: true, origin, routes });
}
