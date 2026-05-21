import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { prepareTrainingReservationForAcars } from "@/lib/dispatch/training-reservations";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "ACARS_PREPARE_FAILED";
  const messageByCode: Record<string, string> = {
    RESERVATION_REQUIRED: "Falta el ID de reserva temporal.",
    DISPATCH_TOKEN_REQUIRED: "Falta el token seguro de despacho.",
    DISPATCH_TOKEN_MISSING: "La reserva no tiene token seguro de despacho.",
    RESERVATION_NOT_FOUND: "La reserva temporal no existe o no pertenece a tu usuario.",
    DISPATCH_TOKEN_INVALID: "El token seguro de despacho no coincide con la reserva.",
    RESERVATION_EXPIRED: "La reserva temporal vencio. Vuelve a reservar por 15 minutos.",
    RESERVATION_NOT_READY: "La reserva no esta disponible para enviar a ACARS.",
  };

  const status = code === "RESERVATION_NOT_FOUND" ? 404 : code === "DISPATCH_TOKEN_INVALID" ? 403 : 400;
  return NextResponse.json(
    {
      ok: false,
      code,
      error: messageByCode[code] ?? "No se pudo preparar el despacho para ACARS.",
      message: messageByCode[code] ?? "No se pudo preparar el despacho para ACARS.",
    },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const sessionToken = await getSessionTokenFromCookies();
    const user = await getAuthenticatedPilot(sessionToken);
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const prepared = await prepareTrainingReservationForAcars(user, {
      reservationId: String(body.reservationId ?? ""),
      dispatchToken: typeof body.dispatchToken === "string" ? body.dispatchToken : null,
    });
    const claimUrl = new URL("/api/acars/dispatch/claim", request.url).toString();

    return NextResponse.json({
      ok: true,
      status: "ACARS_READY",
      message: "Despacho listo para ACARS.",
      reservationId: prepared.reservationId,
      dispatchToken: prepared.dispatchToken,
      claimUrl,
      payloadVersion: prepared.payloadVersion,
      expiresAt: prepared.expiresAt,
      acarsPayload: prepared.acarsPayload,
    });
  } catch (error) {
    console.error("[dispatch] acars prepare failed", error instanceof Error ? error.message : error);
    return errorResponse(error);
  }
}
