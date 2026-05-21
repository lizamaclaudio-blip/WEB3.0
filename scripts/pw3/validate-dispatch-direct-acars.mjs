import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const uiPath = path.join(root, "src/components/dispatch/DispatchRoomClient.tsx");
const apiPath = path.join(root, "src/app/api/dispatch/send-to-acars/route.ts");
const ui = fs.readFileSync(uiPath, "utf8");
const api = fs.existsSync(apiPath) ? fs.readFileSync(apiPath, "utf8") : "";

let failed = 0;
const check = (ok, label) => {
  console.log(`[${ok ? "ok" : "fail"}] ${label}`);
  if (!ok) failed += 1;
};

check(!ui.includes("Reservar por 15 minutos"), "reserve button removed from UI");
check(!ui.includes("<span>Reserva temporal</span>"), "temporary reservation block removed from final UI");
check(!ui.includes("onCreateReservation={"), "final UI no longer wires reserve action");
check(ui.includes("/api/dispatch/send-to-acars"), "UI uses direct send-to-acars endpoint");
check(api.includes("payload_version: \"pw3-dispatch-v1\""), "direct endpoint builds pw3-dispatch-v1 payload");
check(api.includes("dispatchToken"), "direct endpoint returns dispatchToken");
check(api.includes("route_id") && api.includes("route_code"), "payload includes route id/code");
check(api.includes("simbrief"), "payload includes simbrief");
check(api.includes("loading"), "payload includes loading");
check(api.includes("schedule"), "payload includes schedule");
check(api.includes("economy_snapshot"), "payload includes economy snapshot");

if (failed > 0) {
  console.error(`\n[fail] validate-dispatch-direct-acars: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n[ok] validate-dispatch-direct-acars");
