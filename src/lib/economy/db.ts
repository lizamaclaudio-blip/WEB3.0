import "server-only";
import { dbOne, dbQuery } from "@/lib/db/client";
import type { FlightEconomyEstimate, ProgressionExpenseCatalogItem } from "@/lib/economy/types";

export async function getAirlineEconomyAccount() {
  return dbOne<{
    airline_code: string;
    cash_balance_usd: number;
    monthly_revenue_usd: number;
    monthly_cost_usd: number;
    monthly_net_usd: number;
    pilot_accrual_liability_usd: number;
    maintenance_reserve_usd: number;
    currency: string;
  }>(`select airline_code, cash_balance_usd, monthly_revenue_usd, monthly_cost_usd, monthly_net_usd,
      pilot_accrual_liability_usd, maintenance_reserve_usd, currency
    from public.pw3_airline_economy_accounts
    where airline_code = 'PW3'
    limit 1`);
}

export async function getRouteEconomyEstimate(routeId: string, flightType?: string, aircraftCode?: string) {
  return dbOne<{
    route_id: string;
    flight_type: string;
    aircraft_code: string;
    origin: string;
    destination: string;
    distance_nm: number;
    gross_revenue_usd: number;
    total_cost_usd: number;
    net_profit_usd: number;
    pilot_accrual_usd: number;
    maintenance_reserve_usd: number;
    economy_eligible: boolean;
    estimate_payload: Record<string, unknown>;
  }>(
    `select route_id, flight_type, aircraft_code, origin, destination, distance_nm,
      gross_revenue_usd, total_cost_usd, net_profit_usd, pilot_accrual_usd,
      maintenance_reserve_usd, economy_eligible, estimate_payload
    from public.pw3_flight_economy_estimates
    where route_id = $1
      and ($2::text is null or flight_type = $2)
      and ($3::text is null or aircraft_code = $3)
    order by updated_at desc
    limit 1`,
    [routeId, flightType ?? null, aircraftCode ?? null],
  );
}

export async function getEconomyRouteProfiles() {
  return dbQuery<{
    route_id: string;
    origin: string;
    destination: string;
    flight_type: string;
    route_category: string;
    distance_nm: number;
    recommended_aircraft: string | null;
    active: boolean;
  }>(
    `select route_id, origin, destination, flight_type, route_category, distance_nm, recommended_aircraft, active
     from public.pw3_route_economy_profiles
     where active = true
     order by route_id asc`,
  );
}

export async function getProgressionExpenseCatalogDb() {
  const result = await dbQuery<{
    expense_code: string;
    label: string;
    category: string;
    amount_usd: number;
    metadata: Record<string, unknown>;
  }>(
    `select expense_code, label, category, amount_usd, metadata
     from public.pw3_pilot_expense_catalog
     where active = true
     order by expense_code asc`,
  );

  return result.rows.map((row): ProgressionExpenseCatalogItem => ({
    code: row.expense_code,
    label: row.label,
    type: row.category as ProgressionExpenseCatalogItem["type"],
    amountUsd: Number(row.amount_usd ?? 0),
    appliesTo: typeof row.metadata?.appliesTo === "string" ? row.metadata.appliesTo : "No definido",
  }));
}

export function mapDbEstimateToEconomyEstimate(row: {
  route_id: string;
  origin: string;
  destination: string;
  flight_type: string;
  aircraft_code: string;
  distance_nm: number;
  gross_revenue_usd: number;
  total_cost_usd: number;
  net_profit_usd: number;
  pilot_accrual_usd: number;
  maintenance_reserve_usd: number;
  economy_eligible: boolean;
  estimate_payload: Record<string, unknown>;
}): FlightEconomyEstimate {
  const payload = row.estimate_payload ?? {};
  const n = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  const arr = (value: unknown) => (Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []);
  return {
    routeId: row.route_id,
    origin: row.origin,
    destination: row.destination,
    flightType: row.flight_type as FlightEconomyEstimate["flightType"],
    aircraftCode: row.aircraft_code,
    distanceNm: Number(row.distance_nm ?? 0),
    passengerCapacity: n(payload.passengerCapacity),
    estimatedPassengers: n(payload.estimatedPassengers),
    cargoCapacityKg: n(payload.cargoCapacityKg),
    estimatedCargoKg: n(payload.estimatedCargoKg),
    grossRevenueUsd: Number(row.gross_revenue_usd ?? 0),
    fuelCostUsd: n(payload.fuelCostUsd),
    airportFeesUsd: n(payload.airportFeesUsd),
    maintenanceCostUsd: n(payload.maintenanceCostUsd),
    maintenanceReserveUsd: Number(row.maintenance_reserve_usd ?? 0),
    crewCostUsd: n(payload.crewCostUsd),
    cateringCostUsd: n(payload.cateringCostUsd),
    cargoHandlingCostUsd: n(payload.cargoHandlingCostUsd),
    totalCostUsd: Number(row.total_cost_usd ?? 0),
    netProfitUsd: Number(row.net_profit_usd ?? 0),
    pilotAccrualUsd: Number(row.pilot_accrual_usd ?? 0),
    airlineNetUsd: Number((Number(row.net_profit_usd ?? 0) - Number(row.pilot_accrual_usd ?? 0)).toFixed(2)),
    economyEligible: Boolean(row.economy_eligible),
    notes: arr(payload.notes),
    estimatePayload: payload.estimatePayload && typeof payload.estimatePayload === "object"
      ? (payload.estimatePayload as FlightEconomyEstimate["estimatePayload"])
      : undefined,
  };
}
