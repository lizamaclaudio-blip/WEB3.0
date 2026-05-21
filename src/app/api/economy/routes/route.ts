import { NextResponse } from "next/server";
import {
  getCargoEconomyEstimates,
  getOperationalEconomyEstimates,
  getPassengerEconomyEstimates,
} from "@/lib/economy";
import { getEconomyRouteProfiles } from "@/lib/economy/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getEconomyRouteProfiles();
    const passenger = result.rows.filter((row) => row.flight_type === "itinerary");
    const cargo = result.rows.filter((row) => row.flight_type === "cargo");

    return NextResponse.json({
      ok: true,
      routes: result.rows,
      passengerRoutes: passenger,
      cargoRoutes: cargo,
      totals: {
        passengerRoutes: passenger.length,
        cargoRoutes: cargo.length,
        totalRoutes: result.rows.length,
      },
      source: "db",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    const passengerRoutes = getPassengerEconomyEstimates();
    const cargoRoutes = getCargoEconomyEstimates();
    return NextResponse.json({
      ok: true,
      routes: getOperationalEconomyEstimates(),
      passengerRoutes,
      cargoRoutes,
      totals: {
        passengerRoutes: passengerRoutes.length,
        cargoRoutes: cargoRoutes.length,
        totalRoutes: passengerRoutes.length + cargoRoutes.length,
      },
      source: "local-fallback",
      updatedAt: new Date().toISOString(),
    });
  }
}
