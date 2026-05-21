import { NextRequest, NextResponse } from "next/server";
import { loadCrewCenterData } from "@/lib/crew/server-data";
import { buildPilotEconomyProfile, getProgressionExpenseCatalog } from "@/lib/economy";
import { getProgressionExpenseCatalogDb } from "@/lib/economy/db";
import { getPilotWallet } from "@/lib/economy/wallet-db";
import { getPilotLedger } from "@/lib/economy/ledger-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const data = await loadCrewCenterData(request);

    try {
      const [wallet, expenses, ledger] = await Promise.all([
        getPilotWallet(data.pilot.id, data.pilot.callsign),
        getProgressionExpenseCatalogDb(),
        getPilotLedger(data.pilot.id, data.pilot.callsign, 12),
      ]);

      const pilotEconomy = buildPilotEconomyProfile({
        pilotId: data.pilot.id,
        callsign: data.pilot.callsign,
        rank: data.pilot.rankCode,
        walletBalanceUsd: wallet?.wallet_balance_usd,
        pendingAccrualUsd: wallet?.pending_accrual_usd,
      });

      return NextResponse.json({
        economy: data.economy,
        pilotEconomy,
        progressionExpenses: expenses,
        movements: ledger.rows,
        source: "db",
        updatedAt: new Date().toISOString(),
      });
    } catch {
      const pilotEconomy = buildPilotEconomyProfile({
        pilotId: data.pilot.id,
        callsign: data.pilot.callsign,
        rank: data.pilot.rankCode,
        walletBalanceUsd: data.economy?.balance,
        pendingAccrualUsd: data.economy?.accruedMonthlySalary,
      });
      return NextResponse.json({
        economy: data.economy,
        pilotEconomy,
        progressionExpenses: getProgressionExpenseCatalog(),
        movements: data.movements,
        source: "local-fallback",
        updatedAt: data.updatedAt,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No autenticado." }, { status: 401 });
  }
}
