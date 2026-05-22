import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const uiPath = path.join(root, "src/components/dispatch/DispatchRoomClient.tsx");
const apiPath = path.join(root, "src/app/api/dispatch/send-to-acars/route.ts");
const ofpPath = path.join(root, "src/lib/simbrief/ofp.ts");
const migrationPath = path.join(root, "supabase/migrations/20260521_training_dispatch_reservations_acars_direct_columns.sql");
const ui = fs.readFileSync(uiPath, "utf8");
const api = fs.existsSync(apiPath) ? fs.readFileSync(apiPath, "utf8") : "";
const ofp = fs.existsSync(ofpPath) ? fs.readFileSync(ofpPath, "utf8") : "";
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

let failed = 0;
const check = (ok, label) => {
  console.log(`[${ok ? "ok" : "fail"}] ${label}`);
  if (!ok) failed += 1;
};

check(!ui.includes("Reservar por 15 minutos"), "reserve button removed from UI");
check(!ui.includes("<span>Reserva temporal</span>"), "temporary reservation block removed from final UI");
check(!ui.includes("onCreateReservation={"), "final UI no longer wires reserve action");
check(ui.includes("/api/dispatch/send-to-acars"), "UI uses direct send-to-acars endpoint");
check(api.includes("payload_version: ACARS_PAYLOAD_VERSION") || api.includes("payload_version: \"pw3-dispatch-v1\""), "direct endpoint builds pw3-dispatch-v1 payload");
check(api.includes("dispatchToken"), "direct endpoint returns dispatchToken");
check(api.includes("route_id") && api.includes("route_code"), "payload includes route id/code");
check(migration.includes("add column if not exists route_code text"), "schema includes route_code");
check(migration.includes("add column if not exists assigned_flight_number text"), "schema includes assigned_flight_number");
check(migration.includes("add column if not exists assigned_callsign text"), "schema includes assigned_callsign");
check(migration.includes("add column if not exists payload_version text"), "schema includes payload_version");
check(migration.includes("add column if not exists dispatch_payload jsonb"), "schema includes dispatch_payload jsonb");
check(migration.includes("add column if not exists acars_state text"), "schema includes acars_state");
check(api.includes("ACARS_SCHEMA_MISSING_COLUMN"), "direct insert reports missing column clearly");
check(api.includes("acars_state") && api.includes("'ACARS_READY'"), "direct insert sets acars_state ACARS_READY");
check(api.includes("simbrief"), "payload includes simbrief");
check(api.includes("loading"), "payload includes loading");
check(api.includes("schedule"), "payload includes schedule");
check(api.includes("economySnapshot") && api.includes("economy_snapshot"), "payload includes economy snapshot");
check(ofp.includes("routeClean.toUpperCase() === destination.toUpperCase()"), "destination-only OFP route invalid");
check(ofp.includes("if (hasOrigin && hasDest)"), "SCTE DCT SCIE-style OFP route valid");
check(ui.includes("setSimbriefOfp(payload.ofp);"), "OFP is stored before final route-status handling");

if (failed > 0) {
  console.error(`\n[fail] validate-dispatch-direct-acars: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n[ok] validate-dispatch-direct-acars");
