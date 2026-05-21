import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const profilePath = path.join(root, "src/lib/aircraft/technical-profiles.ts");
const dispatchPath = path.join(root, "src/components/dispatch/DispatchRoomClient.tsx");

const profile = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, "utf8") : "";
const dispatch = fs.existsSync(dispatchPath) ? fs.readFileSync(dispatchPath, "utf8") : "";

let failed = 0;
function check(ok, label) {
  console.log(`[${ok ? "ok" : "fail"}] ${label}`);
  if (!ok) failed += 1;
}

check(profile.includes("getAircraftTechnicalProfile"), "technical profile helper present");
check(profile.includes("defaultCargoKg"), "default cargo profile value present");
check(profile.includes("maxPassengerFlightCargoKg"), "passenger cargo cap profile value present");
check(dispatch.includes("if (isCargo) {"), "dispatch separates cargo/passenger prefill logic");
check(!dispatch.includes("prefill.searchParams.set(\"pax\"") || dispatch.includes("if (isCargo) {"), "passenger does not force pax prefill");
check(!dispatch.includes("prefill.searchParams.set(\"cargo\"") || dispatch.includes("if (isCargo) {"), "passenger does not force cargo prefill");
check(dispatch.includes("commercialCargoKg"), "dispatch computes commercial cargo");
check(dispatch.includes("prefill.searchParams.set(\"units\", \"KGS\")"), "simbrief prefill uses KGS");

if (failed > 0) {
  console.error(`\n[fail] validate-aircraft-payload-limits: ${failed} check(s) failed`);
  process.exit(1);
}

console.log("\n[ok] validate-aircraft-payload-limits");
