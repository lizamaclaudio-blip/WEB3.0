import fs from "node:fs";
import process from "node:process";
import pg from "pg";

const TARGET_EMAIL = "lizamaclaudio@gmail.com";
const TARGET_CALLSIGN = "PWG001";
const INITIAL_GRANT = 25000;

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
  loadEnvLocal();
  if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
    console.error("[error] PW3_CONFIRM_DB_WRITE=YES requerido.");
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[error] DATABASE_URL no definido.");
    process.exit(1);
  }
  console.log(`[info] DB host=${maskHost(databaseUrl)}`);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("begin");

    const user = await client.query(
      `select u.id::text as user_id, u.email, p.callsign, p.rank_code, p.pilot_status
         from public.app_users u
         join public.pilot_profiles p on p.id = u.id
        where lower(u.email) = lower($1)
        limit 1`,
      [TARGET_EMAIL],
    );
    if (!user.rows[0]) throw new Error("Usuario Claudio no encontrado.");
    const userId = user.rows[0].user_id;

    const conflict = await client.query(
      `select id::text, callsign
         from public.pilot_profiles
        where upper(callsign) = $1
          and id <> $2::uuid
          and upper(coalesce(pilot_status,'')) not in ('ARCHIVED','DELETED','INACTIVE_ARCHIVED')
        limit 1`,
      [TARGET_CALLSIGN, userId],
    );
    if (conflict.rows[0]) {
      throw new Error(`PWG001 ocupado por otro piloto activo (${conflict.rows[0].id}).`);
    }

    await client.query(
      `update public.pilot_profiles
          set callsign = $2,
              callsign_number = 1,
              rank_code = 'CADET',
              pilot_status = 'ACTIVE',
              updated_at = now()
        where id = $1::uuid`,
      [userId, TARGET_CALLSIGN],
    );

    await client.query(
      `insert into public.pw3_pilot_wallets (pilot_id, callsign)
       values ($1::uuid, $2)
       on conflict do nothing`,
      [userId, TARGET_CALLSIGN],
    );

    await client.query(
      `update public.pw3_pilot_wallets
          set callsign = $2,
              updated_at = now()
        where pilot_id = $1::uuid
           or lower(callsign) = lower('PWG002')`,
      [userId, TARGET_CALLSIGN],
    );

    const idempotencyKey = `pilot_initial_grant:${userId}`;
    const existingGrant = await client.query(
      `select id::text from public.pw3_economy_ledger where idempotency_key = $1 limit 1`,
      [idempotencyKey],
    );

    let grantApplied = false;
    if (!existingGrant.rows[0]) {
      const wallet = await client.query(
        `select id::text
           from public.pw3_pilot_wallets
          where pilot_id = $1::uuid
             or lower(callsign) = lower($2)
          limit 1
          for update`,
        [userId, TARGET_CALLSIGN],
      );
      const walletId = wallet.rows[0]?.id;
      if (!walletId) throw new Error("Wallet no encontrada para aplicar grant inicial.");

      await client.query(
        `update public.pw3_pilot_wallets
            set wallet_balance_usd = coalesce(wallet_balance_usd, 0) + $2,
                total_earned_usd = coalesce(total_earned_usd, 0) + $2,
                updated_at = now()
          where id = $1::uuid`,
        [walletId, INITIAL_GRANT],
      );

      await client.query(
        `insert into public.pw3_economy_ledger
          (pilot_id, callsign, source, type, category, direction, amount_usd, status, description, metadata, idempotency_key, created_by)
         values
          ($1::uuid, $2, 'system', 'adjustment', 'pilot_initial_grant', 'credit', $3, 'posted', 'Capital inicial carrera Patagonia Wings 3.0', $4::jsonb, $5, 'fix-claudio-register')`,
        [userId, TARGET_CALLSIGN, INITIAL_GRANT, JSON.stringify({ reason: "registration_fix" }), idempotencyKey],
      );
      grantApplied = true;
    }

    await client.query("commit");
    console.log(
      JSON.stringify(
        {
          ok: true,
          userId,
          email: TARGET_EMAIL,
          callsign: TARGET_CALLSIGN,
          rankCode: "CADET",
          pilotStatus: "ACTIVE",
          grantApplied,
          idempotencyKey,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("[error] fix-claudio-registration-state failed:", error?.message || error);
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
