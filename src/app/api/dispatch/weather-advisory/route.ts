import { NextRequest, NextResponse } from "next/server";
import { dbOne, dbQuery } from "@/lib/db/client";
import { buildOperationalAdvisory, type RunwayCandidate } from "@/lib/weather/operational-advisory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 600;

type AirportRow = {
  ident: string | null;
  icao: string | null;
  name: string | null;
  city: string | null;
  latitude_deg: number | string | null;
  longitude_deg: number | string | null;
};

type CandidateRow = {
  ident: string;
  icao: string;
  distance_nm: number | string;
};

type RunwayRow = {
  le_ident: string | null;
  le_heading_degt: number | string | null;
  he_ident: string | null;
  he_heading_degt: number | string | null;
  closed: boolean | number | string | null;
  length_ft: number | string | null;
  surface: string | null;
  lighted: boolean | number | string | null;
};

type MetarApiRow = {
  icaoId?: string | null;
  rawOb?: string | null;
  rawTAF?: string | null;
  rawTaf?: string | null;
  raw?: string | null;
};

const AVIATION_WEATHER_METAR_URL = "https://aviationweather.gov/api/data/metar";
const AVIATION_WEATHER_TAF_URL = "https://aviationweather.gov/api/data/taf";

function sanitize(code: string | null | undefined) {
  return (code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseWind(raw: string | null) {
  if (!raw) return { direction: null as number | null, speedKt: null as number | null, gustKt: null as number | null };
  const match = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (!match) return { direction: null, speedKt: null, gustKt: null };
  return {
    direction: match[1] === "VRB" ? null : Number(match[1]),
    speedKt: Number(match[2]),
    gustKt: match[3] ? Number(match[3]) : null,
  };
}

function parseVisibilityMeters(raw: string | null) {
  if (!raw) return null;
  if (/\bCAVOK\b/.test(raw)) return 10000;
  const m = raw.match(/\b(\d{4})\b/);
  if (!m) return null;
  return Number(m[1]);
}

function parseCeilingFt(raw: string | null) {
  if (!raw) return null;
  const layers = [...raw.matchAll(/\b(BKN|OVC|VV)(\d{3})\b/g)];
  if (!layers.length) return null;
  return Math.min(...layers.map((layer) => Number(layer[2]) * 100));
}

function parseTemperatureC(raw: string | null) {
  if (!raw) return null;
  const m = raw.match(/\s(M?\d{2})\/(M?\d{2})\s/);
  if (!m) return null;
  return m[1].startsWith("M") ? -Number(m[1].slice(1)) : Number(m[1]);
}

function parseQnh(raw: string | null) {
  if (!raw) return null;
  const q = raw.match(/\bQ(\d{4})\b/);
  if (q) return Number(q[1]);
  const a = raw.match(/\bA(\d{4})\b/);
  if (!a) return null;
  const inHg = Number(a[1]) / 100;
  return Math.round(inHg * 33.8639);
}

function asBool(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function headingFromRunwayIdent(ident: string | null | undefined) {
  const match = (ident ?? "").trim().toUpperCase().match(/^(\d{1,2})/);
  if (!match) return null;
  const runwayNumber = Number(match[1]);
  if (!Number.isFinite(runwayNumber) || runwayNumber < 1 || runwayNumber > 36) return null;
  return runwayNumber === 36 ? 360 : runwayNumber * 10;
}

function resolveRunwayHeading(value: unknown, ident: string | null | undefined) {
  return toNumber(value) ?? headingFromRunwayIdent(ident);
}

async function fetchMetarByStation(station: string) {
  const url = new URL(AVIATION_WEATHER_METAR_URL);
  url.searchParams.set("ids", station);
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal, next: { revalidate: 600 } });
    if (!response.ok || response.status === 204) return null;
    const payload = (await response.json().catch(() => null)) as MetarApiRow[] | null;
    const metar = payload?.[0];
    if (!metar?.rawOb) return null;
    return metar;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTafByStation(station: string) {
  const url = new URL(AVIATION_WEATHER_TAF_URL);
  url.searchParams.set("ids", station);
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal, next: { revalidate: 600 } });
    if (!response.ok || response.status === 204) return null;
    const payload = (await response.json().catch(() => null)) as MetarApiRow[] | null;
    const taf = payload?.[0];
    return taf?.rawTAF ?? taf?.rawTaf ?? taf?.rawOb ?? taf?.raw ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveAirport(code: string) {
  return await dbOne<AirportRow>(
    `select ident, icao, name, city, latitude_deg, longitude_deg
       from public.airports
      where upper(ident) = $1 or upper(icao) = $1
      limit 1`,
    [code],
  );
}

async function nearestMetarCandidates(code: string, lat: number, lng: number, maxNm: number, limit: number) {
  const result = await dbQuery<CandidateRow>(
    `with candidates as (
       select
         ident,
         icao,
         3440.065 * acos(
           least(1.0, greatest(-1.0,
             cos(radians($1)) * cos(radians(latitude_deg::float8)) * cos(radians(longitude_deg::float8) - radians($2)) +
             sin(radians($1)) * sin(radians(latitude_deg::float8))
           ))
         ) as distance_nm
       from public.airports
       where coalesce(is_active, true) = true
         and icao ~ '^[A-Z]{4}$'
         and latitude_deg is not null
         and longitude_deg is not null
         and lower(coalesce(airport_type, '')) in ('large_airport','medium_airport','small_airport')
         and upper(ident) <> $3
         and upper(icao) <> $3
     )
     select ident, icao, distance_nm
     from candidates
     where distance_nm <= $4
     order by distance_nm asc
     limit $5`,
    [lat, lng, code, maxNm, limit],
  );
  return result.rows;
}

async function loadRunwaysForAirport(ident: string): Promise<RunwayCandidate[]> {
  let rows: RunwayRow[] = [];

  try {
    const result = await dbQuery<RunwayRow>(
      `select
         le_ident,
         "le_heading_degT" as le_heading_degt,
         he_ident,
         "he_heading_degT" as he_heading_degt,
         closed,
         length_ft,
         surface,
         lighted
       from public.ourairports_runways_import
      where upper(airport_ident) = $1
      order by public.pw3_to_numeric(length_ft) desc nulls last
      limit 80`,
      [ident],
    );
    rows = result.rows;
  } catch {
    console.warn(`[weather] runway import unavailable ident=${ident}`);
  }

  if (!rows.length) {
    const result = await dbQuery<RunwayRow>(
      `select
         ar.le_ident,
         null::numeric as le_heading_degt,
         ar.he_ident,
         null::numeric as he_heading_degt,
         ar.closed,
         ar.length_ft,
         ar.surface,
         ar.lighted
       from public.airport_runways ar
       join public.airports ap on ap.id = ar.airport_id
      where upper(coalesce(ar.airport_ident, ap.ident)) = $1
         or upper(ap.ident) = $1
         or upper(coalesce(ap.icao, '')) = $1
      order by coalesce(ar.length_ft, 0) desc nulls last
      limit 80`,
      [ident],
    );
    rows = result.rows;
  }

  const runways: RunwayCandidate[] = [];
  for (const row of rows) {
    const leHeading = resolveRunwayHeading(row.le_heading_degt, row.le_ident);
    const heHeading = resolveRunwayHeading(row.he_heading_degt, row.he_ident);
    const shared = {
      isClosed: asBool(row.closed),
      lengthFt: toNumber(row.length_ft),
      surface: row.surface,
      lighted: row.lighted === null ? null : asBool(row.lighted),
    };
    if (row.le_ident && leHeading !== null) {
      runways.push({ runwayIdent: row.le_ident.trim().toUpperCase(), runwayHeadingDeg: Math.round(leHeading) % 360, ...shared });
    }
    if (row.he_ident && heHeading !== null) {
      runways.push({ runwayIdent: row.he_ident.trim().toUpperCase(), runwayHeadingDeg: Math.round(heHeading) % 360, ...shared });
    }
  }

  return runways;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
  });
}

