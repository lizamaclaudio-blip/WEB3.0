import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";


function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function readEnvValue(name) {
  const envPath = path.join(process.cwd(), ".env.local");
  const processValue = process.env[name];
  if (!fs.existsSync(envPath)) return processValue || "";

  const envText = fs.readFileSync(envPath, "utf8");
  const match = envText.match(new RegExp(`^\\s*${name}\\s*=\\s*[\"']?([^\"'\\r\\n]+)[\"']?`, "m"));
  return match?.[1]?.trim() || processValue || "";
}

const AIRCRAFT_MODELS = [
  { code: "C172", name: "Cessna 172 Skyhawk", manufacturer: "Cessna", display: "C172 — Cessna 172 Skyhawk", category: "LIGHT_TRAINING", seats: 3, cargoKg: 120, rangeNm: 640, cruiseKt: 115, training: true, cargo: false, widebody: false, commercial: false },
  { code: "BE58", name: "Beechcraft Baron 58", manufacturer: "Beechcraft", display: "BE58 — Beechcraft Baron 58", category: "LIGHT_TWIN", seats: 5, cargoKg: 180, rangeNm: 950, cruiseKt: 190, training: true, cargo: false, widebody: false, commercial: false },
  { code: "C208", name: "Cessna Grand Caravan", manufacturer: "Cessna", display: "C208 — Cessna Grand Caravan", category: "UTILITY_TURBOPROP", seats: 9, cargoKg: 1200, rangeNm: 870, cruiseKt: 155, training: true, cargo: true, widebody: false, commercial: true },
  { code: "TBM9", name: "Daher TBM 930", manufacturer: "Daher", display: "TBM9 — Daher TBM 930", category: "TURBOPROP", seats: 5, cargoKg: 300, rangeNm: 1300, cruiseKt: 310, training: true, cargo: false, widebody: false, commercial: true },
  { code: "B350", name: "Beechcraft King Air 350", manufacturer: "Beechcraft", display: "B350 — Beechcraft King Air 350", category: "TURBOPROP", seats: 9, cargoKg: 700, rangeNm: 1450, cruiseKt: 300, training: true, cargo: true, widebody: false, commercial: true },
  { code: "AT76", name: "ATR 72-600", manufacturer: "ATR", display: "AT76 — ATR 72-600", category: "REGIONAL_TURBOPROP", seats: 70, cargoKg: 1700, rangeNm: 825, cruiseKt: 275, training: false, cargo: true, widebody: false, commercial: true },
  { code: "A20N", name: "Airbus A320neo", manufacturer: "Airbus", display: "A20N — Airbus A320neo", category: "NARROWBODY", seats: 180, cargoKg: 3000, rangeNm: 3500, cruiseKt: 455, training: false, cargo: true, widebody: false, commercial: true },
  { code: "A319", name: "Airbus A319", manufacturer: "Airbus", display: "A319 — Airbus A319", category: "NARROWBODY", seats: 144, cargoKg: 2500, rangeNm: 3300, cruiseKt: 455, training: false, cargo: true, widebody: false, commercial: true },
  { code: "A320", name: "Airbus A320", manufacturer: "Airbus", display: "A320 — Airbus A320", category: "NARROWBODY", seats: 180, cargoKg: 3000, rangeNm: 3150, cruiseKt: 455, training: false, cargo: true, widebody: false, commercial: true },
  { code: "B736", name: "Boeing 737-600", manufacturer: "Boeing", display: "B736 — Boeing 737-600", category: "NARROWBODY", seats: 130, cargoKg: 2300, rangeNm: 3050, cruiseKt: 450, training: false, cargo: true, widebody: false, commercial: true },
  { code: "B737", name: "Boeing 737-700/800", manufacturer: "Boeing", display: "B737 — Boeing 737-700/800", category: "NARROWBODY", seats: 160, cargoKg: 2900, rangeNm: 2950, cruiseKt: 450, training: false, cargo: true, widebody: false, commercial: true },
  { code: "B739", name: "Boeing 737-900", manufacturer: "Boeing", display: "B739 — Boeing 737-900", category: "NARROWBODY", seats: 180, cargoKg: 3000, rangeNm: 2900, cruiseKt: 450, training: false, cargo: true, widebody: false, commercial: true },
  { code: "MD88", name: "McDonnell Douglas MD-88", manufacturer: "McDonnell Douglas", display: "MD88 — McDonnell Douglas MD-88", category: "NARROWBODY_CLASSIC", seats: 150, cargoKg: 2500, rangeNm: 2050, cruiseKt: 430, training: false, cargo: true, widebody: false, commercial: true },
  { code: "B78X", name: "Boeing 787-10 Dreamliner", manufacturer: "Boeing", display: "B78X — Boeing 787-10 Dreamliner", category: "WIDEBODY", seats: 318, cargoKg: 14000, rangeNm: 6430, cruiseKt: 488, training: false, cargo: true, widebody: true, commercial: true },
];

