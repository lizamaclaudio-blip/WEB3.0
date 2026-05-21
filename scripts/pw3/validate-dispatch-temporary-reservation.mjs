import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const BASE_URL = process.env.PW3_VALIDATE_BASE_URL || "http://localhost:3000";
const TEST_CALLSIGN = "PWG001";
const TEST_ORIGIN = "SCTE";
const TEST_DESTINATION = "SCPF";
const TEST_AIRCRAFT_CODE = "BE58";
const TEST_AIRCRAFT_REGISTRATION = "CC-PBA";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function assertCheck(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[ok] ${message}`);
}

function warn(message) {
  console.log(`[warn] ${message}`);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const json = await response.json().catch(() => null);
  return { response, json };
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("[error] DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

let sessionToken = null;
let createdReservationId = null;

try {
  const pilotResult = await pool.query(
    `select
       u.id::text as user_id,
       u.email,
       u.display_name,
       p.callsign,
       p.rank_code,
       p.pilot_status,
       p.current_airport_id::text,
       a.ident as current_airport_ident
     from public.app_users u
     join public.pilot_profiles p on p.id = u.id
     left join public.airports a on a.id = p.current_airport_id
     where p.callsign = $1
     limit 1`,
    [TEST_CALLSIGN],
  );
  const pilot = pilotResult.rows[0];
  assertCheck(Boolean(pilot), `${TEST_CALLSIGN} exists`);
  assertCheck(pilot.pilot_status === "ACTIVE", `${TEST_CALLSIGN} is ACTIVE`);
  assertCheck(pilot.current_airport_ident === TEST_ORIGIN, `${TEST_CALLSIGN} current_airport = ${TEST_ORIGIN}`);

  const routeResult = await pool.query(
    `select
       nr.id::text,
       nr.route_code,
       nr.distance_nm,
       nr.route_category,
       nr.is_active,
       oa.ident as origin_ident,
       da.ident as destination_ident
     from public.network_routes nr
     join public.airports oa on oa.id = nr.origin_airport_id
     join public.airports da on da.id = nr.destination_airport_id
     where oa.ident = $1
       and da.ident = $2
       and coalesce(nr.is_active, true) = true
     order by nr.route_code nulls last
     limit 1`,
    [TEST_ORIGIN, TEST_DESTINATION],
  );
  const route = routeResult.rows[0];
  assertCheck(Boolean(route), `active route ${TEST_ORIGIN} -> ${TEST_DESTINATION} exists`);

  const aircraftResult = await pool.query(
    `select
       fa.id::text,
       fa.registration,
       fa.model_code,
       fa.aircraft_status,
       ap.ident as current_airport_ident
     from public.fleet_aircraft fa
     left join public.airports ap on ap.id = fa.current_airport_id
     where fa.registration = $1
       and fa.model_code = $2
     limit 1`,
    [TEST_AIRCRAFT_REGISTRATION, TEST_AIRCRAFT_CODE],
  );
  const aircraft = aircraftResult.rows[0];
  assertCheck(Boolean(aircraft), `${TEST_AIRCRAFT_CODE}/${TEST_AIRCRAFT_REGISTRATION} exists`);
  assertCheck(aircraft.aircraft_status === "AVAILABLE", `${TEST_AIRCRAFT_REGISTRATION} is AVAILABLE`);
  assertCheck(aircraft.current_airport_ident === TEST_ORIGIN, `${TEST_AIRCRAFT_REGISTRATION} is at ${TEST_ORIGIN}`);

  const preExistingActive = await pool.query(
    `select id::text, status, route_id::text, aircraft_registration
     from public.training_dispatch_reservations
     where pilot_user_id = $1::uuid
       and (
         status in ('ACARS_CLAIMED','RESERVED','DISPATCHED','IN_FLIGHT','LANDED','PENDING_EVALUATION','EVALUATED')
         or (status in ('TEMP_RESERVED','ACARS_READY') and expires_at > now())
       )
     limit 1`,
    [pilot.user_id],
  );
  if (preExistingActive.rows[0]) {
    throw new Error(
      `Pre-existing active reservation ${preExistingActive.rows[0].id} found. Cancel it before running the destructive test validator.`,
    );
  }
  assertCheck(true, "no pre-existing active reservation blocks the test");

  sessionToken = randomBytes(48).toString("base64url");
  await pool.query(
    `insert into public.app_sessions (user_id, token_hash, expires_at)
     values ($1::uuid, $2, now() + interval '20 minutes')`,
    [pilot.user_id, tokenHash(sessionToken)],
  );
  assertCheck(Boolean(sessionToken), "temporary validation session created");

  const cookie = `pw3_session=${sessionToken}`;
  const reservationBody = {
    operationType: "SCHOOL_OFFICIAL_ROUTE",
    routeId: route.id,
    routeCode: route.route_code,
    aircraftId: aircraft.id,
    aircraftCode: aircraft.model_code,
    aircraftRegistration: aircraft.registration,
    originIdent: TEST_ORIGIN,
    destinationIdent: TEST_DESTINATION,
    alternateIdent: "SCTE",
    departureTime: "12:00",
    flightLevel: "FL070",
    routeText: `${TEST_ORIGIN} DCT ${TEST_DESTINATION}`,
    passengerCount: 2,
    cargoKg: 0,
    fuelKg: 1200,
    fuelPolicy: "AUTO PW",
  };

  const first = await fetchJson(`${BASE_URL}/api/dispatch/training-reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(reservationBody),
  });
  assertCheck(first.response.ok, "temporary reservation endpoint responds OK");
  assertCheck(first.json?.ok === true, "temporary reservation payload ok=true");
  assertCheck(Boolean(first.json?.reservationId), "reservationId returned");
  assertCheck(Boolean(first.json?.dispatchToken), "dispatchToken returned");
  assertCheck(first.json?.route?.id === route.id, "reservation route_id matches SCTE-SCPF");
  assertCheck(first.json?.aircraft?.registration === TEST_AIRCRAFT_REGISTRATION, "reservation aircraft matches CC-PBA");
  createdReservationId = first.json.reservationId;

  const expiresAt = new Date(first.json.expiresAt);
  const ttlMinutes = (expiresAt.getTime() - Date.now()) / 60000;
  assertCheck(ttlMinutes > 12 && ttlMinutes <= 16, "expiresAt is approximately 15 minutes in the future");

  const second = await fetchJson(`${BASE_URL}/api/dispatch/training-reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(reservationBody),
  });
  assertCheck(second.response.ok, "second temporary reservation call responds OK");
  assertCheck(second.json?.reservationId === createdReservationId, "second call reuses the existing reservation");
  assertCheck(second.json?.reusedExistingReservation === true, "reusedExistingReservation=true on second call");
  assertCheck(Boolean(second.json?.dispatchToken), "second call returns a fresh dispatchToken");

  const sendToAcars = await fetchJson(`${BASE_URL}/api/dispatch/training-reservations/send-to-acars`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      reservationId: second.json.reservationId,
      dispatchToken: second.json.dispatchToken,
    }),
  });
  assertCheck(sendToAcars.response.ok, "send-to-acars responds OK");
  assertCheck(sendToAcars.json?.ok === true, "send-to-acars payload ok=true");
  assertCheck(sendToAcars.json?.reservationId === createdReservationId, "send-to-acars returns reservationId");
  assertCheck(Boolean(sendToAcars.json?.dispatchToken), "send-to-acars returns dispatchToken");
  assertCheck(sendToAcars.json?.payloadVersion === "pw3-dispatch-v1", "ACARS payload v1 prepared");
  assertCheck(Boolean(sendToAcars.json?.claimUrl), "claimUrl returned");

  const rowResult = await pool.query(
    `select
       id::text,
       pilot_callsign,
       route_id::text,
       aircraft_id::text,
       aircraft_registration,
       aircraft_model_code,
       operation_type,
       status,
       dispatch_token_hash is not null as has_token_hash,
       expires_at::text,
       created_at::text,
       updated_at::text
     from public.training_dispatch_reservations
     where id = $1::uuid`,
    [createdReservationId],
  );
  const reservationRow = rowResult.rows[0];
  assertCheck(reservationRow?.status === "ACARS_READY", "DB reservation status is ACARS_READY");
  assertCheck(reservationRow?.has_token_hash === true, "DB dispatch_token_hash is present");
  assertCheck(reservationRow?.route_id === route.id, "DB route_id is correct");
  assertCheck(reservationRow?.aircraft_id === aircraft.id, "DB aircraft_id is correct");
  assertCheck(reservationRow?.aircraft_registration === TEST_AIRCRAFT_REGISTRATION, "DB aircraft_registration is correct");

  await pool.query(
    `update public.training_dispatch_reservations
        set status = 'CANCELLED',
            acars_status = 'CANCELLED',
            updated_at = now()
      where id = $1::uuid`,
    [createdReservationId],
  );
  warn(`test reservation ${createdReservationId} cancelled for cleanup`);
  createdReservationId = null;

  console.log("[ok] dispatch temporary reservation validator completed");
} catch (error) {
  console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (createdReservationId) {
    await pool.query(
      `update public.training_dispatch_reservations
          set status = 'CANCELLED',
              acars_status = 'CANCELLED',
              updated_at = now()
        where id = $1::uuid`,
      [createdReservationId],
    ).catch(() => null);
    warn(`test reservation ${createdReservationId} cancelled after failure`);
  }

  if (sessionToken) {
    await pool.query(
      "delete from public.app_sessions where token_hash = $1",
      [tokenHash(sessionToken)],
    ).catch(() => null);
    warn("temporary validation session removed");
  }

  await pool.end();
}
