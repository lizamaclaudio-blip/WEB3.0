import pg from "pg";
import fs from "node:fs";
import process from "node:process";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i < 0) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^["'`]|["'`]$/g, "");
  if (!process.env[k]) process.env[k] = v;
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, p = []) => (await pool.query(sql, p)).rows;

const rows = await q(`
  select route_category, allows_cargo, allows_passenger, count(*) as cnt
  from public.network_routes
  where allows_cargo = true
  group by route_category, allows_cargo, allows_passenger
  order by cnt desc
  limit 20
`);
console.log("=== Rutas con allows_cargo=true ===");
if (rows.length === 0) console.log("  NINGUNA — no hay rutas cargo activas");
for (const r of rows) console.log(`  category=${r.route_category} allows_cargo=${r.allows_cargo} allows_passenger=${r.allows_passenger} count=${r.cnt}`);

const total = await q(`select count(*) as cnt from public.network_routes`);
const cargo = await q(`select count(*) as cnt from public.network_routes where allows_cargo = true`);
console.log(`\nTotal rutas: ${total[0].cnt} | Cargo rutas: ${cargo[0].cnt}`);

await pool.end();
