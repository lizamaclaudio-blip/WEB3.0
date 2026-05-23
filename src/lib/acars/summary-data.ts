import "server-only";
import { dbOne, dbQuery } from "@/lib/db/client";

type JsonRow = Record<string, unknown>;

export type EvaluationPenaltyView = {
  code: string;
  severity: string;
  points: number;
  message: string;
  createdAt?: string | null;
};

export type EvaluationCategoryView = {
  key: string;
  label: string;
  score: number;
  weight: number;
  description: string;
};

export type FlightEvaluationSummaryData = {
  reservationId: string;
  found: boolean;
  reservation: JsonRow | null;
  evaluation: JsonRow | null;
  evidence: JsonRow | null;
  report: JsonRow | null;
  penalties: EvaluationPenaltyView[];
  observations: string[];
  timeline: Array<{ type: string; at?: string | null; message?: string | null; severity?: string | null }>;
  flight: {
    flightRef: string;
    pilotCallsign: string;
    aircraft: string;
    aircraftModel: string;
    origin: string;
    destination: string;
    landing: string;
    alternate: string;
    routeText: string;
    operationType: string;
    finalStatus: string;
    dispatchStatus: string;
    acarsState: string;
    payloadVersion: string;
    createdAt: string;
    updatedAt: string;
  };
  metrics: {
    totalScore: number;
    operationalScore: number;
    procedureScore: number;
    performanceScore: number;
    safetyScore: number;
    economyScore: number;
    blockMinutes: number;
    flightMinutes: number;
    distanceNm: number;
    fuelUsedKg: number;
    touchdownVsFpm: number | null;
    touchdownGs: number | null;
    telemetrySamplesCount: number;
    blackboxFrames: number;
    penaltiesCount: number;
  };
  categories: EvaluationCategoryView[];
  integrity: {
    blackboxReceived: boolean;
    airborneDetected: boolean;
    touchdownDetected: boolean;
    enoughFrames: boolean;
    evaluationStatus: string;
    economyStatus: string;
  };
};

function asRecord(value: unknown): JsonRow {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRow) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function upper(value: unknown, fallback = ""): string {
  return text(value, fallback).toUpperCase();
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstText(values: unknown[], fallback = ""): string {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return fallback;
}

function nested(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const key of path) {
    const record = asRecord(cursor);
    if (!(key in record)) return undefined;
    cursor = record[key];
  }
  return cursor;
}

function normalizeAirportLike(value: unknown, fallback = "Sin alternativo"): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[object Object]" || trimmed === "[OBJECT OBJECT]") return fallback;
    return trimmed.toUpperCase();
  }

  const record = asRecord(value);
  const candidate = firstText([
    record.icao,
    record.icao_code,
    record.ident,
    record.id,
    record.code,
    record.name,
  ]);

  return candidate ? candidate.toUpperCase() : fallback;
}

