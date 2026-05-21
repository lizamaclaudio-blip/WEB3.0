import { NextRequest, NextResponse } from "next/server";
import { loadCrewCenterData } from "@/lib/crew/server-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const data = await loadCrewCenterData(request);
    return NextResponse.json({ pilot: data.pilot, source: data.source, updatedAt: data.updatedAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No autenticado." }, { status: 401 });
  }
}
