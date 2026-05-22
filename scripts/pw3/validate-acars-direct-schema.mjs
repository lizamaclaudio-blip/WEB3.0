#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const repo = process.cwd();
const migrationName = "20260521_training_dispatch_reservations_acars_direct_columns.sql";
const requiredColumns = new Map([
  ["route_code", "text"],
  ["assigned_flight_number", "text"],
  ["assigned_callsign", "text"],
  ["airline_icao", "text"],
  ["payload_version", "text"],
  ["dispatch_payload", "jsonb"],
  ["acars_payload", "jsonb"],
  ["acars_state", "text"],
  ["sent_to_acars_at", "timestamp with time zone"],
]);

function readEnvFileValue(key) {
  const envPath = path.join(repo, ".env.local");
  if (!fs.existsSync(envPath)) return "";
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || match[1] !== key) continue;
    return match[2].trim().replace(/^"|"$/g, "");
  }
  return "";
}

function check(ok, label) {
  console.log(`[${ok ? "ok" : "fail"}] ${label}`);
  if (!ok) process.exitCode = 1;
}

const migrationPath = path.join(repo, "supabase", "migrations", migrationName);
const endpointPath = path.join(repo, "src", "app", "api", "dispatch", "send-to-acars", "route.ts");
const migration = fs.readFileSync(migrationPath, "utf8");
const endpoint = fs.readFileSync(endpointPath, "utf8");

for (const column of requiredColumns.keys()) {
  check(migration.includes(`add column if not exists ${column}`), `migration adds ${column}`);
}
check(migration.includes("create index if not exists idx_training_dispatch_reservations_route_code"), "migration indexes route_code");
check(migration.includes("create index if not exists idx_training_dispatch_reservations_acars_state"), "migration indexes acars_state");
check(endpoint.includes("ACARS_SCHEMA_MISSING_COLUMN"), "endpoint reports missing schema column clearly");
check(endpoint.includes("dispatch_payload") && endpoint.includes("acars_payload"), "endpoint writes direct ACARS payload columns");
check(endpoint.includes("acars_state") && endpoint.includes("ACARS_READY"), "endpoint writes acars_state ACARS_READY");

const databaseUrl = process.env.DATABASE_URL || readEnvFileValue("DATABASE_URL");
if (!databaseUrl) {
  check(false, "DATABASE_URL available for Neon schema validation");
  process.exit(process.exitCode || 1);
}

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const { rows } = await client.query(
    `select column_name, data_type
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'training_dispatch_reservations'
        and column_name = any($1::text[])`,
    [[...requiredColumns.keys()]],
  );
  const found = new Map(rows.map((row) => [row.column_name, row.data_type]));
  for (const [column, dataType] of requiredColumns) {
    check(found.get(column) === dataType, `Neon column ${column} exists as ${dataType}`);
  }
  await client.query("begin");
  try {
    const pilot = await client.query("select id from public.pilot_profiles where callsign='PWG001' limit 1");
    const origin = await client.query("select id from public.airports where ident='SCTE' limit 1");
    const destination = await client.query("select id from public.airports where ident='SCIE' limit 1");
    check(pilot.rowCount === 1, "PWG001 exists for dry-run insert");
    check(origin.rowCount === 1 && destination.rowCount === 1, "SCTE/SCIE airports exist for dry-run insert");
    if (pilot.rowCount === 1 && origin.rowCount === 1 && destination.rowCount === 1) {
      const dispatchId = randomUUID();
      const payload = {
        payloadVersion: "pw3-dispatch-v1",
        flight: { airlineIcao: "PWG", flightNumber: "695", callsign: "PWG695", routeCode: "PW-PAX-SCTE-SCIE" },
        route: { routeId: null, routeCode: "PW-PAX-SCTE-SCIE", origin: "SCTE", destination: "SCIE" },
        aircraft: { aircraftCode: "C208", registration: "CC-PCD" },
        simbrief: { route: "SCTE DCT SCIE" },
        loading: { passengerCount: 6, cargoKg: 259, fuelPlannedKg: 361 },
        schedule: { departureLocalTime: "18:30", estimatedArrivalLocalTime: "20:43", estimatedBlockMinutes: 133 },
        economySnapshot: { source: "validator" },
      };
      await client.query(
        `insert into public.training_dispatch_reservations (
           id, pilot_user_id, pilot_callsign, aircraft_registration, aircraft_model_code,
           origin_airport_id, destination_airport_id, route_code, origin_ident, destination_ident,
           departure_time, route_text, operation_type, score_mode, status, acars_status,
           dispatch_token_hash, dispatch_token_hint, assigned_flight_number, assigned_callsign, airline_icao,
           payload_version, dispatch_payload, acars_payload, acars_state, flight_payload,
           simbrief_ofp_json, prepared_acars_payload, acars_payload_version, sent_to_acars_at, acars_ready_at, expires_at
         ) values (
           $1::uuid, $2::uuid, 'PWG001', 'CC-PCD', 'C208',
           $3::uuid, $4::uuid, 'PW-PAX-SCTE-SCIE', 'SCTE', 'SCIE',
           '18:30', 'SCTE DCT SCIE', 'SCHOOL_OFFICIAL_ROUTE', 'SERVER_CONTROLLED', 'ACARS_READY', 'READY',
           $5, 'dry-run', '695', 'PWG695', 'PWG',
           'pw3-dispatch-v1', $6::jsonb, $6::jsonb, 'ACARS_READY', $7::jsonb,
           $8::jsonb, $6::jsonb, 'pw3-dispatch-v1', now(), now(), now() + interval '5 minutes'
         )`,
        [
          dispatchId,
          pilot.rows[0].id,
          origin.rows[0].id,
          destination.rows[0].id,
          `dry-run-${dispatchId}`,
          JSON.stringify(payload),
          JSON.stringify({ flight: payload.flight }),
          JSON.stringify(payload.simbrief),
        ],
      );
      const verify = await client.query(
        "select acars_state, payload_version, dispatch_payload->>'payloadVersion' as payload_version_json from public.training_dispatch_reservations where id=$1::uuid",
        [dispatchId],
      );
      check(verify.rows[0]?.acars_state === "ACARS_READY", "dry-run insert sets acars_state=ACARS_READY");
      check(verify.rows[0]?.payload_version === "pw3-dispatch-v1", "dry-run insert sets payload_version=pw3-dispatch-v1");
      check(verify.rows[0]?.payload_version_json === "pw3-dispatch-v1", "dry-run insert stores dispatch_payload payloadVersion");
    }
  } finally {
    await client.query("rollback").catch(() => undefined);
  }
} catch (error) {
  check(false, `Neon schema query failed: ${error instanceof Error ? error.message : String(error)}`);
  await client.query("rollback").catch(() => undefined);
} finally {
  await client.end().catch(() => undefined);
}

if (process.exitCode) {
  console.error("\n[fail] validate-acars-direct-schema");
  process.exit(process.exitCode);
}

console.log("\n[ok] validate-acars-direct-schema");
