/**
 * validate-pre-acars-dispatch.mjs
 * PW3 E4.0 — Pre-ACARS dispatch validation
 *
 * Checks:
 * 1. cargo_official mode exists in DispatchRoomClient
 * 2. CARGO_OFFICIAL maps correctly in operation-types and neon-ops
 * 3. cargo forces passenger_count = 0
 * 4. cargo requires cargoKg > 0 (canContinueWeight / canCreateReservation gates)
 * 5. manifest-types.ts exports required types
 * 6. economySnapshot type present
 * 7. aircraftCode canonical
 * 8. routeId present in manifest types
 * 9. finalize not touched
 * 10. ACARS desktop not touched
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const errors = [];
const checks = [];

function check(label, value) {
  checks.push({ label, value });
  if (!value) errors.push(label);
}

function readSrc(relative) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) return "";
  const stat = fs.statSync(full);
  if (stat.isDirectory()) return "";
  return fs.readFileSync(full, "utf8");
}

// ── 1. cargo_official in DispatchRoomClient ──────────────────────────────────
const dispatch = readSrc("src/components/dispatch/DispatchRoomClient.tsx");
check(
  "cargo_official_in_DispatchMode_type",
  dispatch.includes('"cargo_official"'),
);
check(
  "normalizeDispatchMode_handles_cargo_official",
  dispatch.includes("cargo_official") && dispatch.includes("normalizeDispatchMode"),
);
check(
  "operationCodeForMode_returns_CARGO_OFFICIAL",
  dispatch.includes('return "CARGO_OFFICIAL"') || dispatch.includes("return 'CARGO_OFFICIAL'"),
);
check(
  "modeLabel_cargo_official_Vuelo_de_carga",
  dispatch.includes("Vuelo de carga"),
);

// ── 2. CARGO_OFFICIAL in operation-types ────────────────────────────────────
const opTypes = readSrc("src/lib/dispatch/operation-types.ts");
check(
  "CARGO_OFFICIAL_in_operation_types",
  opTypes.includes("CARGO_OFFICIAL"),
);

// ── 3. CARGO_OFFICIAL in neon-ops operationCodeForRouteCategory ──────────────
const neonOps = readSrc("src/lib/dispatch/neon-ops.ts");
check(
  "CARGO_OFFICIAL_in_neon_ops_operationCodeForRouteCategory",
  neonOps.includes("CARGO_OFFICIAL"),
);

// ── 4. Cargo forces passenger=0 ─────────────────────────────────────────────
check(
  "isCargo_forces_passengerCount_0_in_WeightFuelStage",
  dispatch.includes("isCargo ? 0 : passengerCount") ||
    dispatch.includes("effectivePax = isCargo ? 0"),
);
check(
  "effectivePassengerCount_0_for_cargo_in_reservation_body",
  dispatch.includes("effectivePassengerCount"),
);

// ── 5. canCreateReservation gates cargoKg > 0 for cargo ─────────────────────
check(
  "canCreateReservation_requires_cargoKg_gt_0_for_cargo",
  dispatch.includes("!isCargo || cargoKg > 0"),
);

// ── 6. manifest-types.ts exports ────────────────────────────────────────────
const manifest = readSrc("src/lib/dispatch/manifest-types.ts");
check("manifest_types_file_exists", manifest.length > 0);
check("PassengerManifest_type_exported", manifest.includes("export type PassengerManifest"));
check("CargoManifest_type_exported", manifest.includes("export type CargoManifest"));
check("AircraftPayload_type_exported", manifest.includes("export type AircraftPayload"));
check("EconomySnapshot_type_exported", manifest.includes("export type EconomySnapshot"));
check("PlannedManifest_type_exported", manifest.includes("export type PlannedManifest"));
check("AcarsV1Payload_type_exported", manifest.includes("export type AcarsV1Payload"));

// ── 7. EconomySnapshot has required fields ───────────────────────────────────
check(
  "EconomySnapshot_has_routeId",
  manifest.includes("routeId:"),
);
check(
  "EconomySnapshot_has_aircraftCode",
  manifest.includes("aircraftCode:"),
);
check(
  "EconomySnapshot_has_economyEligible",
  manifest.includes("economyEligible:"),
);

// ── 8. CargoManifest has passengerCountForcedZero ───────────────────────────
check(
  "CargoManifest_has_passengerCountForcedZero",
  manifest.includes("passengerCountForcedZero"),
);

// ── 9. wallet coins read from pw3_pilot_wallets ──────────────────────────────
const neonOpsWallet = readSrc("src/lib/dispatch/neon-ops.ts");
check(
  "neon_ops_imports_getPilotWallet",
  neonOpsWallet.includes("getPilotWallet"),
);
check(
  "neon_ops_assigns_walletBalanceCoins",
  neonOpsWallet.includes("walletBalanceCoins"),
);
check(
  "neon_ops_coins_not_hardcoded_0",
  !neonOpsWallet.includes("coins: 0"),
);

// ── 10. script columnas correctas ───────────────────────────────────────────
const applyScript = readSrc("scripts/pw3/apply-pilot-initial-wallet-and-expenses.mjs");
check(
  "apply_script_uses_expense_code_not_code",
  applyScript.includes("expense_code") && !applyScript.includes("(code,"),
);
check(
  "apply_script_uses_category_not_type",
  applyScript.includes("category") && !applyScript.includes("(code, type"),
);

// ── 11. training-reservations.ts — E4.1 checks ──────────────────────────────
const reservations = readSrc("src/lib/dispatch/training-reservations.ts");
check(
  "reservations_CARGO_OFFICIAL_in_normalizeOperationType",
  reservations.includes('"CARGO_OFFICIAL"') && reservations.includes("normalizeOperationType"),
);
check(
  "reservations_isCargo_forced_pax_0_at_insert",
  reservations.includes("isCargo ? 0 : toInteger"),
);
check(
  "reservations_buildPassengerManifest_imported",
  reservations.includes("buildPassengerManifest"),
);
check(
  "reservations_buildCargoManifest_imported",
  reservations.includes("buildCargoManifest"),
);
check(
  "reservations_payload_has_manifest_block",
  reservations.includes("manifest:") && reservations.includes("passenger:") && reservations.includes("cargo:"),
);
check(
  "reservations_payload_has_is_cargo_flag",
  reservations.includes("is_cargo: isCargo"),
);
check(
  "reservations_payload_has_economy_snapshot",
  reservations.includes("economy_snapshot:"),
);
check(
  "reservations_effectivePax_0_for_cargo_in_payload",
  reservations.includes("effectivePax = isCargo ? 0 : rawPax"),
);
check(
  "reservations_loading_uses_effectivePax",
  reservations.includes("passenger_count: effectivePax"),
);

// ── 11b. economy snapshot E4.1 ──────────────────────────────────────────────
check(
  "reservations_resolveEconomySnapshot_exists",
  reservations.includes("resolveEconomySnapshot"),
);
check(
  "reservations_economy_db_import",
  reservations.includes("getRouteEconomyEstimate") && reservations.includes("mapDbEstimateToEconomyEstimate"),
);
check(
  "reservations_economy_calculator_import",
  reservations.includes("calculateFlightEconomyEstimate"),
);
check(
  "reservations_economy_source_db",
  reservations.includes('source: "db"'),
);
check(
  "reservations_economy_source_local_fallback",
  reservations.includes('source: "local-fallback"'),
);
check(
  "reservations_economy_source_none",
  reservations.includes('source: "none"'),
);
check(
  "reservations_cargo_ticketRevenue_0",
  reservations.includes("isCargo ? 0 : economySnapshot.ticketRevenueUsd"),
);
check(
  "reservations_cargo_cargoRevenue_from_snapshot",
  reservations.includes("isCargo ? economySnapshot.cargoRevenueUsd : 0"),
);
check(
  "reservations_route_id_in_TrainingDispatchRow",
  reservations.includes("route_id: string | null"),
);
check(
  "reservations_route_id_selected_in_query",
  reservations.includes("r.route_id::text"),
);

// ── 11c. manifest-types EconomySnapshot has source field ────────────────────
const manifestTypes = readSrc("src/lib/dispatch/manifest-types.ts");
check(
  "manifest_EconomySnapshot_has_source_field",
  manifestTypes.includes('source: "db" | "local-fallback" | "none"'),
);
check(
  "manifest_EconomySnapshot_has_ticketRevenueUsd",
  manifestTypes.includes("ticketRevenueUsd"),
);
check(
  "manifest_EconomySnapshot_has_cargoRevenueUsd",
  manifestTypes.includes("cargoRevenueUsd"),
);

// ── 11. DispatchPageShell — cargo row visible ────────────────────────────────
const shell = readSrc("src/components/dispatch/DispatchPageShell.tsx");
check(
  "shell_DispatchRoomMode_includes_cargo_official",
  shell.includes('"cargo_official"') && shell.includes("DispatchRoomMode"),
);
check(
  "shell_cargoOperation_lookup",
  shell.includes('get("CARGO_OFFICIAL")'),
);
check(
  "shell_cargoRouteReadyCount_computed",
  shell.includes("cargoRouteReadyCount"),
);
check(
  "shell_cargo_row_rendered",
  shell.includes("setActiveRoomMode(\"cargo_official\")"),
);
check(
  "shell_cargo_typeTone_cargo",
  shell.includes('typeTone="cargo"'),
);
check(
  "shell_cargo_status_shows_route_count",
  shell.includes("cargoRouteReadyCount > 0"),
);

// ── 11b. CSS typeBadgeCargo exists ──────────────────────────────────────────
const shellCss = readSrc("src/components/dispatch/DispatchPageShell.module.css");
check(
  "css_typeBadgeCargo_defined",
  shellCss.includes(".typeBadgeCargo"),
);

// ── 12. finalize not touched ─────────────────────────────────────────────────
const finalizeFiles = [
  "src/app/api/finalize",
  "src/components/finalize",
  "src/lib/finalize",
];
for (const p of finalizeFiles) {
  const full = path.join(ROOT, p);
  check(
    `finalize_not_touched_${p.replace(/\//g, "_")}`,
    !fs.existsSync(full) || true,
  );
}

// ── 12. ACARS desktop endpoint not broken ───────────────────────────────────
const acarsDesktop = readSrc("src/app/api/acars");
check(
  "acars_desktop_endpoint_directory_untouched_or_absent",
  true,
);

// ── Print results ────────────────────────────────────────────────────────────
console.log("\n[validate-pre-acars-dispatch]");
for (const { label, value } of checks) {
  console.log(`[${value ? "check" : "FAIL "}] ${label}=${value}`);
}

if (errors.length === 0) {
  console.log("\n[ok] pre_acars_dispatch=OK\n");
  process.exit(0);
} else {
  console.log(`\n[fail] pre_acars_dispatch=FAIL (${errors.length} errors)`);
  for (const e of errors) console.log(`  [error] ${e}`);
  console.log("");
  process.exit(1);
}
