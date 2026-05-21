import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const ROOT = process.cwd();
const SQL_PATH = path.join(ROOT, "docs", "sql", "PW3_ACARS_FINALIZE_SCHEMA_001.sql");

if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
  console.error("[error] PW3_CONFIRM_DB_WRITE=YES requerido.");
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[error] DATABASE_URL ausente.");
  process.exit(1);
}

const url = new URL(dbUrl);
const mask = (v) => (v.length <= 4 ? "***" : `${v.slice(0,2)}***${v.slice(-2)}`);
console.log(`[check] host=${mask(url.hostname)} db=${url.pathname.replace(/^\//,"")} user=${mask(decodeURIComponent(url.username||"na"))}`);
console.log("[warn] ESTE SCRIPT ESCRIBE EN DB. EJECUTAR SOLO CON AUTORIZACION.");

const sql = fs.readFileSync(SQL_PATH, "utf8");
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const client = await pool.connect();
try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("[ok] acars finalize schema applied");
} catch (e) {
  await client.query("rollback").catch(() => null);
  console.error("[error] rollback executed", e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
