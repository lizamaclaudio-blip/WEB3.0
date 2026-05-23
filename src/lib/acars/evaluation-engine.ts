import { canPenalizeMissing, collectAcarsEvidence, signalByKey } from "@/lib/acars/evidence-collector";
import type { NormalizedFinalizePayload } from "@/lib/acars/finalize-types";

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

function pushPenalty(penalties: EvaluationPenalty[], penalty: EvaluationPenalty) {
  const existing = penalties.find((item) => item.code === penalty.code);
  if (existing) {
    existing.points = Math.max(existing.points, penalty.points);
    existing.severity = existing.severity === "critical" || penalty.severity === "critical" ? "critical" : existing.severity === "warning" || penalty.severity === "warning" ? "warning" : "info";
    return;
  }
  penalties.push(penalty);
}

function capScore(value: number, cap: number | null) {
  if (cap === null) return value;
  return Math.min(value, cap);
}

function signalDetected(payloadEvidence: ReturnType<typeof collectAcarsEvidence>, key: Parameters<typeof signalByKey>[1]) {
  return Boolean(signalByKey(payloadEvidence, key)?.detected);
}

function signalCanPenalize(payloadEvidence: ReturnType<typeof collectAcarsEvidence>, key: Parameters<typeof signalByKey>[1]) {
  return Boolean(signalByKey(payloadEvidence, key)?.canPenalize);
}

