import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const DB_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("[error] Missing DATABASE_URL or SUPABASE_DB_URL");
  process.exit(1);
}

const CHECK_FILES = [
  "scripts/pw3/download-ourairports.mjs",
  "scripts/pw3/import-ourairports.mjs",
  "scripts/pw3/run-pw3-supabase-master.mjs",
  "scripts/pw3/validate-pw3-master.mjs",
  "supabase/pw3/001_core_schema.sql",
  "src/app/api/acars/finalize/route.ts",
  "src/lib/acars/finalize-schema.ts",
  "scripts/pw3/validate-acars-finalize.mjs"
];

async function q(client, sql, values = []) {
  const r = await client.query(sql, values);
  return r.rows;
}

async function tableExists(client, tableName) {
  const rows = await q(
    client,
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = $1
    ) as ok`,
    [tableName]
  );
  return rows[0]?.ok === true;
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    const requiredTables = [
      "airports",
      "airport_runways",
      "pilot_ranks",
      "aircraft_models",
      "fleet_aircraft",
      "network_routes",
      "pw3_airline_hubs"
    ];
    for (const table of requiredTables) {
      if (!(await tableExists(client, table))) {
        console.log(`[error] schema incompleto: falta tabla ${table}`);
        process.exitCode = 1;
        return;
      }
    }

    const airportsTotal = (await q(client, "select count(*)::int as n from airports"))[0].n;
    const runwaysTotal = (await q(client, "select count(*)::int as n from airport_runways"))[0].n;
    const ranksTotal = (await q(client, "select count(*)::int as n from pilot_ranks"))[0].n;
    const fleetTotal = (await q(client, "select count(*)::int as n from fleet_aircraft"))[0].n;
    const fleetUnique = (await q(client, "select count(distinct registration)::int as n from fleet_aircraft"))[0].n;

    console.log(`[check] airports_total=${airportsTotal} (expected > 80000)`);
    console.log(`[check] runways_total=${runwaysTotal} (expected > 40000)`);
    console.log(`[check] ranks_total=${ranksTotal} (expected 10)`);
    console.log(`[check] fleet_total=${fleetTotal} (expected 47)`);
    console.log(`[check] fleet_unique_registration=${fleetUnique} (expected 47)`);

    const distances = await q(client, "select pw_airport_distance_nm('SCEL','SCIP') as scel_scip, pw_airport_distance_nm('SCEL','LEMD') as scel_lemd, pw_airport_distance_nm('SCTE','SCEL') as scte_scel");
    console.log("[check] distances:", distances[0]);

    const lighting = await q(client, "select lighting_policy, count(*)::int as total from airports group by lighting_policy order by total desc");
    console.log("[check] lighting_policy distribution:", lighting);

    for (const term of ["SCTE", "Santiago", "Madrid"]) {
      const rows = await q(client, "select ident, name, lighting_policy from pw_search_airports_for_dispatch($1, 10)", [term]);
      console.log(`[check] search '${term}' => ${rows.length} rows`);
    }

    for (const rel of CHECK_FILES) {
      const abs = path.join(process.cwd(), rel);
      const text = await readFile(abs, "utf8");
      const bad = ["", "", ""].filter((p) => text.includes(p));
      if (bad.length) {
        console.log(`[warn] mojibake in ${rel}: ${bad.join(", ")}`);
      }
    }
  } catch (error) {
    console.error(`[error] ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