function normalizeRouteText(value: unknown, origin: string, destination: string): string {
  const originCode = origin.toUpperCase();
  const destinationCode = destination.toUpperCase();

  if (typeof value === "string") {
    const clean = value.trim().replace(/\s+/g, " ").toUpperCase();
    if (!clean || clean === "[OBJECT OBJECT]") return originCode && destinationCode ? `${originCode} DCT ${destinationCode}` : "Ruta directa";
    if (destinationCode && clean === destinationCode) return originCode ? `${originCode} DCT ${destinationCode}` : `DCT ${destinationCode}`;
    if (originCode && destinationCode && clean === `${originCode}-${destinationCode}`) return `${originCode} DCT ${destinationCode}`;
    return clean;
  }

  const record = asRecord(value);
  const fromObject = firstText([
    record.route,
    record.route_text,
    record.routeString,
    record.nav_route,
    record.simbrief_route,
    record.ofp_route,
  ]);
  if (fromObject) return normalizeRouteText(fromObject, originCode, destinationCode);

  return originCode && destinationCode ? `${originCode} DCT ${destinationCode}` : "Ruta directa";
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonRecord(value: unknown): JsonRow {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as JsonRow;
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return {};
}

function eventType(value: unknown): string {
  const record = asRecord(value);
  return upper(record.type ?? record.event ?? record.name ?? record.code);
}

function eventAt(value: unknown): string | null {
  const record = asRecord(value);
  return text(record.at ?? record.timestamp ?? record.time ?? record.created_at, "") || null;
}

function eventMessage(value: unknown): string | null {
  const record = asRecord(value);
  return text(record.message ?? record.detail ?? record.description, "") || null;
}

function collectTimeline(payload: JsonRow, evidence: JsonRow): FlightEvaluationSummaryData["timeline"] {
  const raw = asRecord(payload.raw);
  const blackbox = asRecord(raw.blackbox);
  const directEvents = parseJsonArray(payload.events);
  const rawEvents = parseJsonArray(raw.events);
  const blackboxEvents = parseJsonArray(blackbox.events);
  const evidenceEvents = parseJsonArray(evidence.eventDetails ?? evidence.events);
  const merged = [...directEvents, ...rawEvents, ...blackboxEvents, ...evidenceEvents];
  const seen = new Set<string>();

  return merged
    .map((event) => {
      const type = eventType(event);
      if (!type) return null;
      const at = eventAt(event);
      const message = eventMessage(event);
      const severity = text(asRecord(event).severity, "") || null;
      const key = `${type}|${at ?? ""}|${message ?? ""}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { type, at, message, severity };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .slice(0, 120);
}

async function safeOne<T extends JsonRow>(sql: string, params: readonly unknown[]): Promise<T | null> {
  try {
    return await dbOne<T>(sql, params);
  } catch (error) {
    console.warn("[acars-summary] query failed", error instanceof Error ? error.message : error);
    return null;
  }
}

async function safeRows<T extends JsonRow>(sql: string, params: readonly unknown[]): Promise<T[]> {
  try {
    const result = await dbQuery<T>(sql, params);
    return result.rows;
  } catch (error) {
    console.warn("[acars-summary] query failed", error instanceof Error ? error.message : error);
    return [];
  }
}

function buildObservations(evaluation: JsonRow, evidence: JsonRow): string[] {
  const raw = parseJsonArray(evaluation.observations);
  const evidenceObs = parseJsonArray(evidence.observations);
  return [...raw, ...evidenceObs]
    .map((item) => text(item))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function normalizePenalty(row: JsonRow): EvaluationPenaltyView {
  return {
    code: upper(row.code, "OBSERVATION"),
    severity: upper(row.severity, "INFO"),
    points: num(row.points, 0),
    message: text(row.message, "Observación operacional"),
    createdAt: text(row.created_at, "") || null,
  };
}

export async function getFlightEvaluationSummaryData(reservationId: string): Promise<FlightEvaluationSummaryData> {
  const id = reservationId.trim();

  const reservationRow = await safeOne<{ row: JsonRow }>(
    `select to_jsonb(t) as row
       from public.training_dispatch_reservations t
      where t.id = $1::uuid
      limit 1`,
    [id],
  );

  const evaluationRow = await safeOne<{ row: JsonRow }>(
    `select to_jsonb(e) as row
       from public.acars_evaluations e
      where e.reservation_id = $1::uuid
      limit 1`,
    [id],
  );

  const evidenceRow = await safeOne<{ row: JsonRow }>(
    `select to_jsonb(ev) as row
       from public.acars_evaluation_evidence ev
      where ev.reservation_id = $1::uuid
      limit 1`,
    [id],
  );

  const reportRow = await safeOne<{ row: JsonRow }>(
    `select to_jsonb(r) as row
       from public.pw3_flight_reports r
      where r.reservation_id = $1::uuid
      limit 1`,
    [id],
  );

  const penaltyRows = await safeRows<{ row: JsonRow }>(
    `select to_jsonb(p) as row
       from public.acars_evaluation_penalties p
      where p.reservation_id = $1::uuid
      order by p.points desc, p.created_at asc`,
    [id],
  );

  const reservation = reservationRow?.row ?? null;
  const evaluation = evaluationRow?.row ?? null;
  const evidenceContainer = evidenceRow?.row ?? null;
  const evidence = parseJsonRecord(evidenceContainer?.evidence);
  const report = reportRow?.row ?? null;
  const payload = parseJsonRecord(reservation?.acars_finalize_payload ?? reservation?.prepared_acars_payload ?? report?.pirep_payload);
  const summary = parseJsonRecord(reservation?.acars_finalize_summary);
  const actual = asRecord(payload.actual);
  const planned = asRecord(payload.planned);
  const raw = asRecord(payload.raw);
  const blackbox = asRecord(raw.blackbox);
  const blackboxSummary = asRecord(blackbox.summary ?? evidence.blackboxSummary);

  const origin = upper(firstText([reservation?.origin_ident, payload.origin, report?.origin_ident, nested(payload, ["route", "origin"])]), "----");
  const destination = upper(firstText([reservation?.destination_ident, payload.destination, report?.destination_ident, nested(payload, ["route", "destination"])]), "----");
  const landing = upper(firstText([reservation?.actual_landing_airport, actual.landingAirport, report?.landing_ident, destination]), destination);

  const routeText = normalizeRouteText(
    firstText([
      planned.route,
      payload.route,
      nested(payload, ["simbrief", "route"]),
      nested(payload, ["ofp", "route"]),
      nested(raw, ["route"]),
      destination,
    ]),
    origin,
    destination,
  );

  const alternate = normalizeAirportLike(
    planned.alternate ??
      planned.alternateIdent ??
      payload.alternate ??
      nested(payload, ["simbrief", "alternate"]) ??
      nested(payload, ["ofp", "alternate"]) ??
      nested(raw, ["alternate"]),
    "Sin alternativo",
  );

  const observations = buildObservations(evaluation ?? {}, evidence);
  const penalties = penaltyRows.map((row) => normalizePenalty(row.row));
  const timeline = collectTimeline(payload, evidence);
  const eventTypes = new Set([
    ...timeline.map((event) => event.type),
    ...parseJsonArray(evidence.eventTypes).map((event) => upper(event)),
  ]);

  const totalScore = num(evaluation?.total_score ?? summary.score, 0);
  const operationalScore = num(evaluation?.operational_score, totalScore);
  const procedureScore = num(evaluation?.procedure_score, totalScore);
  const performanceScore = num(evaluation?.performance_score, totalScore);
  const safetyScore = num(evaluation?.safety_score, totalScore);
  const economyScore = num(evaluation?.economy_score, totalScore);
  const blockMinutes = num(reservation?.actual_block_minutes ?? report?.block_time_minutes ?? actual.blockTimeMinutes, 0);
  const flightMinutes = num(reservation?.actual_flight_minutes ?? report?.flight_time_minutes ?? actual.flightTimeMinutes, 0);
  const distanceNm = num(report?.distance_nm ?? actual.distanceNm ?? planned.distanceNm ?? evidence.distanceNm, 0);
  const fuelUsedKg = num(reservation?.actual_fuel_used_kg ?? actual.fuelUsedKg ?? evidence.fuelUsedKg, 0);
  const touchdownVs = actual.touchdownVsFpm ?? evidence.touchdownVs;
  const touchdownGs = actual.touchdownGs ?? evidence.touchdownG;
  const telemetrySamplesCount = num(evidence.telemetrySamplesCount ?? asArray(raw.telemetrySamples).length, 0);
  const blackboxFrames = num(evidence.blackboxFrameCount ?? blackboxSummary.frameCount, 0);

  const categories: EvaluationCategoryView[] = [
    { key: "safety", label: "Seguridad", score: safetyScore, weight: 30, description: "Crash, stall, overspeed, telemetría imposible, payload manipulado y cierre en aeropuerto correcto." },
    { key: "procedure", label: "Procedimientos", score: procedureScore, weight: 25, description: "Uso de luces, frenos, puertas, motores, taxi, pista, parking y cierre operacional." },
    { key: "performance", label: "Performance", score: performanceScore, weight: 20, description: "Taxi speed, takeoff, tasas de ascenso/descenso, touchdown, G-force y estabilidad." },
    { key: "operational", label: "Operación", score: operationalScore, weight: 15, description: "Despacho, ruta, destino/alternativo, consistencia del timeline y datos ACARS live." },
    { key: "economy", label: "Economía", score: economyScore, weight: 10, description: "Combustible, payload, costos, utilidad, mantenimiento y pago virtual del piloto." },
  ];

  return {
    reservationId: id,
    found: Boolean(reservation || evaluation || report),
    reservation,
    evaluation,
    evidence,
    report,
    penalties,
    observations,
    timeline,
    flight: {
      flightRef: upper(firstText([reservation?.assigned_callsign, reservation?.assigned_flight_number, payload.flightNumber, report?.flight_type], "Vuelo ACARS")),
      pilotCallsign: upper(firstText([reservation?.pilot_callsign, evaluation?.pilot_callsign, payload.pilotCallsign], "PWG")),
      aircraft: upper(firstText([reservation?.aircraft_registration, payload.aircraftRegistration, payload.aircraftCode, report?.aircraft_code], "N/D")),
      aircraftModel: upper(firstText([reservation?.aircraft_model_code, payload.aircraftCode, report?.aircraft_code], "N/D")),
      origin,
      destination,
      landing,
      alternate,
      routeText,
      operationType: upper(firstText([reservation?.operation_type, payload.operationType, report?.operation_type], "TRAINING")),
      finalStatus: upper(firstText([reservation?.final_status, payload.finalStatus, report?.final_status], "PENDING")),
      dispatchStatus: upper(firstText([reservation?.status], "PENDING")),
      acarsState: upper(firstText([reservation?.acars_state], "PENDING")),
      payloadVersion: text(reservation?.payload_version ?? payload.payloadVersion, "N/D"),
      createdAt: text(reservation?.created_at ?? report?.created_at, ""),
      updatedAt: text(reservation?.updated_at ?? report?.updated_at, ""),
    },
    metrics: {
      totalScore,
      operationalScore,
      procedureScore,
      performanceScore,
      safetyScore,
      economyScore,
      blockMinutes,
      flightMinutes,
      distanceNm,
      fuelUsedKg,
      touchdownVsFpm: touchdownVs === undefined || touchdownVs === null || touchdownVs === "" ? null : num(touchdownVs, 0),
      touchdownGs: touchdownGs === undefined || touchdownGs === null || touchdownGs === "" ? null : num(touchdownGs, 0),
      telemetrySamplesCount,
      blackboxFrames,
      penaltiesCount: penalties.length || num(evaluation?.penalties_count, 0),
    },
    categories,
    integrity: {
      blackboxReceived: blackboxFrames > 0 || Object.keys(blackbox).length > 0 || Object.keys(evidence).length > 0,
      airborneDetected: eventTypes.has("AIRBORNE"),
      touchdownDetected: eventTypes.has("TOUCHDOWN"),
      enoughFrames: blackboxFrames >= 5 || telemetrySamplesCount >= 5,
      evaluationStatus: upper(firstText([evaluation?.evaluation_status], "PENDING_EVALUATION")),
      economyStatus: upper(firstText([evaluation?.economy_status], "PENDING_EVALUATION")),
    },
  };
}
