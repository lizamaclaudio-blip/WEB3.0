import { dbOne, dbQuery } from "@/lib/db/client";
import type { AuthenticatedPilot } from "@/lib/auth/service";
import type {
  CrewCenterPayload,
  DispatchRoutePayload,
  FleetAircraftPayload,
} from "@/lib/crew/server-data";
import {
  canRankUseOperation,
  getRankOperationPermissions,
} from "@/lib/dispatch/operation-types";
import { getPilotWallet } from "@/lib/economy/wallet-db";

type RankPolicy = {
  rank_code: string;
  display_name: string;
  allows_training_free: boolean;
  allows_school_routes: boolean;
  allows_commercial_routes: boolean;
  allows_charter: boolean;
  allows_cargo: boolean;
  allows_aircraft_transfer: boolean;
  allows_pilot_reposition: boolean;
  allows_international: boolean;
  allows_oceanic: boolean;
  allows_long_range: boolean;
  allows_widebody: boolean;
  allows_instructor: boolean;
  allows_admin: boolean;
};

type FleetRow = {
  id: string;
  registration: string;
  model_code: string;
  model_name: string | null;
  variant_code: string | null;
  variant_name: string | null;
  current_airport_ident: string | null;
  aircraft_status: string;
  seats: number | null;
  cargo_kg: number | string | null;
  practical_range_nm: number | string | null;
  reserve_factor: number | string | null;
  is_widebody: boolean | null;
  is_cargo: boolean | null;
  is_training: boolean | null;
  is_commercial: boolean | null;
};

type RouteRow = {
  id: string;
  route_code: string | null;
  route_category: string | null;
  origin_ident: string | null;
  destination_ident: string | null;
  destination_name: string | null;
  destination_city: string | null;
  distance_nm: number | string | null;
  requires_oceanic: boolean | null;
  requires_international: boolean | null;
  requires_long_range: boolean | null;
  requires_widebody: boolean | null;
  allows_passenger: boolean | null;
  allows_cargo: boolean | null;
  lighting_policy: string | null;
  lighting_warning_only: boolean | null;
};

type ActiveReservationRow = {
  id: string;
  route_code: string | null;
  pilot_callsign: string | null;
  pilot_id: string | null;
  aircraft_registration: string | null;
  aircraft_type_code: string | null;
  origin_ident: string | null;
  destination_ident: string | null;
  status: string;
  reserved_at: string | null;
};

type AirportRow = {
  id: string;
  ident: string | null;
  icao: string | null;
  iata: string | null;
  name: string | null;
  city: string | null;
  municipality: string | null;
  country: string | null;
  iso_country: string | null;
  latitude_deg: number | string | null;
  longitude_deg: number | string | null;
  elevation_ft: number | string | null;
  lighting_policy: string | null;
  lighting_warning_only: boolean | null;
  is_active: boolean | null;
};

export type AvailableAircraft = {
  id: string;
  registration: string;
  model_code: string;
  display_name: string;
  variant_code: string | null;
  current_airport_ident: string | null;
  aircraft_status: string;
  seats: number | null;
  cargo_kg: number | null;
  practical_range_nm: number | null;
  reserve_factor: number;
  range_available_nm: number | null;
  flags: {
    is_widebody: boolean;
    is_cargo: boolean;
    is_training: boolean;
    is_commercial: boolean;
  };
};

