import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "src/lib/dispatch/training-reservations.ts");
const apiRoute = path.join(root, "src/app/api/dispatch/training-reservations/route.ts");
const sendToAcarsRoute = path.join(root, "src/app/api/dispatch/training-reservations/send-to-acars/route.ts");
const simbriefClient = path.join(root, "src/components/dispatch/DispatchRoomClient.tsx");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function check(ok, label) {
  console.log(`[${ok ? "ok" : "fail"}] ${label}`);
  if (!ok) failed += 1;
}

let failed = 0;
const lib = read(target);
const api = read(apiRoute);
const sendApi = read(sendToAcarsRoute);
const ui = read(simbriefClient);

check(lib.includes("assignDispatchFlightNumber"), "flight helper wired");
check(lib.includes("PILOT_ALREADY_HAS_ACTIVE_RESERVATION"), "pilot single-active rule");
check(lib.includes("AIRCRAFT_RESERVED_BY_OTHER"), "aircraft lock rule");
check(!lib.includes("ROUTE_RESERVED_BY_OTHER"), "route is not lock key");
check(lib.includes("assigned_flight_number"), "assigned_flight_number persisted");
check(lib.includes("assigned_callsign"), "assigned_callsign persisted");
check(lib.includes("airline_icao"), "airline_icao persisted");
check(lib.includes("flight_payload"), "flight payload persisted");
check(lib.includes("payload_version: \"pw3-dispatch-v1\""), "pw3-dispatch-v1 payload");
check(lib.includes("flight_number: flightNumber"), "acars payload uses assigned flight number");
check(lib.includes("callsign"), "acars payload includes callsign");
check(lib.includes("reservation_id: row.id"), "reservationId included in payload");
check(sendApi.includes("prepareTrainingReservationForAcars"), "send-to-acars uses reservation source");
check(api.includes("PILOT_ALREADY_HAS_ACTIVE_RESERVATION"), "api error mapping includes pilot active");
check(ui.includes("Esta reserva bloquea la aeronave por 15 minutos"), "ui reservation lock message");
check(ui.includes("assigned_flight_number") && ui.includes("assigned_callsign"), "simbrief prefill can use assigned flight");

if (failed > 0) {
  console.error(`\n[fail] validate-dispatch-aircraft-reservation-rules: ${failed} check(s) failed`);
  process.exit(1);
}

console.log("\n[ok] validate-dispatch-aircraft-reservation-rules");
