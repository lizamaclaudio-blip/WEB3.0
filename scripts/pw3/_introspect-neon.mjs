/**
 * _introspect-neon.mjs  — READ-ONLY Neon introspection
 * Detecta tablas reales, columnas de piloto, y busca PWG001.
 * NO hace ningún write.
 */
import pg from "pg";
import fs from "node:fs";
import process from "node:process";

const envFile = fs.readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^["'`]|["'`]$/g, "");
  if (!process.env[k]) process.env[k] = v;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function q(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows;
}

// ── FASE 1: Todas las tablas ─────────────────────────────────────────────────
console.log("\n=== FASE 1: ALL TABLES ===");
const tables = await q(
  `select table_schema, table_name
   from information_schema.tables
   where table_schema not in ('pg_catalog','information_schema')
   order by table_schema, table_name`,
);
for (const row of tables) {
  console.log(`  ${row.table_schema}.${row.table_name}`);
}

// ── FASE 2: Columnas con callsign/pilot/email/user/name ─────────────────────
console.log("\n=== FASE 2: COLUMNS MATCHING callsign|pilot|email|user|name ===");
const cols = await q(
  `select table_schema, table_name, column_name, data_type
   from information_schema.columns
   where table_schema not in ('pg_catalog','information_schema')
     and (
       lower(column_name) like '%callsign%'
       or lower(column_name) like '%pilot%'
       or lower(column_name) like '%email%'
       or lower(column_name) like '%user%'
       or lower(column_name) like '%name%'
     )
   order by table_schema, table_name, ordinal_position`,
);
for (const row of cols) {
  console.log(
    `  ${row.table_schema}.${row.table_name}.${row.column_name} [${row.data_type}]`,
  );
}

// ── FASE 3: Buscar PWG001 en tablas candidatas ───────────────────────────────
console.log("\n=== FASE 3: SEARCH PWG001 IN CANDIDATE TABLES ===");

// Encontrar tablas que tienen callsign
const callsignTables = [...new Set(
  cols
    .filter((c) => c.column_name.toLowerCase().includes("callsign"))
    .map((c) => `${c.table_schema}.${c.table_name}`),
)];
console.log(`  Tables with callsign: ${callsignTables.join(", ") || "none"}`);

for (const tbl of callsignTables) {
  try {
    const rows = await q(
      `select * from ${tbl} where lower(callsign) = lower($1) limit 5`,
      ["PWG001"],
    );
    console.log(`  ${tbl} → ${rows.length} row(s)`);
    for (const row of rows) console.log("   ", JSON.stringify(row));
  } catch (e) {
    console.log(`  ${tbl} → ERROR: ${e.message}`);
  }
}

// Buscar por nombre "claudio" en tablas con name columns
const nameTables = [...new Set(
  cols
    .filter((c) =>
      ["full_name", "first_name", "last_name", "display_name", "name"].includes(
        c.column_name.toLowerCase(),
      ),
    )
    .map((c) => `${c.table_schema}.${c.table_name}`),
)];
console.log(`\n  Tables with name cols: ${nameTables.join(", ") || "none"}`);
for (const tbl of nameTables) {
  const nameCols = cols
    .filter(
      (c) =>
        `${c.table_schema}.${c.table_name}` === tbl &&
        ["full_name", "first_name", "last_name", "display_name", "name"].includes(
          c.column_name.toLowerCase(),
        ),
    )
    .map((c) => c.column_name);
  const expr = nameCols
    .map((col) => `lower(coalesce(${col}::text,''))`)
    .join(" || ' ' || ");
  if (!expr) continue;
  try {
    const rows = await q(
      `select * from ${tbl} where (${expr}) like '%claudio%' limit 5`,
    );
    console.log(`  ${tbl} name-search → ${rows.length} row(s)`);
    for (const row of rows) console.log("   ", JSON.stringify(row));
  } catch (e) {
    console.log(`  ${tbl} → ERROR: ${e.message}`);
  }
}

// ── FASE 4: wallet y ledger existentes ──────────────────────────────────────
console.log("\n=== FASE 4: pw3_pilot_wallets PWG001 ===");
try {
  const walletRows = await q(
    `select * from public.pw3_pilot_wallets where lower(callsign) = lower($1)`,
    ["PWG001"],
  );
  if (walletRows.length === 0) {
    console.log("  No wallet for PWG001");
  } else {
    for (const row of walletRows) console.log(" ", JSON.stringify(row));
  }
} catch (e) {
  console.log("  ERROR:", e.message);
}

console.log("\n=== FASE 4: pw3_economy_ledger initial_grant ===");
try {
  const ledgerRows = await q(
    `select id, category, direction, amount_usd, idempotency_key, created_at
     from public.pw3_economy_ledger
     where category = 'pilot_initial_grant'
        or idempotency_key ilike '%pilot_initial_grant%'
     limit 10`,
  );
  if (ledgerRows.length === 0) {
    console.log("  No initial grant ledger entries");
  } else {
    for (const row of ledgerRows) console.log(" ", JSON.stringify(row));
  }
} catch (e) {
  console.log("  ERROR:", e.message);
}

await pool.end();
console.log("\n[done] introspection complete — no writes performed");
