import type { AcarsFinalizeEvent, NormalizedFinalizePayload } from "@/lib/acars/finalize-types";

export type EvaluationPenalty = {
  code: string;
  severity: "info" | "warning" | "critical";
  points: number;
  message: string;
};

export type EvaluationResult = {
  operationalScore: number;
  procedureScore: number;
  performanceScore: number;
  safetyScore: number;
  economyScore: number;
  totalScore: number;
  penalties: EvaluationPenalty[];
  observations: string[];
  evidence: Record<string, unknown>;
  evaluationStatus: "EVALUATED" | "PENDING_EVALUATION";
  economyStatus: "EVALUATED" | "NOT_APPLICABLE";
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function num(v: unknown, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function asObj(v: unknown) {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asEvents(v: unknown): AcarsFinalizeEvent[] {
  return Array.isArray(v) ? (v as AcarsFinalizeEvent[]) : [];
}

export function evaluateFinalizePayload(payload: NormalizedFinalizePayload): EvaluationResult {
  const penalties: EvaluationPenalty[] = [];
  const observations: string[] = [];

  const actual = payload.actual ?? {};
  const ops = payload.acarsOperationalInputs ?? {};
  const raw = asObj(payload.raw);
  const telemetry = asEvents(raw.telemetrySamples);
  const blackbox = asObj(raw.blackbox);
  const blackboxSummary = asObj(blackbox.summary);
  const events = payload.events ?? [];

  const touchdownVs = num(actual.touchdownVsFpm, num(ops.touchdownVsFpm, 0));
  const touchdownG = num(actual.touchdownGs, 1);
  const overspeed = num(actual.overspeedEvents, num(ops.overspeedEvents, 0));
  const stalls = num(actual.stallEvents, 0);
  const hardBrake = num(actual.hardBrakeEvents, num(ops.hardBrakeEvents, 0));
  const excessiveBank = num(ops.excessiveBankEvents, 0);
  const damage = num(actual.damageEvents, num(ops.damageEvents, 0));
  const flightMins = num(actual.flightTimeMinutes, 0);
  const distNm = num(actual.distanceNm, num(payload.planned.distanceNm, 0));
  const fuelUsed = num(actual.fuelUsedKg, num(ops.actualFuelUsedKg, 0));

  if (payload.finalStatus === "crashed") penalties.push({ code: "CRASH", severity: "critical", points: 70, message: "Vuelo marcado como crashed." });
  if (Math.abs(touchdownVs) > 900) penalties.push({ code: "TOUCHDOWN_VS_SEVERE", severity: "critical", points: 25, message: "Touchdown vertical speed severa." });
  else if (Math.abs(touchdownVs) > 600) penalties.push({ code: "TOUCHDOWN_VS_HARD", severity: "warning", points: 12, message: "Touchdown duro detectado." });
  if (touchdownG >= 2.0) penalties.push({ code: "TOUCHDOWN_G_HIGH", severity: "warning", points: 10, message: "G-force alta en touchdown." });
  if (overspeed > 0) penalties.push({ code: "OVERSPEED", severity: "warning", points: overspeed * 4, message: `Overspeed events: ${overspeed}.` });
  if (stalls > 0) penalties.push({ code: "STALL", severity: "critical", points: stalls * 8, message: `Stall events: ${stalls}.` });
  if (hardBrake > 0) penalties.push({ code: "HARD_BRAKE", severity: "warning", points: hardBrake * 3, message: `Hard brake events: ${hardBrake}.` });
  if (excessiveBank > 0) penalties.push({ code: "EXCESSIVE_BANK", severity: "warning", points: excessiveBank * 2, message: `Excessive bank events: ${excessiveBank}.` });
  if (damage > 0) penalties.push({ code: "DAMAGE", severity: "critical", points: damage * 10, message: `Damage events: ${damage}.` });

  if (!payload.actual.landingAirport) penalties.push({ code: "LANDING_AIRPORT_MISSING", severity: "critical", points: 12, message: "Landing airport ausente." });
  if (payload.actual.landingAirport && payload.actual.landingAirport !== payload.destination && payload.finalStatus === "completed") {
    penalties.push({ code: "OUTSIDE_DESTINATION", severity: "warning", points: 8, message: "Cierre fuera de destino para estado completed." });
  }

  // Anti-hack / consistency
  if (distNm > 0 && flightMins > 0) {
    const gsAvg = (distNm / (flightMins / 60));
    if (gsAvg > 700) penalties.push({ code: "IMPOSSIBLE_SPEED", severity: "critical", points: 25, message: `Velocidad media imposible (${gsAvg.toFixed(1)}kt).` });
  }
  if (distNm > 0 && fuelUsed <= 0) penalties.push({ code: "FUEL_IMPOSSIBLE", severity: "critical", points: 20, message: "Consumo de fuel incoherente." });
  if (telemetry.length > 0 && telemetry.length < 5) penalties.push({ code: "SPARSE_FRAMES", severity: "warning", points: 8, message: "Frames demasiado escasos." });
  if (Object.keys(blackbox).length === 0) penalties.push({ code: "BLACKBOX_MISSING", severity: "critical", points: 20, message: "Payload sin blackbox." });
  if (Object.keys(blackboxSummary).length > 0 && num(blackboxSummary.frameCount, 0) < 5) penalties.push({ code: "BLACKBOX_INSUFFICIENT", severity: "warning", points: 6, message: "Blackbox con pocos frames." });

  const lightEventNames = new Set(events.map((e) => String(e.type ?? "").toUpperCase()));
  if (!lightEventNames.has("AIRBORNE")) observations.push("No se detectó evento AIRBORNE en timeline.");
  if (!lightEventNames.has("TOUCHDOWN")) observations.push("No se detectó evento TOUCHDOWN en timeline.");

  const totalPenalty = penalties.reduce((acc, p) => acc + p.points, 0);
  const safetyPenalty = penalties.filter((p) => p.severity === "critical").reduce((acc, p) => acc + p.points, 0);
  const procPenalty = penalties.filter((p) => p.code.includes("LIGHT") || p.code.includes("BRAKE") || p.code.includes("DESTINATION")).reduce((acc, p) => acc + p.points, 0);
  const perfPenalty = penalties.filter((p) => p.code.includes("OVERSPEED") || p.code.includes("STALL") || p.code.includes("BANK")).reduce((acc, p) => acc + p.points, 0);

  const operationalScore = clamp(100 - totalPenalty);
  const procedureScore = clamp(100 - procPenalty - (payload.finalStatus === "aborted" ? 20 : 0));
  const performanceScore = clamp(100 - perfPenalty - (Math.abs(touchdownVs) > 600 ? 10 : 0));
  const safetyScore = clamp(100 - safetyPenalty - (payload.finalStatus === "crashed" ? 40 : 0));
  const economyScore = clamp(100 - (fuelUsed <= 0 ? 30 : 0) - (payload.finalStatus === "cancelled" ? 100 : 0));

  const totalScore = clamp(Math.round((operationalScore + procedureScore + performanceScore + safetyScore + economyScore) / 5));

  return {
    operationalScore,
    procedureScore,
    performanceScore,
    safetyScore,
    economyScore,
    totalScore,
    penalties,
    observations,
    evidence: {
      finalStatus: payload.finalStatus,
      destination: payload.destination,
      landingAirport: payload.actual.landingAirport ?? null,
      touchdownVs,
      touchdownG,
      overspeed,
      stalls,
      hardBrake,
      excessiveBank,
      damage,
      distanceNm: distNm,
      flightMinutes: flightMins,
      fuelUsedKg: fuelUsed,
      telemetrySamplesCount: telemetry.length,
      blackboxSummary,
      eventTypes: events.map((e) => e.type),
    },
    evaluationStatus: "EVALUATED",
    economyStatus: "EVALUATED",
  };
}

