/**
 * Validador: SimBrief Direct Route OFP
 * Verifica que rutas directas (route === destination) sean aceptadas correctamente
 */

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// --- Simulación de validateIfrRoute ---
function validateIfrRoute(route, origin, destination) {
  const routeClean = typeof route === "string" ? route.trim() : "";

  if (!routeClean) {
    return { valid: false, errorCode: "SIMBRIEF_IFR_ROUTE_MISSING" };
  }

  if (destination && routeClean.toUpperCase() === destination.toUpperCase()) {
    if (origin && destination) {
      return {
        valid: true,
        normalizedRoute: `${origin.toUpperCase()} DCT ${destination.toUpperCase()}`,
        displayRoute: "Vuelo directo",
        isDirectFlight: true,
      };
    }
    return { valid: false, errorCode: "SIMBRIEF_IFR_ROUTE_INVALID" };
  }

  const segments = routeClean.split(/\s+/).filter((s) => s.length >= 2);
  const hasOrigin = origin ? routeClean.toUpperCase().includes(origin.toUpperCase()) : false;
  const hasDest = destination ? routeClean.toUpperCase().includes(destination.toUpperCase()) : false;

  if (hasOrigin && hasDest) return { valid: true };

  const hasWaypoints = segments.some(
    (s) =>
      /^[A-Z]{5}$/.test(s) ||
      /^[A-Z]{3}\d[A-Z]?$/.test(s) ||
      /^V\d{2,4}$/.test(s) ||
      /^[A-Z]\d{2,4}$/.test(s) ||
      s.includes("/"),
  );
  if (hasWaypoints) return { valid: true };

  return { valid: false, errorCode: "SIMBRIEF_IFR_ROUTE_INVALID" };
}

// --- send-to-acars invalidRoute logic ---
function checkSendToAcars(simbriefRoute, originIdent, destinationIdent) {
  const isDirectRoute =
    simbriefRoute &&
    destinationIdent &&
    simbriefRoute.toUpperCase() === destinationIdent.toUpperCase();
  const invalidRoute =
    !simbriefRoute || (!isDirectRoute && simbriefRoute.toUpperCase() === originIdent);
  return { isDirectRoute, invalidRoute };
}

console.log("\n=== validate-simbrief-direct-route-ofp ===\n");

// Caso A: route = destination → vuelo directo VÁLIDO
console.log("Caso A: origin=SCTE, destination=SCPF, route=SCPF → VALID vuelo directo");
{
  const r = validateIfrRoute("SCPF", "SCTE", "SCPF");
  assert("valid = true", r.valid);
  assert("isDirectFlight = true", r.isDirectFlight);
  assert("displayRoute = Vuelo directo", r.displayRoute === "Vuelo directo");
  assert("normalizedRoute = SCTE DCT SCPF", r.normalizedRoute === "SCTE DCT SCPF");
  const sta = checkSendToAcars("SCPF", "SCTE", "SCPF");
  assert("send-to-acars: isDirectRoute = true", sta.isDirectRoute);
  assert("send-to-acars: invalidRoute = false", !sta.invalidRoute);
}

// Caso B: route = "SCTE DCT SCPF" → VÁLIDO
console.log("\nCaso B: route = SCTE DCT SCPF → VALID");
{
  const r = validateIfrRoute("SCTE DCT SCPF", "SCTE", "SCPF");
  assert("valid = true", r.valid);
}

// Caso C: route = "SCTE DCT ALFA SCPF" → VÁLIDO (waypoints)
console.log("\nCaso C: route = SCTE DCT ALFA SCPF → VALID");
{
  const r = validateIfrRoute("SCTE DCT ALFA SCPF", "SCTE", "SCPF");
  assert("valid = true", r.valid);
}

// Caso D: route = "SCIE" pero destination = "SCPF" → INVÁLIDO
console.log("\nCaso D: route=SCIE, destination=SCPF → INVALID (ICAO incorrecto)");
{
  const r = validateIfrRoute("SCIE", "SCTE", "SCPF");
  assert("valid = false", !r.valid);
  assert("errorCode present", Boolean(r.errorCode));
}

// Caso E: route vacío → INVÁLIDO
console.log("\nCaso E: route vacío → INVALID");
{
  const r = validateIfrRoute("", "SCTE", "SCPF");
  assert("valid = false", !r.valid);
  assert("errorCode = SIMBRIEF_IFR_ROUTE_MISSING", r.errorCode === "SIMBRIEF_IFR_ROUTE_MISSING");
  const sta = checkSendToAcars("", "SCTE", "SCPF");
  assert("send-to-acars: invalidRoute = true", sta.invalidRoute);
}

// Caso F: route = null → INVÁLIDO
console.log("\nCaso F: route null → INVALID");
{
  const r = validateIfrRoute(null, "SCTE", "SCPF");
  assert("valid = false", !r.valid);
}

// Caso G: route = origin (SCTE) → INVÁLIDO (no es destino, es origen)
console.log("\nCaso G: route=SCTE (origen), destination=SCPF → INVALID");
{
  const sta = checkSendToAcars("SCTE", "SCTE", "SCPF");
  assert("send-to-acars: invalidRoute = true", sta.invalidRoute);
}

// Caso H: route = VOVK4A VOVKI V551 NIA → VÁLIDO (airways)
console.log("\nCaso H: ruta con airways → VALID");
{
  const r = validateIfrRoute("VOVK4A VOVKI V551 NIA V103 ANGOL ANG05A", "SCTE", "SCPF");
  assert("valid = true", r.valid);
}

// Resumen
console.log(`\n=== Resultado: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