export function evaluateFinalizePayload(payload: NormalizedFinalizePayload): EvaluationResult {
  const penalties: EvaluationPenalty[] = [];
  const observations: string[] = [];
  const evidenceReport = collectAcarsEvidence(payload);

  const actual = payload.actual ?? {};
  const ops = payload.acarsOperationalInputs ?? {};
  const raw = asObj(payload.raw);
  const completedLike = ["completed", "diverted"].includes(payload.finalStatus);

  const touchdownSignal = signalByKey(evidenceReport, "TOUCHDOWN");
  const airborneSignal = signalByKey(evidenceReport, "AIRBORNE");
  const takeoffRollSignal = signalByKey(evidenceReport, "TAKEOFF_ROLL");
  const parkedSignal = signalByKey(evidenceReport, "PARKED");
  const blackboxSignal = signalByKey(evidenceReport, "BLACKBOX");
  const telemetrySignal = signalByKey(evidenceReport, "TELEMETRY_SAMPLES");
  const fuelSignal = signalByKey(evidenceReport, "FUEL");

  const hasBlackbox = Boolean(blackboxSignal?.detected);
  const hasEnoughRawEvidence = Boolean(
    blackboxSignal?.status === "CERTIFIED" ||
      telemetrySignal?.status === "CERTIFIED" ||
      evidenceReport.rawFacts.hasPirepXml ||
      evidenceReport.eventDetails.length >= 3,
  );

  const hasAirborne = signalDetected(evidenceReport, "AIRBORNE");
  const hasTouchdown = signalDetected(evidenceReport, "TOUCHDOWN");
  const hasTakeoffRoll = signalDetected(evidenceReport, "TAKEOFF_ROLL");
  const hasParked = signalDetected(evidenceReport, "PARKED");

  const touchdownVs = evidenceReport.rawFacts.touchdownVsFpm ?? num(actual.touchdownVsFpm, num(ops.touchdownVsFpm, 0));
  const touchdownG = evidenceReport.rawFacts.touchdownG ?? num(actual.touchdownGs, 1);
  const overspeed = evidenceReport.rawFacts.overspeedEvents || num(actual.overspeedEvents, num(ops.overspeedEvents, 0));
  const stalls = evidenceReport.rawFacts.stallEvents || num(actual.stallEvents, 0);
  const hardBrake = num(actual.hardBrakeEvents, num(ops.hardBrakeEvents, 0));
  const excessiveBank = num(ops.excessiveBankEvents, 0);
  const damage = num(actual.damageEvents, num(ops.damageEvents, 0));
  const flightMins = num(actual.flightTimeMinutes, 0);
  const blockMins = num(actual.blockTimeMinutes, 0);
  const distNm = num(actual.distanceNm, num(payload.planned.distanceNm, 0));
  const fuelUsed = evidenceReport.rawFacts.fuelUsedKg ?? num(actual.fuelUsedKg, num(ops.actualFuelUsedKg, 0));

  let maxScoreCap: number | null = null;

  observations.push(...evidenceReport.observations);
  observations.push(...evidenceReport.warnings);

  if (payload.finalStatus === "crashed") {
    pushPenalty(penalties, { code: "CRASH", severity: "critical", points: 70, message: "Vuelo marcado como crashed." });
    maxScoreCap = 30;
  }

  if (!hasBlackbox) {
    pushPenalty(penalties, { code: "BLACKBOX_MISSING", severity: "critical", points: 35, message: "Payload sin caja negra BlackBox; vuelo requiere revisión técnica." });
    maxScoreCap = Math.min(maxScoreCap ?? 40, 40);
  }

  // Regla estricta, pero alineada con evidencia certificada:
  // solo se castiga AIRBORNE/TOUCHDOWN si existía fuente confiable para esperarlos.
  if (completedLike && !hasAirborne && hasEnoughRawEvidence && canPenalizeMissing(evidenceReport, "AIRBORNE")) {
    pushPenalty(penalties, { code: "AIRBORNE_MISSING", severity: "critical", points: 22, message: "No se detectó AIRBORNE en ninguna fuente certificada del vuelo." });
    observations.push("AIRBORNE ausente en fuentes certificadas; penalización aplicada.");
    maxScoreCap = Math.min(maxScoreCap ?? 65, 65);
  } else if (completedLike && !hasAirborne) {
    observations.push("AIRBORNE no certificado: la fuente disponible no permite penalizar sin riesgo de falso positivo.");
  }

  if (completedLike && !hasTouchdown && hasEnoughRawEvidence && canPenalizeMissing(evidenceReport, "TOUCHDOWN")) {
    pushPenalty(penalties, { code: "TOUCHDOWN_MISSING", severity: "critical", points: 22, message: "No se detectó TOUCHDOWN en ninguna fuente certificada del vuelo." });
    observations.push("TOUCHDOWN ausente en fuentes certificadas; penalización aplicada.");
    maxScoreCap = Math.min(maxScoreCap ?? 70, 70);
  } else if (completedLike && !hasTouchdown) {
    observations.push("TOUCHDOWN no certificado: la fuente disponible no permite penalizar sin riesgo de falso positivo.");
  }

  if (completedLike && !hasAirborne && !hasTouchdown && hasEnoughRawEvidence) {
    maxScoreCap = Math.min(maxScoreCap ?? 50, 50);
    pushPenalty(penalties, { code: "FLIGHT_CORE_EVENTS_MISSING", severity: "critical", points: 18, message: "Faltan AIRBORNE y TOUCHDOWN en fuentes certificadas; evaluación limitada automáticamente." });
  }

  if (completedLike && !hasTakeoffRoll && signalCanPenalize(evidenceReport, "TAKEOFF_ROLL")) {
    pushPenalty(penalties, { code: "TAKEOFF_ROLL_MISSING", severity: "warning", points: 6, message: "No se detectó TAKEOFF_ROLL en fuentes certificadas." });
  }

  if (completedLike && !hasParked && parkedSignal?.status !== "UNRELIABLE") {
    pushPenalty(penalties, { code: "PARKING_SEQUENCE_MISSING", severity: "warning", points: 4, message: "No se detectó PARKED/COLD_AND_DARK/REPORT_SENT; revisar secuencia de cierre." });
  }

  if (Math.abs(touchdownVs) > 900) pushPenalty(penalties, { code: "TOUCHDOWN_VS_SEVERE", severity: "critical", points: 25, message: "Touchdown vertical speed severa." });
  else if (Math.abs(touchdownVs) > 600) pushPenalty(penalties, { code: "TOUCHDOWN_VS_HARD", severity: "warning", points: 12, message: "Touchdown duro detectado." });
  if (touchdownG >= 2.0) pushPenalty(penalties, { code: "TOUCHDOWN_G_HIGH", severity: "warning", points: 10, message: "G-force alta en touchdown." });
  if (overspeed > 0) pushPenalty(penalties, { code: "OVERSPEED", severity: "warning", points: overspeed * 4, message: `Overspeed events/seconds: ${overspeed}.` });
  if (stalls > 0) pushPenalty(penalties, { code: "STALL", severity: "critical", points: stalls * 8, message: `Stall events/seconds: ${stalls}.` });
  if (hardBrake > 0) pushPenalty(penalties, { code: "HARD_BRAKE", severity: "warning", points: hardBrake * 3, message: `Hard brake events: ${hardBrake}.` });
  if (excessiveBank > 0) pushPenalty(penalties, { code: "EXCESSIVE_BANK", severity: "warning", points: excessiveBank * 2, message: `Excessive bank events: ${excessiveBank}.` });
  if (damage > 0) pushPenalty(penalties, { code: "DAMAGE", severity: "critical", points: damage * 10, message: `Damage events: ${damage}.` });

  if (completedLike && !payload.actual.landingAirport && !hasTouchdown) {
    pushPenalty(penalties, { code: "LANDING_AIRPORT_MISSING", severity: "critical", points: 10, message: "Landing airport ausente y sin evidencia touchdown." });
    maxScoreCap = Math.min(maxScoreCap ?? 75, 75);
  }

  if (payload.actual.landingAirport && payload.actual.landingAirport !== payload.destination && payload.finalStatus === "completed") {
    pushPenalty(penalties, { code: "OUTSIDE_DESTINATION", severity: "warning", points: 8, message: "Cierre fuera de destino para estado completed." });
    maxScoreCap = Math.min(maxScoreCap ?? 60, 60);
  }

  if (distNm > 0 && flightMins > 0) {
    const gsAvg = distNm / (flightMins / 60);
    if (gsAvg > 700) {
      pushPenalty(penalties, { code: "IMPOSSIBLE_SPEED", severity: "critical", points: 25, message: `Velocidad media imposible (${gsAvg.toFixed(1)} kt).` });
      maxScoreCap = Math.min(maxScoreCap ?? 50, 50);
    }
  }

  // Fuel será estricto solo si la señal está certificada y no inconsistente.
  if (completedLike && distNm > 0 && fuelUsed <= 0 && fuelSignal?.canPenalize) {
    pushPenalty(penalties, { code: "FUEL_IMPOSSIBLE", severity: "critical", points: 20, message: "Consumo de fuel incoherente." });
    maxScoreCap = Math.min(maxScoreCap ?? 60, 60);
  } else if (evidenceReport.rawFacts.fuelInconsistent) {
    observations.push("Fuel queda en observación: unidades/cálculo inconsistentes detectados, sin castigo económico estricto todavía.");
  }

  if (completedLike && flightMins <= 0 && blockMins <= 0) pushPenalty(penalties, { code: "TIME_MISSING", severity: "warning", points: 8, message: "Tiempo block/airborne ausente o cero." });

  const totalPenalty = penalties.reduce((acc, p) => acc + p.points, 0);
  const criticalPenalty = penalties.filter((p) => p.severity === "critical").reduce((acc, p) => acc + p.points, 0);
  const warningPenalty = penalties.filter((p) => p.severity === "warning").reduce((acc, p) => acc + p.points, 0);
  const procedurePenalty = penalties
    .filter((p) => p.code.includes("LIGHT") || p.code.includes("BRAKE") || p.code.includes("PARK") || p.code.includes("DESTINATION") || p.code.includes("AIRBORNE") || p.code.includes("TOUCHDOWN"))
    .reduce((acc, p) => acc + p.points, 0);
  const performancePenalty = penalties
    .filter((p) => p.code.includes("OVERSPEED") || p.code.includes("STALL") || p.code.includes("TOUCHDOWN") || p.code.includes("BANK") || p.code.includes("SPEED"))
    .reduce((acc, p) => acc + p.points, 0);
  const economyPenalty = evidenceReport.rawFacts.fuelInconsistent ? 0 : penalties.filter((p) => p.code.includes("FUEL") || p.code.includes("ECONOMY")).reduce((acc, p) => acc + p.points, 0);

  const safetyScore = clamp(100 - criticalPenalty - Math.max(0, warningPenalty * 0.35));
  const procedureScore = clamp(100 - procedurePenalty);
  const performanceScore = clamp(100 - performancePenalty);
  const operationalScore = clamp(100 - Math.max(0, totalPenalty * 0.45));
  const economyScore = clamp(100 - economyPenalty);

  let totalScore =
    safetyScore * 0.3 +
    procedureScore * 0.25 +
    performanceScore * 0.2 +
    operationalScore * 0.15 +
    economyScore * 0.1;

  totalScore = capScore(totalScore, maxScoreCap);
  totalScore = clamp(Math.round(totalScore * 100) / 100);

  const telemetryCertification = {
    signals: evidenceReport.signals,
    observations: evidenceReport.observations,
    warnings: evidenceReport.warnings,
    rawFacts: evidenceReport.rawFacts,
  };

  return {
    operationalScore: Math.round(operationalScore * 100) / 100,
    procedureScore: Math.round(procedureScore * 100) / 100,
    performanceScore: Math.round(performanceScore * 100) / 100,
    safetyScore: Math.round(safetyScore * 100) / 100,
    economyScore: Math.round(economyScore * 100) / 100,
    totalScore,
    penalties,
    observations: Array.from(new Set(observations.filter(Boolean))),
    evidence: {
      eventTypes: evidenceReport.eventTypes,
      eventDetails: evidenceReport.eventDetails,
      blackboxSummary: asObj(asObj(raw.blackbox ?? raw.BlackBox).summary ?? asObj(raw.blackbox ?? raw.BlackBox).Summary),
      telemetrySamplesCount: evidenceReport.rawFacts.telemetrySamplesCount,
      blackboxFrameCount: evidenceReport.rawFacts.blackboxFrameCount,
      touchdownVs: touchdownVs ?? null,
      touchdownG: touchdownG ?? null,
      fuelUsedKg: fuelUsed ?? null,
      distanceNm: distNm || null,
      maxScoreCap,
      telemetryCertification,
    },
    evaluationStatus: "EVALUATED",
    economyStatus: "EVALUATED",
  };
}
