import { NextResponse } from "next/server";
import { getSessionTokenFromCookies } from "@/lib/session/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { dbOne } from "@/lib/db/client";
import { normalizeSimbriefOfp } from "@/lib/simbrief/ofp";
import { isSamePwgFlight, normalizePwgFlightNumber } from "@/lib/dispatch/flight-number";
import { isSameDispatchAircraft, normalizeAircraftCode } from "@/lib/simbrief/aircraft-map";

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
  
  // Logging seguro para diagnóstico - Aircraft raw data
  const rawAircraft = (payload as any)?.aircraft;
  const rawGeneral = (payload as any)?.general;
  const rawParams = (payload as any)?.params;
  console.info(`[simbrief-ofp] pilot=${user.callsign}`);
  console.info(`[simbrief-ofp] aircraftRaw=${JSON.stringify({
    aircraft_icaocode: rawAircraft?.icaocode || rawAircraft?.icao_code,
    aircraft_name: rawAircraft?.name,
    aircraft_type: rawAircraft?.type,
    aircraft_basetype: rawAircraft?.basetype,
    general_icaoairline: rawGeneral?.icao_airline,
    general_aircrafticao: rawGeneral?.aircraft_icao,
    general_icaotype: rawGeneral?.icao_type,
    general_aircraft: rawGeneral?.aircraft,
    params_aircraft: rawParams?.aircraft,
    normalized: ofp.aircraftIcao,
    expected: expectedAircraftCode,
  })}`);
  console.info(`[simbrief-ofp] ofpOrigin=${ofp.origin} ofpDest=${ofp.destination} ofpFlightNum=${ofp.flightNumber} ofpAircraft=${ofp.aircraftIcao}`);
  
  if (!ofp.origin || !ofp.destination) {
    console.warn("[simbrief-ofp] OFP missing origin/destination");
    return error("SIMBRIEF_OFP_NOT_FOUND", 404);
  }
  
  if (expectedOrigin && ofp.origin !== expectedOrigin) {
    console.warn(`[simbrief-ofp] Origin mismatch: got ${ofp.origin}, expected ${expectedOrigin}`);
    return error("SIMBRIEF_ORIGIN_MISMATCH");
  }
  
  if (expectedDestination && ofp.destination !== expectedDestination) {
    console.warn(`[simbrief-ofp] Destination mismatch: got ${ofp.destination}, expected ${expectedDestination}`);
    return error("SIMBRIEF_DESTINATION_MISMATCH");
  }
  
  // Comparación flexible de flight number (acepta PWG695 vs 695)
  if (expectedFlightNumber && ofp.flightNumber) {
    const matches = isSamePwgFlight(ofp.flightNumber, expectedFlightNumber);
    const normOfp = normalizePwgFlightNumber(ofp.flightNumber);
    const normExp = normalizePwgFlightNumber(expectedFlightNumber);
    console.info(`[simbrief-ofp] flightNumCompare: ofp=${ofp.flightNumber}(norm=${normOfp}) expected=${expectedFlightNumber}(norm=${normExp}) matches=${matches}`);
    
    if (!matches) {
      console.warn(`[simbrief-ofp] Flight number mismatch: got ${ofp.flightNumber}, expected ${expectedFlightNumber}`);
      return error("SIMBRIEF_FLIGHT_MISMATCH");
    }
  }
  
  // Validación flexible de aeronave (acepta C208 vs Cessna 208B)
  if (expectedAircraftCode && ofp.aircraftIcao) {
    const aircraftMatches = isSameDispatchAircraft(expectedAircraftCode, ofp.aircraftIcao);
    const normExpected = normalizeAircraftCode(expectedAircraftCode);
    const normOfp = normalizeAircraftCode(ofp.aircraftIcao);
    console.info(`[simbrief-ofp] aircraftCompare: ofpRaw=${ofp.aircraftIcao}(norm=${normOfp}) expected=${expectedAircraftCode}(norm=${normExpected}) matches=${aircraftMatches}`);
    
    if (!aircraftMatches) {
      console.warn(`[simbrief-ofp] Aircraft mismatch: got ${ofp.aircraftIcao} (norm=${normOfp}), expected ${expectedAircraftCode} (norm=${normExpected})`);
      return error("SIMBRIEF_AIRCRAFT_MISMATCH");
    }
  } else if (expectedAircraftCode && !ofp.aircraftIcao) {
    console.warn(`[simbrief-ofp] Aircraft not identified in OFP. Raw fields logged above.`);
    return error("SIMBRIEF_AIRCRAFT_NOT_IDENTIFIED");
  }

  console.info(`[simbrief-ofp] OFP loaded successfully for ${user.callsign}`);
  return NextResponse.json({ ok: true, ofp });
}