export async function GET(request: NextRequest) {
  const requestedIdent = sanitize(request.nextUrl.searchParams.get("ident") || request.nextUrl.searchParams.get("icao"));
  if (!requestedIdent) {
    return json({ ok: false, message: "ident/icao requerido" }, 400);
  }

  const requestedAirport = await resolveAirport(requestedIdent);
  const directStation = sanitize(requestedAirport?.icao || requestedAirport?.ident || requestedIdent);

  let stationIdent = directStation;
  let isNearestStation = false;
  let distanceNm = 0;
  let rawMetar: string | null = null;

  if (directStation) {
    const direct = await fetchMetarByStation(directStation);
    if (direct?.rawOb) {
      rawMetar = direct.rawOb;
      stationIdent = sanitize(direct.icaoId) || directStation;
      console.info(`[metar] direct station=${stationIdent}`);
    }
  }

  if (!rawMetar) {
    const lat = toNumber(requestedAirport?.latitude_deg);
    const lng = toNumber(requestedAirport?.longitude_deg);
    if (lat !== null && lng !== null) {
      for (const radius of [80, 150, 300]) {
        const candidates = await nearestMetarCandidates(requestedIdent, lat, lng, radius, 15);
        for (const candidate of candidates.slice(0, 10)) {
          const station = sanitize(candidate.icao || candidate.ident);
          if (!station) continue;
          const metar = await fetchMetarByStation(station);
          if (!metar?.rawOb) continue;
          rawMetar = metar.rawOb;
          stationIdent = sanitize(metar.icaoId) || station;
          isNearestStation = true;
          distanceNm = Number((toNumber(candidate.distance_nm) ?? 0).toFixed(1));
          console.info(`[metar] fallback requested=${requestedIdent} station=${stationIdent} distance_nm=${distanceNm}`);
          break;
        }
        if (rawMetar) break;
      }
    }
  }

  const wind = parseWind(rawMetar);
  const rawTaf = stationIdent ? await fetchTafByStation(stationIdent) : null;
  const includeRunwayDetails = Boolean(rawMetar) && !isNearestStation;
  const runways = includeRunwayDetails ? await loadRunwaysForAirport(requestedIdent) : [];
  const advisory = buildOperationalAdvisory({
    requestedIdent,
    airportName: requestedAirport?.name,
    city: requestedAirport?.city,
    stationIdent,
    isNearestStation,
    distanceNm,
    rawMetar,
    rawTaf,
    windDirectionDeg: wind.direction,
    windSpeedKt: wind.speedKt,
    windGustKt: wind.gustKt,
    visibilityMeters: parseVisibilityMeters(rawMetar),
    ceilingFt: parseCeilingFt(rawMetar),
    temperatureC: parseTemperatureC(rawMetar),
    qnhHpa: parseQnh(rawMetar),
    runways,
    includeRunwayDetails,
  });

  return json({
    ok: true,
    requestedIdent,
    stationIdent,
    isNearestStation,
    distanceNm,
    riskLevel: advisory.riskLevel,
    title: advisory.title,
    updatedLabel: advisory.updatedLabel,
    currentConditions: advisory.currentConditions,
    operationalMessage: advisory.operationalMessage,
    runwayStatus: advisory.runwayStatus,
    suggestedRunway: advisory.suggestedRunway,
    forecast: advisory.forecast,
    nextUpdate: advisory.nextUpdate,
    summary: advisory.summary,
    advisories: advisory.advisories,
    briefingText: advisory.briefingText,
    blocking: advisory.blocking,
    rawMetar,
    source: advisory.source,
    generatedAt: advisory.generatedAt,
  });
}
