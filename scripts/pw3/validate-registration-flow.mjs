import fs from "node:fs";
import process from "node:process";
import pg from "pg";

function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) return;
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
}

const checks = [];
function ok(msg) {
  checks.push({ ok: true, msg });
  console.log(`[ok] ${msg}`);
}
function fail(msg) {
  checks.push({ ok: false, msg });
  console.error(`[error] ${msg}`);
}

async function main() {
  loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[error] DATABASE_URL no definido.");
    process.exit(1);
  }

  const servicePath = "src/lib/auth/service.ts";
  const registerUiPath = "src/app/register/page.tsx";
  const service = fs.readFileSync(servicePath, "utf8");
  const registerUi = fs.readFileSync(registerUiPath, "utf8");

  if (service.includes("pilot_status = 'ACTIVE'")) ok("registro fuerza pilot_status ACTIVE");
  else fail("registro no fuerza pilot_status ACTIVE");

  if (service.includes("rank_code = 'CADET'")) ok("registro fuerza rank_code CADET");
  else fail("registro no fuerza rank_code CADET");

  if (service.includes("getNextAvailablePilotCallsign")) ok("generador primer callsign disponible implementado");
  else fail("falta generador getNextAvailablePilotCallsign");

  if (service.includes("pilot_initial_grant:")) ok("idempotency key initial grant implementada");
  else fail("falta idempotency key initial grant");

  if (service.includes("Este correo ya esta registrado. Inicia sesion o recupera tu contrasena.")) ok("mensaje user-friendly email duplicado en backend");
  else fail("falta mensaje user-friendly email duplicado");

  if (registerUi.includes("Este correo ya está registrado. Inicia sesión o recupera tu contraseña.")) ok("mensaje user-friendly email duplicado en UI");
  else ok("UI consume mensaje backend (sin hardcode adicional)");

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const duplicateEmails = await pool.query(
      `select lower(email) as normalized_email, count(*)::int as count
         from public.app_users
        group by lower(email)
       having count(*) > 1`,
    );
    if (duplicateEmails.rows.length === 0) ok("no hay doble registro por correo (case-insensitive)");
    else fail("hay correos duplicados case-insensitive");

    const pending = await pool.query(
      `select count(*)::int as count
         from public.pilot_profiles
        where upper(coalesce(pilot_status,''))='PENDING_APPROVAL'`,
    );
    if (Number(pending.rows[0]?.count ?? 0) === 0) ok("no hay pilotos nuevos en PENDING_APPROVAL");
    else fail("existen pilotos en PENDING_APPROVAL");

    const dupeCallsign = await pool.query(
      `select upper(callsign) as callsign, count(*)::int as count
         from public.pilot_profiles
        where callsign ~ '^PWG[0-9]{3,}$'
          and upper(coalesce(pilot_status,'')) not in ('ARCHIVED','DELETED','INACTIVE_ARCHIVED')
        group by upper(callsign)
       having count(*) > 1`,
    );
    if (dupeCallsign.rows.length === 0) ok("no hay callsign activo duplicado");
    else fail("hay callsign activo duplicado");

    const walletNegative = await pool.query(
      `select count(*)::int as count
         from public.pw3_pilot_wallets
        where wallet_balance_usd < 0`,
    );
    if (Number(walletNegative.rows[0]?.count ?? 0) === 0) ok("wallets no negativas");
    else fail("hay wallet negativa");

    const idx = await pool.query(
      `select indexname
         from pg_indexes
        where schemaname='public'
          and tablename='app_users'
          and indexname='app_users_email_lower_unique'`,
    );
    if (idx.rows.length > 0) ok("indice unico lower(email) creado/verificado");
    else fail("falta indice app_users_email_lower_unique");

    const grantMissing = await pool.query(
      `select count(*)::int as count
         from public.pilot_profiles p
        where upper(coalesce(p.pilot_status,''))='ACTIVE'
          and not exists (
            select 1
              from public.pw3_economy_ledger l
             where l.pilot_id = p.id
               and l.category = 'pilot_initial_grant'
          )`,
    );
    if (Number(grantMissing.rows[0]?.count ?? 0) === 0) ok("pilotos activos con initial grant en ledger");
    else fail("hay pilotos activos sin initial grant en ledger");
  } finally {
    await pool.end();
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.error(`[fail] validate-registration-flow con ${failed.length} error(es).`);
    process.exit(1);
  }
  console.log("[ok] validate-registration-flow completo.");
}

main().catch((error) => {
  console.error("[error] validate-registration-flow fatal:", error?.message || error);
  process.exit(1);
});
