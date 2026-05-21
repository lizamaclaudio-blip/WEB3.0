import { NextRequest, NextResponse } from "next/server";
import { calculateFlightEconomyEstimate } from "@/lib/economy";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const routeId = request.nextUrl.searchParams.get("routeId") ?? "";
  const aircraftCode = request.nextUrl.searchParams.get("aircraftCode") ?? undefined;

  if (!routeId.trim()) {
    return NextResponse.json({ ok: false, error: "routeId requerido." }, { status: 400 });
  }

  const estimate = calculateFlightEconomyEstimate({ routeId, aircraftCode });
  return NextResponse.json({
    ok: estimate.economyEligible,
    estimate,
    source: "local-economy-catalog",
    updatedAt: new Date().toISOString(),
  });
}
