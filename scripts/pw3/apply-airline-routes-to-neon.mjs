import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

function readEnvValue(name) {
  const envPath = path.join(process.cwd(), ".env.local");
  const processValue = process.env[name];
  if (!fs.existsSync(envPath)) return processValue || "";

  const envText = fs.readFileSync(envPath, "utf8");
  const match = envText.match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\r\n]+)["']?`, "m"));
  return match?.[1]?.trim() || processValue || "";
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceNm(a, b) {
  const earthRadiusNm = 3440.065;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Number((earthRadiusNm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(1));
}

function routePrefix(link) {
  return link.flightType === "cargo" ? "PW-CGO" : "PW-PAX";
}

function routeCode(link, origin, destination) {
  return `${routePrefix(link)}-${origin}-${destination}`;
}

function operationType(link) {
  if (link.flightType === "cargo") return "CARGO_OFFICIAL";
  if (link.flightType === "training") return "SCHOOL_OFFICIAL_ROUTE";
  return "COMMERCIAL_OFFICIAL_ROUTE";
}

function buildRoutes(catalog) {
  const airports = new Map(catalog.airports.map((airport) => [airport.icao, airport]));
  const links = [...catalog.passengerLinks, ...catalog.cargoLinks];
  return links.flatMap((link) =>
    [false, true].map((reverse) => {
      const origin = reverse ? link.destination : link.origin;
      const destination = reverse ? link.origin : link.destination;
      const originAirport = airports.get(origin);
      const destinationAirport = airports.get(destination);
      if (!originAirport || !destinationAirport) throw new Error(`AIRPORT_MISSING_${origin}_${destination}`);
      const distance = distanceNm(originAirport, destinationAirport);
      const isInternational = originAirport.country !== destinationAirport.country;
      const isLongRange = link.routeCategory === "largo_radio" || distance > 3000;
      const isOceanic = origin === "SCIP" || destination === "SCIP";
      return {
        route_code: routeCode(link, origin, destination),
        origin,
        destination,
        route_category: link.routeCategory.toUpperCase(),
        operation_type: operationType(link),
        min_rank_code: link.minRank,
        requires_oceanic: isOceanic,
        requires_international: isInternational,
        requires_long_range: isLongRange,
        allows_passenger: link.flightType !== "cargo",
        allows_cargo: link.flightType === "cargo",
        distance_nm: distance,
      };
    }),
  );
}

async function getColumns(client, table) {
  const { rows } = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return new Set(rows.map((row) => row.column_name));
}

function pick(columns, row) {
  return Object.fromEntries(Object.entries(row).filter(([key, value]) => columns.has(key) && value !== undefined));
}

async function updateRow(client, table, keyColumn, keyValue, row) {
  const entries = Object.entries(row).filter(([key]) => key !== keyColumn);
  if (!entries.length) return;
  const sets = entries.map(([key], index) => `"${key}" = $${index + 2}`).join(", ");
  await client.query(
    `update public.${table} set ${sets} where "${keyColumn}" = $1`,
    [keyValue, ...entries.map(([, value]) => value)],
  );
}

async function insertRow(client, table, row) {
  const entries = Object.entries(row);
  const columns = entries.map(([key]) => `"${key}"`).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  await client.query(
    `insert into public.${table} (${columns}) values (${placeholders})`,
    entries.map(([, value]) => value),
  );
}

async function ensureHubs(client, catalog) {
  await client.query("create extension if not exists pgcrypto");
  await client.query(`
    create table if not exists public.pw3_airline_hubs (
      id uuid primary key default gen_random_uuid(),
      airport_id uuid not null references public.airports(id),
      hub_code text not null unique,
      hub_name text not null,
      hub_roles text[] not null default '{}',
      is_school_hub boolean not null default false,
      allows_initial_registration boolean not null default false,
      allows_training boolean not null default false,
      allows_dispatch boolean not null default true,
      allows_charter boolean not null default true,
      allows_cargo boolean not null default false,
      allows_maintenance_routine boolean not null default true,
      allows_maintenance_medium boolean not null default false,
      allows_maintenance_major boolean not null default false,
      is_accident_recovery_base boolean not null default false,
      allows_international boolean not null default false,
      allows_oceanic_national boolean not null default false,
      display_order int not null default 100,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  const hubAirports = catalog.airports.filter((airport) => airport.isPassengerHub || airport.isCargoHub);
  let order = 10;
  let upserted = 0;
  for (const airport of hubAirports) {
    const roles = [
      airport.isPassengerHub ? "HUB_PASAJEROS" : null,
      airport.isCargoHub ? "HUB_CARGA" : null,
      airport.hubCategory === "main_hub" ? "BASE_PRINCIPAL" : null,
      airport.airportCategory === "international" ? "HUB_INTERNACIONAL" : null,
      airport.airportCategory === "patagonia_hub" ? "HUB_PATAGONIA" : null,
    ].filter(Boolean);
    const result = await client.query(
      `insert into public.pw3_airline_hubs (
         airport_id, hub_code, hub_name, hub_roles, allows_training, allows_dispatch, allows_charter,
         allows_cargo, allows_maintenance_routine, allows_maintenance_medium, allows_maintenance_major,
         allows_international, allows_oceanic_national, display_order, notes, updated_at
       )
       select id, $1, $2, $3::text[], true, true, true, $4, true, $5, $6, $7, $8, $9, $10, now()
       from public.airports
       where ident = $1 or icao = $1
       limit 1
       on conflict (hub_code) do update set
         airport_id = excluded.airport_id,
         hub_name = excluded.hub_name,
         hub_roles = excluded.hub_roles,
         allows_cargo = excluded.allows_cargo,
         allows_maintenance_medium = excluded.allows_maintenance_medium,
         allows_maintenance_major = excluded.allows_maintenance_major,
         allows_international = excluded.allows_international,
         allows_oceanic_national = excluded.allows_oceanic_national,
         display_order = excluded.display_order,
         notes = excluded.notes,
         updated_at = now()`,
      [
        airport.icao,
        `${airport.city} / ${airport.name}`,
        roles,
        airport.isCargoHub,
        airport.isCargoHub,
        airport.hubCategory === "main_hub" || airport.icao === "SCTE",
        airport.airportCategory === "international",
        airport.icao === "SCIP",
        order,
        `PW3 ${airport.hubCategory} / ${airport.airportCategory}`,
      ],
    );
    order += 10;
    upserted += result.rowCount;
  }
  console.log(`[ok] hubs_upserted=${upserted}`);
}

async function ensureCargoOperation(client) {
  const columns = await getColumns(client, "flight_operation_types");
  const cargoRule = pick(columns, {
    code: "CARGO_OFFICIAL",
    label: "Carga",
    description: "Operacion oficial de carga. No conecta economia real en esta fase.",
    score_mode: "OFFICIAL",
    affects_pilot_position: true,
    affects_aircraft_position: true,
    affects_economy: false,
    affects_ranking: true,
    affects_progression: true,
    requires_real_aircraft_lock: true,
    requires_route: true,
    requires_aircraft: true,
    requires_payload: true,
    requires_simbrief: true,
    reservation_expires_minutes: 15,
    is_active: true,
    sort_order: 50,
    updated_at: new Date(),
  });
  const existing = await client.query("select code from public.flight_operation_types where code = 'CARGO_OFFICIAL' limit 1");
  if (existing.rows[0]) await updateRow(client, "flight_operation_types", "code", "CARGO_OFFICIAL", cargoRule);
  else await insertRow(client, "flight_operation_types", cargoRule);
  console.log("[ok] cargo_operation_ready=CARGO_OFFICIAL");
}

async function syncRankCargoPermissions(client, catalog) {
  const columns = await getColumns(client, "pilot_ranks");
  const cargoRanks = catalog.ranks.filter((rank) => rank.canFlyCargo).map((rank) => rank.rankCode);
  const internationalRanks = catalog.ranks.filter((rank) => rank.canFlyInternational).map((rank) => rank.rankCode);
  const longHaulRanks = catalog.ranks.filter((rank) => rank.canFlyLongHaul).map((rank) => rank.rankCode);

  if (columns.has("allows_cargo")) {
    await client.query("update public.pilot_ranks set allows_cargo = rank_code = any($1::text[]) where rank_code = any($2::text[])", [cargoRanks, catalog.ranks.map((rank) => rank.rankCode)]);
  }
  if (columns.has("allows_international")) {
    await client.query("update public.pilot_ranks set allows_international = rank_code = any($1::text[]) where rank_code = any($2::text[])", [internationalRanks, catalog.ranks.map((rank) => rank.rankCode)]);
  }
  if (columns.has("allows_long_range")) {
    await client.query("update public.pilot_ranks set allows_long_range = rank_code = any($1::text[]) where rank_code = any($2::text[])", [longHaulRanks, catalog.ranks.map((rank) => rank.rankCode)]);
  }
  if (columns.has("allows_oceanic")) {
    await client.query("update public.pilot_ranks set allows_oceanic = rank_code = any($1::text[]) where rank_code = any($2::text[])", [longHaulRanks, catalog.ranks.map((rank) => rank.rankCode)]);
  }
  console.log(`[ok] rank_cargo_permissions=${cargoRanks.length}`);
}

async function syncRoutes(client, catalog) {
  const columns = await getColumns(client, "network_routes");
  const routes = buildRoutes(catalog);
  const airportRows = await client.query("select id, ident, icao from public.airports where ident = any($1::text[]) or icao = any($1::text[])", [
    Array.from(new Set(routes.flatMap((route) => [route.origin, route.destination]))),
  ]);
  const airportsByCode = new Map();
  for (const row of airportRows.rows) {
    airportsByCode.set(row.ident, row.id);
    if (row.icao) airportsByCode.set(row.icao, row.id);
  }

  let upserted = 0;
  let skipped = 0;
  for (const route of routes) {
    const originId = airportsByCode.get(route.origin);
    const destinationId = airportsByCode.get(route.destination);
    if (!originId || !destinationId) {
      console.log(`[warn] route_skipped_missing_airport=${route.route_code}`);
      skipped += 1;
      continue;
    }

    const row = pick(columns, {
      route_code: route.route_code,
      route_category: route.route_category,
      origin_airport_id: originId,
      destination_airport_id: destinationId,
      requires_oceanic: route.requires_oceanic,
      requires_international: route.requires_international,
      requires_long_range: route.requires_long_range,
      allows_passenger: route.allows_passenger,
      allows_cargo: route.allows_cargo,
      distance_nm: route.distance_nm,
      operation_type: route.operation_type,
      min_rank_code: route.min_rank_code,
      is_active: true,
      updated_at: new Date(),
    });

    const existing = await client.query(
      `select id
       from public.network_routes
       where route_code = $1
          or (
            origin_airport_id = $2
            and destination_airport_id = $3
            and upper(coalesce(route_category, '')) = $4
          )
       limit 1`,
      [route.route_code, originId, destinationId, route.route_category],
    );
    if (existing.rows[0]) await updateRow(client, "network_routes", "id", existing.rows[0].id, row);
    else await insertRow(client, "network_routes", row);
    upserted += 1;
  }

  const knownRouteCodes = routes.map((route) => route.route_code);
  const airportCodes = catalog.airports.map((airport) => airport.icao);
  const knownCategories = [
    "SCHOOL",
    "TRAINING",
    "REGIONAL",
    "PATAGONIA",
    "DOMESTIC",
    "OCEANIC",
    "CARGO",
    ...Array.from(new Set(routes.map((route) => route.route_category))),
  ];
  const deactivated = await client.query(
    `update public.network_routes nr
     set is_active = false, updated_at = now()
     from public.airports oa, public.airports da
     where nr.origin_airport_id = oa.id
       and nr.destination_airport_id = da.id
       and (oa.ident = any($2::text[]) or oa.icao = any($2::text[]))
       and (da.ident = any($2::text[]) or da.icao = any($2::text[]))
       and coalesce(nr.route_code, '') <> all($1::text[])
       and (
         upper(coalesce(nr.operation_type, '')) = any($3::text[])
         or upper(coalesce(nr.route_category, '')) = any($4::text[])
       )`,
    [
      knownRouteCodes,
      airportCodes,
      ["SCHOOL_OFFICIAL_ROUTE", "COMMERCIAL_OFFICIAL_ROUTE", "CARGO_OFFICIAL"],
      knownCategories,
    ],
  );

  console.log(`[ok] routes_upserted=${upserted}`);
  console.log(`[ok] routes_skipped=${skipped}`);
  console.log(`[ok] old_routes_deactivated=${deactivated.rowCount}`);
}

async function validateNeonRoutes(client) {
  const result = await client.query(`
    with active_routes as (
      select
        nr.route_code,
        nr.allows_cargo,
        nr.allows_passenger,
        oa.ident as origin,
        da.ident as destination,
        nr.distance_nm
      from public.network_routes nr
      join public.airports oa on oa.id = nr.origin_airport_id
      join public.airports da on da.id = nr.destination_airport_id
      where nr.is_active = true
        and nr.route_code like 'PW-%'
    )
    select
      count(*)::int as total_routes,
      count(*) filter (where route_code like 'PW-PAX-%')::int as passenger_routes,
      count(*) filter (where route_code like 'PW-CGO-%')::int as cargo_routes,
      count(*) filter (
        where not exists (
          select 1
          from active_routes reverse_route
          where reverse_route.origin = active_routes.destination
            and reverse_route.destination = active_routes.origin
            and reverse_route.allows_cargo = active_routes.allows_cargo
            and reverse_route.allows_passenger = active_routes.allows_passenger
        )
      )::int as missing_returns,
      count(*) filter (where distance_nm is null or distance_nm <= 0)::int as invalid_distance
    from active_routes
  `);
  const row = result.rows[0];
  console.log(`[check] neon_total_routes=${row.total_routes}`);
  console.log(`[check] neon_passenger_routes=${row.passenger_routes}`);
  console.log(`[check] neon_cargo_routes=${row.cargo_routes}`);
  console.log(`[check] neon_missing_returns=${row.missing_returns}`);
  console.log(`[check] neon_invalid_distance=${row.invalid_distance}`);
  if (Number(row.missing_returns) !== 0 || Number(row.invalid_distance) !== 0) {
    throw new Error("NEON_ROUTE_VALIDATION_FAILED");
  }
}

const connectionString = readEnvValue("DATABASE_URL");
if (!connectionString) {
  console.error("[error] DATABASE_URL missing");
  process.exit(1);
}

const catalogPath = path.join(process.cwd(), "src", "lib", "airline", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const client = new Client({
  connectionString,
  ssl: connectionString.includes("sslmode=require") ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("[ok] neon_connected=DATABASE_URL");
  await client.query("begin");
  await ensureHubs(client, catalog);
  await ensureCargoOperation(client);
  await syncRankCargoPermissions(client, catalog);
  await syncRoutes(client, catalog);
  await validateNeonRoutes(client);
  await client.query("commit");
  console.log("[ok] neon_airline_routes_ready=OK");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error(`[error] ${error instanceof Error ? error.message : "UNKNOWN_ERROR"}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
