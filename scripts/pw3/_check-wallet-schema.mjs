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
const q = async (sql, p = []) => (await pool.query(sql, p)).rows;

// Columnas de pw3_pilot_wallets
const cols = await q(`
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'pw3_pilot_wallets'
  order by ordinal_position
`);
console.log("=== pw3_pilot_wallets columns ===");
for (const c of cols) console.log(`  ${c.column_name} [${c.data_type}] nullable=${c.is_nullable} default=${c.column_default ?? "null"}`);

// Constraints/indexes
const constraints = await q(`
  select conname, contype, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid = 'public.pw3_pilot_wallets'::regclass
  order by contype
`);
console.log("\n=== pw3_pilot_wallets constraints ===");
for (const c of constraints) console.log(`  [${c.contype}] ${c.conname}: ${c.def}`);

// Indexes
const indexes = await q(`
  select indexname, indexdef
  from pg_indexes
  where schemaname = 'public' and tablename = 'pw3_pilot_wallets'
`);
console.log("\n=== pw3_pilot_wallets indexes ===");
for (const i of indexes) console.log(`  ${i.indexname}: ${i.indexdef}`);

// Columnas de pw3_economy_ledger constraints
const ledgerConstraints = await q(`
  select conname, contype, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid = 'public.pw3_economy_ledger'::regclass
  order by contype
`);
console.log("\n=== pw3_economy_ledger constraints ===");
for (const c of ledgerConstraints) console.log(`  [${c.contype}] ${c.conname}: ${c.def}`);

await pool.end();
