import { NextResponse } from "next/server";
import { calculateRealEconomyFromFinalize } from "@/lib/acars/finalize-economy";
import { writeFinalizeLedger } from "@/lib/acars/finalize-ledger";
import { validateAcarsFinalizePayload, normalizeFinalizePayload } from "@/lib/acars/finalize-schema";
import { calculateFlightScore } from "@/lib/acars/finalize-score";
import {
  acquireFinalizeLock,
  closeDispatchReservation,
  ensureAcarsFinalizeSchema,
  getDispatchReservationById,
  isAlreadyFinalized,
  upsertFlightReport,
  updatePilotAndAircraftPosition,
  validateFinalizeToken,
} from "@/lib/acars/finalize-reservation";
import { buildFinalizeSummary, buildSummaryUrl } from "@/lib/acars/finalize-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function error(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ success: false, error: code, message, details }, { status });
}

export async function POST(request: Request) {
  try {
    await ensureAcarsFinalizeSchema();

    const body = await request.json().catch(() => null);
    const validated = validateAcarsFinalizePayload(body);
    if (!validated.ok) {
      return error(validated.status, "INVALID_FINALIZE_PAYLOAD", "Payload finalize invalido.", validated.errors);
    }

    const payload = normalizeFinalizePayload(validated.payload);
    const reservation = await getDispatchReservationById(payload.reservationId);
    if (!reservation) {
      return error(404, "RESERVATION_NOT_FOUND", "Reserva no encontrada.");
    }

    if (!validateFinalizeToken(reservation, payload.dispatchToken)) {
      return error(403, "DISPATCH_TOKEN_INVALID", "dispatchToken invalido.");
    }

    const summaryUrl = buildSummaryUrl(payload.reservationId);
    const finalizeIdempotencyKey = `acars_finalize:${payload.reservationId}`;
    if (isAlreadyFinalized(reservation)) {
      const already = buildFinalizeSummary({
        alreadyProcessed: true,
        reservationClosed: true,
        economyEligible: false,
        score: Number(reservation.final_status ? 0 : 0),
        summaryUrl,
        ledgerWritten: false,
        pilotAccrualUsd: 0,
        finalStatus: (reservation.final_status?.toLowerCase() as typeof payload.finalStatus) || payload.finalStatus,
        warnings: ["Finalize ya procesado previamente."],
      });
      return NextResponse.json(already);
    }

    const locked = await acquireFinalizeLock(payload.reservationId, finalizeIdempotencyKey);
    if (!locked) {
      const already = buildFinalizeSummary({
        alreadyProcessed: true,
        reservationClosed: true,
        economyEligible: false,
        score: 0,
        summaryUrl,
        ledgerWritten: false,
        pilotAccrualUsd: 0,
        finalStatus: payload.finalStatus,
        warnings: ["Finalize ya procesado previamente."],
      });
      return NextResponse.json(already);
    }

    const scoreResult = calculateFlightScore(payload);
    const economy = calculateRealEconomyFromFinalize(payload);

    if (["crashed", "aborted", "cancelled"].includes(payload.finalStatus)) {
      economy.economyEligible = false;
      economy.pilotAccrualUsd = 0;
      economy.grossRevenueUsd = 0;
      economy.netProfitUsd = 0;
      economy.airlineRevenueUsd = 0;
    }

    const ledger = await writeFinalizeLedger({
      reservationId: payload.reservationId,
      routeId: reservation.route_id,
      pilotId: reservation.pilot_user_id,
      callsign: reservation.pilot_callsign ?? payload.pilotCallsign,
      payload,
      economy,
    });

    const landingAirport = payload.actual.landingAirport || (payload.finalStatus === "diverted" ? payload.actual.landingAirport : payload.destination) || reservation.destination_ident;

    const pirepPayload = {
      reservationId: payload.reservationId,
      pilotCallsign: payload.pilotCallsign,
      aircraftCode: payload.aircraftCode,
      finalStatus: payload.finalStatus,
      score: scoreResult.score,
      blockTimeMinutes: payload.actual.blockTimeMinutes ?? 0,
      flightTimeMinutes: payload.actual.flightTimeMinutes ?? 0,
      events: payload.events ?? [],
    };

    const summary = buildFinalizeSummary({
      alreadyProcessed: false,
      reservationClosed: true,
      economyEligible: economy.economyEligible,
      score: scoreResult.score,
      summaryUrl,
      ledgerWritten: ledger.ledgerWritten,
      pilotAccrualUsd: ledger.pilotAccrualUsd,
      finalStatus: payload.finalStatus,
      warnings: [...scoreResult.warnings, ...economy.notes],
    });

    await closeDispatchReservation({
      reservationId: payload.reservationId,
      finalStatus: payload.finalStatus.toUpperCase(),
      score: scoreResult.score,
      finalizeIdempotencyKey,
      payload: payload as unknown as Record<string, unknown>,
      summary: summary as unknown as Record<string, unknown>,
      economyPayload: economy as unknown as Record<string, unknown>,
      pirepPayload,
      actualBlockMinutes: payload.actual.blockTimeMinutes ?? 0,
      actualFlightMinutes: payload.actual.flightTimeMinutes ?? 0,
      actualFuelUsedKg: payload.actual.fuelUsedKg ?? payload.acarsOperationalInputs.actualFuelUsedKg ?? 0,
      actualLandingAirport: landingAirport,
    });

    await updatePilotAndAircraftPosition({
      pilotUserId: reservation.pilot_user_id,
      aircraftId: reservation.aircraft_id,
      landingIdent: landingAirport,
    }).catch(() => false);

    await upsertFlightReport({
      reservationId: payload.reservationId,
      pilotUserId: reservation.pilot_user_id,
      pilotCallsign: reservation.pilot_callsign ?? payload.pilotCallsign,
      aircraftCode: payload.aircraftCode,
      origin: payload.origin,
      destination: payload.destination,
      landing: landingAirport,
      operationType: payload.operationType,
      flightType: payload.flightType,
      finalStatus: payload.finalStatus,
      score: scoreResult.score,
      blockMinutes: payload.actual.blockTimeMinutes ?? 0,
      flightMinutes: payload.actual.flightTimeMinutes ?? 0,
      distanceNm: payload.actual.distanceNm ?? payload.planned.distanceNm ?? 0,
      pilotAccrualUsd: ledger.pilotAccrualUsd,
      netProfitUsd: economy.netProfitUsd,
      economyPayload: economy as unknown as Record<string, unknown>,
      pirepPayload,
    });

    return NextResponse.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : "FINALIZE_FAILED";
    console.error("[acars-finalize] failed", message);
    return error(500, "FINALIZE_FAILED", "No se pudo finalizar el vuelo.", message);
  }
}
