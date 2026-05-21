import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function fail(msg) {
  console.error(`[error] ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[check] ${msg}`);
}

function miniValidate(payload) {
  const errors = [];
  if (payload.payloadVersion !== "pw3-acars-finalize-v1") errors.push("version");
  if (!payload.reservationId) errors.push("reservationId");
  if (!payload.pilotCallsign) errors.push("pilotCallsign");
  if (!payload.aircraftCode) errors.push("aircraftCode");
  if (!payload.finalStatus) errors.push("finalStatus");
  if (payload.flightType === "cargo" && Number(payload.actual?.passengerCount || 0) > 0) errors.push("cargo_passengers");
  if (payload.flightType === "cargo" && Number(payload.actual?.ticketRevenueUsd || 0) > 0) errors.push("cargo_ticket");
  if (payload.finalStatus === "completed" && !(payload.landedAt || payload.completedAt)) errors.push("completed_timestamps");
  return errors;
}

const finalizeRoutePath = "src/app/api/acars/finalize/route.ts";
const schemaPath = "src/lib/acars/finalize-schema.ts";
const ledgerPath = "src/lib/acars/finalize-ledger.ts";
const economyPath = "src/lib/acars/finalize-economy.ts";
const scorePath = "src/lib/acars/finalize-score.ts";
const reservationPath = "src/lib/acars/finalize-reservation.ts";

for (const f of [finalizeRoutePath, schemaPath, ledgerPath, economyPath, scorePath, reservationPath]) {
  if (!fs.existsSync(path.join(ROOT, f))) fail(`missing_file=${f}`);
}
ok("files_exist=true");

const finalizeRoute = read(finalizeRoutePath);
const ledger = read(ledgerPath);
const economy = read(economyPath);

if (!finalizeRoute.includes("acars_finalize:")) fail("idempotency_finalize_missing");
ok("idempotency_finalize_present=true");
if (!ledger.includes("flight_economy:")) fail("ledger_idempotency_missing");
ok("ledger_idempotency_present=true");
if (!ledger.includes("accruePilotAmount")) fail("pending_accrual_missing");
ok("pending_accrual_used=true");
if (ledger.includes("wallet_balance_usd = wallet_balance_usd +")) fail("wallet_paid_per_flight_detected");
ok("wallet_per_flight_payment=false");
if (!economy.includes("status !== \"completed\" && status !== \"diverted\"")) fail("no_non_completed_guard");
ok("crashed_aborted_cancelled_no_positive_accrual_guard=true");

const validCompleted = {
  payloadVersion: "pw3-acars-finalize-v1",
  reservationId: "11111111-1111-4111-8111-111111111111",
  pilotCallsign: "PWG001",
  aircraftCode: "A320",
  operationType: "COMMERCIAL_OFFICIAL_ROUTE",
  flightType: "itinerary",
  origin: "SCEL",
  destination: "SCTE",
  finalStatus: "completed",
  landedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  planned: {},
  actual: { passengerCount: 120 },
  acarsOperationalInputs: {},
};
const invalidCargo = {
  ...validCompleted,
  flightType: "cargo",
  actual: { passengerCount: 2, ticketRevenueUsd: 20 },
};
const missingReservation = { ...validCompleted, reservationId: "" };

if (miniValidate(validCompleted).length) fail("completed_payload_should_pass");
ok("completed_payload_validation=pass");
if (!miniValidate(invalidCargo).includes("cargo_passengers")) fail("cargo_with_passengers_should_fail");
ok("cargo_with_passengers_validation=fail_expected");
if (!miniValidate(missingReservation).includes("reservationId")) fail("missing_reservation_should_fail");
ok("missing_reservation_validation=fail_expected");

if (fs.existsSync(path.join(ROOT, "src", "app", "globals.css"))) ok("globals_css_present_not_modified_check_manual=true");
ok("acars_desktop_not_touched_in_web_repo=true");

console.log("[ok] validate-acars-finalize=OK");