export type AvailableRoute = {
  id: string;
  routeId?: string;
  route_id?: string;
  route_code: string;
  origin_ident: string;
  destination_ident: string;
  destination_name: string;
  destination_city: string;
  category: string;
  distance_nm: number;
  operation_profiles: string[];
  warnings: string[];
  available_aircraft: string[];
  blocked_reasons: string[];
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function upper(value: unknown, fallback = ""): string {
  return safeText(value, fallback).toUpperCase();
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function buildOperationProfiles(category: string, route: RouteRow): string[] {
  const profiles = [category];
  if (bool(route.allows_passenger, false)) profiles.push("PASSENGER");
  if (bool(route.allows_cargo, false)) profiles.push("CARGO");
  if (bool(route.requires_long_range, false)) profiles.push("LONG_RANGE");
  if (bool(route.requires_oceanic, false)) profiles.push("OCEANIC");
  return Array.from(new Set(profiles));
}

function operationCodeForRouteCategory(category: string, route: RouteRow) {
  const c = category.toUpperCase();
  if (["TRAINING", "SCHOOL", "CADET", "ACADEMY"].includes(c))
    return "SCHOOL_OFFICIAL_ROUTE";
  if (c === "CHARTER") return "CHARTER_OFFICIAL";
  if (c === "CARGO" || c.startsWith("CARGA") || bool(route.allows_cargo, false)) return "CARGO_OFFICIAL";
  if (c === "TRANSFER" || c === "AIRCRAFT_TRANSFER") return "AIRCRAFT_TRANSFER";
  return "COMMERCIAL_OFFICIAL_ROUTE";
}

function canRankOperateCategory(
  rank: RankPolicy,
  category: string,
  route: RouteRow,
) {
  const operationCode = operationCodeForRouteCategory(category, route);
  return canRankUseOperation(operationCode, rank).allowed;
}

function canAircraftOperateCategory(
  aircraft: AvailableAircraft,
  category: string,
  route: RouteRow,
) {
  const c = category.toUpperCase();
  if (["TRAINING", "SCHOOL", "CADET", "ACADEMY"].includes(c))
    return aircraft.flags.is_training;
  if (c === "CARGO" || c.startsWith("CARGA") || (bool(route.allows_cargo, false) && !bool(route.allows_passenger, false)))
    return aircraft.flags.is_cargo || aircraft.cargo_kg !== null;
  if (c === "PASSENGER")
    return aircraft.flags.is_commercial || (aircraft.seats ?? 0) > 0;
  if (c === "CHARTER") {
    return (
      (bool(route.allows_passenger, true) &&
        ((aircraft.seats ?? 0) > 0 || aircraft.flags.is_commercial)) ||
      (bool(route.allows_cargo, true) &&
        (aircraft.flags.is_cargo || (aircraft.cargo_kg ?? 0) > 0))
    );
  }
  return true;
}

async function getRankPolicy(rankCode: string): Promise<RankPolicy | null> {
  const rank = await getRankOperationPermissions(rankCode);
  if (!rank) return null;

  return {
    ...rank,
    display_name: safeText(rank.display_name, rank.rank_code || rankCode),
  };
}

export async function resolveOperationalContext(user: AuthenticatedPilot) {
  const currentAirportId = user.currentAirportId || user.baseAirportId;
  const rankCode = upper(user.rankCode);

  if (!currentAirportId)
    return { ok: false as const, error: "PILOT_AIRPORT_NOT_CONFIGURED" };
  if (!rankCode)
    return { ok: false as const, error: "PILOT_RANK_NOT_CONFIGURED" };

  const rank = await getRankPolicy(rankCode);
  if (!rank) return { ok: false as const, error: "RANK_POLICY_NOT_FOUND" };

  const airport = await dbOne<AirportRow>(
    `select id, ident, icao, iata, name, city, municipality, country, iso_country,
            latitude_deg, longitude_deg, elevation_ft, lighting_policy, lighting_warning_only, is_active
       from public.airports
      where id = $1
      limit 1`,
    [currentAirportId],
  );

  return { ok: true as const, currentAirportId, rank, airport };
}

export async function listAvailableAircraft(
  user: AuthenticatedPilot,
): Promise<AvailableAircraft[]> {
  const context = await resolveOperationalContext(user);
  if (!context.ok) return [];

  const rows = await dbQuery<FleetRow>(
    `select
       fa.id::text as id,
       fa.registration,
       fa.model_code,
       am.model_name,
       av.variant_code,
       av.variant_name,
       ap.ident as current_airport_ident,
       fa.aircraft_status,
       app.seats,
       app.cargo_kg,
       app.practical_range_nm,
       app.reserve_factor,
       app.is_widebody,
       app.is_cargo,
       app.is_training,
       app.is_commercial
     from public.fleet_aircraft fa
     join public.airports ap
       on ap.id = fa.current_airport_id
      and coalesce(ap.is_active, true) = true
     left join public.aircraft_models am
       on am.model_code = fa.model_code
     left join public.aircraft_variants av
       on av.model_id = am.id
     left join public.aircraft_performance_profiles app
       on app.model_id = am.id
     where fa.current_airport_id = $1
       and fa.aircraft_status = 'AVAILABLE'
       and exists (
         select 1
         from public.rank_aircraft_permissions rap
         where rap.rank_code = $2
           and rap.model_code = fa.model_code
       )
     order by fa.model_code asc, fa.registration asc`,
    [context.currentAirportId, context.rank.rank_code],
  );

  return rows.rows.map((row) => {
    const practicalRange = toNumber(row.practical_range_nm);
    const reserveFactor = toNumber(row.reserve_factor) ?? 0.85;
    return {
      id: row.id,
      registration: row.registration,
      model_code: row.model_code,
      display_name: safeText(row.model_name, row.model_code),
      variant_code: row.variant_code,
      current_airport_ident: row.current_airport_ident,
      aircraft_status: row.aircraft_status,
      seats: row.seats,
      cargo_kg: toNumber(row.cargo_kg),
      practical_range_nm: practicalRange,
      reserve_factor: reserveFactor,
      range_available_nm:
        practicalRange === null
          ? null
          : Number((practicalRange * reserveFactor).toFixed(1)),
      flags: {
        is_widebody: bool(row.is_widebody, false),
        is_cargo: bool(row.is_cargo, false),
        is_training: bool(row.is_training, false),
        is_commercial: bool(row.is_commercial, false),
      },
    } satisfies AvailableAircraft;
  });
}

export async function listAvailableRoutes(
  user: AuthenticatedPilot,
  fleet: AvailableAircraft[],
): Promise<{ origin: string; routes: AvailableRoute[] }> {
  const context = await resolveOperationalContext(user);
  if (!context.ok) return { origin: "N/A", routes: [] };

  const rows = await dbQuery<RouteRow>(
     `select
       nr.id::text as id,
       nr.route_code,
       nr.route_category,
       oa.ident as origin_ident,
       da.ident as destination_ident,
       da.name as destination_name,
       coalesce(da.city, da.municipality) as destination_city,
       nr.distance_nm,
       nr.requires_oceanic,
       nr.requires_international,
       nr.requires_long_range,
       false::boolean as requires_widebody,
       nr.allows_passenger,
       nr.allows_cargo,
       da.lighting_policy,
       da.lighting_warning_only
     from public.network_routes nr
     join public.airports oa
       on oa.id = nr.origin_airport_id
      and coalesce(oa.is_active, true) = true
     join public.airports da
       on da.id = nr.destination_airport_id
      and coalesce(da.is_active, true) = true
     where nr.origin_airport_id = $1
     order by nr.distance_nm asc nulls last, da.ident asc`,
    [context.currentAirportId],
  );

  const routes: AvailableRoute[] = rows.rows.map((row) => {
    const distance = toNumber(row.distance_nm) ?? 0;
    const category = upper(row.route_category, "STANDARD");
    const warnings: string[] = [];
    const blocked: string[] = [];

    if (bool(row.lighting_warning_only, false) && safeText(row.lighting_policy))
      warnings.push(
        `Lighting policy ${safeText(row.lighting_policy)} (warning)`,
      );
    if (!canRankOperateCategory(context.rank, category, row))
      blocked.push(`Rango ${context.rank.rank_code} no habilita ${category}`);
    if (
      bool(row.requires_international, false) &&
      !context.rank.allows_international
    )
      blocked.push("Requiere permiso internacional");
    if (bool(row.requires_oceanic, false) && !context.rank.allows_oceanic)
      blocked.push("Requiere permiso oceanico");
    if (bool(row.requires_long_range, false) && !context.rank.allows_long_range)
      blocked.push("Requiere permiso long range");
    if (bool(row.requires_widebody, false) && !context.rank.allows_widebody)
      blocked.push("Requiere permiso widebody");

    const availableAircraft = fleet
      .filter((aircraft) => {
        if (
          aircraft.range_available_nm !== null &&
          distance > aircraft.range_available_nm
        )
          return false;
        if (bool(row.requires_widebody, false) && !aircraft.flags.is_widebody)
          return false;
        if (!canAircraftOperateCategory(aircraft, category, row)) return false;
        return true;
      })
      .map((aircraft) => aircraft.registration);

    if (availableAircraft.length === 0)
      blocked.push("No hay aeronave operable para la ruta");

    return {
      id: row.id,
      routeId: row.id,
      route_id: row.id,
      route_code: safeText(
        row.route_code,
        `${upper(row.origin_ident)}-${upper(row.destination_ident)}`,
      ),
      origin_ident: upper(row.origin_ident, "N/A"),
      destination_ident: upper(row.destination_ident, "N/A"),
      destination_name: safeText(row.destination_name, "No registrado"),
      destination_city: safeText(row.destination_city, "No registrado"),
      category,
      distance_nm: Number(distance.toFixed(1)),
      operation_profiles: buildOperationProfiles(category, row),
      warnings,
      available_aircraft: availableAircraft,
      blocked_reasons: Array.from(new Set(blocked)),
    } satisfies AvailableRoute;
  });

  return {
    origin: upper(
      context.airport?.ident ||
        context.airport?.icao ||
        user.currentAirportIdent ||
        "N/A",
    ),
    routes,
  };
}

export async function loadActiveReservation(user: AuthenticatedPilot) {
  try {
    const trainingRow = await dbOne<{
      id: string;
      aircraft_registration: string | null;
      aircraft_model_code: string | null;
      origin_ident: string | null;
      destination_ident: string | null;
      operation_type: string | null;
      score_mode: string | null;
      status: string;
      expires_at: string | null;
      created_at: string | null;
      acars_status: string | null;
    }>(
      `select
         id::text,
         aircraft_registration,
         aircraft_model_code,
         origin_ident,
         destination_ident,
         operation_type,
         score_mode,
         status,
         expires_at::text,
         created_at::text,
         acars_status
       from public.training_dispatch_reservations
       where pilot_user_id = $1::uuid
         and (
           status in ('ACARS_CLAIMED','RESERVED','DISPATCHED','IN_FLIGHT','LANDED','PENDING_EVALUATION','EVALUATED')
           or (status in ('TEMP_RESERVED','ACARS_READY') and expires_at > now())
         )
       order by updated_at desc nulls last, created_at desc nulls last
       limit 1`,
      [user.userId],
    );

    if (trainingRow) {
      const operationType = upper(trainingRow.operation_type, "TRAINING_FREE");
      const operationLabels: Record<string, string> = {
        TRAINING_FREE: "Entrenamiento libre",
        SCHOOL_OFFICIAL_ROUTE: "Ruta oficial",
        COMMERCIAL_OFFICIAL_ROUTE: "Ruta oficial",
        CHARTER_OFFICIAL: "Charter",
        CARGO_OFFICIAL: "Carga",
        AIRCRAFT_TRANSFER: "Traslado de aeronave",
        EVENT_TOUR: "Evento / Tour",
      };

      return {
        id: trainingRow.id,
        flightNumber: operationLabels[operationType] ?? operationType.replaceAll("_", " "),
        origin: upper(trainingRow.origin_ident, "No registrado"),
        destination: upper(trainingRow.destination_ident, "No registrado"),
        aircraft: upper(trainingRow.aircraft_model_code || trainingRow.aircraft_registration, "No registrado"),
        aircraftRegistration: upper(trainingRow.aircraft_registration, "No registrado"),
        aircraftType: upper(trainingRow.aircraft_model_code, "No registrado"),
        registration: upper(trainingRow.aircraft_registration, "No registrado"),
        status: safeText(trainingRow.status, "No registrado"),
        scheduledDeparture: trainingRow.created_at,
        simbriefStatus: "No aplica",
        acarsStatus: safeText(trainingRow.acars_status, safeText(trainingRow.status, "No conectado")),
      };
    }
  } catch {
    // La tabla de despacho temporal puede no existir en bases antiguas; continuar con flight_reservations.
  }

  let row: ActiveReservationRow | null = null;
  try {
    row = await dbOne<ActiveReservationRow>(
      `select
       fr.id::text as id,
       fr.route_code,
       fr.pilot_callsign,
       fr.pilot_id::text as pilot_id,
       fr.aircraft_registration,
       fr.aircraft_type_code,
       oa.ident as origin_ident,
       da.ident as destination_ident,
       fr.status,
       fr.reserved_at
     from public.flight_reservations fr
     left join public.airports oa on oa.id = fr.origin_airport_id
     left join public.airports da on da.id = fr.destination_airport_id
     where ((fr.pilot_id::text = $1) or (upper(coalesce(fr.pilot_callsign, '')) = upper(coalesce($2, ''))))
       and lower(fr.status) in ('reserved','draft','booked','confirmed','active','in_progress','dispatched','dispatch_ready','in_flight','preparing')
     order by fr.updated_at desc nulls last, fr.reserved_at desc nulls last
     limit 1`,
      [user.userId, user.callsign],
    );
  } catch {
    return null;
  }

  if (!row) return null;
  return {
    id: row.id,
    flightNumber: safeText(row.route_code, "No registrado"),
    origin: upper(row.origin_ident, "No registrado"),
    destination: upper(row.destination_ident, "No registrado"),
    aircraft: upper(
      row.aircraft_type_code || row.aircraft_registration,
      "No registrado",
    ),
    aircraftRegistration: upper(row.aircraft_registration, "No registrado"),
    aircraftType: upper(row.aircraft_type_code, "No registrado"),
    registration: upper(row.aircraft_registration, "No registrado"),
    status: safeText(row.status, "No registrado"),
    scheduledDeparture: row.reserved_at,
    simbriefStatus: "No disponible",
    acarsStatus: "No conectado",
  };
}

async function fetchMetarSnapshot(icao: string | null) {
  const station = upper(icao);
  if (!station) return null;
  const url = new URL("https://aviationweather.gov/api/data/metar");
  url.searchParams.set("ids", station);
  url.searchParams.set("format", "json");
  try {
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok || response.status === 204) return null;
    const payload = (await response.json().catch(() => null)) as Array<{
      rawOb?: string | null;
      obsTime?: string | null;
      receiptTime?: string | null;
      icaoId?: string | null;
    }> | null;
    const metar = payload?.[0];
    if (!metar) return null;
    return {
      station: upper(metar.icaoId, station),
      raw: metar.rawOb ?? null,
      observedAt: metar.obsTime ?? metar.receiptTime ?? null,
    };
  } catch {
    return null;
  }
}

async function resolveHeroSnapshot(
  airport: { icao: string; city: string; country: string; name: string } | null,
) {
  if (!airport) return { imageUrl: null, source: "default" };
  const cityTitle = [airport.city, airport.country].filter(Boolean).join(", ");
  const title = cityTitle || airport.name || airport.icao;
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("pithumbsize", "1200");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);
  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) return { imageUrl: null, source: "default" };
    const payload = (await response.json().catch(() => null)) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    } | null;
    const page = Object.values(payload?.query?.pages ?? {}).find(
      (item) => item?.thumbnail?.source,
    );
    if (!page?.thumbnail?.source) return { imageUrl: null, source: "default" };
    return { imageUrl: page.thumbnail.source, source: "wikimedia" };
  } catch {
    return { imageUrl: null, source: "default" };
  }
}

