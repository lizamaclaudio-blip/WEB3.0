#!/usr/bin/env node
import { Client } from "pg";

function maskHost(input) {
  if (!input) return "";
  let host = "";
  try {
    if (input.includes("://")) {
      host = new URL(input).hostname;
    } else {
      const at = input.split("@")[1] || "";
      host = at.split(":")[0] || input;
    }
  } catch {
    host = input;
  }
  if (!host) return "";
  if (host.length <= 8) return "*".repeat(host.length);
  return `${host.slice(0, 3)}***${host.slice(-8)}`;
}

const url = process.env.DATABASE_URL || "";
if (!url) {
  console.log(JSON.stringify({ ok: false, code: "DATABASE_URL_MISSING" }, null, 2));
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  const identity = await client.query("select current_database() as db, current_user as usr");
  const appUsers = await client.query("select count(*)::int as count from public.app_users");
  const profiles = await client.query("select count(*)::int as count from public.pilot_profiles");
  const routes = await client.query("select count(*)::int as count from public.network_routes");
  const reservations = await client.query("select count(*)::int as count from public.training_dispatch_reservations");
  const scteScie = await client.query(
    `select r.id, r.route_code, ao.ident as origin_icao, ad.ident as destination_icao, r.is_active
     from public.network_routes r
     join public.airports ao on ao.id = r.origin_airport_id
     join public.airports ad on ad.id = r.destination_airport_id
     where ao.ident='SCTE'
       and ad.ident='SCIE'
       and r.is_active=true
     order by r.route_code`,
  );
  const pwg001 = await client.query(
    `select p.callsign as pilot_callsign, p.pilot_status, a.ident as current_airport_icao
     from public.pilot_profiles p
     left join public.airports a on a.id = p.current_airport_id
     where p.callsign='PWG001'
     limit 1`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseUrlPresent: true,
        databaseHostMasked: maskHost(url),
        currentDatabase: identity.rows[0]?.db ?? null,
        currentUser: identity.rows[0]?.usr ?? null,
        counts: {
          app_users: appUsers.rows[0]?.count ?? 0,
          pilot_profiles: profiles.rows[0]?.count ?? 0,
          network_routes: routes.rows[0]?.count ?? 0,
          training_dispatch_reservations: reservations.rows[0]?.count ?? 0,
          scte_scie_active: scteScie.rowCount ?? 0,
        },
        scteScieRoutes: scteScie.rows,
        pwg001: pwg001.rows[0] ?? null,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        code: "DB_AUDIT_FAILED",
        message: error instanceof Error ? error.message : String(error),
        databaseHostMasked: maskHost(url),
      },
      null,
      2,
    ),
  );
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
