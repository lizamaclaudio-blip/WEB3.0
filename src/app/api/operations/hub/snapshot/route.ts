import { acarsJson } from "@/lib/acars/api-response";
import { loadPublicHubs } from "@/lib/crew/server-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  try {
    const hubs = await loadPublicHubs();
    return acarsJson(200, {
      ok: true,
      code: "HUB_SNAPSHOT_OK",
      message: "Snapshot de hubs cargado.",
      extra: { snapshot: { hubs, updatedAt: new Date().toISOString() } },
    });
  } catch (error) {
    return acarsJson(500, {
      ok: false,
      code: "HUB_SNAPSHOT_FAILED",
      message: "No se pudo cargar hubs.",
      details: error instanceof Error ? error.message : "HUB_SNAPSHOT_FAILED",
    });
  }
}

