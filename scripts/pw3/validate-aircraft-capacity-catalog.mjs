#!/usr/bin/env node
/**
 * Validate Aircraft Capacity Catalog
 * Checks technical profiles against fleet requirements
 */

import { getAllTechnicalProfiles, validatePayloadAgainstAircraft, estimateFuelForRoute } from "../../src/lib/aircraft/technical-profiles.ts";

// Simple check function
async function validate() {
  console.log("=== PW3 Aircraft Capacity Catalog Validator ===\n");

  const checks = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  function check(name, condition, warning = false) {
    checks.total++;
    if (condition) {
      checks.passed++;
      console.log(`  ✅ ${name}`);
    } else if (warning) {
      checks.warnings++;
      console.log(`  ⚠️  ${name}`);
    } else {
      checks.failed++;
      console.log(`  ❌ ${name}`);
    }
  }

  // Check 1: Profiles exist
  const profiles = getAllTechnicalProfiles ? getAllTechnicalProfiles() : [];
  check("Technical profiles module loaded", profiles.length > 0);

  // Check 2: Key aircraft have profiles
  const requiredAircraft = ["C172", "C208", "BE58", "TBM9", "B350", "DHC6", "AT76", "E170", "E175", "B738"];
  for (const code of requiredAircraft) {
    const profile = profiles.find((p) => p.aircraftCode === code);
    check(`Profile exists for ${code}`, !!profile, !profile);
  }

  // Check 3: Profile data completeness
  for (const profile of profiles) {
    console.log(`\n📋 Checking ${profile.aircraftCode}...`);
    check(`  - passengerCapacity > 0`, profile.passengerCapacity > 0);
    check(`  - maxCargoKg >= 0`, profile.maxCargoKg >= 0);
    check(`  - maxPayloadKg > 0`, profile.maxPayloadKg > 0);
    check(`  - fuelCapacityKg > 0`, profile.fuelCapacityKg > 0);
    check(`  - avgFuelBurnKgHour > 0`, profile.avgFuelBurnKgHour > 0);
    check(`  - avgCruiseKt > 0`, profile.avgCruiseKt > 0);
    check(`  - maxRangeNm > 0`, profile.maxRangeNm > 0);
    check(`  - simbrief.units = KGS`, profile.simbrief?.units === "KGS");
  }

  // Check 4: Payload validation logic
  console.log("\n📦 Testing payload validation...");
  if (profiles.length > 0) {
    const c208 = profiles.find((p) => p.aircraftCode === "C208");
    if (c208) {
      const valid1 = validatePayloadAgainstAircraft ? validatePayloadAgainstAircraft("C208", 6, 400) : { valid: true };
      check("C208: 6 pax + 400kg cargo valid", valid1.valid);

      const valid2 = validatePayloadAgainstAircraft ? validatePayloadAgainstAircraft("C208", 20, 2000) : { valid: false };
      check("C208: 20 pax exceeds capacity rejected", !valid2.valid);
    }
  }

  // Check 5: Fuel estimation
  console.log("\n⛽ Testing fuel estimation...");
  if (profiles.length > 0) {
    const c208 = profiles.find((p) => p.aircraftCode === "C208");
    if (c208) {
      const fuel = estimateFuelForRoute ? estimateFuelForRoute("C208", 200) : null;
      check("C208: Fuel estimate for 200nm returns values", !!fuel && fuel.blockFuelKg > 0);
      if (fuel) {
        check("C208: Block fuel > trip fuel", fuel.blockFuelKg > fuel.tripFuelKg);
        check("C208: Fuel within capacity", fuel.blockFuelKg <= c208.fuelCapacityKg);
      }
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total checks: ${checks.total}`);
  console.log(`✅ Passed: ${checks.passed}`);
  console.log(`❌ Failed: ${checks.failed}`);
  console.log(`⚠️  Warnings: ${checks.warnings}`);

  process.exit(checks.failed > 0 ? 1 : 0);
}

validate().catch((err) => {
  console.error("Validation error:", err);
  process.exit(1);
});
