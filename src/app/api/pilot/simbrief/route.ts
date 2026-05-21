import { NextResponse } from "next/server";
import { getSessionTokenFromCookies } from "@/lib/session/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { dbOne, dbQuery } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensurePilotSimbriefColumns() {
  await dbQuery("alter table public.pilot_profiles add column if not exists simbrief_username text");
  await dbQuery("alter table public.pilot_profiles add column if not exists simbrief_user_id text");
}

function cleanUsername(value: unknown) {
  return String(value ?? "").trim().replace(/[^A-Za-z0-9_.-]/g, "");
}

function cleanUserId(value: unknown) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) return "";
  return /^\d+$/.test(cleaned) ? cleaned : "";
}

export async function GET() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  await ensurePilotSimbriefColumns();
  const row = await dbOne<{ simbrief_username: string | null; simbrief_user_id: string | null }>(
    `select simbrief_username, simbrief_user_id
       from public.pilot_profiles
      where id = $1::uuid
      limit 1`,
    [user.userId],
  );

  return NextResponse.json({
    ok: true,
    simbriefUsername: row?.simbrief_username ?? null,
    simbriefUserId: row?.simbrief_user_id ?? null,
  });
}

export async function POST(request: Request) {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

  const simbriefUsername = cleanUsername(body.simbriefUsername);
  const simbriefUserId = cleanUserId(body.simbriefUserId);
  if (body.simbriefUserId !== undefined && String(body.simbriefUserId).trim() && !simbriefUserId) {
    return NextResponse.json({ ok: false, error: "SIMBRIEF_USER_ID_INVALID" }, { status: 400 });
  }

  await ensurePilotSimbriefColumns();
  await dbQuery(
    `update public.pilot_profiles
        set simbrief_username = $2,
            simbrief_user_id = $3,
            updated_at = now()
      where id = $1::uuid`,
    [user.userId, simbriefUsername || null, simbriefUserId || null],
  );

  return NextResponse.json({
    ok: true,
    simbriefUsername: simbriefUsername || null,
    simbriefUserId: simbriefUserId || null,
  });
}
