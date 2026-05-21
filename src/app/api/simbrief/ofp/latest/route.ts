import { NextResponse } from "next/server";
import { getSessionTokenFromCookies } from "@/lib/session/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { dbOne } from "@/lib/db/client";
import { normalizeSimbriefOfp } from "@/lib/simbrief/ofp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function upper(value: unknown) {
  return clean(value).toUpperCase();
}

function error(code: string, status = 400) {
  return NextResponse.json({ ok: false, code, error: code }, { status });
}

export async function POST(request: Request) {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);
  if (!user) return error("UNAUTHENTICATED", 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return error("INVALID_BODY");

  let simbriefUsername = clean(body.simbriefUsername);
  let simbriefUserId = clean(body.simbriefUserId);

  if (!simbriefUsername && !simbriefUserId) {
    const row = await dbOne<{ simbrief_username: string | null; simbrief_user_id: string | null }>(
      `select simbrief_username, simbrief_user_id
         from public.pilot_profiles
        where id = $1::uuid
        limit 1`,
      [user.userId],
    );
    simbriefUsername = clean(row?.simbrief_username);
    simbriefUserId = clean(row?.simbrief_user_id);
  }

  if (!simbriefUsername && !simbriefUserId) return error("SIMBRIEF_USER_NOT_CONFIGURED");

  const expectedOrigin = upper(body.expectedOrigin);
  const expectedDestination = upper(body.expectedDestination);
  const expectedFlightNumber = upper(body.expectedFlightNumber);
  const expectedAircraftCode = upper(body.expectedAircraftCode);

  const url = new URL("https://www.simbrief.com/api/xml.fetcher.php");
  if (simbriefUserId) url.searchParams.set("userid", simbriefUserId);
  else url.searchParams.set("username", simbriefUsername);
  url.searchParams.set("json", "1");

  let payload: Record<string, unknown> | null = null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return error("SIMBRIEF_FETCH_FAILED", 502);
    payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    return error("SIMBRIEF_FETCH_FAILED", 502);
  }

  if (!payload) return error("SIMBRIEF_PARSE_FAILED", 502);

  const ofp = normalizeSimbriefOfp(payload);
  if (!ofp.origin || !ofp.destination) return error("SIMBRIEF_OFP_NOT_FOUND", 404);
  if (expectedOrigin && ofp.origin !== expectedOrigin) return error("SIMBRIEF_ORIGIN_MISMATCH");
  if (expectedDestination && ofp.destination !== expectedDestination) return error("SIMBRIEF_DESTINATION_MISMATCH");
  if (expectedFlightNumber && ofp.flightNumber && ofp.flightNumber !== expectedFlightNumber) {
    return error("SIMBRIEF_OFP_NOT_FOUND");
  }
  if (expectedAircraftCode && ofp.aircraftIcao && !ofp.aircraftIcao.includes(expectedAircraftCode)) {
    return error("SIMBRIEF_AIRCRAFT_MISMATCH");
  }

  return NextResponse.json({ ok: true, ofp });
}
