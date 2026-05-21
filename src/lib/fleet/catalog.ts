import "server-only";

import { dbQuery, existingColumns, tableExists } from "@/lib/db/client";
import type { AuthenticatedPilot } from "@/lib/auth/service";
import type { FleetAircraftPayload } from "@/lib/crew/server-data";

type FleetCatalogRow = {
  id: string;
  registration: string | null;
  model_code: string | null;
  model_name: string | null;
  variant_code: string | null;
  variant_name: string | null;
  aircraft_status: string | null;
  current_airport_ident: string | null;
  current_airport_name: string | null;
  home_airport_ident: string | null;
  home_airport_name: string | null;
  seats: number | string | null;
  cargo_kg: number | string | null;
  practical_range_nm: number | string | null;
  required_rank_code: string | null;
  allowed_rank_codes: string | null;
  engine_health: number | string | null;
  fuselage_health: number | string | null;
  gear_health: number | string | null;
  overall_health: number | string | null;
};

export type FleetCatalogAircraft = FleetAircraftPayload & {
  currentAirportName: string | null;
  homeAirport: string | null;
  homeAirportName: string | null;
  seats: number | null;
  cargoKg: number | null;
  allowedRankCodes: string[];
  canFly: boolean;
  overallHealth: number | null;
  engineHealth: number | null;
  fuselageHealth: number | null;
  gearHealth: number | null;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function upper(value: unknown, fallback = "") {
  return text(value, fallback).toUpperCase();
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function splitRankCodes(value: string | null) {
  return (value ?? "")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusLabel(status: string) {
  const normalized = upper(status, "UNKNOWN");

  switch (normalized) {
    case "AVAILABLE":
      return "AVAILABLE";
    case "RESERVED":
    case "TEMP_RESERVED":
      return "RESERVED";
    case "IN_FLIGHT":
      return "IN_FLIGHT";
    case "MAINTENANCE":
      return "MAINTENANCE";
    case "UNAVAILABLE":
      return "UNAVAILABLE";
    default:
      return normalized;
  }
}

export async function listFleetCatalog(user?: AuthenticatedPilot | null): Promise<FleetCatalogAircraft[]> {
  const fleetTableExists = await tableExists("fleet_aircraft");
  if (!fleetTableExists) return [];

  const fleetColumns = await existingColumns("fleet_aircraft", [
    "home_airport_id",
    "hub_airport_id",
    "base_airport_id",
    "engine_health",
    "fuselage_health",
    "gear_health",
    "overall_health",
  ]);

  const hasModels = await tableExists("aircraft_models");
  const hasVariants = await tableExists("aircraft_variants");
  const hasPerformance = await tableExists("aircraft_performance_profiles");
  const hasRankPermissions = await tableExists("rank_aircraft_permissions");

  const homeAirportExpr = fleetColumns.has("home_airport_id")
    ? "fa.home_airport_id"
    : fleetColumns.has("hub_airport_id")
      ? "fa.hub_airport_id"
      : fleetColumns.has("base_airport_id")
        ? "fa.base_airport_id"
        : "null::uuid";

  const modelJoin = hasModels
    ? "left join public.aircraft_models am on am.model_code = fa.model_code"
    : "left join lateral (select null::uuid as id, fa.model_code as model_code, null::text as model_name) am on true";

  const variantJoin = hasModels && hasVariants
    ? `left join lateral (
         select av.variant_code, av.variant_name
         from public.aircraft_variants av
         where av.model_id = am.id
         order by av.variant_code asc nulls last
         limit 1
       ) av on true`
    : "left join lateral (select null::text as variant_code, null::text as variant_name) av on true";

  const performanceJoin = hasModels && hasPerformance
    ? `left join lateral (
         select app.seats, app.cargo_kg, app.practical_range_nm
         from public.aircraft_performance_profiles app
         where app.model_id = am.id
         order by app.practical_range_nm desc nulls last
         limit 1
       ) app on true`
    : "left join lateral (select null::integer as seats, null::numeric as cargo_kg, null::numeric as practical_range_nm) app on true";

  const rankJoin = hasRankPermissions
    ? `left join lateral (
         select
           min(rap.rank_code) as required_rank_code,
           string_agg(distinct rap.rank_code, ' / ' order by rap.rank_code) as allowed_rank_codes
         from public.rank_aircraft_permissions rap
         where rap.model_code = fa.model_code
       ) ranks on true`
    : "left join lateral (select null::text as required_rank_code, null::text as allowed_rank_codes) ranks on true";

  const engineHealthExpr = fleetColumns.has("engine_health") ? "fa.engine_health" : "100::numeric";
  const fuselageHealthExpr = fleetColumns.has("fuselage_health") ? "fa.fuselage_health" : "100::numeric";
  const gearHealthExpr = fleetColumns.has("gear_health") ? "fa.gear_health" : "100::numeric";
  const overallHealthExpr = fleetColumns.has("overall_health") ? "fa.overall_health" : "100::numeric";

  const rows = await dbQuery<FleetCatalogRow>(
    `select
       fa.id::text as id,
       fa.registration,
       fa.model_code,
       am.model_name,
       av.variant_code,
       av.variant_name,
       fa.aircraft_status,
       current_airport.ident as current_airport_ident,
       current_airport.name as current_airport_name,
       home_airport.ident as home_airport_ident,
       home_airport.name as home_airport_name,
       app.seats,
       app.cargo_kg,
       app.practical_range_nm,
       ranks.required_rank_code,
       ranks.allowed_rank_codes,
       ${engineHealthExpr} as engine_health,
       ${fuselageHealthExpr} as fuselage_health,
       ${gearHealthExpr} as gear_health,
       ${overallHealthExpr} as overall_health
     from public.fleet_aircraft fa
     left join public.airports current_airport
       on current_airport.id = fa.current_airport_id
     left join public.airports home_airport
       on home_airport.id = ${homeAirportExpr}
     ${modelJoin}
     ${variantJoin}
     ${performanceJoin}
     ${rankJoin}
     order by fa.model_code asc nulls last, fa.registration asc nulls last`,
  );

  const pilotRankCode = upper(user?.rankCode);

  return rows.rows.map((row): FleetCatalogAircraft => {
    const status = statusLabel(text(row.aircraft_status, "UNKNOWN"));
    const registration = text(row.registration, "SIN MATRICULA");
    const modelCode = upper(row.model_code, "N/D");
    const allowedRanks = splitRankCodes(row.allowed_rank_codes);
    const requiredRank = text(row.required_rank_code, allowedRanks[0] ?? "No definido");
    const canFly = Boolean(pilotRankCode && allowedRanks.map((item) => upper(item)).includes(pilotRankCode));

    return {
      id: row.id,
      registration,
      aircraftType: modelCode,
      aircraftTypeCode: modelCode,
      modelDisplayName: text(row.model_name, modelCode),
      variant: text(row.variant_name || row.variant_code, "No registrado"),
      status,
      locationAirport: upper(row.current_airport_ident, "No registrado"),
      rangeNm: toNumber(row.practical_range_nm),
      rankRequired: requiredRank,
      licenseRequired: "No aplica",
      enabled: canFly,
      image: null,
      blockedReason: canFly ? null : "No habilitada para tu rango",
      currentAirportName: row.current_airport_name,
      homeAirport: upper(row.home_airport_ident, "No registrado"),
      homeAirportName: row.home_airport_name,
      seats: toNumber(row.seats),
      cargoKg: toNumber(row.cargo_kg),
      allowedRankCodes: allowedRanks,
      canFly,
      overallHealth: toNumber(row.overall_health),
      engineHealth: toNumber(row.engine_health),
      fuselageHealth: toNumber(row.fuselage_health),
      gearHealth: toNumber(row.gear_health),
    };
  });
}
