import type { EconomyLedgerEntry } from "./types";

export type MonthlyPayoutPreview = {
  pilotId: string;
  period: string;
  accrualEntryIds: string[];
  grossAccrualUsd: number;
  alreadyPaidUsd: number;
  payableUsd: number;
  payoutEntry: EconomyLedgerEntry | null;
};

function periodKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyPayoutPreview(
  entries: EconomyLedgerEntry[],
  pilotId: string,
  date = new Date(),
): MonthlyPayoutPreview {
  const period = periodKey(date);
  const accruals = entries.filter((entry) =>
    entry.pilotId === pilotId &&
    entry.type === "pilot_accrual" &&
    entry.status === "pending" &&
    String(entry.createdAt).startsWith(period),
  );
  const payouts = entries.filter((entry) =>
    entry.pilotId === pilotId &&
    entry.type === "pilot_payout" &&
    String(entry.metadata.period ?? "") === period &&
    entry.status !== "void",
  );
  const grossAccrualUsd = Number(accruals.reduce((sum, entry) => sum + entry.amountUsd, 0).toFixed(2));
  const alreadyPaidUsd = Number(payouts.reduce((sum, entry) => sum + entry.amountUsd, 0).toFixed(2));
  const payableUsd = Number(Math.max(0, grossAccrualUsd - alreadyPaidUsd).toFixed(2));
  const payoutEntry: EconomyLedgerEntry | null = payableUsd > 0
    ? {
        id: `PAYOUT-${pilotId}-${period}`,
        createdAt: date.toISOString(),
        pilotId,
        type: "pilot_payout",
        category: "monthly_payout",
        amountUsd: payableUsd,
        direction: "credit",
        status: "pending",
        description: "Liquidacion mensual virtual de devengos piloto",
        metadata: {
          period,
          accrualEntryIds: accruals.map((entry) => entry.id),
          walletEffect: "credit_on_posting_only",
        },
      }
    : null;

  return {
    pilotId,
    period,
    accrualEntryIds: accruals.map((entry) => entry.id),
    grossAccrualUsd,
    alreadyPaidUsd,
    payableUsd,
    payoutEntry,
  };
}
