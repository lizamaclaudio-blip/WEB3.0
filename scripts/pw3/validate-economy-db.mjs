import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const ECONOMY_CATALOG_PATH = path.join(ROOT, "src", "lib", "economy", "catalog.json");

function loadDotEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function fail(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

loadDotEnvLocal();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("DATABASE_URL no configurada.");

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function count(client, sql, params = []) {
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count ?? 0);
}

async function main() {
  const client = await pool.connect();
  try {
    const requiredTables = [
      "pw3_airline_economy_accounts",
      "pw3_pilot_wallets",
      "pw3_economy_ledger",
      "pw3_flight_economy_estimates",
      "pw3_pilot_monthly_payouts",
      "pw3_pilot_expense_catalog",
      "pw3_pilot_expense_ledger",
      "pw3_aircraft_economy_profiles",
      "pw3_route_economy_profiles",
    ];

    const existing = await client.query(
      `select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[])`,
      [requiredTables],
    );
    const existingSet = new Set(existing.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((name) => !existingSet.has(name));
    if (missing.length) fail(`Faltan tablas: ${missing.join(", ")}`);

    const account = await count(client, `select count(*)::int as count from public.pw3_airline_economy_accounts where airline_code='PW3'`);
    const aircraft = await count(client, `select count(*)::int as count from public.pw3_aircraft_economy_profiles where active=true`);
    const routes = await count(client, `select count(*)::int as count from public.pw3_route_economy_profiles where active=true`);
    const expenses = await count(client, `select count(*)::int as count from public.pw3_pilot_expense_catalog where active=true`);

    if (account < 1) fail("Cuenta PW3 no existe.");
    if (aircraft !== 34) fail(`Aeronaves esperadas 34, actual ${aircraft}.`);
    if (routes !== 78) fail(`Rutas esperadas 78, actual ${routes}.`);
    const expectedExpenses = JSON.parse(fs.readFileSync(ECONOMY_CATALOG_PATH, "utf8")).progressionExpenses.length;
    if (expenses !== expectedExpenses) fail(`Gastos esperados ${expectedExpenses}, actual ${expenses}.`);

    const dupExpenses = await count(client, `select count(*)::int as count from (
      select expense_code from public.pw3_pilot_expense_catalog group by expense_code having count(*) > 1
    ) d`);
    if (dupExpenses > 0) fail("Hay duplicados en expense_code.");

    const negativeWallet = await count(client, `select count(*)::int as count from public.pw3_pilot_wallets
      where wallet_balance_usd < 0 or pending_accrual_usd < 0 or paid_this_month_usd < 0 or total_earned_usd < 0 or total_spent_usd < 0`);
    if (negativeWallet > 0) fail("Montos negativos indebidos en wallets.");

    const badCargoRecommended = await count(client, `select count(*)::int as count
      from public.pw3_route_economy_profiles r
      join public.pw3_aircraft_economy_profiles a on a.aircraft_code = r.recommended_aircraft
      where r.flight_type = 'cargo' and coalesce(a.supports_cargo,false) = false`);
    if (badCargoRecommended > 0) fail("Hay rutas cargo con recommended_aircraft sin soporte cargo.");

    await client.query(`select count(*)::int as count from public.pw3_economy_ledger`);
    await client.query(`select count(*)::int as count from public.pw3_pilot_wallets`);

    const mojibake = await count(client, `select count(*)::int as count from public.pw3_aircraft_economy_profiles where name ~ '[�Ã]'`);
    if (mojibake > 0) fail("Posible mojibake detectado en nombres de aeronaves.");

    console.log("[ok] validate-economy-db");
    console.log(`[ok] account_pw3=${account}`);
    console.log(`[ok] aircraft=${aircraft}`);
    console.log(`[ok] routes=${routes}`);
    console.log(`[ok] expenses=${expenses}`);
    console.log("[ok] ledger/wallet consultables");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
