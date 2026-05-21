export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { EconomyDashboard } from "@/components/economy/EconomyDashboard";
import {
  buildAirlineEconomySummary,
  getEconomyDashboardData,
  getMostProfitableRoutes,
  getProgressionExpenseCatalog,
  validateEconomyModel,
} from "@/lib/economy";
import { getAirlineEconomyAccount, getProgressionExpenseCatalogDb } from "@/lib/economy/db";
import type { AirlineEconomySummary, ProgressionExpenseCatalogItem } from "@/lib/economy";

async function resolveInitialData(): Promise<{
  summary: AirlineEconomySummary;
  expenses: ProgressionExpenseCatalogItem[];
  source: "db" | "local";
}> {
  const dashboard = getEconomyDashboardData();
  const localExpenses = getProgressionExpenseCatalog();

  if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_URL) {
    return { summary: dashboard.summary, expenses: localExpenses, source: "local" };
  }

  try {
    const [account, dbExpenses] = await Promise.all([
      getAirlineEconomyAccount(),
      getProgressionExpenseCatalogDb(),
    ]);

    const summary: AirlineEconomySummary = account
      ? {
          airlineCashUsd: Number(account.cash_balance_usd ?? 0),
          monthlyRevenueUsd: Number(account.monthly_revenue_usd ?? 0),
          monthlyCostUsd: Number(account.monthly_cost_usd ?? 0),
          monthlyNetUsd: Number(account.monthly_net_usd ?? 0),
          passengerRevenueUsd: 0,
          cargoRevenueUsd: 0,
          pilotAccrualLiabilityUsd: Number(account.pilot_accrual_liability_usd ?? 0),
          maintenanceReserveUsd: Number(account.maintenance_reserve_usd ?? 0),
        }
      : buildAirlineEconomySummary();

    return {
      summary,
      expenses: dbExpenses.length > 0 ? dbExpenses : localExpenses,
      source: "db",
    };
  } catch {
    return { summary: dashboard.summary, expenses: localExpenses, source: "local" };
  }
}

export default async function EconomyPage() {
  const { summary, expenses, source } = await resolveInitialData();
  const topRoutes = getMostProfitableRoutes(8);
  const dashboard = getEconomyDashboardData();
  const validation = validateEconomyModel();

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <section className="pw-sur-page-header">
        <div className="pw-sur-container">
          <p className="pw-sur-eyebrow">Patagonia Wings 3.0</p>
          <h1>Economia Virtual</h1>
          <p>Motor local de ingresos, costos, devengos, carga y progresion. Sin dinero real.</p>
        </div>
      </section>
      <div className="py-8">
        <AppShell>
          <EconomyDashboard
            summary={summary}
            topRoutes={topRoutes}
            passengerRouteCount={dashboard.passengerRoutes.length}
            cargoRouteCount={dashboard.cargoRoutes.length}
            expenses={expenses}
            validationOk={validation.ok}
            initialSource={source}
          />
        </AppShell>
      </div>
    </main>
  );
}
