import { NextRequest, NextResponse } from "next/server";
import { dbOne, dbQuery } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 900;

type AirportRow = {
  ident: string | null;
  icao: string | null;
  latitude_deg: number | string | null;
  longitude_deg: number | string | null;
};

type CandidateRow = {
  ident: string;
  icao: string;
  distance_nm: number | string;
};

type MetarApiRow = {
  icaoId?: string | null;
  rawOb?: string | null;
  obsTime?: string | null;
  receiptTime?: string | number | null;
};

const AVIATION_WEATHER_URL = "https://aviationweather.gov/api/data/metar";

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

function withCache(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
  });
}

function parseWind(raw: string | null) {
  if (!raw) return "N/D";
  const match = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (!match) return "N/D";
  const dir = match[1] === "VRB" ? "VRB" : `${match[1]}°`;
  const speed = Number(match[2]);
  const gust = match[3] ? Number(match[3]) : null;
  return gust ? `${dir} ${speed}kt G${gust}` : `${dir} ${speed}kt`;
}

function parseVisibility(raw: string | null) {
  if (!raw) return "N/D";
  if (/\bCAVOK\b/.test(raw)) return "CAVOK";
  const m = raw.match(/\b(\d{4})\b/);
  if (!m) return "N/D";
  const meters = Number(m[1]);
  if (meters >= 9999) return "> 10 km";
  return `${(meters / 1000).toFixed(1)} km`;
}

function parseTempDew(raw: string | null) {
  if (!raw) return { temperature: "N/D", dewpoint: "N/D" };
  const m = raw.match(/\s(M?\d{2})\/(M?\d{2})\s/);
  if (!m) return { temperature: "N/D", dewpoint: "N/D" };
  const parse = (v: string) => (v.startsWith("M") ? `-${v.slice(1)}` : v);
  return { temperature: `${parse(m[1])}°C`, dewpoint: `${parse(m[2])}°C` };
}

function parseQnh(raw: string | null) {
  if (!raw) return "N/D";
  const q = raw.match(/\bQ(\d{4})\b/);
  if (q) return `${q[1]} hPa`;
  const a = raw.match(/\bA(\d{4})\b/);
  if (!a) return "N/D";
  const inHg = Number(a[1]) / 100;
  const hpa = Math.round(inHg * 33.8639);
  return `${hpa} hPa`;
}

async function fetchMetarByStation(station: string) {
  const url = new URL(AVIATION_WEATHER_URL);
  url.searchParams.set("ids", station);
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal, next: { revalidate: 900 } });
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

async function resolveAirport(code: string) {
  return await dbOne<AirportRow>(
    `select ident, icao, latitude_deg, longitude_deg
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

export async function GET(request: NextRequest) {
  const requestedCode = sanitize(request.nextUrl.searchParams.get("ident") || request.nextUrl.searchParams.get("icao"));
  if (!requestedCode) {
    return withCache({ ok: false, metar: null, message: "ident/icao requerido" }, 400);
  }

  const requestedAirport = await resolveAirport(requestedCode);
  const directStation = sanitize(requestedAirport?.icao || requestedAirport?.ident || requestedCode);

  if (directStation) {
    const direct = await fetchMetarByStation(directStation);
    if (direct?.rawOb) {
      const raw = direct.rawOb;
      const td = parseTempDew(raw);
      console.info(`[metar] direct station=${directStation}`);
      return withCache({
        ok: true,
        requested_ident: requestedCode,
        station_ident: sanitize(direct.icaoId) || directStation,
        is_nearest_station: false,
        distance_nm: 0,
        message: null,
        raw_metar: raw,
        raw,
        observedAt: direct.obsTime ?? (typeof direct.receiptTime === "string" ? direct.receiptTime : null),
        updatedAt: new Date().toISOString(),
        clouds: "N/D",
        wind: parseWind(raw),
        visibility: parseVisibility(raw),
        temperature: td.temperature,
        dewpoint: td.dewpoint,
        qnh: parseQnh(raw),
        flightCategory: null,
        weather: null,
        source: "aviationweather",
      });
    }
  }

  const lat = toNumber(requestedAirport?.latitude_deg);
  const lng = toNumber(requestedAirport?.longitude_deg);
  if (lat === null || lng === null) {
    return withCache({ ok: false, requested_ident: requestedCode, metar: null, message: "METAR no disponible" });
  }

  for (const radius of [80, 150, 300]) {
    const candidates = await nearestMetarCandidates(requestedCode, lat, lng, radius, 15);
    for (const candidate of candidates.slice(0, 10)) {
      const station = sanitize(candidate.icao || candidate.ident);
      if (!station) continue;
      const metar = await fetchMetarByStation(station);
      if (!metar?.rawOb) continue;

      const distance = Number((toNumber(candidate.distance_nm) ?? 0).toFixed(1));
      const raw = metar.rawOb;
      const td = parseTempDew(raw);
      console.info(`[metar] fallback requested=${requestedCode} station=${station} distance_nm=${distance}`);

      return withCache({
        ok: true,
        requested_ident: requestedCode,
        station_ident: sanitize(metar.icaoId) || station,
        is_nearest_station: true,
        distance_nm: distance,
        message: `METAR no disponible en ${requestedCode}; se usa estacion cercana ${sanitize(metar.icaoId) || station}.`,
        raw_metar: raw,
        raw,
        observedAt: metar.obsTime ?? (typeof metar.receiptTime === "string" ? metar.receiptTime : null),
        updatedAt: new Date().toISOString(),
        clouds: "N/D",
        wind: parseWind(raw),
        visibility: parseVisibility(raw),
        temperature: td.temperature,
        dewpoint: td.dewpoint,
        qnh: parseQnh(raw),
        flightCategory: null,
        weather: null,
        source: "aviationweather",
      });
    }
  }

  return withCache({ ok: false, requested_ident: requestedCode, metar: null, message: "METAR no disponible" });
}
