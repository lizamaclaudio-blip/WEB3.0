import type { FlightEconomyEstimate, EconomyLedgerEntry, EconomyLedgerType } from "./types";

type LedgerBuildOptions = {
  pilotId?: string;
  reservationId?: string;
  createdAt?: string;
};

function cleanId(value: string) {
  return value.replace(/[^A-Z0-9_-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function entry(
  estimate: FlightEconomyEstimate,
  type: EconomyLedgerType,
  category: string,
  amountUsd: number,
  direction: EconomyLedgerEntry["direction"],
  description: string,
  options: LedgerBuildOptions,
): EconomyLedgerEntry {
  const createdAt = options.createdAt ?? new Date().toISOString();
  return {
    id: cleanId(`EST-${estimate.routeId}-${estimate.aircraftCode}-${type}-${category}`),
    createdAt,
    pilotId: options.pilotId,
    routeId: estimate.routeId,
    reservationId: options.reservationId,
    type,
    category,
    amountUsd: Number(Math.max(0, amountUsd).toFixed(2)),
    direction,
    status: "estimated",
    description,
    metadata: {
      aircraftCode: estimate.aircraftCode,
      origin: estimate.origin,
      destination: estimate.destination,
      flightType: estimate.flightType,
      economyEligible: estimate.economyEligible,
    },
  };
}

export function buildFlightEconomyLedgerEntries(
  estimate: FlightEconomyEstimate,
  options: LedgerBuildOptions = {},
) {
  const revenueType = estimate.flightType === "cargo" ? "cargo_revenue" : "airline_revenue";
  const costType = estimate.flightType === "cargo" ? "cargo_cost" : "airline_cost";
  const entries: EconomyLedgerEntry[] = [
    entry(estimate, revenueType, estimate.flightType, estimate.grossRevenueUsd, "credit", "Ingreso operacional estimado", options),
    entry(estimate, costType, "fuel", estimate.fuelCostUsd, "debit", "Combustible estimado", options),
    entry(estimate, costType, "airport_fees", estimate.airportFeesUsd, "debit", "Tasas aeroportuarias estimadas", options),
    entry(estimate, costType, "maintenance", estimate.maintenanceCostUsd, "debit", "Mantenimiento estimado", options),
    entry(estimate, costType, "crew", estimate.crewCostUsd, "debit", "Costo tripulacion estimado", options),
    entry(estimate, "pilot_accrual", "pilot_accrual", estimate.pilotAccrualUsd, "debit", "Devengo piloto estimado, no pagado a wallet", options),
    entry(estimate, "maintenance_reserve", "maintenance_reserve", estimate.maintenanceReserveUsd, "debit", "Reserva virtual de mantenimiento", options),
  ];

  if (estimate.cateringCostUsd > 0) {
    entries.push(entry(estimate, costType, "catering", estimate.cateringCostUsd, "debit", "Catering estimado", options));
  }
  if (estimate.cargoHandlingCostUsd > 0) {
    entries.push(entry(estimate, costType, "cargo_handling", estimate.cargoHandlingCostUsd, "debit", "Handling de carga estimado", options));
  }

  return entries.filter((item) => item.amountUsd > 0);
}
