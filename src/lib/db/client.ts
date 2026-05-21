import "server-only";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

declare global {
  var __pw3DbPool: Pool | undefined;
}

function getConnectionString() {
  const value = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  if (!value) {
    throw new Error("DATABASE_URL no esta configurada. Configura la conexion Neon en .env.local o en el entorno de ejecucion.");
  }

  return value;
}

export function getDbPool() {
  if (!globalThis.__pw3DbPool) {
    globalThis.__pw3DbPool = new Pool({
      connectionString: getConnectionString(),
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false },
    });
  }

  return globalThis.__pw3DbPool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return getDbPool().query<T>(text, params as unknown[]);
}

export async function dbOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const result = await dbQuery<T>(text, params);
  return result.rows[0] ?? null;
}

export async function dbTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

export async function tableExists(tableName: string) {
  const row = await dbOne<{ exists: boolean }>(
    "select to_regclass($1) is not null as exists",
    [`public.${tableName}`],
  );

  return row?.exists === true;
}

export async function columnExists(tableName: string, columnName: string) {
  const row = await dbOne<{ exists: boolean }>(
    `select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    ) as exists`,
    [tableName, columnName],
  );

  return row?.exists === true;
}

export async function existingColumns(tableName: string, columns: readonly string[]): Promise<Set<string>> {
  const result = await dbQuery<{ column_name: string }>(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = $1
       and column_name = any($2::text[])`,
    [tableName, columns],
  );

  return new Set(result.rows.map((row: { column_name: string }) => row.column_name));
}

export function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}