const FLEET = [
  { reg: "CC-PBA", model: "BE58", current: "SCPF", home: "SCPF", rank: "CADET" },
  { reg: "CC-PCA", model: "C172", current: "SCPF", home: "SCPF", rank: "CADET" },
  { reg: "CC-PCB", model: "C172", current: "SCPF", home: "SCPF", rank: "CADET" },
  { reg: "CC-PCC", model: "C172", current: "SCPF", home: "SCPF", rank: "CADET" },
  { reg: "CC-PCD", model: "C208", current: "SCTE", home: "SCTE", rank: "CADET" },
  { reg: "CC-PCE", model: "C208", current: "SCTE", home: "SCTE", rank: "CADET" },
  { reg: "CC-PTB", model: "TBM9", current: "SCTE", home: "SCTE", rank: "SECOND_OFFICER" },
  { reg: "CC-PKA", model: "B350", current: "SCTE", home: "SCTE", rank: "SECOND_OFFICER" },
  { reg: "CC-PKB", model: "B350", current: "SCEL", home: "SCEL", rank: "SECOND_OFFICER" },
  { reg: "CC-PAT", model: "AT76", current: "SCTE", home: "SCTE", rank: "FIRST_OFFICER" },
  { reg: "CC-PAU", model: "AT76", current: "SCEL", home: "SCEL", rank: "FIRST_OFFICER" },
  { reg: "CC-PNA", model: "A20N", current: "SCEL", home: "SCEL", rank: "FIRST_OFFICER" },
  { reg: "CC-PNB", model: "A20N", current: "SCTE", home: "SCTE", rank: "FIRST_OFFICER" },
  { reg: "CC-PAC", model: "A319", current: "SCEL", home: "SCEL", rank: "FIRST_OFFICER" },
  { reg: "CC-PAD", model: "A319", current: "SCEL", home: "SCEL", rank: "FIRST_OFFICER" },
  { reg: "CC-PAA", model: "A320", current: "SCEL", home: "SCEL", rank: "FIRST_OFFICER" },
  { reg: "CC-PAB", model: "A320", current: "SCTE", home: "SCTE", rank: "FIRST_OFFICER" },
  { reg: "CC-PBC", model: "B736", current: "SCEL", home: "SCEL", rank: "FIRST_OFFICER" },
  { reg: "CC-PBD", model: "B736", current: "SCEL", home: "SCEL", rank: "FIRST_OFFICER" },
  { reg: "CC-PBE", model: "B737", current: "SCEL", home: "SCEL", rank: "CAPTAIN" },
  { reg: "CC-PBF", model: "B737", current: "SCTE", home: "SCTE", rank: "CAPTAIN" },
  { reg: "CC-PBG", model: "B739", current: "SCEL", home: "SCEL", rank: "CAPTAIN" },
  { reg: "CC-PBH", model: "B739", current: "SCEL", home: "SCEL", rank: "CAPTAIN" },
  { reg: "CC-PMD", model: "MD88", current: "SCEL", home: "SCEL", rank: "CAPTAIN" },
  { reg: "CC-PME", model: "MD88", current: "SCTE", home: "SCTE", rank: "CAPTAIN" },
  { reg: "CC-PWX", model: "B78X", current: "SCEL", home: "SCEL", rank: "COMMANDER" },
  { reg: "CC-PWY", model: "B78X", current: "SCEL", home: "SCEL", rank: "COMMANDER" },
];

