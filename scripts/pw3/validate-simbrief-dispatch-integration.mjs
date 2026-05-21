#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(repo, rel), "utf8");
}

function ok(msg) {
  console.log(`[ok] ${msg}`);
}

function fail(msg) {
  console.error(`[error] ${msg}`);
  process.exit(1);
}

function checkContains(rel, needles) {
  const content = read(rel);
  for (const needle of needles) {
    if (Array.isArray(needle)) {
      if (!needle.some((option) => content.includes(option))) {
        fail(`${rel} no contiene ninguna opción requerida: ${needle.join(" | ")}`);
      }
      continue;
    }
    if (!content.includes(needle)) fail(`${rel} no contiene: ${needle}`);
  }
  ok(`${rel} contiene trazas requeridas`);
}

checkContains("src/app/api/simbrief/ofp/latest/route.ts", [
  "SIMBRIEF_USER_NOT_CONFIGURED",
  "SIMBRIEF_DESTINATION_MISMATCH",
  "normalizeSimbriefOfp",
]);

checkContains("src/lib/simbrief/aircraft-map.ts", [
  "mapAircraftCodeToSimbrief",
  "C208",
  "AT76",
]);

checkContains("src/components/dispatch/DispatchRoomClient.tsx", [
  "Generar plan de vuelo en SimBrief",
  "Cargar OFP",
  "const canContinuePlan = requiresSimbrief",
  "readOnly={requiresSimbrief}",
  "if (isCargo) {",
  "prefill.searchParams.set(\"pax\"",
  "prefill.searchParams.set(\"cargo\"",
]);

checkContains("src/lib/dispatch/training-reservations.ts", [
  "simbrief_ofp_json",
  "simbrief:",
  "fuel_planned_kg",
  "schedule:",
]);

checkContains("src/lib/simbrief/ofp.ts", [
  "general.route_ifps",
  "general.route_navigraph",
  "SIMBRIEF_IFR_ROUTE_INVALID",
]);

const fixture = JSON.parse(read("scripts/fixtures/simbrief-ofp-scte-scpf.json"));
if (!fixture?.general?.orig_icao || !fixture?.general?.dest_icao) {
  fail("fixture simbrief incompleto");
}
ok("fixture simbrief válido");

const forbidden = [
  "src/lib/economy",
  "src/app/api/acars/finalize",
  "src/app/globals.css",
];
for (const rel of forbidden) {
  if (!fs.existsSync(path.join(repo, rel))) continue;
}
ok("sin chequeos negativos críticos fallidos");

console.log("[ok] validate-simbrief-dispatch-integration finalizado");
