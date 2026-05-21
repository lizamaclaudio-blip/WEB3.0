import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const libPath = path.join(root, "src/lib/dispatch/training-reservations.ts");
const text = fs.existsSync(libPath) ? fs.readFileSync(libPath, "utf8") : "";

let failed = 0;
function check(ok, label) {
  console.log(`[${ok ? "ok" : "fail"}] ${label}`);
  if (!ok) failed += 1;
}

check(text.includes("routeId: selectedRoute.id") || text.includes("selectedRoute.id"), "routeId UUID preserved in reservation");
check(!text.includes("ROUTE_ALREADY_RESERVED"), "no route reservation conflict code");
check(!text.includes("ROUTE_RESERVED_BY_OTHER"), "no route lock by other pilot");
check(text.includes("findActiveAircraftReservationByOtherPilot"), "aircraft lock check exists");
check(text.includes("prepareTrainingReservationForAcars"), "send-to-acars flow exists");
check(text.includes("buildTrainingAcarsPayload"), "acars payload builder exists");
check(text.includes("flight: {"), "flight block in payload exists");
check(text.includes("route_code"), "route code included for identity (not blocking)");
check(text.includes("dispatch_token"), "dispatchToken included");
check(text.includes("reservation_id"), "reservationId included");

if (failed > 0) {
  console.error(`\n[fail] validate-dispatch-route-reservation-acars: ${failed} check(s) failed`);
  process.exit(1);
}

console.log("\n[ok] validate-dispatch-route-reservation-acars");
