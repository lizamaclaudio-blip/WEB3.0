import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const DB_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("[error] Missing DATABASE_URL or SUPABASE_DB_URL");
  process.exit(1);
}

const SQL_DIR = path.join(process.cwd(), "supabase", "pw3");

async function main() {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  console.log("[db] using DATABASE_URL / NEON compatible");
  const files = (await readdir(SQL_DIR))
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => a.localeCompare(b));

  const client = await pool.connect();
  try {
    for (const file of files) {
      const filePath = path.join(SQL_DIR, file);
      const sql = await readFile(filePath, "utf8");
      console.log(`[run] ${file}`);
      try {
        await client.query(sql);
      } catch (error) {
        console.error(`[error] archivo SQL: ${file}`);
        console.error("[error] detalle completo:");
        console.error(error?.stack || error);
        throw error;
      }
    }
    console.log("[ok] PW3 master SQL ejecutado");
  } catch (error) {
    console.error(`[error] db-master detenido: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
