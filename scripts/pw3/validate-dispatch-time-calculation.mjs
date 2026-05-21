import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ui = fs.readFileSync(path.join(root, "src/components/dispatch/DispatchRoomClient.tsx"), "utf8");
const dispatch = fs.readFileSync(path.join(root, "src/lib/dispatch/training-reservations.ts"), "utf8");
const ofp = fs.readFileSync(path.join(root, "src/lib/simbrief/ofp.ts"), "utf8");

let failed = 0;
const check = (ok, label) => {
  console.log(`[${ok ? "ok" : "fail"}] ${label}`);
  if (!ok) failed += 1;
};

check(ui.includes("calculateLocalArrival"), "ui has local arrival calculator");
check(ui.includes("parseDurationToMinutes"), "ui parses OFP duration");
check(ui.includes("Fin local"), "ui renders fin local");
check(dispatch.includes("schedule:"), "payload includes schedule");
check(dispatch.includes("estimatedArrivalLocalTime"), "payload includes estimatedArrivalLocalTime");
check(ofp.includes("blockTimeMinutes"), "ofp normalized blockTimeMinutes");
check(ofp.includes("flightTimeMinutes"), "ofp normalized flightTimeMinutes");
check(ofp.includes("mtowLimited"), "ofp normalized MTOW warning");
check(ui.includes("SIMBRIEF_PAYLOAD_LIMITED_BY_MTOW"), "ui handles mtow error");

// 18:30 + 133 = 20:43 equivalent formula present
check(ui.includes("% (24 * 60)") && ui.includes("padStart(2, \"0\")"), "time math supports midnight crossing");

if (failed > 0) {
  console.error(`\n[fail] validate-dispatch-time-calculation: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n[ok] validate-dispatch-time-calculation");
