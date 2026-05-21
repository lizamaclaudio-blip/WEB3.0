import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { buildCrewCenterPayload } from "@/lib/dispatch/neon-ops";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const payload = await buildCrewCenterPayload(user);
  return NextResponse.json(payload);
}
