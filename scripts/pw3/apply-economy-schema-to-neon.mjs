import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const SQL_PATH = path.join(ROOT, "docs", "sql", "PW3_ECONOMY_SCHEMA_001.sql");
const AIRLINE_CATALOG_PATH = path.join(ROOT, "src", "lib", "airline", "catalog.json");
const ECONOMY_CATALOG_PATH = path.join(ROOT, "src", "lib", "economy", "catalog.json");
const APPLY_LOG_PATH = path.join(ROOT, "docs", "PW3_ECONOMY_DB_APPLY_LOG.md");

function loadDotEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return false;
  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex < 1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

function mask(value) {
  if (!value) return "n/a";
  if (value.length <= 4) return "***";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function parseDbUrl(connectionString) {
  const parsed = new URL(connectionString);
  return {
    host: parsed.hostname,
    database: parsed.pathname.replace(/^\//, "") || "(none)",
    user: decodeURIComponent(parsed.username || ""),
  };
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceNm(from, to) {
  const earthRadiusNm = 3440.065;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return Number((earthRadiusNm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(2));
}

function expandRoutes(airlineCatalog) {
  const airportByIcao = new Map(airlineCatalog.airports.map((a) => [a.icao, a]));
  const expand = (links) => links.flatMap((link) => {
    const legA = { ...link, origin: link.origin, destination: link.destination };
    const legB = { ...link, origin: link.destination, destination: link.origin };
    return [legA, legB].map((leg) => {
      const from = airportByIcao.get(leg.origin);
      const to = airportByIcao.get(leg.destination);
      const dist = from && to ? distanceNm(from, to) : 0;
      const routeId = `${leg.flightType === "cargo" ? "PW-CGO" : "PW-PAX"}-${leg.origin}-${leg.destination}`;
      return {
        routeId,
        origin: leg.origin,
        destination: leg.destination,
        routeCategory: leg.routeCategory,
        flightType: leg.flightType,
        distanceNm: dist,
        recommendedAircraft: Array.isArray(leg.recommendedAircraft) && leg.recommendedAircraft.length ? leg.recommendedAircraft[0] : null,
        active: true,
      };
    });
  });

  const allPassenger = expand(airlineCatalog.passengerLinks);
  const itineraryPassenger = allPassenger.filter((route) => route.flightType === "itinerary");
  const cargo = expand(airlineCatalog.cargoLinks).filter((route) => route.flightType === "cargo");
  return { itineraryPassenger, cargo, all: [...itineraryPassenger, ...cargo] };
}

async function seedData(client) {
  const airlineCatalog = JSON.parse(fs.readFileSync(AIRLINE_CATALOG_PATH, "utf8"));
  const economyCatalog = JSON.parse(fs.readFileSync(ECONOMY_CATALOG_PATH, "utf8"));
  const routes = expandRoutes(airlineCatalog);

  await client.query(
    `insert into public.pw3_airline_economy_accounts (
      airline_code, cash_balance_usd, monthly_revenue_usd, monthly_cost_usd, monthly_net_usd,
      pilot_accrual_liability_usd, maintenance_reserve_usd, currency
    ) values ('PW3', $1, 0, 0, 0, 0, 0, 'USD_VIRTUAL')
    on conflict (airline_code) do update
      set cash_balance_usd = excluded.cash_balance_usd,
          currency = excluded.currency,
          updated_at = now()`,
    [Number(economyCatalog.baseAirlineCashUsd ?? 2500000)],
  );

  for (const aircraft of airlineCatalog.aircraft.filter((a) => a.active)) {
    const payload = {
      minRank: aircraft.minRank,
      allowedRanks: aircraft.allowedRanks,
      supportsPassenger: aircraft.supportsPassenger,
      source: aircraft.source ?? [],
      aliases: aircraft.aliases ?? [],
    };
    await client.query(
      `insert into public.pw3_aircraft_economy_profiles (
        aircraft_code, name, category, passenger_capacity, cargo_capacity_kg, supports_cargo, range_nm,
        economy_payload, active
      ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
      on conflict (aircraft_code) do update set
        name = excluded.name,
        category = excluded.category,
        passenger_capacity = excluded.passenger_capacity,
        cargo_capacity_kg = excluded.cargo_capacity_kg,
        supports_cargo = excluded.supports_cargo,
        range_nm = excluded.range_nm,
        economy_payload = excluded.economy_payload,
        active = excluded.active,
        updated_at = now()`,
      [
        aircraft.code,
        aircraft.name,
        aircraft.category,
        Number(aircraft.passengerCapacity ?? 0),
        aircraft.supportsCargo ? Number(aircraft.cargoCapacityKg ?? 0) : 0,
        Boolean(aircraft.supportsCargo),
        Number(aircraft.rangeNm ?? 0),
        JSON.stringify(payload),
        Boolean(aircraft.active),
      ],
    );
  }

  for (const route of routes.all) {
    await client.query(
      `insert into public.pw3_route_economy_profiles (
        route_id, origin, destination, flight_type, route_category, distance_nm, recommended_aircraft, economy_payload, active
      ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
      on conflict (route_id) do update set
        origin = excluded.origin,
        destination = excluded.destination,
        flight_type = excluded.flight_type,
        route_category = excluded.route_category,
        distance_nm = excluded.distance_nm,
        recommended_aircraft = excluded.recommended_aircraft,
        economy_payload = excluded.economy_payload,
        active = excluded.active,
        updated_at = now()`,
      [
        route.routeId,
        route.origin,
        route.destination,
        route.flightType,
        route.routeCategory,
        route.distanceNm,
        route.recommendedAircraft,
        JSON.stringify({ seedSource: "airline.catalog.json" }),
        Boolean(route.active),
      ],
    );
  }

  for (const expense of economyCatalog.progressionExpenses ?? []) {
    await client.query(
      `insert into public.pw3_pilot_expense_catalog (
        expense_code, label, category, amount_usd, currency, active, metadata
      ) values ($1,$2,$3,$4,'USD_VIRTUAL',true,$5::jsonb)
      on conflict (expense_code) do update set
        label = excluded.label,
        category = excluded.category,
        amount_usd = excluded.amount_usd,
        active = excluded.active,
        metadata = excluded.metadata,
        updated_at = now()`,
      [expense.code, expense.label, expense.type, Number(expense.amountUsd ?? 0), JSON.stringify({ appliesTo: expense.appliesTo ?? "", ...(expense.metadata ?? {}) })],
    );
  }
  const activeCodes = (economyCatalog.progressionExpenses ?? []).map((expense) => expense.code);
  await client.query(
    `update public.pw3_pilot_expense_catalog
     set active = false, updated_at = now()
     where expense_code <> all($1::text[])`,
    [activeCodes.length ? activeCodes : ["__none__"]],
  );

  return {
    aircraftSeedCount: airlineCatalog.aircraft.filter((a) => a.active).length,
    routesSeedCount: routes.all.length,
    expensesSeedCount: (economyCatalog.progressionExpenses ?? []).length,
  };
}

function markdownLog(input) {
  const ts = new Date().toISOString();
  const lines = [
    "# PW3 Economy DB Apply Log",
    "",
    `- Timestamp: ${ts}`,
    `- Result: ${input.ok ? "OK" : "FAIL"}`,
    `- Source DATABASE_URL: ${input.urlSource}`,
    `- DB host: ${input.maskedHost}`,
    `- DB name: ${input.database}`,
    `- DB user: ${input.maskedUser}`,
    "",
    "## Before",
    `- Existing tables: ${input.beforeTables.join(", ") || "(none)"}`,
    "",
    "## After",
    `- Verified tables: ${input.afterTables.join(", ") || "(none)"}`,
    `- Aircraft profiles: ${input.aircraftCount}`,
    `- Route profiles: ${input.routeCount}`,
    `- Progression expenses: ${input.expenseCount}`,
    `- Airline account PW3: ${input.accountOk ? "created/verified" : "missing"}`,
    `- Ledger query: ${input.ledgerOk ? "ok" : "fail"}`,
    `- Wallet query: ${input.walletOk ? "ok" : "fail"}`,
    "",
  ];
  if (input.error) {
    lines.push("## Error", "```text", input.error, "```", "");
  }
  return lines.join("\n");
}

async function main() {
  const loadedFromFile = loadDotEnvLocal();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurada (env/.env.local).");
  }
  if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
    throw new Error("PW3_CONFIRM_DB_WRITE=YES es obligatorio. Abortado antes de escribir.");
  }

  const info = parseDbUrl(connectionString);
  const maskedHost = mask(info.host);
  const maskedUser = mask(info.user);
  const urlSource = process.env.DATABASE_URL ? (loadedFromFile ? ".env.local + env actual" : "env actual") : ".env.local";

  console.log("[check] PW3 DB target pre-run");
  console.log(`[check] DATABASE_URL source: ${urlSource}`);
  console.log(`[check] host: ${maskedHost}`);
  console.log(`[check] database: ${info.database}`);
  console.log(`[check] user: ${maskedUser}`);
  console.log("[warn] ESTE SCRIPT ESCRIBE EN DB. EJECUTAR SOLO CON AUTORIZACION.");

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const tableNames = [
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

  let beforeTables = [];
  let afterTables = [];

  try {
    const client = await pool.connect();
    try {
      const before = await client.query(`select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[]) order by table_name`, [tableNames]);
      beforeTables = before.rows.map((row) => row.table_name);

      await client.query("begin");
      const sql = fs.readFileSync(SQL_PATH, "utf8");
      await client.query(sql);
      await seedData(client);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => null);
      throw error;
    } finally {
      client.release();
    }

    const client2 = await pool.connect();
    try {
      const after = await client2.query(`select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[]) order by table_name`, [tableNames]);
      afterTables = after.rows.map((row) => row.table_name);

      const aircraftCount = Number((await client2.query(`select count(*)::int as count from public.pw3_aircraft_economy_profiles where active = true`)).rows[0]?.count ?? 0);
      const routeCount = Number((await client2.query(`select count(*)::int as count from public.pw3_route_economy_profiles where active = true`)).rows[0]?.count ?? 0);
      const expenseCount = Number((await client2.query(`select count(*)::int as count from public.pw3_pilot_expense_catalog where active = true`)).rows[0]?.count ?? 0);
      const accountOk = Number((await client2.query(`select count(*)::int as count from public.pw3_airline_economy_accounts where airline_code = 'PW3'`)).rows[0]?.count ?? 0) > 0;
      const ledgerOk = (await client2.query(`select count(*)::int as count from public.pw3_economy_ledger`)).rows.length > 0;
      const walletOk = (await client2.query(`select count(*)::int as count from public.pw3_pilot_wallets`)).rows.length > 0;

      const content = markdownLog({
        ok: true,
        urlSource,
        maskedHost,
        maskedUser,
        database: info.database,
        beforeTables,
        afterTables,
        aircraftCount,
        routeCount,
        expenseCount,
        accountOk,
        ledgerOk,
        walletOk,
      });
      fs.writeFileSync(APPLY_LOG_PATH, content, "utf8");

      console.log("[ok] schema applied and seeded");
      console.log(`[ok] before tables: ${beforeTables.length}`);
      console.log(`[ok] after tables: ${afterTables.length}`);
      console.log(`[ok] aircraft: ${aircraftCount} | routes: ${routeCount} | expenses: ${expenseCount}`);
      console.log(`[ok] PW3 account: ${accountOk ? "yes" : "no"}`);
      console.log(`[ok] apply log: ${APPLY_LOG_PATH}`);

      const expectedExpenses = JSON.parse(fs.readFileSync(ECONOMY_CATALOG_PATH, "utf8")).progressionExpenses.length;
      if (aircraftCount !== 34 || routeCount !== 78 || expenseCount !== expectedExpenses || !accountOk) {
        throw new Error(`Conteos esperados no alcanzados (aircraft=${aircraftCount}, routes=${routeCount}, expenses=${expenseCount}/${expectedExpenses}, account=${accountOk}).`);
      }
    } finally {
      client2.release();
    }
  } catch (error) {
    const content = markdownLog({
      ok: false,
      urlSource,
      maskedHost,
      maskedUser,
      database: info.database,
      beforeTables,
      afterTables,
      aircraftCount: 0,
      routeCount: 0,
      expenseCount: 0,
      accountOk: false,
      ledgerOk: false,
      walletOk: false,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    fs.writeFileSync(APPLY_LOG_PATH, content, "utf8");
    console.error("[error] apply failed. rollback executed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
