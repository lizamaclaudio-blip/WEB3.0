#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const repo = process.cwd();
const migrationName = "20260521_training_dispatch_reservations_acars_direct_columns.sql";
const migrationPath = path.join(repo, "supabase", "migrations", migrationName);
const requiredColumns = [
  "route_code",
  "assigned_flight_number",
  "assigned_callsign",
  "airline_icao",
  "payload_version",
  "dispatch_payload",
  "acars_payload",
  "acars_state",
  "sent_to_acars_at",
];

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

function maskHost(input) {
  if (!input) return "";
  let host = "";
  try {
    host = input.includes("://") ? new URL(input).hostname : (input.split("@")[1] || "").split(":")[0];
  } catch {
    host = "";
  }
  if (!host) return "";
  if (host.length <= 8) return "*".repeat(host.length);
  return `${host.slice(0, 3)}***${host.slice(-8)}`;
}

if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
  console.error("[error] PW3_CONFIRM_DB_WRITE=YES requerido para aplicar cambios en Neon.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || readEnvFileValue("DATABASE_URL");
if (!databaseUrl) {
  console.error("[error] DATABASE_URL no configurada.");
  process.exit(1);
}

if (!fs.existsSync(migrationPath)) {
  console.error(`[error] Migracion no encontrada: ${migrationName}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf8");
const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  console.log(`[info] db_host=${maskHost(databaseUrl)}`);
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");

  const { rows } = await client.query(
    `select column_name, data_type, is_nullable
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'training_dispatch_reservations'
        and column_name = any($1::text[])
      order by column_name`,
    [requiredColumns],
  );
  const found = new Set(rows.map((row) => row.column_name));
  const missing = requiredColumns.filter((column) => !found.has(column));
  console.log(JSON.stringify({ ok: missing.length === 0, migrationName, columns: rows, missing }, null, 2));
  if (missing.length > 0) process.exit(1);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "ACARS_DIRECT_SCHEMA_APPLY_FAILED",
        message: error instanceof Error ? error.message : String(error),
        dbHost: maskHost(databaseUrl),
      },
      null,
      2,
    ),
  );
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
