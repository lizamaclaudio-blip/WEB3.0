import type { NextRequest } from "next/server";
import { acarsJson } from "@/lib/acars/api-response";
import { loadCrewCenterData } from "@/lib/crew/server-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 15;

export async function GET(request: NextRequest) {
  try {
    const snapshot = await loadCrewCenterData(request);
    return acarsJson(200, {
      ok: true,
      code: "DASHBOARD_SNAPSHOT_OK",
      message: "Snapshot dashboard cargado.",
      status: "ACARS_READY",
      extra: { snapshot },
    });
  } catch (error) {
    return acarsJson(401, {
      ok: false,
      code: "DASHBOARD_SNAPSHOT_FAILED",
      message: error instanceof Error ? error.message : "No autenticado.",
    });
  }
}

