import "server-only";
import { dbOne, dbQuery } from "@/lib/db/client";
import type { AuthenticatedPilot } from "@/lib/auth/service";
import { getRankMedal } from "@/lib/ranks/medals";

type SnapshotFlight = {
  flightNumber: string;
  origin: string;
  destination: string;
  aircraftRegistration: string;
  aircraftType: string;
  status: string;
  score: number | null;
  blockTimeMinutes: number | null;
  createdAt: string | null;
};

type AirportSnapshot = {
  ident: string | null;
  icao: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function upper(value: unknown, fallback = "") {
  return text(value, fallback).toUpperCase();
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNum(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function mapReservationRow(row: Record<string, unknown>): SnapshotFlight {
  const dispatch = asJson(row.dispatch_payload);
  const flight = asJson(dispatch.flight);
  const route = asJson(dispatch.route);
  const aircraft = asJson(dispatch.aircraft);
  const simbrief = asJson(dispatch.simbrief);

  return {
    flightNumber: upper(row.assigned_callsign || flight.callsign || row.route_code, "N/A"),
    origin: upper(row.origin_ident || route.origin, "----"),
    destination: upper(row.destination_ident || route.destination, "----"),
    aircraftRegistration: upper(row.aircraft_registration || aircraft.registration, "----"),
    aircraftType: upper(row.aircraft_code || aircraft.aircraftCode, "----"),
    status: upper(row.acars_state || row.status, "UNKNOWN"),
    score: optionalNum(row.final_score),
    blockTimeMinutes: optionalNum(row.estimated_block_minutes ?? simbrief.blockTimeMinutes),
    createdAt: text(row.created_at) || null,
  };
}

export async function buildAcarsPilotSnapshot(user: AuthenticatedPilot) {
  const profile = await dbOne<{
    callsign: string | null;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    pilot_status: string | null;
    rank_code: string | null;
    career_rank_code: string | null;
    total_hours: number | null;
    career_hours: number | null;
    transferred_hours: number | null;
    pw_score: number | null;
    score: number | null;
    base_hub: string | null;
    current_airport_code: string | null;
    current_airport_icao: string | null;
  }>(
    `select
       callsign,
       first_name,
       last_name,
       display_name,
       pilot_status,
       rank_code,
       career_rank_code,
       total_hours,
       career_hours,
       transferred_hours,
       pw_score,
       score,
       base_hub,
       current_airport_code,
       current_airport_icao
     from public.pilot_profiles
     where id = $1::uuid
     limit 1`,
    [user.userId],
  );

  const rankCode = upper(profile?.career_rank_code || profile?.rank_code || user.rankCode, "CADET");
  const rank = getRankMedal(rankCode);
  const fullName =
    text(profile?.display_name) ||
    `${text(profile?.first_name)} ${text(profile?.last_name)}`.trim() ||
    text(user.displayName) ||
    text(user.email, "Piloto Patagonia Wings");

  const metrics = await dbOne<{ total_hours: number | null; avg_score: number | null }>(
    `select
       coalesce(sum(coalesce(flight_time_minutes,0)),0)::numeric / 60.0 as total_hours,
       nullif(coalesce(avg(score),0)::numeric, 0) as avg_score
     from public.pw3_flight_reports
     where pilot_user_id = $1::uuid
       and lower(final_status) in ('completed','diverted')`,
    [user.userId],
  ).catch(() => ({ total_hours: 0, avg_score: null }));

  const totalHours =
    num(profile?.total_hours) ||
    num(profile?.career_hours) ||
    num(profile?.transferred_hours) ||
    num(metrics?.total_hours) ||
    0;

  const score = optionalNum(profile?.pw_score ?? profile?.score ?? metrics?.avg_score);
  const baseIcao = upper(
    user.baseAirportIdent || user.baseAirportIcao || profile?.base_hub || profile?.current_airport_code,
  );
  const locationIcao = upper(
    user.currentAirportIdent || user.currentAirportIcao || profile?.current_airport_icao || profile?.current_airport_code || baseIcao,
  );

  const locationAirport = locationIcao
    ? await dbOne<AirportSnapshot>(
        `select ident, icao, name, city, country
         from public.airports
         where upper(coalesce(ident,'')) = $1
            or upper(coalesce(icao,'')) = $1
         limit 1`,
        [locationIcao],
      ).catch(() => null)
    : null;

  const reservations = await dbQuery<Record<string, unknown>>(
    `select
       id::text,
       route_code,
       aircraft_registration,
       aircraft_code,
       status,
       acars_state,
       origin_ident,
       destination_ident,
       final_score,
       estimated_block_minutes,
       created_at,
       dispatch_payload
     from public.training_dispatch_reservations
     where upper(coalesce(pilot_callsign, callsign, '')) = $1
     order by coalesce(sent_to_acars_at, created_at) desc
     limit 8`,
    [upper(profile?.callsign || user.callsign)],
  );

  const recentFlights = reservations.rows.map(mapReservationRow).slice(0, 5);

  const community = await dbOne<{ online: number; in_base: number }>(
    `select
       count(*)::int as online,
       count(*) filter (
         where upper(coalesce(pp.current_airport_icao, pp.current_airport_code, a.ident, a.icao, '')) = $2
       )::int as in_base
     from public.app_sessions s
     join public.app_users u on u.id = s.user_id
     left join public.pilot_profiles pp on pp.id = u.id
     left join public.airports a on a.id = pp.current_airport_id
     where s.expires_at > now()`,
    [upper(profile?.callsign || user.callsign), locationIcao || baseIcao || "----"],
  );

  const online = Math.max(1, num(community?.online, 0));
  const inBase = Math.max(
    locationIcao && baseIcao && locationIcao === baseIcao ? 1 : 0,
    num(community?.in_base, 0),
  );

  const locationName = text(user.currentAirportName || locationAirport?.name, "Aeropuerto no disponible");
  const locationCity = text(user.currentAirportCity || locationAirport?.city, "No registrado");
  const locationCountry = text(user.currentAirportCountry || locationAirport?.country, "No registrado");

  return {
    ok: true,
    pilot: {
      callsign: upper(profile?.callsign || user.callsign, "PWG000"),
      fullName,
      status: upper(profile?.pilot_status || user.pilotStatus, "ACTIVE"),
      totalHours: Math.round(totalHours * 10) / 10,
      score,
      rank: {
        code: rank.code,
        name: rank.name,
        level: rank.level,
        medalUrl: rank.medalUrl,
      },
      currentLocation: locationIcao
        ? {
            icao: locationIcao,
            name: locationName,
            city: locationCity,
            country: locationCountry,
            isHub: locationIcao === baseIcao,
            label: `${locationIcao} - ${locationName}`,
          }
        : null,
    },
    recentFlights,
    community: {
      online,
      inBase,
      baseIcao: baseIcao || null,
    },
  };
}
