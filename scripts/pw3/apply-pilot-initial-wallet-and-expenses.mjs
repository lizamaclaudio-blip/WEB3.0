/**
 * apply-pilot-initial-wallet-and-expenses.mjs
 * PW3 E3.5 — Capital inicial piloto + actualización de catálogo de gastos
 *
 * Flags requeridos/opcionales:
 *   PW3_CONFIRM_DB_WRITE=YES                    — obligatorio para escribir en DB
 *   PW3_TARGET_PILOT_CALLSIGN=PWG001            — aplicar solo a este callsign
 *   PW3_TARGET_PILOT_EMAIL=claudio@example.com  — aplicar solo a este email
 *   PW3_APPLY_INITIAL_GRANT_TO_ALL_PILOTS=YES   — aplicar a todos los pilotos existentes
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Flags ────────────────────────────────────────────────────────────────────
const CONFIRM        = process.env.PW3_CONFIRM_DB_WRITE === "YES";
const TARGET_CALLSIGN = process.env.PW3_TARGET_PILOT_CALLSIGN?.trim() || null;
const TARGET_EMAIL   = process.env.PW3_TARGET_PILOT_EMAIL?.trim() || null;
const APPLY_ALL      = process.env.PW3_APPLY_INITIAL_GRANT_TO_ALL_PILOTS === "YES";

if (!CONFIRM) {
  console.error("[error] PW3_CONFIRM_DB_WRITE=YES requerido para ejecutar este script.");
  process.exit(1);
}

// ── DB connection ────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[error] DATABASE_URL no encontrada en entorno/.env.local");
  process.exit(1);
}

// Mask host for display
function maskDbUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//*****:*****@${u.hostname}${u.pathname}`;
  } catch {
    return "***masked***";
  }
}
console.log(`[info] DB host: ${maskDbUrl(DATABASE_URL)}`);

// ── Load catalog ─────────────────────────────────────────────────────────────
const CATALOG_PATH = path.join(process.cwd(), "src", "lib", "economy", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const INITIAL_GRANT_USD = catalog.initialPilotWalletGrantUsd ?? 25000;
const PROGRESSION_EXPENSES = catalog.progressionExpenses ?? [];

console.log(`[info] initial_pilot_wallet_grant_usd=${INITIAL_GRANT_USD}`);
console.log(`[info] progression_expenses_in_catalog=${PROGRESSION_EXPENSES.length}`);

// ── Dynamic pg import ────────────────────────────────────────────────────────
let pg;
try {
  pg = (await import("pg")).default;
} catch {
  console.error("[error] pg package no disponible. Ejecuta: npm install pg");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ── FASE 1: Upsert catálogo de gastos en pw3_pilot_expense_catalog ───────────
console.log("\n[step] Upserting expense catalog...");
let catalogUpserted = 0;
for (const expense of PROGRESSION_EXPENSES) {
  await query(
    `insert into public.pw3_pilot_expense_catalog
       (expense_code, label, category, amount_usd, currency, active, metadata)
     values ($1, $2, $3, $4, 'USD_VIRTUAL', true, $5::jsonb)
     on conflict (expense_code) do update
       set label      = excluded.label,
           category   = excluded.category,
           amount_usd = excluded.amount_usd,
           currency   = excluded.currency,
           active     = excluded.active,
           metadata   = excluded.metadata,
           updated_at = now()`,
    [
      expense.code,
      expense.label,
      expense.type,
      Number(expense.amountUsd),
      JSON.stringify({ appliesTo: expense.appliesTo ?? "", ...(expense.metadata ?? {}) }),
    ],
  );
  catalogUpserted++;
}
console.log(`[ok] catalog_upserted=${catalogUpserted}`);

// ── FASE 2: Identify target pilot(s) ─────────────────────────────────────────
console.log("\n[step] Identifying pilot(s)...");

// Tabla real de pilotos: public.pilot_profiles (callsign, id)
// Tabla real de usuarios: public.app_users (id, email, display_name)
// Las tablas comparten el mismo id (uuid)
async function listCandidates() {
  const rows = [];

  if (TARGET_CALLSIGN) {
    const r = await query(
      `select p.id as pilot_id, p.callsign, a.email,
              w.id as wallet_id, w.wallet_balance_usd
       from public.pilot_profiles p
       left join public.app_users a on a.id = p.id
       left join public.pw3_pilot_wallets w
         on (w.pilot_id = p.id or lower(w.callsign) = lower(p.callsign))
       where lower(p.callsign) = lower($1)
       limit 1`,
      [TARGET_CALLSIGN],
    );
    rows.push(...r.rows);
  }

  if (TARGET_EMAIL && rows.length === 0) {
    const r = await query(
      `select p.id as pilot_id, p.callsign, a.email,
              w.id as wallet_id, w.wallet_balance_usd
       from public.app_users a
       join public.pilot_profiles p on p.id = a.id
       left join public.pw3_pilot_wallets w
         on (w.pilot_id = p.id or lower(w.callsign) = lower(p.callsign))
       where lower(a.email) = lower($1)
       limit 1`,
      [TARGET_EMAIL],
    );
    rows.push(...r.rows);
  }

  if (APPLY_ALL && rows.length === 0) {
    const r = await query(
      `select p.id as pilot_id, p.callsign, a.email,
              w.id as wallet_id, w.wallet_balance_usd
       from public.pilot_profiles p
       left join public.app_users a on a.id = p.id
       left join public.pw3_pilot_wallets w
         on (w.pilot_id = p.id or lower(w.callsign) = lower(p.callsign))
       order by p.created_at asc`,
    );
    rows.push(...r.rows);
  }

  return rows;
}

// If no target flags at all, list candidates safely without applying
if (!TARGET_CALLSIGN && !TARGET_EMAIL && !APPLY_ALL) {
  console.log("[info] No target flag set. Listing existing pilots (no changes applied):");
  const r = await query(
    `select p.id as pilot_id, p.callsign, a.email,
            w.wallet_balance_usd
     from public.pilot_profiles p
     left join public.app_users a on a.id = p.id
     left join public.pw3_pilot_wallets w
       on (w.pilot_id = p.id or lower(w.callsign) = lower(p.callsign))
     order by p.created_at asc
     limit 20`,
  );
  for (const row of r.rows) {
    const callsign = row.callsign ?? "(sin callsign)";
    const email = row.email ? row.email.replace(/(?<=.).(?=[^@]*@)/g, "*") : "(sin email)";
    console.log(`  pilot=${callsign}  email=${email}  wallet=${row.wallet_balance_usd ?? "null"}`);
  }
  console.log("[info] Para aplicar, usa PW3_TARGET_PILOT_CALLSIGN=<CALLSIGN> o PW3_APPLY_INITIAL_GRANT_TO_ALL_PILOTS=YES");
  await pool.end();
  process.exit(0);
}

const pilots = await listCandidates();

if (pilots.length === 0) {
  console.error("[error] No se encontraron pilotos con los criterios dados. Verifica callsign/email.");
  await pool.end();
  process.exit(1);
}

console.log(`[info] pilots_found=${pilots.length}`);
for (const p of pilots) {
  const emailMasked = p.email ? p.email.replace(/(?<=.).(?=[^@]*@)/g, "*") : "(sin email)";
  console.log(`  callsign=${p.callsign}  email=${emailMasked}  wallet_balance=${p.wallet_balance_usd ?? "null"}`);
}

// ── FASE 3: Apply initial grant idempotently ──────────────────────────────────
console.log("\n[step] Applying initial wallet grant...");

let grantsApplied = 0;
let grantsSkipped = 0;

for (const pilot of pilots) {
  const pilotId = pilot.pilot_id ?? null;
  const callsign = pilot.callsign ?? null;
  const idempotencyKey = pilotId
    ? `pilot_initial_grant:${pilotId}`
    : `pilot_initial_grant:${callsign?.toLowerCase()}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check idempotency — if ledger entry exists, skip
    const existing = await client.query(
      `select id from public.pw3_economy_ledger
       where idempotency_key = $1 limit 1`,
      [idempotencyKey],
    );
    if (existing.rows.length > 0) {
      console.log(`  [skip] ${callsign} — initial grant already applied (idempotency_key=${idempotencyKey})`);
      await client.query("ROLLBACK");
      grantsSkipped++;
      continue;
    }

    // 2. Upsert wallet (create if not exists)
    // Dos unique indexes: uidx_pilot_id (WHERE pilot_id IS NOT NULL)
    //                     uidx_callsign_lower (WHERE callsign IS NOT NULL)
    // Usamos INSERT ... ON CONFLICT DO NOTHING con ambas estrategias:
    // INSERT WHERE NOT EXISTS — seguro con partial unique indexes en PostgreSQL
    await client.query(
      `insert into public.pw3_pilot_wallets (pilot_id, callsign, wallet_balance_usd, total_earned_usd)
       select $1::uuid, $2, 0, 0
       where not exists (
         select 1 from public.pw3_pilot_wallets
         where ($1::uuid is not null and pilot_id = $1::uuid)
            or ($2::text is not null and lower(callsign) = lower($2))
       )`,
      [pilotId, callsign],
    );

    // 3. Get wallet row with lock
    const walletRow = await client.query(
      `select id, wallet_balance_usd, total_earned_usd
       from public.pw3_pilot_wallets
       where ($1::uuid is not null and pilot_id = $1)
          or ($2::text is not null and lower(callsign) = lower($2))
       limit 1 for update`,
      [pilotId, callsign],
    );
    const wallet = walletRow.rows[0];
    if (!wallet) {
      await client.query("ROLLBACK");
      console.error(`  [error] ${callsign} — wallet no encontrada tras upsert`);
      continue;
    }

    const prevBalance = Number(wallet.wallet_balance_usd ?? 0);
    const newBalance = Number((prevBalance + INITIAL_GRANT_USD).toFixed(2));
    console.log(`  [info] ${callsign} — pilot_id=${pilotId ?? "null"} | tabla=pilot_profiles | wallet_prev=${prevBalance}`);

    // 4. Credit wallet
    await client.query(
      `update public.pw3_pilot_wallets
       set wallet_balance_usd = $2,
           total_earned_usd   = total_earned_usd + $3,
           updated_at         = now()
       where id = $1`,
      [wallet.id, newBalance, INITIAL_GRANT_USD],
    );

    // 5. Insert economy ledger (idempotent)
    await client.query(
      `insert into public.pw3_economy_ledger
         (pilot_id, callsign, source, type, category, direction, amount_usd,
          description, idempotency_key, metadata, created_by)
       values ($1::uuid, $2, 'system', 'adjustment', 'pilot_initial_grant', 'credit',
               $3, $4, $5, $6::jsonb, 'apply-script-e3.5')
       on conflict (idempotency_key) do nothing`,
      [
        pilotId,
        callsign,
        INITIAL_GRANT_USD,
        "Capital inicial carrera Patagonia Wings 3.0",
        idempotencyKey,
        JSON.stringify({ reason: "initial_wallet_grant", version: "PW3_E3_5" }),
      ],
    );

    await client.query("COMMIT");
    console.log(`  [ok] ${callsign} — balance ${prevBalance} → ${newBalance}`);
    console.log(`       idempotency_key=${idempotencyKey}`);
    console.log(`       alreadyProcessed=false`);
    grantsApplied++;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  [error] ${callsign} — ${err.message}`);
  } finally {
    client.release();
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n[summary]");
console.log(`  catalog_upserted=${catalogUpserted}`);
console.log(`  pilots_found=${pilots.length}`);
console.log(`  grants_applied=${grantsApplied}`);
console.log(`  grants_skipped_already_applied=${grantsSkipped}`);
console.log(`  initial_grant_usd=${INITIAL_GRANT_USD}`);
console.log(`  idempotency=OK (no duplicates if re-run)`);

await pool.end();
console.log("\n[ok] apply-pilot-initial-wallet-and-expenses complete");
