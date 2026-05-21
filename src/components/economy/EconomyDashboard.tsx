"use client";

import { useEffect, useState } from "react";
import type { EconomyPayload } from "@/lib/crew/server-data";
import type {
  AirlineEconomySummary,
  FlightEconomyEstimate,
  PilotEconomyProfile,
  ProgressionExpenseCatalogItem,
} from "@/lib/economy";
import { usePrivateApi } from "@/lib/supabase/use-private-api";
import styles from "./EconomyDashboard.module.css";

type PilotSummaryResponse = {
  economy: EconomyPayload | null;
  pilotEconomy?: PilotEconomyProfile;
  progressionExpenses?: ProgressionExpenseCatalogItem[];
  error?: string;
};

type Props = {
  summary: AirlineEconomySummary;
  topRoutes: FlightEconomyEstimate[];
  passengerRouteCount: number;
  cargoRouteCount: number;
  expenses: ProgressionExpenseCatalogItem[];
  validationOk: boolean;
  initialSource?: "db" | "local";
};

function money(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "No disponible";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function flightTypeLabel(value: string) {
  return value === "cargo" ? "Carga" : "Itinerario";
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <em>{helper}</em> : null}
    </div>
  );
}

export function EconomyDashboard({
  summary,
  topRoutes,
  passengerRouteCount,
  cargoRouteCount,
  expenses,
  validationOk,
  initialSource,
}: Props) {
  const { data, loading, error } = usePrivateApi<PilotSummaryResponse>("/api/economy/pilot-summary");
  const [dbSummary, setDbSummary] = useState<AirlineEconomySummary | null>(
    initialSource === "db" ? summary : null,
  );
  const pilot = data?.pilotEconomy;
  const progressionTotal = expenses.reduce((total, expense) => total + expense.amountUsd, 0);
  const positiveTopRoutes = topRoutes.filter((route) => route.airlineNetUsd > 0);
  const displayedTopRoutes = positiveTopRoutes.length ? positiveTopRoutes : topRoutes;
  const routeRankingTitle = positiveTopRoutes.length ? "Rutas mas rentables" : "Rutas con menor perdida estimada";

  useEffect(() => {
    if (initialSource === "db") return;
    let cancelled = false;
    void fetch("/api/economy/airline-summary", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled && json?.summary) {
          setDbSummary(json.summary as AirlineEconomySummary);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [initialSource]);

  const activeSummary = dbSummary ?? summary;

  return (
    <div className={styles.shell}>
      <p className={styles.notice}>
        Economia 100% virtual. Los vuelos generan devengo piloto pendiente; el wallet solo cambia con liquidacion mensual futura o gastos de progresion.
      </p>

      <section className={styles.grid}>
        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h2>Resumen aerolinea</h2>
            <span>{validationOk ? "Modelo OK" : "Revisar"}</span>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.metricGrid}>
              <Metric label="Caja virtual" value={money(activeSummary.airlineCashUsd)} />
              <Metric label="Ingresos mes" value={money(activeSummary.monthlyRevenueUsd)} helper={`${passengerRouteCount} pax / ${cargoRouteCount} carga`} />
              <Metric label="Costos mes" value={money(activeSummary.monthlyCostUsd)} />
              <Metric label="Utilidad mes" value={money(activeSummary.monthlyNetUsd)} />
              <Metric label="Ingresos pasajeros" value={money(activeSummary.passengerRevenueUsd)} />
              <Metric label="Ingresos carga" value={money(activeSummary.cargoRevenueUsd)} />
              <Metric label="Devengos pilotos" value={money(activeSummary.pilotAccrualLiabilityUsd)} helper="Pendiente de liquidacion" />
              <Metric label="Reserva mant." value={money(activeSummary.maintenanceReserveUsd)} />
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h2>Resumen piloto</h2>
            <span>{pilot?.callsign ?? "Piloto"}</span>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.metricGrid}>
              <Metric label="Wallet" value={money(pilot?.walletBalanceUsd)} helper="No sube vuelo a vuelo" />
              <Metric label="Devengo pendiente" value={money(pilot?.pendingAccrualUsd)} />
              <Metric label="Pagado este mes" value={money(pilot?.paidThisMonthUsd)} />
              <Metric label="Total ganado" value={money(pilot?.totalEarnedUsd)} />
              <Metric label="Total gastado" value={money(pilot?.totalSpentUsd)} />
              <Metric label="Gastos catalogo" value={money(progressionTotal)} helper={`${expenses.length} items`} />
            </div>
            <p className={styles.statusLine}>
              {loading ? "Cargando resumen privado del piloto..." : error || "Resumen privado listo. Los movimientos reales siguen en modo lectura."}
            </p>
          </div>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h2>{routeRankingTitle}</h2>
            <span>Estimacion</span>
          </header>
          <div className={styles.cardBody}>
            {!positiveTopRoutes.length ? (
              <p className={styles.warningLine}>La calibracion actual no tiene rutas positivas en el ranking superior.</p>
            ) : null}
            <ul className={styles.routeList}>
              {displayedTopRoutes.slice(0, 8).map((route) => (
                <li className={styles.routeItem} key={`${route.routeId}-${route.aircraftCode}`}>
                  <div>
                    <strong>{route.origin} - {route.destination}</strong>
                    <span>{flightTypeLabel(route.flightType)} - {route.aircraftCode} - ingreso {money(route.grossRevenueUsd)} - costo {money(route.totalCostUsd)}</span>
                  </div>
                  <span className={route.airlineNetUsd >= 0 ? styles.amountPositive : styles.amountNegative}>{money(route.airlineNetUsd)}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h2>Progresion</h2>
            <span>Wallet debit futuro</span>
          </header>
          <div className={styles.cardBody}>
            <ul className={styles.expenseList}>
              {expenses.slice(0, 8).map((expense) => (
                <li className={styles.expenseItem} key={expense.code}>
                  <div>
                    <strong>{expense.label}</strong>
                    <span>{expense.appliesTo} - {expense.type}</span>
                  </div>
                  <span className={styles.amountNeutral}>{money(expense.amountUsd)}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </div>
  );
}
