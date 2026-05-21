import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { getActiveDispatchReservationForPilot } from "@/lib/dispatch/active-reservations";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  const reservation = await getActiveDispatchReservationForPilot(user);

  return NextResponse.json({
    ok: true,
    hasActiveReservation: Boolean(reservation),
    reservation,
    updatedAt: new Date().toISOString(),
  });
}
