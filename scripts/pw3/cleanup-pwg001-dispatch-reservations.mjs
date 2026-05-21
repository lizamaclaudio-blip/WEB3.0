import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));

if (process.env.PW3_CONFIRM_DB_WRITE !== "YES") {
  console.error("[error] Set PW3_CONFIRM_DB_WRITE=YES to run this cleanup.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("[error] DATABASE_URL or SUPABASE_DB_URL missing.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  const before = await pool.query(
    `select id::text, pilot_callsign, route_id::text, aircraft_registration, status, expires_at::text
     from public.training_dispatch_reservations
     where pilot_callsign = 'PWG001'
       and status in ('RESERVED','PENDING','READY_FOR_ACARS','SENT_TO_ACARS','ACTIVE','TEMP_RESERVED','ACARS_READY')
     order by created_at desc`,
  );
  console.log(`[info] active_or_temp_found=${before.rowCount}`);

  const expired = await pool.query(
    `update public.training_dispatch_reservations
       set status='EXPIRED', acars_status='EXPIRED', updated_at=now()
     where pilot_callsign='PWG001'
       and status in ('RESERVED','PENDING','READY_FOR_ACARS','SENT_TO_ACARS','ACTIVE','TEMP_RESERVED','ACARS_READY')
       and expires_at <= now()`,
  );

  const cancelled = await pool.query(
    `update public.training_dispatch_reservations
       set status='CANCELLED', acars_status='CANCELLED', updated_at=now()
     where pilot_callsign='PWG001'
       and status in ('RESERVED','PENDING','READY_FOR_ACARS','SENT_TO_ACARS','ACTIVE','TEMP_RESERVED','ACARS_READY')
       and (expires_at is null or expires_at > now())`,
  );

  const after = await pool.query(
    `select count(*)::int as c
     from public.training_dispatch_reservations
     where pilot_callsign='PWG001'
       and status in ('RESERVED','PENDING','READY_FOR_ACARS','SENT_TO_ACARS','ACTIVE','TEMP_RESERVED','ACARS_READY')
       and (expires_at is null or expires_at > now())`,
  );

  console.log(`[ok] expired=${expired.rowCount} cancelled=${cancelled.rowCount} remaining_active=${after.rows[0].c}`);
} finally {
  await pool.end();
}
