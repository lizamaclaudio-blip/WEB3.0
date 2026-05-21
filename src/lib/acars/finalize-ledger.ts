import "server-only";
import { createLedgerEntry } from "@/lib/economy/ledger-db";
import { accruePilotAmount } from "@/lib/economy/wallet-db";
import type { FinalizeEconomyResult, NormalizedFinalizePayload } from "@/lib/acars/finalize-types";

export function buildFlightLedgerEntries(input: {
  reservationId: string;
  routeId?: string | null;
  pilotId: string;
  callsign: string;
  economy: FinalizeEconomyResult;
  payload: NormalizedFinalizePayload;
}) {
  const rid = input.reservationId;
  return [
    {
      type: "airline_revenue",
      category: input.payload.flightType,
      direction: "credit" as const,
      amountUsd: input.economy.airlineRevenueUsd,
      description: `Revenue post-vuelo ${rid}`,
      idempotencyKey: `flight_economy:${rid}:airline_revenue`,
    },
    {
      type: "airline_cost",
      category: input.payload.flightType,
      direction: "debit" as const,
      amountUsd: input.economy.airlineCostUsd,
      description: `Cost post-vuelo ${rid}`,
      idempotencyKey: `flight_economy:${rid}:airline_cost`,
    },
    {
      type: "maintenance_reserve",
      category: input.payload.flightType,
      direction: "debit" as const,
      amountUsd: input.economy.maintenanceReserveUsd,
      description: `Maintenance reserve post-vuelo ${rid}`,
      idempotencyKey: `flight_economy:${rid}:maintenance_reserve`,
    },
    {
      type: "pilot_accrual",
      category: input.payload.flightType,
      direction: "debit" as const,
      amountUsd: input.economy.pilotAccrualUsd,
      description: `Pilot accrual post-vuelo ${rid}`,
      idempotencyKey: `flight_economy:${rid}:pilot_accrual`,
    },
  ];
}

export async function writeFinalizeLedger(input: {
  reservationId: string;
  routeId?: string | null;
  pilotId: string;
  callsign: string;
  payload: NormalizedFinalizePayload;
  economy: FinalizeEconomyResult;
}) {
  if (!input.economy.economyEligible) {
    return { ledgerWritten: false, pilotAccrualUsd: 0 };
  }

  const entries = buildFlightLedgerEntries(input);

  for (const entry of entries) {
    await createLedgerEntry({
      pilotId: input.pilotId,
      callsign: input.callsign,
      reservationId: input.reservationId,
      routeId: input.routeId ?? undefined,
      source: "acars_finalize",
      type: entry.type,
      category: entry.category,
      direction: entry.direction,
      amountUsd: entry.amountUsd,
      description: entry.description,
      idempotencyKey: entry.idempotencyKey,
      metadata: {
        reservationId: input.reservationId,
        finalStatus: input.payload.finalStatus,
        flightType: input.payload.flightType,
      },
      createdBy: "acars-finalize-api",
    });
  }

  if (input.economy.pilotAccrualUsd > 0) {
    await accruePilotAmount({
      pilotId: input.pilotId,
      callsign: input.callsign,
      amountUsd: input.economy.pilotAccrualUsd,
    });
  }

  return {
    ledgerWritten: true,
    pilotAccrualUsd: input.economy.pilotAccrualUsd,
  };
}
