import { acarsJson } from "@/lib/acars/api-response";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { getAirlineEconomyAccount } from "@/lib/economy/db";
import { getPilotWallet } from "@/lib/economy/wallet-db";
import { getPilotLedger } from "@/lib/economy/ledger-db";

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
    const [airline, wallet, ledger] = await Promise.all([
      getAirlineEconomyAccount(),
      getPilotWallet(user.userId, user.callsign),
      getPilotLedger(user.userId, user.callsign, 10),
    ]);
    return acarsJson(200, {
      ok: true,
      code: "ECONOMY_SNAPSHOT_OK",
      message: "Snapshot de economia cargado.",
      extra: {
        snapshot: {
          airline,
          wallet,
          ledger,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    return acarsJson(500, {
      ok: false,
      code: "ECONOMY_SNAPSHOT_FAILED",
      message: "No se pudo cargar snapshot de economia.",
      details: error instanceof Error ? error.message : "ECONOMY_SNAPSHOT_FAILED",
    });
  }
}

