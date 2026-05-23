import { acarsJson } from "@/lib/acars/api-response";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { listAvailableAircraft, listAvailableRoutes, resolveOperationalContext } from "@/lib/dispatch/neon-ops";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 20;

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedPilot(bearerToken(request));
    if (!user) return acarsJson(401, { ok: false, code: "UNAUTHORIZED", message: "No autenticado." });

    const context = await resolveOperationalContext(user);
    if (!context.ok) {
      return acarsJson(409, {
        ok: false,
        code: context.error,
        message: "No se pudo resolver el contexto operacional del piloto.",
      });
    }

    const fleet = await listAvailableAircraft(user);
    const routesData = await listAvailableRoutes(user, fleet);

    return acarsJson(200, {
      ok: true,
      code: "DISPATCH_CATALOG_SNAPSHOT_OK",
      message: "Catalogo de despacho cargado.",
      status: "ACARS_READY",
      extra: {
        snapshot: {
          originAirport: routesData.origin,
          routes: routesData.routes,
          fleet,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    return acarsJson(500, {
      ok: false,
      code: "DISPATCH_CATALOG_SNAPSHOT_FAILED",
      message: "No se pudo cargar catalogo de despacho.",
      details: error instanceof Error ? error.message : "DISPATCH_CATALOG_SNAPSHOT_FAILED",
    });
  }
}

