import { NextResponse } from "next/server";
import { dbOne, dbQuery } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HubTableRow = {
  table_name: string | null;
};

type HubRow = {
  id: string;
  hub_code: string | null;
  hub_name: string | null;
  hub_roles: string[] | null;
  is_school_hub: boolean | null;
  allows_initial_registration: boolean | null;
  allows_training: boolean | null;
  allows_dispatch: boolean | null;
  allows_charter: boolean | null;
  allows_cargo: boolean | null;
  allows_maintenance_routine: boolean | null;
  allows_maintenance_medium: boolean | null;
  allows_maintenance_major: boolean | null;
  is_accident_recovery_base: boolean | null;
  allows_international: boolean | null;
  allows_oceanic_national: boolean | null;
  display_order: number | null;
  airport_ident: string;
  icao: string | null;
  iata: string | null;
  airport_name: string;
  city: string | null;
  country: string | null;
  latitude_deg: string | number | null;
  longitude_deg: string | number | null;
  lighting_policy: string | null;
};

function toNumber(value: string | number | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveHubTable() {
  const row = await dbOne<HubTableRow>(
    `select case
       when to_regclass('public.pw3_airline_hubs') is not null then 'pw3_airline_hubs'
       when to_regclass('public.airline_hubs') is not null then 'airline_hubs'
       else null
     end as table_name`,
  );

  return row?.table_name;
}

export async function GET() {
  const hubTable = await resolveHubTable();

  if (!hubTable) {
    return NextResponse.json({ hubs: [], source: "neon", warning: "HUB_TABLE_NOT_FOUND" });
  }

  try {
    const result = await dbQuery<HubRow>(
      `select
        h.id::text,
        h.hub_code,
        h.hub_name,
        h.hub_roles,
        h.is_school_hub,
        h.allows_initial_registration,
        h.allows_training,
        h.allows_dispatch,
        h.allows_charter,
        h.allows_cargo,
        h.allows_maintenance_routine,
        h.allows_maintenance_medium,
        h.allows_maintenance_major,
        h.is_accident_recovery_base,
        h.allows_international,
        h.allows_oceanic_national,
        h.display_order,
        a.ident as airport_ident,
        a.icao,
        a.iata,
        a.name as airport_name,
        a.city,
        a.country,
        a.latitude_deg,
        a.longitude_deg,
        a.lighting_policy
      from public.${hubTable} h
      join public.airports a on a.id = h.airport_id
      order by coalesce(h.display_order, 999), a.ident`,
    );

    return NextResponse.json({
      hubs: result.rows.map((row: HubRow) => ({
        id: row.id,
        code: row.hub_code ?? row.airport_ident,
        name: row.hub_name ?? row.airport_name,
        roles: row.hub_roles ?? [],
        airport: {
          ident: row.airport_ident,
          icao: row.icao,
          iata: row.iata,
          name: row.airport_name,
          city: row.city,
          country: row.country,
          latitude: toNumber(row.latitude_deg),
          longitude: toNumber(row.longitude_deg),
          lightingPolicy: row.lighting_policy,
        },
        permissions: {
          school: row.is_school_hub === true,
          initialRegistration: row.allows_initial_registration === true,
          training: row.allows_training === true,
          dispatch: row.allows_dispatch === true,
          charter: row.allows_charter === true,
          cargo: row.allows_cargo === true,
          maintenanceRoutine: row.allows_maintenance_routine === true,
          maintenanceMedium: row.allows_maintenance_medium === true,
          maintenanceMajor: row.allows_maintenance_major === true,
          accidentRecovery: row.is_accident_recovery_base === true,
          international: row.allows_international === true,
          oceanicNational: row.allows_oceanic_national === true,
        },
      })),
      source: "neon",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[hubs] Neon query failed", error);
    return NextResponse.json({ hubs: [], source: "neon", error: "HUBS_QUERY_FAILED" }, { status: 500 });
  }
}
