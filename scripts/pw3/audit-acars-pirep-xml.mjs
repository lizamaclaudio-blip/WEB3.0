#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];

if (!file) {
  console.error("Uso: node scripts/pw3/audit-acars-pirep-xml.mjs <archivo-pirep.xml>");
  process.exit(1);
}

const fullPath = path.resolve(file);
if (!fs.existsSync(fullPath)) {
  console.error(`No existe el archivo: ${fullPath}`);
  process.exit(1);
}

const xml = fs.readFileSync(fullPath, "utf8");
const upper = xml.toUpperCase();

function tag(name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const match = xml.match(re);
  return match ? match[1].trim() : "";
}

function boolTag(name) {
  return /^(true|1|yes|si|sí)$/i.test(tag(name));
}

function numTag(name) {
  const raw = tag(name).replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasAny(patterns) {
  return patterns.some((pattern) => pattern.test(xml));
}

function sourcesForAirborne() {
  const sources = [];
  if (boolTag("TakeoffDetected")) sources.push("FlightPhaseSummary.TakeoffDetected");
  if (/\bAIRBORNE\b/i.test(xml)) sources.push("Vuelo.Log/EventTimeline AIRBORNE");
  if (/Aircraft became airborne/i.test(xml)) sources.push("EventTimeline Aircraft became airborne");
  if (/Satisfied[^<]*Airborne/i.test(xml)) sources.push("PhaseAcceptanceMatrix Airborne");
  return [...new Set(sources)];
}

function sourcesForTouchdown() {
  const sources = [];
  if (boolTag("TouchdownDetected")) sources.push("FlightPhaseSummary.TouchdownDetected");
  if (/\bTOUCHDOWN\b/i.test(xml)) sources.push("Vuelo.Log/EventTimeline TOUCHDOWN");
  if (/Touchdown detected/i.test(xml)) sources.push("EventTimeline touchdown detected");
  if ((numTag("CantTouchdowns") ?? 0) > 0) sources.push("Indicadores.CantTouchdowns");
  if (numTag("TouchdownVS") !== null) sources.push("Resumen/Indicadores.TouchdownVS");
  return [...new Set(sources)];
}

function signal(key, label, detected, status, sources, reason) {
  return { key, label, detected, status, sources, reason };
}

const airborneSources = sourcesForAirborne();
const touchdownSources = sourcesForTouchdown();
const takeoffFuel = numTag("TakeOffFuel");
const finalFuel = numTag("FinalFuel");
const spentFuel = numTag("SpentFuel");
const expectedSpent = takeoffFuel !== null && finalFuel !== null ? Math.max(0, takeoffFuel - finalFuel) : null;
const fuelInconsistent = expectedSpent !== null && spentFuel !== null && Math.abs(expectedSpent - spentFuel) > Math.max(5, takeoffFuel * 0.2);

const report = {
  file: fullPath,
  summary: {
    samples: numTag("Samples") ?? numTag("TotalSamples"),
    flightNumber: tag("FlightNum") || tag("VueloNum") || tag("FlightNumber"),
    aircraft: tag("Matricula") || tag("AircraftRegistration"),
    origin: tag("Origen") || tag("Origin") || tag("Departure"),
    destination: tag("Destino") || tag("Destination") || tag("Arrival"),
  },
  signals: [
    signal("AIRBORNE", "Despegue/Airborne", airborneSources.length > 0, airborneSources.length > 0 ? "CERTIFIED" : "NOT_AVAILABLE", airborneSources, airborneSources.length > 0 ? "AIRBORNE confirmado por XML." : "No se encontró AIRBORNE en fuentes XML."),
    signal("TOUCHDOWN", "Touchdown", touchdownSources.length > 0, touchdownSources.length > 0 ? "CERTIFIED" : "NOT_AVAILABLE", touchdownSources, touchdownSources.length > 0 ? "TOUCHDOWN confirmado por XML." : "No se encontró TOUCHDOWN en fuentes XML."),
    signal("TOUCHDOWN_VS", "Touchdown VS/G", numTag("TouchdownVS") !== null || numTag("TouchdownG") !== null || numTag("TouchdownGForce") !== null, "CERTIFIED", [numTag("TouchdownVS") !== null ? `TouchdownVS=${numTag("TouchdownVS")}` : "", numTag("TouchdownG") !== null ? `TouchdownG=${numTag("TouchdownG")}` : "", numTag("TouchdownGForce") !== null ? `TouchdownGForce=${numTag("TouchdownGForce")}` : ""].filter(Boolean), "Métrica usable para performance de aterrizaje."),
    signal("OVERSPEED", "Overspeed", (numTag("OverspeedSecs") ?? 0) > 0, "CERTIFIED", [`OverspeedSecs=${numTag("OverspeedSecs") ?? 0}`], "Señal crítica de seguridad."),
    signal("STALL", "Stall", (numTag("StallSecs") ?? 0) > 0, "CERTIFIED", [`StallSecs=${numTag("StallSecs") ?? 0}`], "Señal crítica de seguridad."),
    signal("FUEL", "Combustible", takeoffFuel !== null || finalFuel !== null || spentFuel !== null, fuelInconsistent ? "PARTIAL" : "CERTIFIED", [`TakeOffFuel=${takeoffFuel ?? "N/D"}`, `FinalFuel=${finalFuel ?? "N/D"}`, `SpentFuel=${spentFuel ?? "N/D"}`, `ExpectedSpent=${expectedSpent ?? "N/D"}`], fuelInconsistent ? "Combustible inconsistente; revisar unidades/cálculo antes de economía estricta." : "Fuel utilizable para revisión."),
    signal("DOORS", "Puertas", false, hasAny([/Door state not reliable/i, /Door.*unreliable/i]) ? "UNRELIABLE" : "PARTIAL", hasAny([/Door state not reliable/i, /Door.*unreliable/i]) ? ["Aircraft profile"] : [], hasAny([/Door state not reliable/i, /Door.*unreliable/i]) ? "No penalizar puertas para este perfil." : "Pendiente certificación por aeronave."),
    signal("GEAR", "Tren", false, hasAny([/Gear state not reliable/i, /fixed gear/i, /gear.*not applicable/i]) ? "NOT_APPLICABLE" : "PARTIAL", hasAny([/Gear state not reliable/i, /fixed gear/i, /gear.*not applicable/i]) ? ["Aircraft profile"] : [], hasAny([/Gear state not reliable/i, /fixed gear/i, /gear.*not applicable/i]) ? "No penalizar tren si es fijo/no confiable." : "Pendiente certificación por aeronave."),
  ],
};

console.log(JSON.stringify(report, null, 2));
