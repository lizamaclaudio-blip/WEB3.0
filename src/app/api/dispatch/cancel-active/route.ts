import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { cancelActiveDispatchReservationForPilot } from "@/lib/dispatch/active-reservations";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { reservationId?: string };
  const reservationId = String(body.reservationId ?? "").trim();

  if (!reservationId) {
    return NextResponse.json({ ok: false, error: "Reserva no informada." }, { status: 400 });
  }

  try {
    const cancelled = await cancelActiveDispatchReservationForPilot(user, reservationId);
    return NextResponse.json({
      ok: true,
      cancelled: true,
      reservationId: cancelled.id,
      previousState: cancelled.status,
      state: "CANCELLED",
      reservation: cancelled,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo anular el despacho.";
    const status = message === "RESERVATION_CANNOT_BE_CANCELLED" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
