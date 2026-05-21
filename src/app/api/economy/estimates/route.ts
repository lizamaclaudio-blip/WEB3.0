import { NextRequest, NextResponse } from "next/server";
import { calculateFlightEconomyEstimate } from "@/lib/economy";
import { getRouteEconomyEstimate, mapDbEstimateToEconomyEstimate } from "@/lib/economy/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const routeId = (request.nextUrl.searchParams.get("routeId") ?? "").trim().toUpperCase();
  const flightType = (request.nextUrl.searchParams.get("flightType") ?? "").trim().toLowerCase() || undefined;
  const aircraftCode = (request.nextUrl.searchParams.get("aircraftCode") ?? "").trim().toUpperCase() || undefined;

  if (!routeId) {
    return NextResponse.json({ ok: false, error: "routeId es obligatorio." }, { status: 400 });
  }

  try {
    const dbEstimate = await getRouteEconomyEstimate(routeId, flightType, aircraftCode);
    if (dbEstimate) {
      return NextResponse.json({
        ok: true,
        estimate: mapDbEstimateToEconomyEstimate(dbEstimate),
        source: "db",
        updatedAt: new Date().toISOString(),
      });
    }
    throw new Error("No estimate in DB");
  } catch {
    return NextResponse.json({
      ok: true,
      estimate: calculateFlightEconomyEstimate({ routeId, aircraftCode }),
      source: "local-fallback",
      updatedAt: new Date().toISOString(),
    });
  }
}
