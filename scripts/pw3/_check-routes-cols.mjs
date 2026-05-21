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

const cols = await q(`select column_name, data_type from information_schema.columns where table_schema='public' and table_name='network_routes' order by ordinal_position`);
console.log("network_routes columns:");
for (const c of cols) console.log(`  ${c.column_name} [${c.data_type}]`);

const sample = await q(`select * from public.network_routes limit 2`);
console.log("\nSample rows:");
for (const r of sample) console.log(" ", JSON.stringify(r).slice(0, 300));

await pool.end();
