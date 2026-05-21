import type { FinalizeScoreResult, NormalizedFinalizePayload } from "@/lib/acars/finalize-types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function calculateFlightScore(payload: NormalizedFinalizePayload): FinalizeScoreResult {
  const warnings: string[] = [];

  if (payload.finalStatus === "crashed") {
    return { score: 0, warnings: ["Vuelo marcado como crashed."], hardLanding: true };
  }

  let score = 100;

  const vs = payload.actual.touchdownVsFpm ?? payload.acarsOperationalInputs.touchdownVsFpm;
  let hardLanding = Boolean(payload.acarsOperationalInputs.hardLanding);
  if (typeof vs === "number") {
    if (vs < -900) {
      score -= 30;
      hardLanding = true;
      warnings.push("Aterrizaje severo detectado.");
    } else if (vs < -600) {
      score -= 15;
      hardLanding = true;
      warnings.push("Aterrizaje duro detectado.");
    }
  }

  const overspeed = payload.actual.overspeedEvents ?? payload.acarsOperationalInputs.overspeedEvents ?? 0;
  const stalls = payload.actual.stallEvents ?? 0;
  const hardBrake = payload.actual.hardBrakeEvents ?? payload.acarsOperationalInputs.hardBrakeEvents ?? 0;
  const excessiveBank = payload.acarsOperationalInputs.excessiveBankEvents ?? 0;
  const damage = payload.actual.damageEvents ?? payload.acarsOperationalInputs.damageEvents ?? 0;

  score -= overspeed * 5;
  score -= stalls * 10;
  score -= hardBrake * 4;
  score -= excessiveBank * 3;
  score -= damage * 10;

  if (payload.actual.simRateExceeded) {
    score -= 20;
    warnings.push("Sim rate excedido.");
  }

  if (payload.finalStatus === "aborted") {
    score = Math.min(score, 50);
    warnings.push("Vuelo abortado.");
  }
  if (payload.finalStatus === "cancelled") {
    score = 0;
    warnings.push("Vuelo cancelado.");
  }
  if (payload.finalStatus === "diverted") {
    score = Math.min(score, 85);
    warnings.push("Vuelo desviado.");
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    warnings,
    hardLanding,
  };
}