export async function buildCrewCenterPayload(
  user: AuthenticatedPilot,
): Promise<CrewCenterPayload> {
  const context = await resolveOperationalContext(user);
  const fleet = await listAvailableAircraft(user);
  const routeResult = await listAvailableRoutes(user, fleet);
  const activeReservation = await loadActiveReservation(user);
  const contextAirport = context.ok ? context.airport : null;

  const airport = contextAirport
    ? {
        icao: upper(contextAirport.ident || contextAirport.icao, "N/A"),
        iata: contextAirport.iata,
        name: safeText(contextAirport.name, "Aeropuerto asignado"),
        city: safeText(
          contextAirport.city || contextAirport.municipality,
          "No registrado",
        ),
        country: safeText(
          contextAirport.country || contextAirport.iso_country,
          "No registrado",
        ),
        countryCode: contextAirport.iso_country,
        flagCountryCode: contextAirport.iso_country,
        lat: toNumber(contextAirport.latitude_deg) ?? 0,
        lng: toNumber(contextAirport.longitude_deg) ?? 0,
        elevationFt: toNumber(contextAirport.elevation_ft),
        timezone: null,
      }
    : null;

  const rankName = context.ok
    ? context.rank.display_name
    : user.rankCode || "No registrado";
  const routesEnabled = routeResult.routes.filter(
    (route) => route.blocked_reasons.length === 0,
  ).length;
  const cadetTrainingRoute =
    upper(user.rankCode) === "CADET"
      ? routeResult.routes.find(
          (route) =>
            route.category === "TRAINING" && route.blocked_reasons.length === 0,
        )
      : null;
  const walletRow = await getPilotWallet(user.userId, user.callsign).catch(() => null);
  const walletBalanceCoins = Math.round(walletRow?.wallet_balance_usd ?? 0);
  const stats = await dbOne<{ total_pireps: number; total_hours: number; avg_score: number }>(
    `select
       count(*)::int as total_pireps,
       coalesce(sum(coalesce(flight_time_minutes,0)),0)::numeric / 60.0 as total_hours,
       coalesce(avg(score),0)::numeric as avg_score
     from public.pw3_flight_reports
     where pilot_user_id = $1::uuid
       and lower(final_status) in ('completed','diverted')`,
    [user.userId],
  ).catch(() => ({ total_pireps: 0, total_hours: 0, avg_score: 0 }));
  const totalPireps = Math.max(0, Number(stats?.total_pireps ?? 0));
  const totalHours = Number((Number(stats?.total_hours ?? 0)).toFixed(1));
  const avgScore = Math.round(Number(stats?.avg_score ?? 0));

  const metar = await fetchMetarSnapshot(airport?.icao ?? null);
  const airportHero = await resolveHeroSnapshot(
    airport
      ? {
          icao: airport.icao,
          city: airport.city,
          country: airport.country,
          name: airport.name,
        }
      : null,
  );
  const notices: Record<string, unknown>[] = [];
  if (upper(user.pilotStatus) === "PENDING_APPROVAL")
    notices.push({
      level: "info",
      code: "PENDING_APPROVAL",
      message: "Cuenta pendiente de aprobacion",
    });
  if (cadetTrainingRoute)
    notices.push({
      level: "info",
      code: "SUGGESTED_TRAINING",
      route: cadetTrainingRoute.route_code,
    });
  if (
    airport &&
    contextAirport &&
    bool(contextAirport.lighting_warning_only, false) &&
    safeText(contextAirport.lighting_policy)
  )
    notices.push({
      level: "warning",
      code: "LIGHTING_POLICY",
      message: `Lighting policy ${contextAirport.lighting_policy}`,
    });

  const pilotCallsign = safeText(user.callsign, "No registrado");
  if (airport)
    console.info(
      `[crew] current airport ok callsign=${pilotCallsign} airport=${airport.icao}`,
    );

  return {
    pilot: {
      id: user.userId,
      name: safeText(user.displayName, pilotCallsign),
      callsign: pilotCallsign,
      rank: rankName,
      rankCode: safeText(user.rankCode, "No registrado"),
      baseIcao: upper(user.baseAirportIdent, "No registrado"),
      status: safeText(user.pilotStatus, "No registrado"),
      baseAirportId: user.baseAirportId,
      currentAirportId: user.currentAirportId,
      licenses: [],
      ratings: [],
      hours: 0,
      progress: 0,
      avatarUrl: null,
    },
    hub: airport,
    airport,
    activeReservation,
    reservedFlight: activeReservation,
    recentFlights: [],
    recentPireps: [],
    economy: null,
    acars: null,
    notices,
    dispatchSummary: {
      routesAvailable: routesEnabled,
      aircraftAvailable: fleet.length,
      activeReservation: Boolean(activeReservation),
    },
    counters: {
      monthPosition: 0,
      monthHours: 0,
      totalPireps,
      totalHours,
      score: avgScore,
      coins: walletBalanceCoins,
    },
    suggestedTrainingRoute: cadetTrainingRoute?.route_code ?? null,
    airportHero,
    metar,
    movements: [],
    routes: routeResult.routes.map(
      (route): DispatchRoutePayload => ({
        id: route.id,
        flightNumber: route.route_code,
        origin: route.origin_ident,
        destination: route.destination_ident,
        originAirport: route.origin_ident,
        destinationAirport: route.destination_city,
        distanceNm: route.distance_nm,
        aircraftTypeRequired: route.available_aircraft.length
          ? route.available_aircraft.join(" / ")
          : "No disponible",
        estimatedTime: "No disponible",
        routeType: route.category,
        active: route.blocked_reasons.length === 0,
        rankRequired: safeText(user.rankCode, "No registrado"),
        licenseRequired: null,
        blockedReason: route.blocked_reasons[0] ?? null,
      }),
    ),
    fleet: fleet.map(
      (aircraft): FleetAircraftPayload => ({
        id: aircraft.id,
        registration: aircraft.registration,
        aircraftType: aircraft.model_code,
        aircraftTypeCode: aircraft.model_code,
        modelDisplayName: aircraft.display_name,
        variant: aircraft.variant_code ?? "No registrado",
        status: aircraft.aircraft_status,
        locationAirport: upper(aircraft.current_airport_ident, "No registrado"),
        rangeNm: aircraft.practical_range_nm,
        rankRequired: safeText(user.rankCode, "No registrado"),
        licenseRequired: "No aplica",
        enabled: true,
        image: null,
        blockedReason: null,
      }),
    ),
    pilots: [
      {
        callsign: pilotCallsign,
        name: safeText(user.displayName, "Piloto"),
        rank: rankName,
        hours: String(totalHours),
        pireps: String(totalPireps),
        score: String(avgScore),
      },
    ],
    permissions: {
      permittedAircraftTypes: fleet.map((item) => item.model_code),
      allowedDispatchAirports: airport ? [airport.icao] : [],
    },
    source: "neon",
    updatedAt: new Date().toISOString(),
  };
}
