import { NextResponse } from "next/server";
import { buildAirlineEconomySummary, getMostProfitableRoutes } from "@/lib/economy";
import { getAirlineEconomyAccount } from "@/lib/economy/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await getAirlineEconomyAccount();
    if (!account) throw new Error("Cuenta PW3 no disponible en DB.");

    const summary = {
      airlineCashUsd: Number(account.cash_balance_usd ?? 0),
      monthlyRevenueUsd: Number(account.monthly_revenue_usd ?? 0),
      monthlyCostUsd: Number(account.monthly_cost_usd ?? 0),
      monthlyNetUsd: Number(account.monthly_net_usd ?? 0),
      passengerRevenueUsd: 0,
      cargoRevenueUsd: 0,
      pilotAccrualLiabilityUsd: Number(account.pilot_accrual_liability_usd ?? 0),
      maintenanceReserveUsd: Number(account.maintenance_reserve_usd ?? 0),
    };

    return NextResponse.json({
      ok: true,
      summary,
      topRoutes: [],
      source: "db",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      summary: buildAirlineEconomySummary(),
      topRoutes: getMostProfitableRoutes(10),
      source: "local-fallback",
      updatedAt: new Date().toISOString(),
    });
  }
}
