import fs from "node:fs";
import process from "node:process";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) return;
  const raw = fs.readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"`]|['"`]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function createPasswordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  return { algorithm: "scrypt-v1", salt, passwordHash };
}

function maskEmail(email) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const left = user.length <= 2 ? `${user[0]}*` : `${user.slice(0, 2)}***`;
  return `${left}@${domain}`;
}

async function main() {
  loadEnvLocal();

  if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
    console.error("[error] PW3_CONFIRM_DB_WRITE=YES requerido.");
    process.exit(1);
  }

  const email = (process.env.PW3_TARGET_EMAIL || "").trim().toLowerCase();
  const newPassword = process.env.PW3_NEW_PASSWORD || "";
  if (!email) {
    console.error("[error] PW3_TARGET_EMAIL requerido.");
    process.exit(1);
  }
  if (!newPassword || newPassword.length < 8) {
    console.error("[error] PW3_NEW_PASSWORD requerido (min 8 chars).");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("[error] DATABASE_URL no definido.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const user = await pool.query(
      `select id::text, email from public.app_users where lower(email)=lower($1) limit 1`,
      [email],
    );
    if (!user.rows[0]) {
      console.error("[error] Usuario no encontrado.");
      process.exit(1);
    }

    const userId = user.rows[0].id;
    const pass = createPasswordHash(newPassword);

    const updated = await pool.query(
      `update public.app_user_credentials
          set password_hash = $2,
              password_salt = $3,
              password_algorithm = $4,
              updated_at = now()
        where user_id = $1::uuid`,
      [userId, pass.passwordHash, pass.salt, pass.algorithm],
    );

    if (updated.rowCount !== 1) {
      console.error("[error] No se actualizo credencial (rowCount != 1).");
      process.exit(1);
    }

    console.log(`[ok] Password reseteada para ${maskEmail(email)} user_id=${userId}`);
    console.log("[ok] Wallet y pilot_profile no modificados.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[error] reset-pilot-password", err?.message || err);
  process.exit(1);
});
