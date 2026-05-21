import { NextRequest, NextResponse } from "next/server";
import { getEconomyLedger } from "@/lib/economy/ledger-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(200, limitValue)) : 50;

  try {
    const result = await getEconomyLedger(limit);
    return NextResponse.json({
      ok: true,
      entries: result.rows,
      total: result.rows.length,
      source: "db",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "No disponible.",
      entries: [],
      total: 0,
      source: "unavailable",
      updatedAt: new Date().toISOString(),
    });
  }
}
