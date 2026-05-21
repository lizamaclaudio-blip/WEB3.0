import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AirportSearchRow = {
  ident: string;
  icao: string | null;
  iata: string | null;
  name: string;
  city: string | null;
  country: string | null;
  iso_country: string | null;
  timezone: string | null;
  latitude_deg: string | number | null;
  longitude_deg: string | number | null;
  airport_type: string | null;
  lighting_policy: string | null;
  lighting_warning_only: boolean | null;
};

function toNumber(value: string | number | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? searchParams.get("query") ?? "").trim();
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit") ?? 20) || 20, 50));

  if (query.length < 2) {
    return NextResponse.json({ airports: [], query, source: "neon" });
  }

  try {
    let rows: AirportSearchRow[] = [];
    try {
      const result = await dbQuery<AirportSearchRow>(
        "select * from public.pw_search_airports_for_dispatch($1, $2)",
        [query, limit],
      );
      rows = result.rows;
    } catch {
      const fallback = await dbQuery<AirportSearchRow>(
        `select
           ident,
           icao,
           iata,
           name,
           city,
           country,
           iso_country,
           timezone,
           latitude_deg,
           longitude_deg,
           airport_type,
           lighting_policy,
           lighting_warning_only
         from public.airports
         where coalesce(is_active, true) = true
           and lower(coalesce(airport_type, '')) not like '%closed%'
           and (
             upper(ident) like upper($1) || '%'
             or upper(icao) like upper($1) || '%'
             or upper(iata) like upper($1) || '%'
             or upper(name) like '%' || upper($1) || '%'
             or upper(city) like '%' || upper($1) || '%'
           )
         order by ident asc
         limit $2`,
        [query, limit],
      );
      rows = fallback.rows;
    }

    return NextResponse.json({
      airports: rows.map((row: AirportSearchRow) => ({
        ident: row.ident,
        icao: row.icao,
        iata: row.iata,
        name: row.name,
        city: row.city,
        country: row.country,
        isoCountry: row.iso_country,
        timezone: row.timezone,
        latitude: toNumber(row.latitude_deg),
        longitude: toNumber(row.longitude_deg),
        airportType: row.airport_type,
        lightingPolicy: row.lighting_policy,
        lightingWarningOnly: row.lighting_warning_only !== false,
      })),
      query,
      source: "neon",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[airports/search] Neon query failed", error);
    return NextResponse.json({ airports: [], query, source: "neon", error: "AIRPORT_SEARCH_FAILED" }, { status: 500 });
  }
}
