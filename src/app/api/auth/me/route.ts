import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }

  console.info(`[auth] me ok callsign=${user.callsign ?? "N/A"} user=${user.userId}`);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.userId,
      email: user.email,
      display_name: user.displayName,
    },
    pilot: {
      id: user.pilotId,
      callsign: user.callsign,
      callsign_number: user.callsignNumber,
      rank_code: user.rankCode,
      pilot_status: user.pilotStatus,
      founder_badge: user.founderBadge,
      founder_number: user.founderNumber,
      base_airport_id: user.baseAirportId,
      current_airport_id: user.currentAirportId,
    },
    base_airport: {
      ident: user.baseAirportIdent,
      icao: user.baseAirportIcao,
      iata: user.baseAirportIata,
      name: user.baseAirportName,
      city: user.baseAirportCity,
      country: user.baseAirportCountry,
    },
    current_airport: {
      ident: user.currentAirportIdent,
      icao: user.currentAirportIcao,
      iata: user.currentAirportIata,
      name: user.currentAirportName,
      city: user.currentAirportCity,
      country: user.currentAirportCountry,
      lighting_policy: user.currentAirportLightingPolicy,
      lighting_warning_only: user.currentAirportLightingWarningOnly,
    },
  });
}
