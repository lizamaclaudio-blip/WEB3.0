import type { FinalizeEconomyResult, NormalizedFinalizePayload } from "@/lib/acars/finalize-types";

type WearInput = {
  plannedWearPercent?: number;
  acarsOperationalInputs: NormalizedFinalizePayload["acarsOperationalInputs"];
};

export function calculateAircraftWearFromAcars(input: WearInput) {
  const planned = input.plannedWearPercent ?? 0;
  const touch = Math.abs(input.acarsOperationalInputs.touchdownVsFpm ?? 0);
  const hardLandingFactor = input.acarsOperationalInputs.hardLanding ? 1.3 : 1;
  const overspeed = input.acarsOperationalInputs.overspeedEvents ?? 0;
  const damage = input.acarsOperationalInputs.damageEvents ?? 0;
  const bank = input.acarsOperationalInputs.excessiveBankEvents ?? 0;
  const hardBrake = input.acarsOperationalInputs.hardBrakeEvents ?? 0;
  const touchFactor = touch > 900 ? 1.35 : touch > 600 ? 1.18 : 1;
  const eventsFactor = 1 + overspeed * 0.03 + damage * 0.08 + bank * 0.02 + hardBrake * 0.02;
  const total = Number((Math.max(planned, 0.2) * hardLandingFactor * touchFactor * eventsFactor).toFixed(2));
  return total;
}

function n(v: unknown, fallback = 0) {
  const parsed = typeof v === "number" ? v : Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateRealEconomyFromFinalize(payload: NormalizedFinalizePayload): FinalizeEconomyResult {
  const status = payload.finalStatus;
  const snap = (payload.planned.economySnapshot ?? {}) as Record<string, unknown>;

  if (status !== "completed" && status !== "diverted") {
    return {
      economyEligible: false,
      grossRevenueUsd: 0,
      totalCostUsd: 0,
      netProfitUsd: 0,
      maintenanceReserveUsd: 0,
      pilotAccrualUsd: 0,
      airlineRevenueUsd: 0,
      airlineCostUsd: 0,
      wearPercent: 0,
      ticketRevenueUsd: 0,
      cargoRevenueUsd: 0,
      notes: ["Vuelo no completado: sin devengo positivo."],
    };
  }

  const flightType = payload.flightType;
  const isCargo = flightType === "cargo";

  const plannedGross = n(snap.grossRevenueUsd);
  const plannedCost = n(snap.totalCostUsd);
  const plannedReserve = n(snap.maintenanceReserveUsd);
  const plannedWear = n(snap.aircraftWearPercent);
  const plannedTicketRevenue = n(snap.ticketRevenueUsd);
  const plannedCargoRevenue = n(snap.cargoRevenueUsd);

  const fuelUsedKg = n(payload.actual.fuelUsedKg ?? payload.acarsOperationalInputs.actualFuelUsedKg, 0);
  const passengerCount = n(payload.actual.passengerCount ?? payload.planned.passengerCount, 0);
  const cargoKg = n(payload.actual.cargoKg ?? payload.planned.cargoKg, 0);
  const baggageKg = n(payload.actual.baggageKg ?? payload.planned.baggageKg, 0);
  const distanceNm = n(payload.actual.distanceNm ?? payload.planned.distanceNm, 0);

  const fuelAdjustment = fuelUsedKg > 0 ? fuelUsedKg * 0.62 : 0;
  const qualityPenalty = (payload.actual.simRateExceeded ? 85 : 0) + (n(payload.actual.overspeedEvents) * 32);
  const baseCost = plannedCost + fuelAdjustment + qualityPenalty;

  let ticketRevenue = isCargo ? 0 : Math.max(plannedTicketRevenue, passengerCount * (32 + distanceNm * 0.18));
  const excessBaggageRevenue = isCargo ? 0 : Math.max(0, baggageKg - passengerCount * 20) * 2.1;
  const onboardRevenue = isCargo ? 0 : passengerCount * 3.2;
  const serviceRevenue = isCargo ? 0 : passengerCount * 2.1;

  const cargoRevenue = isCargo
    ? Math.max(plannedCargoRevenue, cargoKg * Math.max(0.004, distanceNm * 0.000012) + 160)
    : 0;

  if (isCargo) {
    ticketRevenue = 0;
  }

  const grossRevenue = isCargo
    ? cargoRevenue
    : Math.max(plannedGross, ticketRevenue + excessBaggageRevenue + onboardRevenue + serviceRevenue);

  const wearPercent = calculateAircraftWearFromAcars({
    plannedWearPercent: plannedWear,
    acarsOperationalInputs: payload.acarsOperationalInputs,
  });
  const wearReserve = Math.max(plannedReserve, plannedReserve * (wearPercent / Math.max(plannedWear || 1, 1)));

  const totalCost = Number((baseCost + Math.max(0, wearReserve - plannedReserve)).toFixed(2));
  const netProfit = Number((grossRevenue - totalCost).toFixed(2));
  const pilotAccrual = netProfit > 0 ? Number((Math.max(45, netProfit * 0.08)).toFixed(2)) : 0;

  return {
    economyEligible: netProfit > 0,
    grossRevenueUsd: Number(grossRevenue.toFixed(2)),
    totalCostUsd: totalCost,
    netProfitUsd: netProfit,
    maintenanceReserveUsd: Number(wearReserve.toFixed(2)),
    pilotAccrualUsd: pilotAccrual,
    airlineRevenueUsd: Number(grossRevenue.toFixed(2)),
    airlineCostUsd: totalCost,
    wearPercent,
    ticketRevenueUsd: Number(ticketRevenue.toFixed(2)),
    cargoRevenueUsd: Number(cargoRevenue.toFixed(2)),
    notes: isCargo ? ["Economia cargo final aplicada."] : ["Economia pasajeros final aplicada."],
  };
}
