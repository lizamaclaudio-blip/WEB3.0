import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import {
  createTrainingFreeReservation,
  expireTrainingReservations,
  getTrainingReservationErrorCode,
  getTrainingReservationErrorDetails,
} from "@/lib/dispatch/training-reservations";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const code = getTrainingReservationErrorCode(error);
  const details = getTrainingReservationErrorDetails(error);
  const messageByCode: Record<string, string> = {
    ORIGIN_REQUIRED: "Selecciona el origen del entrenamiento.",
    DESTINATION_REQUIRED: "Selecciona el destino del entrenamiento.",
    AIRCRAFT_REQUIRED: "Selecciona una aeronave para el despacho.",
    AIRCRAFT_ID_REQUIRED: "Selecciona una aeronave valida para el despacho.",
    ROUTE_ID_REQUIRED: "Selecciona una ruta oficial valida para el despacho.",
    ORIGIN_NOT_FOUND: "El aeropuerto de origen no existe o no esta activo.",
    DESTINATION_NOT_FOUND: "El aeropuerto de destino no existe o no esta activo.",
    AIRCRAFT_NOT_ALLOWED_FOR_PILOT: "La aeronave no esta disponible para tu rango, ubicacion operacional o tipo de despacho.",
    ACTIVE_RESERVATION_EXISTS: "Ya tienes una reserva activa para otra ruta. Cancelala o enviala a ACARS.",
    AIRCRAFT_RESERVED_BY_OTHER: "Esta aeronave ya esta reservada por otro piloto.",
    ACTIVE_FLIGHT_IN_PROGRESS: "Tienes un vuelo activo en progreso. Finaliza o evalua el vuelo actual antes de crear uno nuevo.",
    TRAINING_RESERVATION_FAILED: "Error al crear la reserva temporal. Intenta nuevamente.",
    DB_TRANSACTION_FAILED: "Error de base de datos al crear la reserva. Contacte soporte.",
  };

  // Usar mensaje específico de details si está disponible, sino el genérico
  const specificMessage = details?.message || details?.error;
  const message = specificMessage || messageByCode[code] || messageByCode["TRAINING_RESERVATION_FAILED"];
  const statusByCode: Record<string, number> = {
    ACTIVE_RESERVATION_EXISTS: 409,
    ACTIVE_FLIGHT_IN_PROGRESS: 409,
    AIRCRAFT_RESERVED_BY_OTHER: 409,
  };
  console.error(`[training-reservations] Error ${code}: ${message}`, error);
  return NextResponse.json(
    { ok: false, code, error: message, message, details },
    { status: statusByCode[code] ?? 400 },
  );
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
      routeCode: body.routeCode as string | null,
      aircraftId: body.aircraftId as string | null,
      aircraftCode: body.aircraftCode as string | null,
      aircraftRegistration: body.aircraftRegistration as string | null,
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
      simbriefOfp:
        body.simbriefOfp && typeof body.simbriefOfp === "object"
          ? (body.simbriefOfp as Record<string, unknown>)
          : null,
    });

    return NextResponse.json({
      ok: true,
      reservation,
      reservationId: reservation.id,
      dispatchToken: reservation.dispatch_token,
      expiresAt: reservation.expires_at,
      status: reservation.status,
      reusedExistingReservation: reservation.reusedExistingReservation,
      aircraft: reservation.aircraft,
      route: reservation.route,
    });
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
