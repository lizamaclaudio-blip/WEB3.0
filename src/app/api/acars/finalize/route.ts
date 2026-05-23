import { NextResponse } from "next/server";
import { calculateRealEconomyFromFinalize } from "@/lib/acars/finalize-economy";
import { writeFinalizeLedger } from "@/lib/acars/finalize-ledger";
import { validateAcarsFinalizePayload, normalizeFinalizePayload } from "@/lib/acars/finalize-schema";
import { calculateFlightScore } from "@/lib/acars/finalize-score";
import {
  acquireFinalizeLock,
  closeDispatchReservation,
  ensureAcarsFinalizeSchema,
  findDispatchForFinalize,
  getDispatchReservationById,
  isAlreadyFinalized,
  upsertAcarsEvaluation,
  upsertFlightReport,
  updatePilotAndAircraftPosition,
  validateFinalizeToken,
} from "@/lib/acars/finalize-reservation";
import { buildFinalizeSummary, buildSummaryUrl } from "@/lib/acars/finalize-summary";
import { acarsJson } from "@/lib/acars/api-response";
import { evaluateFinalizePayload } from "@/lib/acars/evaluation-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function error(status: number, code: string, message: string, details?: unknown) {
  return acarsJson(status, { ok: false, code, message, details });
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

    // Intento 1: lookup directo por reservationId
    let reservation = payload.reservationId
      ? await getDispatchReservationById(payload.reservationId)
      : null;

    // Intento 2: fallback lookup por piloto/aeronave/ruta si no se encontró por ID
    if (!reservation) {
      console.warn(`[acars-finalize] reservationId ${payload.reservationId} not found, trying fallback lookup for pilot ${payload.pilotCallsign}`);
      reservation = await findDispatchForFinalize({
        pilotCallsign: payload.pilotCallsign,
        reservationId: payload.reservationId,
        dispatchToken: payload.dispatchToken,
        aircraftCode: payload.aircraftCode,
        origin: payload.origin,
        destination: payload.destination,
      });
    }

    if (!reservation) {
      return error(404, "NO_ACTIVE_DISPATCH_OR_REPORT", "No se encontró un despacho o vuelo activo para finalizar. Verifica que el vuelo haya sido despachado desde la Web antes de cerrar.");
    }

    // Asegurar que el piloto coincide
    const reservationCallsign = String(reservation.pilot_callsign ?? '').trim().toUpperCase();
    if (reservationCallsign && reservationCallsign !== payload.pilotCallsign.toUpperCase()) {
      return error(403, "DISPATCH_NOT_OWNED_BY_PILOT", "El despacho pertenece a otro piloto.");
    }

    if (!validateFinalizeToken(reservation, payload.dispatchToken)) {
      return error(403, "DISPATCH_TOKEN_INVALID", "dispatchToken invalido.");
    }

    // Usar siempre el ID real del despacho encontrado (puede diferir del payload si fue fallback lookup)
    const resolvedReservationId = reservation.id || payload.reservationId;
    const summaryUrl = buildSummaryUrl(resolvedReservationId);
    const finalizeIdempotencyKey = `acars_finalize:${resolvedReservationId}`;
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
      return acarsJson(200, {
        ok: true,
        code: "FINALIZE_ALREADY_PROCESSED",
        message: "Finalize ya procesado previamente.",
        status: "COMPLETED",
        evaluationStatus: "PENDING_EVALUATION",
        extra: already as unknown as Record<string, unknown>,
      });
    }

    const locked = await acquireFinalizeLock(resolvedReservationId, finalizeIdempotencyKey);
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
      return acarsJson(200, {
        ok: true,
        code: "FINALIZE_ALREADY_PROCESSED",
        message: "Finalize ya procesado previamente.",
        status: "COMPLETED",
        evaluationStatus: "PENDING_EVALUATION",
        extra: already as unknown as Record<string, unknown>,
      });
    }

    const scoreResult = calculateFlightScore(payload);
    const economy = calculateRealEconomyFromFinalize(payload);
    const evaluation = evaluateFinalizePayload(payload);

    if (["crashed", "aborted", "cancelled"].includes(payload.finalStatus)) {
      economy.economyEligible = false;
      economy.pilotAccrualUsd = 0;
      economy.grossRevenueUsd = 0;
      economy.netProfitUsd = 0;
      economy.airlineRevenueUsd = 0;
    }

    const ledger = await writeFinalizeLedger({
      reservationId: resolvedReservationId,
      routeId: reservation.route_id,
      pilotId: reservation.pilot_user_id,
      callsign: reservation.pilot_callsign ?? payload.pilotCallsign,
      payload,
      economy,
    });

    const landingAirport = payload.actual.landingAirport || (payload.finalStatus === "diverted" ? payload.actual.landingAirport : payload.destination) || reservation.destination_ident;

    const pirepPayload = {
      reservationId: resolvedReservationId,
      pilotCallsign: payload.pilotCallsign,
      aircraftCode: payload.aircraftCode,
      finalStatus: payload.finalStatus,
      score: evaluation.totalScore,
      blockTimeMinutes: payload.actual.blockTimeMinutes ?? 0,
      flightTimeMinutes: payload.actual.flightTimeMinutes ?? 0,
      events: payload.events ?? [],
    };

    const summary = buildFinalizeSummary({
      alreadyProcessed: false,
      reservationClosed: true,
      economyEligible: economy.economyEligible,
      score: evaluation.totalScore,
      summaryUrl,
      ledgerWritten: ledger.ledgerWritten,
      pilotAccrualUsd: ledger.pilotAccrualUsd,
      finalStatus: payload.finalStatus,
      warnings: [...scoreResult.warnings, ...economy.notes, ...evaluation.observations],
    });

    await closeDispatchReservation({
      reservationId: resolvedReservationId,
      finalStatus: payload.finalStatus.toUpperCase(),
      score: evaluation.totalScore,
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
      reservationId: resolvedReservationId,
      pilotUserId: reservation.pilot_user_id,
      pilotCallsign: reservation.pilot_callsign ?? payload.pilotCallsign,
      aircraftCode: payload.aircraftCode,
      origin: payload.origin,
      destination: payload.destination,
      landing: landingAirport,
      operationType: payload.operationType,
      flightType: payload.flightType,
      finalStatus: payload.finalStatus,
      score: evaluation.totalScore,
      blockMinutes: payload.actual.blockTimeMinutes ?? 0,
      flightMinutes: payload.actual.flightTimeMinutes ?? 0,
      distanceNm: payload.actual.distanceNm ?? payload.planned.distanceNm ?? 0,
      pilotAccrualUsd: ledger.pilotAccrualUsd,
      netProfitUsd: economy.netProfitUsd,
      economyPayload: economy as unknown as Record<string, unknown>,
      pirepPayload,
    });

    await upsertAcarsEvaluation({
      reservationId: resolvedReservationId,
      pilotUserId: reservation.pilot_user_id,
      pilotCallsign: reservation.pilot_callsign ?? payload.pilotCallsign,
      evaluationStatus: evaluation.evaluationStatus,
      economyStatus: evaluation.economyStatus,
      operationalScore: evaluation.operationalScore,
      procedureScore: evaluation.procedureScore,
      performanceScore: evaluation.performanceScore,
      safetyScore: evaluation.safetyScore,
      economyScore: evaluation.economyScore,
      totalScore: evaluation.totalScore,
      observations: evaluation.observations,
      penalties: evaluation.penalties,
      evidence: evaluation.evidence,
    });

    return acarsJson(200, {
      ok: true,
      code: "FINALIZE_ACCEPTED",
      message: "Cierre recibido correctamente.",
      status: "REPORT_RECEIVED",
      evaluationStatus: evaluation.evaluationStatus,
      extra: {
        ...(summary as unknown as Record<string, unknown>),
        evaluationStatus: evaluation.evaluationStatus,
        economyStatus: evaluation.economyStatus,
        evaluation: {
          operationalScore: evaluation.operationalScore,
          procedureScore: evaluation.procedureScore,
          performanceScore: evaluation.performanceScore,
          safetyScore: evaluation.safetyScore,
          economyScore: evaluation.economyScore,
          totalScore: evaluation.totalScore,
          penalties: evaluation.penalties,
          observations: evaluation.observations,
        },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "FINALIZE_FAILED";
    console.error("[acars-finalize] failed", message);
    return error(500, "FINALIZE_FAILED", "No se pudo finalizar el vuelo.", message);
  }
}
