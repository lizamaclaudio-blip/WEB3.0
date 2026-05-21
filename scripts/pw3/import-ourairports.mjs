import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse";
import pg from "pg";

const { Pool } = pg;
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "ourairports");
const DB_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.error("[error] Missing DATABASE_URL or SUPABASE_DB_URL");
  process.exit(1);
}

const FILES = [
  { file: "airports.csv", table: "ourairports_airports_import" },
  { file: "runways.csv", table: "ourairports_runways_import" },
  { file: "countries.csv", table: "ourairports_countries_import" },
  { file: "regions.csv", table: "ourairports_regions_import" }
];

function sanitizeColumnName(name) {
  return name.replace(/"/g, "").trim();
}

async function importCsv(client, filePath, tableName) {
  const parser = createReadStream(filePath).pipe(parse({ columns: true, bom: true, relax_quotes: true, skip_empty_lines: true, trim: false }));
  let columns = null;
  let batch = [];
  let count = 0;
  const batchSize = 500;

  for await (const row of parser) {
    if (!columns) columns = Object.keys(row).map(sanitizeColumnName);
    batch.push(row);
    if (batch.length >= batchSize) {
      await insertBatch(client, tableName, columns, batch);
      count += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await insertBatch(client, tableName, columns, batch);
    count += batch.length;
  }
  return count;
}

async function insertBatch(client, table, columns, rows) {
  const tableColumnsRows = await client.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    [table]
  );
  const tableColumns = new Set(tableColumnsRows.rows.map((r) => r.column_name));
  const effectiveColumns = columns.filter((c) => tableColumns.has(c));
  if (effectiveColumns.length === 0) return;

  const quotedCols = effectiveColumns.map((c) => `"${c}"`).join(", ");
  const values = [];
  const placeholders = rows.map((row, rIdx) => {
    const rowHolders = effectiveColumns.map((col, cIdx) => {
      values.push(row[col]);
      return `$${rIdx * effectiveColumns.length + cIdx + 1}`;
    });
    return `(${rowHolders.join(", ")})`;
  });
  const sql = `insert into ${table} (${quotedCols}) values ${placeholders.join(", ")}`;
  await client.query(sql, values);
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    for (const f of FILES) {
      await access(path.join(DATA_DIR, f.file));
    }
    await client.query("begin");
    await client.query("truncate table ourairports_airports_import, ourairports_runways_import, ourairports_countries_import, ourairports_regions_import");

    const report = {};
    for (const f of FILES) {
      const filePath = path.join(DATA_DIR, f.file);
      report[f.table] = await importCsv(client, filePath, f.table);
    }
    await client.query("commit");

    console.log(`[ok] airports importados: ${report.ourairports_airports_import}`);
    console.log(`[ok] runways importados: ${report.ourairports_runways_import}`);
    console.log(`[ok] countries importados: ${report.ourairports_countries_import}`);
    console.log(`[ok] regions importados: ${report.ourairports_regions_import}`);
  } catch (error) {
    await client.query("rollback");
    console.error(`[error] ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
