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

type AnyRecord = Record<string, unknown>;

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function num(v: unknown, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function asObj(v: unknown): AnyRecord {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as AnyRecord) : {};
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asEvents(v: unknown): AcarsFinalizeEvent[] {
  return Array.isArray(v) ? (v as AcarsFinalizeEvent[]) : [];
}

function eventType(v: unknown) {
  if (typeof v === "string") return v.trim().toUpperCase();
  const record = asObj(v);
  const value = record.type ?? record.event ?? record.name ?? record.code;
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function collectEventTypes(payload: NormalizedFinalizePayload, raw: AnyRecord, blackbox: AnyRecord) {
  const eventSources = [
    ...(payload.events ?? []),
    ...asArray(raw.events),
    ...asArray(blackbox.events),
    ...asArray(blackbox.timeline),
  ];

  return unique(eventSources.map(eventType).filter(Boolean));
}

function collectDetailedEvents(payload: NormalizedFinalizePayload, raw: AnyRecord, blackbox: AnyRecord) {
  return [
    ...(payload.events ?? []),
    ...asArray(raw.events),
    ...asArray(blackbox.events),
    ...asArray(blackbox.timeline),
  ].slice(0, 250);
}

function pushPenalty(penalties: EvaluationPenalty[], penalty: EvaluationPenalty) {
  const existing = penalties.find((item) => item.code === penalty.code);
  if (existing) {
    existing.points = Math.max(existing.points, penalty.points);
    return;
  }
  penalties.push(penalty);
}

function capScore(value: number, cap: number | null) {
  if (cap === null) return value;
  return Math.min(value, cap);
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
  const eventTypes = collectEventTypes(payload, raw, blackbox);
  const detailedEvents = collectDetailedEvents(payload, raw, blackbox);
  const completedLike = ["completed", "diverted"].includes(payload.finalStatus);

  const touchdownVs = num(actual.touchdownVsFpm, num(ops.touchdownVsFpm, 0));
  const touchdownG = num(actual.touchdownGs, 1);
  const overspeed = num(actual.overspeedEvents, num(ops.overspeedEvents, 0));
  const stalls = num(actual.stallEvents, 0);
  const hardBrake = num(actual.hardBrakeEvents, num(ops.hardBrakeEvents, 0));
  const excessiveBank = num(ops.excessiveBankEvents, 0);
  const damage = num(actual.damageEvents, num(ops.damageEvents, 0));
  const flightMins = num(actual.flightTimeMinutes, 0);
  const blockMins = num(actual.blockTimeMinutes, 0);
  const distNm = num(actual.distanceNm, num(payload.planned.distanceNm, 0));
  const fuelUsed = num(actual.fuelUsedKg, num(ops.actualFuelUsedKg, 0));
  const blackboxFrameCount = num(blackboxSummary.frameCount, num(blackbox.frameCount, 0));
  const telemetryCount = telemetry.length;
  const hasBlackbox = Object.keys(blackbox).length > 0 || blackboxFrameCount > 0;
  const hasAirborne = eventTypes.includes("AIRBORNE");
  const hasTouchdown = eventTypes.includes("TOUCHDOWN");
  const hasTakeoffRoll = eventTypes.includes("TAKEOFF_ROLL") || eventTypes.includes("TAKEOFF");
  const hasParked = eventTypes.includes("PARKED") || eventTypes.includes("COLD_AND_DARK") || eventTypes.includes("REPORT_SENT");

  let maxScoreCap: number | null = null;

  if (payload.finalStatus === "crashed") {
    pushPenalty(penalties, { code: "CRASH", severity: "critical", points: 70, message: "Vuelo marcado como crashed." });
    maxScoreCap = 30;
  }

  if (!hasBlackbox) {
    pushPenalty(penalties, { code: "BLACKBOX_MISSING", severity: "critical", points: 35, message: "Payload sin caja negra BlackBox." });
    maxScoreCap = Math.min(maxScoreCap ?? 40, 40);
  }

  if (completedLike && !hasAirborne) {
    pushPenalty(penalties, { code: "AIRBORNE_MISSING", severity: "critical", points: 22, message: "No se detectó evento AIRBORNE en un vuelo completado." });
    observations.push("No se detectó evento AIRBORNE en timeline.");
    maxScoreCap = Math.min(maxScoreCap ?? 65, 65);
  }

  if (completedLike && !hasTouchdown) {
    pushPenalty(penalties, { code: "TOUCHDOWN_MISSING", severity: "critical", points: 22, message: "No se detectó evento TOUCHDOWN en un vuelo completado." });
    observations.push("No se detectó evento TOUCHDOWN en timeline.");
    maxScoreCap = Math.min(maxScoreCap ?? 70, 70);
  }

  if (completedLike && !hasAirborne && !hasTouchdown) {
    maxScoreCap = Math.min(maxScoreCap ?? 50, 50);
    pushPenalty(penalties, { code: "FLIGHT_CORE_EVENTS_MISSING", severity: "critical", points: 18, message: "Faltan eventos centrales AIRBORNE y TOUCHDOWN; evaluación limitada automáticamente." });
  }

  if (completedLike && !hasTakeoffRoll) {
    pushPenalty(penalties, { code: "TAKEOFF_ROLL_MISSING", severity: "warning", points: 8, message: "No se detectó TAKEOFF_ROLL en timeline." });
  }

  if (completedLike && !hasParked) {
    pushPenalty(penalties, { code: "PARKING_SEQUENCE_MISSING", severity: "warning", points: 6, message: "No se detectó evento PARKED/COLD_AND_DARK/REPORT_SENT." });
  }

  if (Math.abs(touchdownVs) > 900) pushPenalty(penalties, { code: "TOUCHDOWN_VS_SEVERE", severity: "critical", points: 25, message: "Touchdown vertical speed severa." });
  else if (Math.abs(touchdownVs) > 600) pushPenalty(penalties, { code: "TOUCHDOWN_VS_HARD", severity: "warning", points: 12, message: "Touchdown duro detectado." });
  if (touchdownG >= 2.0) pushPenalty(penalties, { code: "TOUCHDOWN_G_HIGH", severity: "warning", points: 10, message: "G-force alta en touchdown." });
  if (overspeed > 0) pushPenalty(penalties, { code: "OVERSPEED", severity: "warning", points: overspeed * 4, message: `Overspeed events: ${overspeed}.` });
  if (stalls > 0) pushPenalty(penalties, { code: "STALL", severity: "critical", points: stalls * 8, message: `Stall events: ${stalls}.` });
  if (hardBrake > 0) pushPenalty(penalties, { code: "HARD_BRAKE", severity: "warning", points: hardBrake * 3, message: `Hard brake events: ${hardBrake}.` });
  if (excessiveBank > 0) pushPenalty(penalties, { code: "EXCESSIVE_BANK", severity: "warning", points: excessiveBank * 2, message: `Excessive bank events: ${excessiveBank}.` });
  if (damage > 0) pushPenalty(penalties, { code: "DAMAGE", severity: "critical", points: damage * 10, message: `Damage events: ${damage}.` });

  if (completedLike && !payload.actual.landingAirport) {
    pushPenalty(penalties, { code: "LANDING_AIRPORT_MISSING", severity: "critical", points: 12, message: "Landing airport ausente." });
    maxScoreCap = Math.min(maxScoreCap ?? 75, 75);
  }

  if (payload.actual.landingAirport && payload.actual.landingAirport !== payload.destination && payload.finalStatus === "completed") {
    pushPenalty(penalties, { code: "OUTSIDE_DESTINATION", severity: "warning", points: 8, message: "Cierre fuera de destino para estado completed." });
    maxScoreCap = Math.min(maxScoreCap ?? 60, 60);
  }

  // Anti-hack / consistency
  if (distNm > 0 && flightMins > 0) {
    const gsAvg = distNm / (flightMins / 60);
    if (gsAvg > 700) {
      pushPenalty(penalties, { code: "IMPOSSIBLE_SPEED", severity: "critical", points: 25, message: `Velocidad media imposible (${gsAvg.toFixed(1)}kt).` });
      maxScoreCap = Math.min(maxScoreCap ?? 50, 50);
    }
  }

  if (completedLike && distNm > 0 && fuelUsed <= 0) {
    pushPenalty(penalties, { code: "FUEL_IMPOSSIBLE", severity: "critical", points: 20, message: "Consumo de fuel incoherente." });
    maxScoreCap = Math.min(maxScoreCap ?? 60, 60);
  }

  if (telemetryCount > 0 && telemetryCount < 5) pushPenalty(penalties, { code: "SPARSE_FRAMES", severity: "warning", points: 8, message: "Frames de telemetría demasiado escasos." });
  if (hasBlackbox && blackboxFrameCount > 0 && blackboxFrameCount < 5) pushPenalty(penalties, { code: "BLACKBOX_INSUFFICIENT", severity: "warning", points: 6, message: "BlackBox con pocos frames." });
  if (completedLike && flightMins <= 0 && blockMins <= 0) pushPenalty(penalties, { code: "TIME_MISSING", severity: "warning", points: 8, message: "Tiempo block/airborne ausente o cero." });

  const totalPenalty = penalties.reduce((acc, p) => acc + p.points, 0);
  const criticalPenalty = penalties.filter((p) => p.severity === "critical").reduce((acc, p) => acc + p.points, 0);
  const warningPenalty = penalties.filter((p) => p.severity === "warning").reduce((acc, p) => acc + p.points, 0);
  const procedurePenalty = penalties
    .filter((p) => p.code.includes("LIGHT") || p.code.includes("BRAKE") || p.code.includes("PARK") || p.code.includes("DESTINATION") || p.code.includes("AIRBORNE") || p.code.includes("TOUCHDOWN"))
    .reduce((acc, p) => acc + p.points, 0);
  const performancePenalty = penalties
    .filter((p) => p.code.includes("OVERSPEED") || p.code.includes("STALL") || p.code.includes("BANK") || p.code.includes("TOUCHDOWN") || p.code.includes("SPEED"))
    .reduce((acc, p) => acc + p.points, 0);
  const economyPenalty = fuelUsed <= 0 && completedLike ? 30 : 0;

  const operationalScore = capScore(clamp(100 - totalPenalty), maxScoreCap);
  const procedureScore = capScore(clamp(100 - procedurePenalty - (payload.finalStatus === "aborted" ? 20 : 0)), maxScoreCap);
  const performanceScore = capScore(clamp(100 - performancePenalty - (Math.abs(touchdownVs) > 600 ? 10 : 0)), maxScoreCap);
  const safetyScore = capScore(clamp(100 - criticalPenalty - warningPenalty * 0.25 - (payload.finalStatus === "crashed" ? 40 : 0)), maxScoreCap);
  const economyScore = capScore(clamp(100 - economyPenalty - (payload.finalStatus === "cancelled" ? 100 : 0)), maxScoreCap);

  const weightedScore =
    safetyScore * 0.3 +
    procedureScore * 0.25 +
    performanceScore * 0.2 +
    operationalScore * 0.15 +
    economyScore * 0.1;

  const totalScore = clamp(Math.round(capScore(weightedScore, maxScoreCap)));

  if (!observations.length && penalties.length === 0) observations.push("Vuelo evaluado sin observaciones penalizables.");

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
      blockMinutes: blockMins,
      fuelUsedKg: fuelUsed,
      telemetrySamplesCount: telemetryCount,
      blackboxFrameCount,
      blackboxSummary,
      eventTypes,
      eventDetails: detailedEvents,
      maxScoreCap,
      scoringWeights: {
        safety: 30,
        procedure: 25,
        performance: 20,
        operational: 15,
        economy: 10,
      },
    },
    evaluationStatus: "EVALUATED",
    economyStatus: "EVALUATED",
  };
}
