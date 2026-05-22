#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Client } from "pg";

const root = process.cwd();
let failed = 0;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function check(ok, label, details = "") {
  console.log(`[${ok ? "ok" : "fail"}] ${label}${details ? ` - ${details}` : ""}`);
  if (!ok) failed += 1;
}

function loadEnvFile(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  const content = fs.readFileSync(full, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function maskHost(input) {
  try {
    const host = new URL(input).hostname;
    return host.length > 10 ? `${host.slice(0, 3)}***${host.slice(-9)}` : "***";
  } catch {
    return "***";
  }
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const claimRoute = read("src/app/api/acars/dispatch/claim/route.ts");
const claimHelper = read("src/lib/acars/direct-dispatch-claim.ts");

check(claimRoute.includes("claimDirectAcarsDispatch"), "claim endpoint uses direct dispatch claim helper");
check(claimRoute.includes("pilotCallsign") && claimRoute.includes("dispatchToken"), "claim endpoint accepts pilotCallsign and dispatchToken");
check(claimRoute.includes("NO_ACARS_READY_DISPATCH"), "claim endpoint returns NO_ACARS_READY_DISPATCH when empty");
check(claimRoute.includes("UNAUTHENTICATED"), "claim by pilotCallsign requires ACARS auth");
check(claimHelper.includes("ACARS_READY"), "claim helper searches ACARS_READY state");
check(!claimHelper.includes("expires_at"), "claim helper does not require temporary reservation expiry");
check(claimHelper.includes("dispatch_payload") && claimHelper.includes("acars_payload") && claimHelper.includes("prepared_acars_payload"), "claim helper reads all payload fallback columns");
check(claimHelper.includes("status = 'ACARS_CLAIMED'") && claimHelper.includes("acars_state = 'CLAIMED'"), "claim helper marks dispatch as claimed");
check(claimHelper.includes("normalizeFlightRouteCode"), "claim helper normalizes PWG flight routeCode");

loadEnvFile(".env.local");
loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  check(false, "DATABASE_URL available for Neon read-only claim audit");
} else {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`[info] connected database host ${maskHost(databaseUrl)}`);
    const result = await client.query(`
      select
        id::text,
        pilot_callsign,
        route_code,
        assigned_flight_number,
        assigned_callsign,
        aircraft_model_code,
        aircraft_registration,
        payload_version,
        acars_state,
        status,
        dispatch_token_hash,
        dispatch_payload,
        acars_payload,
        prepared_acars_payload
      from public.training_dispatch_reservations
      where upper(coalesce(pilot_callsign, '')) = 'PWG001'
        and (
          upper(coalesce(acars_state, '')) = 'ACARS_READY'
          or upper(coalesce(status, '')) = 'ACARS_READY'
        )
      order by coalesce(sent_to_acars_at, acars_ready_at, created_at) desc
      limit 1
    `);

    const row = result.rows[0];
    check(Boolean(row), "latest PWG001 ACARS_READY dispatch exists");
    if (row) {
      const payload = asObject(row.dispatch_payload ?? row.acars_payload ?? row.prepared_acars_payload);
      const flight = asObject(payload.flight);
      const route = asObject(payload.route);
      const aircraft = asObject(payload.aircraft);
      const simbrief = asObject(payload.simbrief);
      const loading = asObject(payload.loading);
      const schedule = asObject(payload.schedule);
      const economySnapshot = asObject(payload.economySnapshot ?? payload.economy_snapshot);
      const dispatchToken = String(payload.dispatchToken ?? payload.dispatch_token ?? "");

      check(row.payload_version === "pw3-dispatch-v1" || payload.payloadVersion === "pw3-dispatch-v1", "claim source has pw3-dispatch-v1 payload");
      check(row.assigned_callsign === "PWG695" || flight.callsign === "PWG695", "claim source has flight PWG695");
      check(route.origin === "SCTE" && route.destination === "SCIE", "claim source has route SCTE to SCIE");
      check((aircraft.aircraftCode ?? aircraft.model_code) === "C208" && aircraft.registration === "CC-PCD", "claim source has aircraft C208 CC-PCD");
      check(Object.keys(simbrief).length > 0, "claim source includes simbrief");
      check(Object.keys(loading).length > 0, "claim source includes loading");
      check(Object.keys(schedule).length > 0, "claim source includes schedule");
      check(Object.keys(economySnapshot).length > 0, "claim source includes economySnapshot");
      if (dispatchToken) {
        const tokenHash = createHash("sha256").update(dispatchToken).digest("hex");
        check(tokenHash === row.dispatch_token_hash, "claim by dispatchToken can match stored hash");
      } else {
        check(false, "claim source exposes dispatchToken inside payload for ACARS compatibility");
      }
    }
  } catch (error) {
    check(false, "Neon read-only claim audit completed", error instanceof Error ? error.message : String(error));
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (failed > 0) {
  console.error(`\n[fail] validate-acars-claim-direct-dispatch: ${failed} check(s) failed`);
  process.exit(1);
}

console.log("\n[ok] validate-acars-claim-direct-dispatch");
