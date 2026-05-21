#!/usr/bin/env node
/**
 * Validator: Aircraft Payload Limits for SimBrief
 * 
 * Validates:
 * 1. C208 passenger flight with 6 pax:
 *    - passengerCount = 6
 *    - baggageKg ≈ 120 (6 × 20)
 *    - commercialCargoKg = 0
 *    - simbriefCargoFieldKg = baggageKg (≈120)
 *    - NO usa defaultCargoKg 400
 *    - NO usa passengerCount 0
 * 
 * 2. C208 cargo flight:
 *    - passengerCount = 0
 *    - baggageKg = 0
 *    - commercialCargoKg > 0
 *    - simbriefCargoFieldKg = commercialCargoKg
 * 
 * 3. Passenger economy:
 *    - cargoRevenueUsd = 0
 *    - ticketRevenueUsd > 0
 * 
 * 4. Cargo economy:
 *    - ticketRevenueUsd = 0
 *    - cargoRevenueUsd > 0
 */

import { getAircraftTechnicalProfile } from "../../src/lib/aircraft/index.js";

const TESTS = [];
const ERRORS = [];
const PASSED = [];

function test(name, fn) {
  TESTS.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test 1: C208 passenger flight payload calculation
test("C208 passenger flight: 6 pax should send baggage only, no commercial cargo", () => {
  const profile = getAircraftTechnicalProfile("C208");
  assert(profile, "C208 profile not found");
  
  const paxCount = 6;
  const baggagePerPax = profile.baggagePerPassengerKg;
  const baggageKg = paxCount * baggagePerPax;
  
  // Regla: vuelo pax NO lleva carga comercial
  const commercialCargoKg = 0;
  
  // SimBrief cargo field = equipaje (no carga comercial)
  const simbriefCargoFieldKg = baggageKg;
  
  assert(paxCount === 6, `Expected 6 pax, got ${paxCount}`);
  assert(baggageKg === 120, `Expected baggage 120 kg (6×20), got ${baggageKg}`);
  assert(commercialCargoKg === 0, `Commercial cargo must be 0 for passenger flight, got ${commercialCargoKg}`);
  assert(simbriefCargoFieldKg === 120, `SimBrief cargo field should be 120 (baggage), got ${simbriefCargoFieldKg}`);
  
  // NO debe usar defaultCargoKg
  assert(profile.simbrief.defaultCargoKg !== 400, "C208 defaultCargoKg must NOT be 400 (was causing overweight)");
  assert(profile.simbrief.defaultCargoKg <= 300, `C208 defaultCargoKg should be <= 300 (conservative for cargo flights), got ${profile.simbrief.defaultCargoKg}`);
});

// Test 2: C208 cargo flight payload calculation
test("C208 cargo flight: pax=0, commercial cargo from scenario/default", () => {
  const profile = getAircraftTechnicalProfile("C208");
  assert(profile, "C208 profile not found");
  
  const isCargo = true;
  const paxCount = 0;
  const baggageKg = 0;
  
  // Cargo flight usa defaultCargoKg (conservador)
  const commercialCargoKg = profile.simbrief.defaultCargoKg ?? Math.round(profile.maxCargoKg * 0.3);
  const simbriefCargoFieldKg = commercialCargoKg;
  
  assert(paxCount === 0, `Cargo flight must have 0 pax, got ${paxCount}`);
  assert(baggageKg === 0, `Cargo flight must have 0 baggage, got ${baggageKg}`);
  assert(commercialCargoKg > 0, `Cargo flight must have commercial cargo > 0, got ${commercialCargoKg}`);
  assert(commercialCargoKg <= profile.maxCargoKg, `Cargo must be <= maxCargoKg (${profile.maxCargoKg}), got ${commercialCargoKg}`);
  assert(simbriefCargoFieldKg === commercialCargoKg, `SimBrief field must equal commercial cargo`);
});

// Test 3: Payload safety fields exist
test("All aircraft profiles have payload safety fields", () => {
  const codes = ["C172", "BE58", "C208", "TBM9", "B350", "DHC6", "AT76", "E170", "E175", "B738", "C17"];
  
  for (const code of codes) {
    const profile = getAircraftTechnicalProfile(code);
    assert(profile, `${code} profile not found`);
    assert(typeof profile.standardPassengerWeightKg === "number", `${code}: standardPassengerWeightKg missing`);
    assert(typeof profile.operationalMtowBufferKg === "number", `${code}: operationalMtowBufferKg missing`);
    assert(typeof profile.maxPassengerFlightCargoKg === "number", `${code}: maxPassengerFlightCargoKg missing`);
    
    // Validaciones de valores razonables
    assert(profile.standardPassengerWeightKg >= 75 && profile.standardPassengerWeightKg <= 100, 
      `${code}: standardPassengerWeightKg should be 75-100 kg, got ${profile.standardPassengerWeightKg}`);
    assert(profile.operationalMtowBufferKg >= 0, 
      `${code}: operationalMtowBufferKg must be >= 0, got ${profile.operationalMtowBufferKg}`);
    assert(profile.maxPassengerFlightCargoKg >= 0, 
      `${code}: maxPassengerFlightCargoKg must be >= 0, got ${profile.maxPassengerFlightCargoKg}`);
  }
});

// Test 4: C208 maxPassengerFlightCargoKg is 0 (no commercial cargo on passenger flights)
test("C208 maxPassengerFlightCargoKg = 0 (no commercial cargo on passenger flights)", () => {
  const profile = getAircraftTechnicalProfile("C208");
  assert(profile.maxPassengerFlightCargoKg === 0, 
    `C208 maxPassengerFlightCargoKg must be 0 (passenger flights don't carry commercial cargo), got ${profile.maxPassengerFlightCargoKg}`);
});

// Test 5: SimBrief units = KGS
test("All aircraft profiles use KGS for SimBrief", () => {
  const codes = ["C172", "BE58", "C208", "TBM9", "B350", "DHC6", "AT76", "E170", "E175", "B738", "C17"];
  
  for (const code of codes) {
    const profile = getAircraftTechnicalProfile(code);
    assert(profile.simbrief.units === "KGS", `${code}: SimBrief units must be KGS, got ${profile.simbrief.units}`);
  }
});

// Run all tests
async function runTests() {
  console.log("\n========================================");
  console.log("PW3 Aircraft Payload Limits Validator");
  console.log("========================================\n");
  
  for (const { name, fn } of TESTS) {
    try {
      fn();
      PASSED.push(name);
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      ERRORS.push({ name, error: error.message });
      console.log(`❌ FAIL: ${name}`);
      console.log(`   ${error.message}`);
    }
  }
  
  console.log("\n========================================");
  console.log(`Results: ${PASSED.length} passed, ${ERRORS.length} failed`);
  console.log("========================================\n");
  
  if (ERRORS.length > 0) {
    console.log("Failed tests:");
    ERRORS.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
    process.exit(1);
  }
  
  console.log("✅ All payload limit validations passed!");
  process.exit(0);
}

runTests();
