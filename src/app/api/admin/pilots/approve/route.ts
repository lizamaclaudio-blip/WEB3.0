import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { dbQuery } from "@/lib/db/client";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ownerCallsigns() {
  const fromEnv = (process.env.PWG_OWNER_CALLSIGNS ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return new Set(["PWG001", ...fromEnv]);
}

export async function POST(request: NextRequest) {
  const token = await getSessionTokenFromCookies();
  const requester = await getAuthenticatedPilot(token);

  if (!requester) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  if (!ownerCallsigns().has((requester.callsign ?? "").toUpperCase())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { pilotId?: string; callsign?: string };
  const pilotId = (body.pilotId ?? "").trim();
  const callsign = (body.callsign ?? "").trim().toUpperCase();

  if (!pilotId && !callsign) {
    return NextResponse.json({ ok: false, error: "pilotId o callsign requerido." }, { status: 400 });
  }

  const result = await dbQuery(
    `update public.pilot_profiles
        set pilot_status = 'ACTIVE',
            updated_at = now()
      where ($1::text = '' or id::text = $1)
        and ($2::text = '' or upper(callsign) = $2)
      returning id::text as id, callsign, pilot_status`,
    [pilotId, callsign],
  );

  return NextResponse.json({ ok: true, updated: result.rows });
}
