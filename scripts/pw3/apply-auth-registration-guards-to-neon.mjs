import fs from "node:fs";
import process from "node:process";
import pg from "pg";

function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) return "env";
  const raw = fs.readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^['"`]|['"`]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
  return ".env.local";
}

function maskHost(input) {
  try {
    const url = new URL(input);
    const h = url.hostname || "";
    return h.length > 8 ? `${h.slice(0, 4)}***${h.slice(-4)}` : "***";
  } catch {
    return "***";
  }
}

async function main() {
  const source = loadEnvLocal();
  if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
    console.error("[error] PW3_CONFIRM_DB_WRITE=YES requerido.");
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[error] DATABASE_URL no definido.");
    process.exit(1);
  }
  console.log(`[info] DATABASE_URL source=${source}`);
  console.log(`[info] DB host=${maskHost(databaseUrl)}`);

  const sqlPath = "docs/sql/PW3_AUTH_REGISTRATION_GUARDS_001.sql";
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    const duplicates = await client.query(
      `select lower(email) as normalized_email, count(*)::int as count
         from public.app_users
        group by lower(email)
       having count(*) > 1`,
    );

    if (duplicates.rows.length > 0) {
      console.error("[error] Duplicados detectados en app_users (lower(email)).");
      for (const row of duplicates.rows) {
        console.error(`  - ${row.normalized_email}: ${row.count}`);
      }
      process.exit(2);
    }

    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("[ok] app_users_email_lower_unique creado/verificado.");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("[error] apply-auth-registration-guards-to-neon failed:", error?.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[error] fatal:", error?.message || error);
  process.exit(1);
});