const PERMISSIONS = {
  CADET: ["C172", "BE58", "C208"],
  SECOND_OFFICER: ["C172", "BE58", "C208", "TBM9", "B350", "AT76"],
  FIRST_OFFICER: ["C172", "BE58", "C208", "TBM9", "B350", "AT76", "A319", "A320", "A20N", "B736", "B737"],
  SENIOR_FIRST_OFFICER: ["C172", "BE58", "C208", "TBM9", "B350", "AT76", "A319", "A320", "A20N", "B736", "B737", "B739", "MD88"],
  CAPTAIN: ["C172", "BE58", "C208", "TBM9", "B350", "AT76", "A319", "A320", "A20N", "B736", "B737", "B739", "MD88"],
  COMMANDER: ["C172", "BE58", "C208", "TBM9", "B350", "AT76", "A319", "A320", "A20N", "B736", "B737", "B739", "MD88", "B78X"],
  SENIOR_COMMANDER: ["C172", "BE58", "C208", "TBM9", "B350", "AT76", "A319", "A320", "A20N", "B736", "B737", "B739", "MD88", "B78X"],
};

const ROUTES = [
  { from: "SCPF", to: "SCPF", category: "SCHOOL", operation: "SCHOOL_OFFICIAL_ROUTE", rank: "CADET", cargo: false },
  { from: "SCPF", to: "SCTE", category: "SCHOOL", operation: "SCHOOL_OFFICIAL_ROUTE", rank: "CADET", cargo: false },
  { from: "SCPF", to: "SCAC", category: "SCHOOL", operation: "SCHOOL_OFFICIAL_ROUTE", rank: "CADET", cargo: false },
  { from: "SCPF", to: "SCJO", category: "SCHOOL", operation: "SCHOOL_OFFICIAL_ROUTE", rank: "CADET", cargo: false },
  { from: "SCPF", to: "SCST", category: "SCHOOL", operation: "SCHOOL_OFFICIAL_ROUTE", rank: "CADET", cargo: false },
  { from: "SCPF", to: "SCVD", category: "SCHOOL", operation: "SCHOOL_OFFICIAL_ROUTE", rank: "CADET", cargo: false },
  { from: "SCTE", to: "SCEL", category: "REGIONAL", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCEL", to: "SCTE", category: "REGIONAL", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCTE", to: "SCIE", category: "REGIONAL", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCIE", to: "SCTE", category: "REGIONAL", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCTE", to: "SCBA", category: "PATAGONIA", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCBA", to: "SCTE", category: "PATAGONIA", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCTE", to: "SCCI", category: "PATAGONIA", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCCI", to: "SCTE", category: "PATAGONIA", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCEL", to: "SCIE", category: "DOMESTIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCIE", to: "SCEL", category: "DOMESTIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCEL", to: "SCFA", category: "DOMESTIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCFA", to: "SCEL", category: "DOMESTIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCEL", to: "SCDA", category: "DOMESTIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCDA", to: "SCEL", category: "DOMESTIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "FIRST_OFFICER", cargo: false },
  { from: "SCEL", to: "SCIP", category: "OCEANIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "COMMANDER", cargo: false, oceanic: true, longRange: true },
  { from: "SCIP", to: "SCEL", category: "OCEANIC", operation: "COMMERCIAL_OFFICIAL_ROUTE", rank: "COMMANDER", cargo: false, oceanic: true, longRange: true },
  { from: "SCEL", to: "SCTE", category: "CARGO", operation: "CARGO_OFFICIAL", rank: "FIRST_OFFICER", cargo: true },
  { from: "SCTE", to: "SCBA", category: "CARGO", operation: "CARGO_OFFICIAL", rank: "FIRST_OFFICER", cargo: true },
  { from: "SCTE", to: "SCCI", category: "CARGO", operation: "CARGO_OFFICIAL", rank: "FIRST_OFFICER", cargo: true },
  { from: "SCEL", to: "SCFA", category: "CARGO", operation: "CARGO_OFFICIAL", rank: "FIRST_OFFICER", cargo: true },
  { from: "SCEL", to: "SCDA", category: "CARGO", operation: "CARGO_OFFICIAL", rank: "FIRST_OFFICER", cargo: true },
  { from: "SCEL", to: "SCIP", category: "CARGO", operation: "CARGO_OFFICIAL", rank: "COMMANDER", cargo: true, oceanic: true, longRange: true },
];

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceNm(a, b) {
  const lat1 = Number(a.lat ?? a.latitude_deg);
  const lon1 = Number(a.lon ?? a.longitude_deg);
  const lat2 = Number(b.lat ?? b.latitude_deg);
  const lon2 = Number(b.lon ?? b.longitude_deg);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const earthRadiusNm = 3440.065;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusNm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function tableExists(client, table) {
  const { rows } = await client.query("select to_regclass($1) as reg", [`public.${table}`]);
  return Boolean(rows[0]?.reg);
}

async function getColumns(client, table) {
  const { rows } = await client.query(
    `select column_name, data_type, udt_name, is_nullable, column_default
     from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return new Map(rows.map((row) => [row.column_name, row]));
}

function has(columns, name) {
  return columns.has(name);
}

function pickColumns(columns, row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (columns.has(key) && value !== undefined) out[key] = value;
  }
  return out;
}

async function insertRow(client, table, columns, row) {
  const entries = Object.entries(row).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;
  const names = entries.map(([key]) => key);
  const placeholders = entries.map((_, index) => `$${index + 1}`);
  const values = entries.map(([, value]) => value);
  const { rows } = await client.query(
    `insert into public.${table} (${names.map((name) => `"${name}"`).join(", ")}) values (${placeholders.join(", ")}) returning *`,
    values,
  );
  return rows[0] ?? null;
}

async function updateRow(client, table, keyColumn, keyValue, row) {
  const entries = Object.entries(row).filter(([key, value]) => key !== keyColumn && value !== undefined);
  if (entries.length === 0) return null;
  const setSql = entries.map(([key], index) => `"${key}" = $${index + 2}`).join(", ");
  const values = [keyValue, ...entries.map(([, value]) => value)];
  const { rows } = await client.query(
    `update public.${table} set ${setSql} where "${keyColumn}" = $1 returning *`,
    values,
  );
  return rows[0] ?? null;
}

async function ensureColumn(client, table, column, ddl) {
  const exists = await tableExists(client, table);
  if (!exists) return;
  const columns = await getColumns(client, table);
  if (!columns.has(column)) {
    await client.query(`alter table public.${table} add column if not exists ${ddl}`);
  }
}

async function ensureBaseTables(client) {
  await client.query("create extension if not exists pgcrypto");
  await client.query(`create table if not exists public.aircraft_models (
    id uuid primary key default gen_random_uuid(),
    model_code text not null unique,
    model_name text not null,
    manufacturer text null,
    display_name text null,
    category text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await client.query(`create table if not exists public.fleet_aircraft (
    id uuid primary key default gen_random_uuid(),
    registration text not null unique,
    model_code text not null,
    aircraft_status text not null default 'AVAILABLE',
    current_airport_id uuid null,
    home_airport_id uuid null,
    hub_airport_id uuid null,
    required_rank_code text null,
    engine_health numeric not null default 100,
    fuselage_health numeric not null default 100,
    gear_health numeric not null default 100,
    overall_health numeric not null default 100,
    airframe_hours numeric not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await client.query(`create table if not exists public.rank_aircraft_permissions (
    id uuid primary key default gen_random_uuid(),
    rank_code text not null,
    model_code text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await client.query(`create unique index if not exists pw3_rank_aircraft_permissions_uidx on public.rank_aircraft_permissions (rank_code, model_code)`);
  await client.query(`create table if not exists public.network_routes (
    id uuid primary key default gen_random_uuid(),
    route_code text null,
    origin_airport_id uuid not null,
    destination_airport_id uuid not null,
    route_category text not null default 'REGIONAL',
    operation_type text null,
    min_rank_code text null,
    distance_nm numeric null,
    allows_passenger boolean not null default true,
    allows_cargo boolean not null default false,
    requires_international boolean not null default false,
    requires_oceanic boolean not null default false,
    requires_long_range boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);

  for (const [column, ddl] of [
    ["model_code", "model_code text"],
    ["model_name", "model_name text"],
    ["manufacturer", "manufacturer text"],
    ["display_name", "display_name text"],
    ["category", "category text"],
    ["updated_at", "updated_at timestamptz not null default now()"],
  ]) await ensureColumn(client, "aircraft_models", column, ddl);

  for (const [column, ddl] of [
    ["registration", "registration text"],
    ["model_code", "model_code text"],
    ["aircraft_status", "aircraft_status text not null default 'AVAILABLE'"],
    ["current_airport_id", "current_airport_id uuid"],
    ["home_airport_id", "home_airport_id uuid"],
    ["hub_airport_id", "hub_airport_id uuid"],
    ["required_rank_code", "required_rank_code text"],
    ["engine_health", "engine_health numeric not null default 100"],
    ["fuselage_health", "fuselage_health numeric not null default 100"],
    ["gear_health", "gear_health numeric not null default 100"],
    ["overall_health", "overall_health numeric not null default 100"],
    ["airframe_hours", "airframe_hours numeric not null default 0"],
    ["updated_at", "updated_at timestamptz not null default now()"],
  ]) await ensureColumn(client, "fleet_aircraft", column, ddl);

  for (const [column, ddl] of [
    ["route_code", "route_code text"],
    ["route_category", "route_category text not null default 'REGIONAL'"],
    ["operation_type", "operation_type text"],
    ["min_rank_code", "min_rank_code text"],
    ["distance_nm", "distance_nm numeric"],
    ["allows_passenger", "allows_passenger boolean not null default true"],
    ["allows_cargo", "allows_cargo boolean not null default false"],
    ["requires_international", "requires_international boolean not null default false"],
    ["requires_oceanic", "requires_oceanic boolean not null default false"],
    ["requires_long_range", "requires_long_range boolean not null default false"],
    ["is_active", "is_active boolean not null default true"],
    ["updated_at", "updated_at timestamptz not null default now()"],
  ]) await ensureColumn(client, "network_routes", column, ddl);
}

async function getDefaultFamilyId(client) {
  const columns = await getColumns(client, "aircraft_models");
  if (!columns.has("family_id")) return null;
  const { rows } = await client.query("select family_id from public.aircraft_models where family_id is not null limit 1");
  if (rows[0]?.family_id) return rows[0].family_id;
  console.warn("[warn] aircraft_models.family_id existe y es NOT NULL, pero no hay family_id existente para reutilizar.");
  return null;
}

async function seedModels(client) {
  const columns = await getColumns(client, "aircraft_models");
  const defaultFamilyId = await getDefaultFamilyId(client);
  let count = 0;
  for (const model of AIRCRAFT_MODELS) {
    const { rows: existingRows } = await client.query("select * from public.aircraft_models where model_code = $1 limit 1", [model.code]);
    const base = pickColumns(columns, {
      model_code: model.code,
      model_name: model.name,
      manufacturer: model.manufacturer,
      display_name: model.display,
      category: model.category,
      updated_at: new Date(),
      family_id: defaultFamilyId,
    });

    if (existingRows[0]) {
      await updateRow(client, "aircraft_models", "model_code", model.code, base);
    } else {
      const requiredFamily = columns.get("family_id")?.is_nullable === "NO";
      if (requiredFamily && !base.family_id) {
        console.warn(`[warn] Modelo ${model.code} omitido: aircraft_models.family_id es obligatorio y no hay valor disponible.`);
        continue;
      }
      await insertRow(client, "aircraft_models", columns, base);
    }
    count += 1;
  }
  console.log(`[ok] modelos actualizados/creados: ${count}`);
}

async function seedPerformance(client) {
  const exists = await tableExists(client, "aircraft_performance_profiles");
  if (!exists) return console.log("[skip] aircraft_performance_profiles no existe.");
  const columns = await getColumns(client, "aircraft_performance_profiles");
  let count = 0;
  for (const model of AIRCRAFT_MODELS) {
    const { rows: modelRows } = await client.query("select id from public.aircraft_models where model_code = $1 limit 1", [model.code]);
    const modelId = modelRows[0]?.id;
    if (!modelId) continue;
    const keyColumn = columns.has("model_id") ? "model_id" : columns.has("aircraft_model_id") ? "aircraft_model_id" : null;
    if (!keyColumn) continue;
    const { rows: existing } = await client.query(`select * from public.aircraft_performance_profiles where ${keyColumn} = $1 limit 1`, [modelId]);
    const row = pickColumns(columns, {
      model_id: modelId,
      aircraft_model_id: modelId,
      seats: model.seats,
      cargo_kg: model.cargoKg,
      practical_range_nm: model.rangeNm,
      range_nm: model.rangeNm,
      reserve_factor: 0.85,
      cruise_speed_kt: model.cruiseKt,
      is_widebody: model.widebody,
      is_cargo: model.cargo,
      is_training: model.training,
      is_commercial: model.commercial,
      updated_at: new Date(),
    });
    if (existing[0]) {
      await updateRow(client, "aircraft_performance_profiles", keyColumn, modelId, row);
    } else {
      await insertRow(client, "aircraft_performance_profiles", columns, row);
    }
    count += 1;
  }
  console.log(`[ok] performance profiles actualizados/creados: ${count}`);
}

async function airportMap(client) {
  const { rows } = await client.query("select * from public.airports");
  const map = new Map();
  for (const row of rows) {
    for (const key of [row.ident, row.icao, row.icao_code]) {
      if (typeof key === "string" && key.trim()) map.set(key.trim().toUpperCase(), row);
    }
  }
  return map;
}

async function seedFleet(client) {
  const columns = await getColumns(client, "fleet_aircraft");
  const airports = await airportMap(client);
  let insertedOrUpdated = 0;
  let skipped = 0;

  for (const item of FLEET) {
    const current = airports.get(item.current) || airports.get("SCTE") || airports.get("SCEL");
    const home = airports.get(item.home) || current;
    const { rows: modelRows } = await client.query("select id from public.aircraft_models where model_code = $1 limit 1", [item.model]);
    const modelId = modelRows[0]?.id ?? null;
    const { rows: existingRows } = await client.query("select * from public.fleet_aircraft where registration = $1 limit 1", [item.reg]);

    const base = pickColumns(columns, {
      registration: item.reg,
      model_code: item.model,
      model_id: modelId,
      aircraft_model_id: modelId,
      aircraft_status: "AVAILABLE",
      status: "AVAILABLE",
      current_airport_id: current?.id ?? null,
      home_airport_id: home?.id ?? null,
      hub_airport_id: home?.id ?? null,
      required_rank_code: item.rank,
      engine_health: 100,
      fuselage_health: 100,
      gear_health: 100,
      overall_health: 100,
      airframe_hours: 0,
      updated_at: new Date(),
    });

    for (const [columnName, meta] of columns.entries()) {
      if (columnName in base || meta.is_nullable !== "NO" || meta.column_default) continue;
      if (columnName === "id") continue;
      if (columnName.endsWith("airport_id")) base[columnName] = current?.id ?? home?.id ?? null;
      else if (columnName.endsWith("model_id")) base[columnName] = modelId;
      else if (columnName.includes("status")) base[columnName] = "AVAILABLE";
      else if (meta.data_type === "boolean") base[columnName] = false;
      else if (["numeric", "integer", "bigint", "smallint", "double precision", "real"].includes(meta.data_type)) base[columnName] = 0;
      else if (meta.data_type.includes("timestamp")) base[columnName] = new Date();
      else if (meta.data_type === "text" || meta.data_type === "character varying") base[columnName] = item.reg;
    }

    try {
      if (existingRows[0]) await updateRow(client, "fleet_aircraft", "registration", item.reg, base);
      else await insertRow(client, "fleet_aircraft", columns, base);
      insertedOrUpdated += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`[warn] aeronave ${item.reg} omitida: ${error.message}`);
    }
  }
  console.log(`[ok] flota actualizada/creada: ${insertedOrUpdated}; omitidas: ${skipped}`);
}

async function seedPermissions(client) {
  if (!(await tableExists(client, "rank_aircraft_permissions"))) return;
  const columns = await getColumns(client, "rank_aircraft_permissions");
  if (!columns.has("rank_code") || !columns.has("model_code")) return;
  let count = 0;
  for (const [rank, models] of Object.entries(PERMISSIONS)) {
    for (const model of models) {
      const { rows } = await client.query("select * from public.rank_aircraft_permissions where rank_code = $1 and model_code = $2 limit 1", [rank, model]);
      const row = pickColumns(columns, { rank_code: rank, model_code: model, updated_at: new Date(), created_at: new Date(), is_allowed: true, allowed: true, can_fly: true });
      if (rows[0]) {
        const updatePayload = pickColumns(columns, {
          updated_at: new Date(),
          is_allowed: true,
          allowed: true,
          can_fly: true,
        });
        const entries = Object.entries(updatePayload).filter(([column]) => column !== "id" && column !== "rank_code" && column !== "model_code");
        if (entries.length > 0) {
          const sets = entries.map(([column], index) => `${quoteIdent(column)} = $${index + 2}`).join(", ");
          await client.query(`update public.rank_aircraft_permissions set ${sets} where rank_code = $1 and model_code = $${entries.length + 2}`, [rank, ...entries.map(([, value]) => value), model]);
        }
      } else {
        await insertRow(client, "rank_aircraft_permissions", columns, row);
      }
      count += 1;
    }
  }
  console.log(`[ok] permisos rango/aeronave asegurados: ${count}`);
}

async function seedRoutes(client) {
  const columns = await getColumns(client, "network_routes");
  const airports = await airportMap(client);
  let count = 0;
  let skipped = 0;
  for (const route of ROUTES) {
    const origin = airports.get(route.from);
    const destination = airports.get(route.to);
    if (!origin || !destination) {
      skipped += 1;
      console.warn(`[warn] ruta omitida ${route.from}-${route.to}: aeropuerto faltante.`);
      continue;
    }
    const dist = distanceNm(origin, destination);
    const routeCode = `${route.from}-${route.to}`;
    const base = pickColumns(columns, {
      route_code: routeCode,
      origin_airport_id: origin.id,
      destination_airport_id: destination.id,
      route_category: route.category,
      category: route.category,
      operation_type: route.operation,
      min_rank_code: route.rank,
      distance_nm: dist,
      allows_passenger: !route.cargo,
      allows_cargo: route.cargo,
      requires_international: false,
      requires_oceanic: Boolean(route.oceanic),
      requires_long_range: Boolean(route.longRange),
      is_active: true,
      updated_at: new Date(),
    });
    const { rows: existingRows } = await client.query(
      "select id from public.network_routes where origin_airport_id = $1 and destination_airport_id = $2 and coalesce(route_category, category, '') = $3 limit 1",
      [origin.id, destination.id, route.category],
    ).catch(async () => ({ rows: [] }));
    try {
      if (existingRows[0]) await updateRow(client, "network_routes", "id", existingRows[0].id, base);
      else await insertRow(client, "network_routes", columns, base);
      count += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`[warn] ruta ${routeCode} omitida: ${error.message}`);
    }
  }
  console.log(`[ok] rutas actualizadas/creadas: ${count}; omitidas: ${skipped}`);
}

async function runValidation(client) {
  const sqlPath = path.join(process.cwd(), "supabase", "pw3", "015_validation_fleet_and_routes.sql");
  if (!fs.existsSync(sqlPath)) return;
  console.log("[run] supabase/pw3/015_validation_fleet_and_routes.sql");
  const result = await client.query(fs.readFileSync(sqlPath, "utf8"));
  if (Array.isArray(result)) {
    result.forEach((entry, index) => {
      if (entry.rows?.length) {
        console.log(`\n[check ${index + 1}]`);
        console.table(entry.rows);
      }
    });
  } else if (result.rows?.length) {
    console.table(result.rows);
  }
}

async function main() {
  const shouldValidateOnly = process.argv.includes("--validate-only");
  const connectionString = readEnvValue("DATABASE_URL") || readEnvValue("SUPABASE_DB_URL");
  if (!connectionString) throw new Error("DATABASE_URL no esta configurada en .env.local o entorno.");

  const url = new URL(connectionString);
  console.log("[db] host =", url.hostname);
  console.log("[db] database =", url.pathname.replace(/^\//, ""));
  console.log("[db] user =", url.username);

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    if (!shouldValidateOnly) {
      console.log("[run] PW3 015 JS seeder robusto");
      await ensureBaseTables(client);
      await seedModels(client);
      await seedPerformance(client);
      await seedFleet(client);
      await seedPermissions(client);
      await seedRoutes(client);
      console.log("[ok] Seed 015 aplicado correctamente.");
    }
    await runValidation(client);
    console.log("[ok] Validacion 015 completada.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[error]", error.message);
  process.exit(1);
});
