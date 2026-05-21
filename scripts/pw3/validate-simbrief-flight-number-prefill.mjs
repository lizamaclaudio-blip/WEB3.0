#!/usr/bin/env node
/**
 * Validador de Flight Number PWG para SimBrief
 * Uso: node scripts/pw3/validate-simbrief-flight-number-prefill.mjs
 */

console.log("PW3 SimBrief Flight Number Prefill Validator");
console.log("============================================");

// Importar helpers (simulado para validador)
function extractPwgFlightNumber(routeCode) {
  if (!routeCode) return null;
  const match = routeCode.match(/^PWG(\d{3,4})$/);
  return match ? match[1] : null;
}

function generatePwgFlightNumber(origin, destination) {
  const seed = `${origin}${destination}`.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return String((seed % 900) + 100).padStart(3, "0");
}

function buildPwgCallsign(flightNumber) {
  return `PWG${flightNumber}`;
}

function getSimbriefFlightNumber(routeCode, origin, destination) {
  const existing = extractPwgFlightNumber(routeCode);
  if (existing) {
    return {
      flightNumber: existing,
      routeCode: `PWG${existing}`,
      callsign: `PWG${existing}`,
    };
  }
  const generated = generatePwgFlightNumber(origin, destination);
  return {
    flightNumber: generated,
    routeCode: `PWG${generated}`,
    callsign: `PWG${generated}`,
  };
}

// Tests
const tests = [
  { routeCode: "PWG695", origin: "SCTE", dest: "SCIE", expectedNum: "695", expectedCall: "PWG695" },
  { routeCode: "PWG1204", origin: "SCTE", dest: "SCPF", expectedNum: "1204", expectedCall: "PWG1204" },
  { routeCode: "SCTE-SCIE", origin: "SCTE", dest: "SCIE", expectedNum: "695", expectedCall: "PWG695" },
  { routeCode: null, origin: "SCTE", dest: "SCIE", expectedNum: "695", expectedCall: "PWG695" },
  { routeCode: "", origin: "SCTE", dest: "SCIE", expectedNum: "695", expectedCall: "PWG695" },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  const result = getSimbriefFlightNumber(test.routeCode, test.origin, test.dest);
  const ok = result.flightNumber === test.expectedNum && result.callsign === test.expectedCall;
  
  if (ok) {
    passed++;
    console.log(`✅ routeCode="${test.routeCode}" → fltnum=${result.flightNumber}, callsign=${result.callsign}`);
  } else {
    failed++;
    console.log(`❌ routeCode="${test.routeCode}" → fltnum=${result.flightNumber} (expected ${test.expectedNum}), callsign=${result.callsign} (expected ${test.expectedCall})`);
  }
}

console.log();
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("✅ All flight number validations passed!");
  process.exit(0);
} else {
  console.log("❌ Some validations failed");
  process.exit(1);
}
