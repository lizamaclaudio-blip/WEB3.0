import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { listFleetCatalog } from "@/lib/fleet/catalog";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

  const aircraft = await listFleetCatalog(user);
  console.info(`[fleet] catalog count=${aircraft.length}`);

  return NextResponse.json({ ok: true, aircraft });
}
