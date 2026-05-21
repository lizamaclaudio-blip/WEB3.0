#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, ".env"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[error] DATABASE_URL no definido.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

function ok(msg) {
  console.log(`[ok] ${msg}`);
}
function warn(msg) {
  console.log(`[warn] ${msg}`);
}
function fail(msg) {
  console.error(`[error] ${msg}`);
  process.exitCode = 1;
}

async function main() {
  await client.connect();
  ok("conexion DB establecida");

  const routeRow = await client.query(
    `select
       nr.id::text as id,
       nr.route_code,
       oa.ident as origin_ident,
       da.ident as destination_ident,
       coalesce(nr.is_active, true) as is_active
     from public.network_routes nr
     join public.airports oa on oa.id = nr.origin_airport_id
     join public.airports da on da.id = nr.destination_airport_id
     where upper(coalesce(oa.ident, oa.icao, '')) = 'SCTE'
       and upper(coalesce(da.ident, da.icao, '')) = 'SCIE'
       and coalesce(nr.is_active, true) = true
     order by case when upper(coalesce(nr.route_code, '')) = 'PWG695' then 0 else 1 end, nr.route_code asc nulls last
     limit 5`,
  );

  if (!routeRow.rows.length) {
    fail("no existe ruta activa SCTE -> SCIE.");
  } else {
    ok(`rutas activas SCTE->SCIE encontradas: ${routeRow.rows.length}`);
    const preferred = routeRow.rows[0];
    if (!preferred.id) fail("la ruta activa no trae id real.");
    else ok(`ruta valida id=${preferred.id} route_code=${preferred.route_code ?? "N/D"}`);
  }

  const sourcePath = path.join(repoRoot, "src", "lib", "dispatch", "neon-ops.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  if (!source.includes("nr.route_code")) fail("neon-ops no consulta route_code real.");
  else ok("neon-ops consulta route_code real");

  if (!source.includes("routeId: row.id") || !source.includes("route_id: row.id")) {
    fail("neon-ops no expone routeId/route_id de compatibilidad.");
  } else {
    ok("neon-ops expone id/routeId/route_id");
  }

  const reservationSourcePath = path.join(
    repoRoot,
    "src",
    "lib",
    "dispatch",
    "training-reservations.ts",
  );
  const reservationSource = fs.readFileSync(reservationSourcePath, "utf8");
  if (!reservationSource.includes("findRoutesByCode") || !reservationSource.includes("findRoutesByEndpoints")) {
    fail("fallback seguro de routeId no detectado en training-reservations.");
  } else {
    ok("fallback backend routeId por routeCode/origen/destino presente");
  }

  const uniqueCheck = await client.query(
    `select count(*)::int as total
     from public.network_routes nr
     join public.airports oa on oa.id = nr.origin_airport_id
     join public.airports da on da.id = nr.destination_airport_id
     where upper(coalesce(oa.ident, oa.icao, '')) = 'SCTE'
       and upper(coalesce(da.ident, da.icao, '')) = 'SCIE'
       and coalesce(nr.is_active, true) = true`,
  );
  const total = Number(uniqueCheck.rows[0]?.total ?? 0);
  if (total === 1) ok("fallback por origen/destino seria unico y seguro para SCTE->SCIE");
  else warn(`fallback por origen/destino tiene ${total} coincidencias; en ese caso se exige routeId`);

  const requiredCols = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema='public'
       and table_name='training_dispatch_reservations'
       and column_name in ('id','route_id','dispatch_token_hash','expires_at','status')
     order by column_name`,
  );
  const colSet = new Set(requiredCols.rows.map((r) => r.column_name));
  for (const col of ["id", "route_id", "dispatch_token_hash", "expires_at", "status"]) {
    if (!colSet.has(col)) fail(`falta columna requerida en training_dispatch_reservations: ${col}`);
  }
  if (process.exitCode !== 1) ok("esquema de reserva temporal contiene columnas clave");
}

main()
  .catch((error) => {
    console.error("[error] validador fallo", error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await client.end();
    } catch {
      // no-op
    }
    if (process.exitCode && process.exitCode !== 0) process.exit(process.exitCode);
  });
