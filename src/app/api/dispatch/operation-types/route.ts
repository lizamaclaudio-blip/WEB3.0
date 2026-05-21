import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { listOperationTypesForPilot } from "@/lib/dispatch/operation-types";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSessionTokenFromCookies();
    const user = await getAuthenticatedPilot(token);

    if (!user)
      return NextResponse.json(
        { ok: false, error: "No autenticado." },
        { status: 401 },
      );

    const { operationTypes, permissions } =
      await listOperationTypesForPilot(user);
    console.info(
      `[dispatch] operation types ok callsign=${user.callsign ?? "N/A"} count=${operationTypes.length}`,
    );

    return NextResponse.json({
      ok: true,
      rank_code: user.rankCode,
      permissions,
      operation_types: operationTypes,
    });
  } catch (error) {
    console.error(
      "[dispatch] operation types failed",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { ok: false, error: "OPERATION_TYPES_FAILED" },
      { status: 500 },
    );
  }
}
