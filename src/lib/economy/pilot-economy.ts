import { getOperationalEconomyEstimates } from "./calculator";
import type { EconomyLedgerEntry, PilotEconomyProfile, ProgressionExpenseCatalogItem } from "./types";

export type PilotEconomyProfileInput = {
  pilotId?: string | null;
  callsign?: string | null;
  rank?: string | null;
  walletBalanceUsd?: number | null;
  pendingAccrualUsd?: number | null;
  paidThisMonthUsd?: number | null;
  totalEarnedUsd?: number | null;
  totalSpentUsd?: number | null;
};

function n(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildPilotEconomyProfile(input: PilotEconomyProfileInput = {}): PilotEconomyProfile {
  const estimatedPending = getOperationalEconomyEstimates()
    .slice(0, 8)
    .reduce((sum, estimate) => sum + estimate.pilotAccrualUsd, 0);

  return {
    pilotId: input.pilotId || "local-preview",
    callsign: input.callsign || "PWG000",
    rank: input.rank || "CADET",
    walletBalanceUsd: n(input.walletBalanceUsd),
    pendingAccrualUsd: n(input.pendingAccrualUsd) || Number(estimatedPending.toFixed(2)),
    paidThisMonthUsd: n(input.paidThisMonthUsd),
    totalEarnedUsd: n(input.totalEarnedUsd),
    totalSpentUsd: n(input.totalSpentUsd),
  };
}

export function applyPilotExpense(
  profile: PilotEconomyProfile,
  expense: ProgressionExpenseCatalogItem,
): PilotEconomyProfile {
  return {
    ...profile,
    walletBalanceUsd: Number(Math.max(0, profile.walletBalanceUsd - expense.amountUsd).toFixed(2)),
    totalSpentUsd: Number((profile.totalSpentUsd + expense.amountUsd).toFixed(2)),
  };
}

export function getPendingAccrualFromLedger(entries: EconomyLedgerEntry[], pilotId: string) {
  return Number(entries
    .filter((entry) => entry.pilotId === pilotId && entry.type === "pilot_accrual" && entry.status === "pending")
    .reduce((sum, entry) => sum + entry.amountUsd, 0)
    .toFixed(2));
}
