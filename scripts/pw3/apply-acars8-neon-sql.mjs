import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("No existe .env.local y DATABASE_URL no está en variables de entorno.");
  }

  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split(/\r?\n/).find((value) => /^\s*DATABASE_URL\s*=/.test(value));

  if (!line) {
    throw new Error("No se encontró DATABASE_URL en .env.local.");
  }

  return line
    .replace(/^\s*DATABASE_URL\s*=\s*/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

const sqlFiles = [
  "supabase/migrations/20260523_acars_snapshot_performance_indexes.sql",
  "supabase/migrations/20260523_acars_evaluation_engine.sql",
];

const databaseUrl = readDatabaseUrl();

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  for (const file of sqlFiles) {
    const fullPath = path.resolve(file);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`No existe el archivo SQL: ${file}`);
    }

    console.log(`Aplicando SQL: ${file}`);
    const sql = fs.readFileSync(fullPath, "utf8");
    await client.query(sql);
    console.log(`OK: ${file}`);
  }

  const validation = await client.query(`
    select
      to_regclass('public.acars_evaluations') as acars_evaluations,
      to_regclass('public.acars_evaluation_penalties') as acars_evaluation_penalties,
      to_regclass('public.acars_evaluation_evidence') as acars_evaluation_evidence;
  `);

  console.log("Validación tablas ACARS evaluation:");
  console.table(validation.rows);

  const indexes = await client.query(`
    select schemaname, tablename, indexname
    from pg_indexes
    where schemaname = 'public'
      and (
        tablename ilike '%dispatch%'
        or tablename ilike '%pirep%'
        or tablename ilike '%acars%'
        or tablename ilike '%pilot%'
      )
    order by tablename, indexname;
  `);

  console.log("Índices relacionados:");
  console.table(indexes.rows);

  console.log("SQL ACARS 8 aplicado y validado correctamente en Neon.");
} finally {
  await client.end();
}
