import { NextResponse } from "next/server";
import { claimTrainingReservationForAcars } from "@/lib/dispatch/training-reservations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "ACARS_DISPATCH_CLAIM_FAILED";
  const messageByCode: Record<string, string> = {
    RESERVATION_REQUIRED: "Falta el ID de reserva.",
    DISPATCH_TOKEN_REQUIRED: "Falta el token seguro de despacho.",
    RESERVATION_NOT_FOUND: "El despacho no existe.",
    DISPATCH_TOKEN_INVALID: "El token de despacho no es valido.",
    RESERVATION_EXPIRED: "La reserva temporal vencio. Crea una nueva reserva.",
    ACARS_NOT_READY: "El despacho aun no fue preparado para ACARS desde la web.",
    ACARS_PAYLOAD_MISSING: "El payload ACARS no esta preparado. Vuelve a presionar Enviar a ACARS en la web.",
    RESERVATION_NOT_READY: "El despacho no esta disponible para ACARS.",
  };

  const statusByCode: Record<string, number> = {
    RESERVATION_NOT_FOUND: 404,
    DISPATCH_TOKEN_INVALID: 403,
    RESERVATION_EXPIRED: 410,
    ACARS_NOT_READY: 409,
    ACARS_PAYLOAD_MISSING: 409,
  };

  return NextResponse.json(
    { ok: false, error: code, message: messageByCode[code] ?? "No se pudo reclamar el despacho ACARS." },
    { status: statusByCode[code] ?? 400 },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const dispatch = await claimTrainingReservationForAcars({
      reservationId: String(body.reservationId ?? body.reservation_id ?? ""),
      dispatchToken: String(body.dispatchToken ?? body.dispatch_token ?? ""),
      acarsVersion: typeof body.acarsVersion === "string" ? body.acarsVersion : typeof body.acars_version === "string" ? body.acars_version : null,
      clientName: typeof body.clientName === "string" ? body.clientName : typeof body.client_name === "string" ? body.client_name : "PatagoniaWingsACARS",
    });

    return NextResponse.json({
      ok: true,
      status: "ACARS_CLAIMED",
      message: "Despacho entregado a ACARS.",
      dispatch,
    });
  } catch (error) {
    console.error("[acars] dispatch claim failed", error instanceof Error ? error.message : error);
    return errorResponse(error);
  }
}
