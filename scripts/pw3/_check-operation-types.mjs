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

console.log("=== pw_flight_operation_rules ===");
const ops = await q(`select code, label, is_active, sort_order from public.pw_flight_operation_rules order by sort_order, code`);
for (const op of ops) console.log(`  [${op.is_active ? "active" : "inactive"}] ${op.code} — ${op.label}`);

console.log("\n=== CARGO_OFFICIAL specifically ===");
const cargo = await q(`select * from public.pw_flight_operation_rules where code = 'CARGO_OFFICIAL'`);
if (cargo.length === 0) {
  console.log("  NOT FOUND — CARGO_OFFICIAL does not exist in pw_flight_operation_rules");
} else {
  for (const row of cargo) console.log(" ", JSON.stringify(row));
}

console.log("\n=== pilot_ranks allows_cargo ===");
const ranks = await q(`select rank_code, allows_cargo from public.pilot_ranks order by rank_code`);
for (const r of ranks) console.log(`  ${r.rank_code}: allows_cargo=${r.allows_cargo}`);

console.log("\n=== network_routes category cargo count ===");
const cargoRoutes = await q(`
  select category, count(*) as cnt
  from public.network_routes
  where upper(coalesce(category,'')) in ('CARGO','CARGA','CARGO_OFFICIAL')
     or upper(coalesce(category,'')) like 'CARGA_%'
  group by category order by category
`);
if (cargoRoutes.length === 0) {
  console.log("  No cargo routes found in network_routes");
} else {
  for (const r of cargoRoutes) console.log(`  category=${r.category} count=${r.cnt}`);
}

await pool.end();
