import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { createTrainingFreeReservation, expireTrainingReservations } from "@/lib/dispatch/training-reservations";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "TRAINING_RESERVATION_FAILED";
  const messageByCode: Record<string, string> = {
    ORIGIN_REQUIRED: "Selecciona el origen del entrenamiento.",
    DESTINATION_REQUIRED: "Selecciona el destino del entrenamiento.",
    AIRCRAFT_REQUIRED: "Selecciona una aeronave para el despacho.",
    ORIGIN_NOT_FOUND: "El aeropuerto de origen no existe o no esta activo.",
    DESTINATION_NOT_FOUND: "El aeropuerto de destino no existe o no esta activo.",
    AIRCRAFT_NOT_ALLOWED_FOR_PILOT: "La aeronave no esta disponible para tu rango, ubicacion operacional o tipo de despacho.",
    ACTIVE_RESERVATION_EXISTS: "Ya tienes una reserva activa. Finaliza o cancela la actual antes de crear una nueva.",
    ACTIVE_FLIGHT_IN_PROGRESS: "Tienes un vuelo activo en progreso. Finaliza o evalua el vuelo actual antes de crear uno nuevo.",
    TRAINING_RESERVATION_FAILED: "Error al crear la reserva temporal. Intenta nuevamente.",
    DB_TRANSACTION_FAILED: "Error de base de datos al crear la reserva. Contacte soporte.",
  };

  const message = messageByCode[code] || messageByCode["TRAINING_RESERVATION_FAILED"];
  console.error(`[training-reservations] Error ${code}: ${message}`, error);
  return NextResponse.json({ ok: false, error: code, message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const token = await getSessionTokenFromCookies();
    const user = await getAuthenticatedPilot(token);
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const reservation = await createTrainingFreeReservation(user, {
      operationType: body.operationType as string | null,
      routeId: body.routeId as string | null,
      aircraftId: body.aircraftId as string | null,
      originIdent: String(body.originIdent ?? ""),
      destinationIdent: String(body.destinationIdent ?? ""),
      alternateIdent: body.alternateIdent as string | null,
      departureTime: body.departureTime as string | null,
      flightLevel: body.flightLevel as string | null,
      routeText: body.routeText as string | null,
      passengerCount: Number(body.passengerCount ?? 0),
      cargoKg: Number(body.cargoKg ?? 0),
      fuelKg: Number(body.fuelKg ?? 0),
      fuelPolicy: body.fuelPolicy as string | null,
    });

    return NextResponse.json({ ok: true, reservation });
  } catch (error) {
    console.error("[training] temp reservation failed", error instanceof Error ? error.message : error);
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    await expireTrainingReservations();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[training] expire failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "EXPIRE_FAILED" }, { status: 500 });
  }
}
