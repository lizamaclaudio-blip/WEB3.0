import type { AcarsFinalizeEvent, NormalizedFinalizePayload } from "@/lib/acars/finalize-types";

export type TelemetrySignalStatus = "CERTIFIED" | "PARTIAL" | "UNRELIABLE" | "NOT_AVAILABLE" | "NOT_APPLICABLE";

export type TelemetrySignalKey =
  | "BLACKBOX"
  | "TELEMETRY_SAMPLES"
  | "AIRBORNE"
  | "TAKEOFF_ROLL"
  | "TOUCHDOWN"
  | "PARKED"
  | "TAXI"
  | "FUEL"
  | "TOUCHDOWN_VS"
  | "OVERSPEED"
  | "STALL"
  | "PIC_CHECK"
  | "DOORS"
  | "GEAR"
  | "LIGHTS"
  | "TRANSPONDER";

export type TelemetrySignal = {
  key: TelemetrySignalKey;
  label: string;
  status: TelemetrySignalStatus;
  detected: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  sources: string[];
  reason: string;
  evaluable: boolean;
  canPenalize: boolean;
};

export type EvidenceEvent = {
  type: string;
  at?: string | null;
  message?: string | null;
  source?: string | null;
  severity?: string | null;
};

export type AcarsEvidenceReport = {
  signals: TelemetrySignal[];
  eventTypes: string[];
  eventDetails: EvidenceEvent[];
  observations: string[];
  warnings: string[];
  rawFacts: {
    aircraftCode: string;
    origin: string;
    destination: string;
    blackboxFrameCount: number;
    telemetrySamplesCount: number;
    hasPirepXml: boolean;
    takeoffDetected: boolean;
    touchdownDetected: boolean;
    takeoffSources: string[];
    touchdownSources: string[];
    touchdownVsFpm: number | null;
    touchdownG: number | null;
    touchdownCount: number;
    overspeedEvents: number;
    stallEvents: number;
    picFailed: number;
    fuelPlannedKg: number | null;
    fuelUsedKg: number | null;
    fuelRemainingKg: number | null;
    fuelInconsistent: boolean;
  };
};

type AnyRecord = Record<string, unknown>;

function asObj(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const clean = value.trim();
    return clean.length ? clean : fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function upper(value: unknown, fallback = ""): string {
  return text(value, fallback).toUpperCase();
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function maybeNum(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolLike(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const normalized = text(value).toLowerCase();
  return ["true", "1", "yes", "si", "sí", "ok", "detected", "certified"].includes(normalized);
}

function nested(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const key of path) {
    const record = asObj(cursor);
    if (!(key in record)) return undefined;
    cursor = record[key];
  }
  return cursor;
}

function addSource(target: string[], source: string) {
  if (source && !target.includes(source)) target.push(source);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stringifySafe(value: unknown, max = 700_000): string {
  if (typeof value === "string") return value.slice(0, max);
  try {
    return JSON.stringify(value ?? {}).slice(0, max);
  } catch {
    return "";
  }
}

function eventType(value: unknown): string {
  if (typeof value === "string") return value.trim().toUpperCase();
  const record = asObj(value);
  return upper(record.type ?? record.event ?? record.name ?? record.code ?? record.phase);
}

function eventAt(value: unknown): string | null {
  const record = asObj(value);
  return text(record.at ?? record.timestamp ?? record.TimestampUtc ?? record.time ?? record.created_at, "") || null;
}

function eventMessage(value: unknown): string | null {
  const record = asObj(value);
  return text(record.message ?? record.details ?? record.Details ?? record.description ?? record.Description, "") || null;
}

function collectEvents(payload: NormalizedFinalizePayload): EvidenceEvent[] {
  const raw = asObj(payload.raw);
  const blackbox = asObj(raw.blackbox ?? raw.BlackBox);
  const directEvents = asArray(payload.events);
  const rawEvents = asArray(raw.events ?? raw.Events ?? raw.timeline ?? raw.Timeline);
  const blackboxEvents = asArray(blackbox.events ?? blackbox.Events ?? blackbox.timeline ?? blackbox.Timeline);

  const merged = [
    ...directEvents.map((event) => ({ event, source: "payload.events" })),
    ...rawEvents.map((event) => ({ event, source: "raw.events" })),
    ...blackboxEvents.map((event) => ({ event, source: "raw.blackbox.events" })),
  ];

  const seen = new Set<string>();
  const result: EvidenceEvent[] = [];

  for (const item of merged) {
    const type = eventType(item.event);
    const message = eventMessage(item.event);
    const at = eventAt(item.event);
    if (!type && !message) continue;

    const normalizedType = type || upper(message, "EVENT");
    const key = `${normalizedType}|${at ?? ""}|${message ?? ""}|${item.source}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      type: normalizedType,
      at,
      message,
      source: item.source,
      severity: text(asObj(item.event).severity, "") || null,
    });
  }

  return result.slice(0, 500);
}

function collectFrameCount(payload: NormalizedFinalizePayload) {
  const raw = asObj(payload.raw);
  const blackbox = asObj(raw.blackbox ?? raw.BlackBox);
  const summary = asObj(blackbox.summary ?? blackbox.Summary);
  const frames = asArray(blackbox.frames ?? blackbox.Frames);
  const frameCount = num(summary.frameCount ?? summary.FrameCount ?? blackbox.frameCount ?? blackbox.FrameCount, frames.length);
  const telemetrySamplesCount = asArray(raw.telemetrySamples ?? raw.TelemetrySamples ?? raw.samples ?? raw.Samples).length;
  return { blackbox, summary, frames, frameCount, telemetrySamplesCount };
}

function looksLikeC172(aircraftCode: string) {
  return /C172|CESSNA\s*172|SKYHAWK/.test(aircraftCode.toUpperCase());
}

function detectFuelInconsistency(payload: NormalizedFinalizePayload, corpus: string) {
  const planned = maybeNum(payload.planned.fuelPlannedKg);
  const used = maybeNum(payload.actual.fuelUsedKg ?? payload.acarsOperationalInputs.actualFuelUsedKg);
  const remaining = maybeNum(payload.actual.fuelRemainingKg);
  const takeoff = matchNumber(corpus, /<TakeOffFuel>([-\d.,]+)<\/TakeOffFuel>/i);
  const finalFuel = matchNumber(corpus, /<FinalFuel>([-\d.,]+)<\/FinalFuel>/i);
  const spent = matchNumber(corpus, /<SpentFuel>([-\d.,]+)<\/SpentFuel>/i);

  const evidenceUsed = used ?? spent;
  const evidenceRemaining = remaining ?? finalFuel;
  const evidencePlanned = planned ?? takeoff;

  let inconsistent = false;
  if (takeoff !== null && finalFuel !== null && spent !== null) {
    const expectedSpent = Math.max(0, takeoff - finalFuel);
    if (Math.abs(expectedSpent - spent) > Math.max(5, takeoff * 0.2)) inconsistent = true;
  }

  if (evidenceUsed !== null && evidencePlanned !== null && evidenceUsed > evidencePlanned * 3) inconsistent = true;
  if (evidenceUsed !== null && evidenceUsed < 0) inconsistent = true;

  return {
    fuelPlannedKg: evidencePlanned,
    fuelUsedKg: evidenceUsed,
    fuelRemainingKg: evidenceRemaining,
    fuelInconsistent: inconsistent,
  };
}

function matchNumber(corpus: string, pattern: RegExp): number | null {
  const match = corpus.match(pattern);
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSignal(args: {
  key: TelemetrySignalKey;
  label: string;
  detected: boolean;
  status?: TelemetrySignalStatus;
  sources?: string[];
  reason: string;
  evaluable?: boolean;
  canPenalize?: boolean;
  confidence?: TelemetrySignal["confidence"];
}): TelemetrySignal {
  const status = args.status ?? (args.detected ? "CERTIFIED" : "NOT_AVAILABLE");
  const confidence = args.confidence ?? (args.detected ? "HIGH" : "NONE");
  const evaluable = args.evaluable ?? (status === "CERTIFIED" || status === "PARTIAL");
  const canPenalize = args.canPenalize ?? status === "CERTIFIED";

  return {
    key: args.key,
    label: args.label,
    status,
    detected: args.detected,
    confidence,
    sources: unique(args.sources ?? []),
    reason: args.reason,
    evaluable,
    canPenalize,
  };
}

export function collectAcarsEvidence(payload: NormalizedFinalizePayload): AcarsEvidenceReport {
  const raw = asObj(payload.raw);
  const aircraftCode = upper(payload.aircraftCode);
  const { blackbox, summary, frames, frameCount, telemetrySamplesCount } = collectFrameCount(payload);
  const events = collectEvents(payload);
  const eventTypes = unique(events.map((event) => event.type));
  const corpus = `${stringifySafe(payload)} ${stringifySafe(raw)} ${events.map((event) => `${event.type} ${event.message ?? ""}`).join(" ")}`;
  const corpusUpper = corpus.toUpperCase();

  const takeoffSources: string[] = [];
  const touchdownSources: string[] = [];
  const warnings: string[] = [];
  const observations: string[] = [];

  const hasPirepXml = /<PIREP[\s>]/i.test(corpus) || /<FlightPhaseSummary>/i.test(corpus) || /<Vuelo>/i.test(corpus);

  const airborneByPayload = Boolean(payload.airborneAt);
  if (airborneByPayload) addSource(takeoffSources, "payload.airborneAt");
  if (eventTypes.includes("AIRBORNE")) addSource(takeoffSources, "eventTypes.AIRBORNE");
  if (eventTypes.includes("TAKEOFF") || eventTypes.includes("TAKEOFF_ROLL")) addSource(takeoffSources, "eventTypes.TAKEOFF");
  if (/AIRCRAFT BECAME AIRBORNE|\bAIRBORNE\b|<TakeoffDetected>\s*True\s*<\/TakeoffDetected>|TakeoffDetected[\"']?\s*[:=]\s*[\"']?true/i.test(corpus)) addSource(takeoffSources, "xml/text.TakeoffDetected");
  if (boolLike(nested(raw, ["flightPhaseSummary", "takeoffDetected"])) || boolLike(nested(raw, ["FlightPhaseSummary", "TakeoffDetected"]))) addSource(takeoffSources, "raw.FlightPhaseSummary.TakeoffDetected");
  if (frames.some((frame) => !boolLike(asObj(frame).OnGround ?? asObj(frame).onGround) && num(asObj(frame).GroundSpeedKt ?? asObj(frame).groundSpeedKt, 0) > 35)) addSource(takeoffSources, "blackbox.frames.airborne-heuristic");

  const touchdownByPayload = Boolean(payload.landedAt || payload.completedAt);
  if (touchdownByPayload) addSource(touchdownSources, payload.landedAt ? "payload.landedAt" : "payload.completedAt");
  if (eventTypes.includes("TOUCHDOWN")) addSource(touchdownSources, "eventTypes.TOUCHDOWN");
  if (/TOUCHDOWN DETECTED|\bTOUCHDOWN\b|<TouchdownDetected>\s*True\s*<\/TouchdownDetected>|TouchdownDetected[\"']?\s*[:=]\s*[\"']?true/i.test(corpus)) addSource(touchdownSources, "xml/text.TouchdownDetected");
  if (boolLike(nested(raw, ["flightPhaseSummary", "touchdownDetected"])) || boolLike(nested(raw, ["FlightPhaseSummary", "TouchdownDetected"]))) addSource(touchdownSources, "raw.FlightPhaseSummary.TouchdownDetected");
  if (maybeNum(payload.actual.touchdownVsFpm) !== null || maybeNum(payload.acarsOperationalInputs.touchdownVsFpm) !== null) addSource(touchdownSources, "payload.actual.touchdownVsFpm");
  if (matchNumber(corpus, /<CantTouchdowns>([-\d.,]+)<\/CantTouchdowns>/i) !== null && (matchNumber(corpus, /<CantTouchdowns>([-\d.,]+)<\/CantTouchdowns>/i) ?? 0) > 0) addSource(touchdownSources, "xml.Indicadores.CantTouchdowns");
  if (frames.some((frame, index) => index > 0 && boolLike(asObj(frame).OnGround ?? asObj(frame).onGround) && !boolLike(asObj(frames[index - 1]).OnGround ?? asObj(frames[index - 1]).onGround))) addSource(touchdownSources, "blackbox.frames.ground-transition");

  const takeoffDetected = takeoffSources.length > 0;
  const touchdownDetected = touchdownSources.length > 0;
  const touchdownVs = maybeNum(payload.actual.touchdownVsFpm ?? payload.acarsOperationalInputs.touchdownVsFpm) ?? matchNumber(corpus, /<TouchdownVS>([-\d.,]+)<\/TouchdownVS>/i);
  const touchdownG = maybeNum(payload.actual.touchdownGs) ?? matchNumber(corpus, /<TouchdownG(?:Force)?>([-\d.,]+)<\/TouchdownG(?:Force)?>/i);
  const touchdownCount = num(payload.actual.touchdownVsFpm !== undefined ? 1 : undefined, matchNumber(corpus, /<CantTouchdowns>([-\d.,]+)<\/CantTouchdowns>/i) ?? (touchdownDetected ? 1 : 0));
  const overspeedEvents = num(payload.actual.overspeedEvents, matchNumber(corpus, /<OverspeedSecs>([-\d.,]+)<\/OverspeedSecs>/i) ?? 0);
  const stallEvents = num(payload.actual.stallEvents, matchNumber(corpus, /<StallSecs>([-\d.,]+)<\/StallSecs>/i) ?? 0);
  const picFailed = matchNumber(corpus, /<PICsFailed>([-\d.,]+)<\/PICsFailed>/i) ?? 0;
  const fuel = detectFuelInconsistency(payload, corpus);

  if (fuel.fuelInconsistent) observations.push("Combustible registrado con inconsistencia de unidades/cálculo; economía queda como señal PARTIAL hasta normalización.");
  if (/DOOR STATE NOT RELIABLE|DOOR.*NOT RELIABLE|DOORS?.*UNRELIABLE/i.test(corpus)) observations.push("Puertas declaradas como no confiables por perfil de aeronave; no corresponde penalizar esa señal.");
  if (/GEAR STATE NOT RELIABLE|FIXED GEAR|GEAR.*NOT APPLICABLE|TREN FIJO/i.test(corpus) || looksLikeC172(aircraftCode)) observations.push("Tren no aplicable o no confiable para esta aeronave; no corresponde penalizar gear.");

  const reliableCoreSource = frameCount >= 5 || telemetrySamplesCount >= 5 || hasPirepXml || events.length >= 3;
  if (!reliableCoreSource) warnings.push("No hay suficiente fuente certificable para penalizar eventos centrales de vuelo.");

  const signals: TelemetrySignal[] = [
    buildSignal({
      key: "BLACKBOX",
      label: "Caja negra BlackBox",
      detected: frameCount > 0 || Object.keys(blackbox).length > 0,
      status: frameCount >= 5 ? "CERTIFIED" : frameCount > 0 ? "PARTIAL" : "NOT_AVAILABLE",
      confidence: frameCount >= 20 ? "HIGH" : frameCount >= 5 ? "MEDIUM" : frameCount > 0 ? "LOW" : "NONE",
      sources: frameCount > 0 ? [`BlackBox frames: ${frameCount}`] : [],
      reason: frameCount >= 5 ? "Frames locales suficientes para evaluación operacional." : "Sin frames suficientes de BlackBox.",
      canPenalize: true,
    }),
    buildSignal({
      key: "TELEMETRY_SAMPLES",
      label: "Samples de telemetría",
      detected: telemetrySamplesCount > 0 || frameCount > 0,
      status: telemetrySamplesCount >= 20 || frameCount >= 20 ? "CERTIFIED" : telemetrySamplesCount > 0 || frameCount > 0 ? "PARTIAL" : "NOT_AVAILABLE",
      confidence: telemetrySamplesCount >= 20 || frameCount >= 20 ? "HIGH" : telemetrySamplesCount > 0 || frameCount > 0 ? "LOW" : "NONE",
      sources: [`telemetry=${telemetrySamplesCount}`, `blackbox=${frameCount}`],
      reason: "Base de datos crudos usada para validar fases y consistencia.",
      canPenalize: telemetrySamplesCount >= 20 || frameCount >= 20,
    }),
    buildSignal({
      key: "AIRBORNE",
      label: "AIRBORNE / despegue confirmado",
      detected: takeoffDetected,
      status: takeoffDetected ? "CERTIFIED" : reliableCoreSource ? "NOT_AVAILABLE" : "UNRELIABLE",
      confidence: takeoffSources.length >= 2 ? "HIGH" : takeoffSources.length === 1 ? "MEDIUM" : reliableCoreSource ? "NONE" : "LOW",
      sources: takeoffSources,
      reason: takeoffDetected ? "AIRBORNE encontrado en una o más fuentes válidas." : reliableCoreSource ? "Fuente confiable disponible, pero no se encontró AIRBORNE." : "No hay fuente suficiente para certificar AIRBORNE.",
      evaluable: reliableCoreSource || takeoffDetected,
      canPenalize: reliableCoreSource,
    }),
    buildSignal({
      key: "TAKEOFF_ROLL",
      label: "Takeoff roll",
      detected: eventTypes.includes("TAKEOFF_ROLL") || /TAKEOFF_ROLL|TAKEOFF ROLL|RUNWAY_TAKEOFF_ROLL|TakeoffRollSamples>[1-9]/i.test(corpus),
      status: eventTypes.includes("TAKEOFF_ROLL") || /TAKEOFF_ROLL|TAKEOFF ROLL|RUNWAY_TAKEOFF_ROLL|TakeoffRollSamples>[1-9]/i.test(corpus) ? "CERTIFIED" : reliableCoreSource ? "PARTIAL" : "UNRELIABLE",
      confidence: "MEDIUM",
      sources: eventTypes.includes("TAKEOFF_ROLL") ? ["eventTypes.TAKEOFF_ROLL"] : /TakeoffRollSamples>[1-9]/i.test(corpus) ? ["xml.TakeoffRollSamples"] : [],
      reason: "Carrera de despegue se usa como evidencia procedimental, no como único criterio de vuelo válido.",
      canPenalize: reliableCoreSource,
    }),
    buildSignal({
      key: "TOUCHDOWN",
      label: "TOUCHDOWN / aterrizaje confirmado",
      detected: touchdownDetected,
      status: touchdownDetected ? "CERTIFIED" : reliableCoreSource ? "NOT_AVAILABLE" : "UNRELIABLE",
      confidence: touchdownSources.length >= 2 ? "HIGH" : touchdownSources.length === 1 ? "MEDIUM" : reliableCoreSource ? "NONE" : "LOW",
      sources: touchdownSources,
      reason: touchdownDetected ? "TOUCHDOWN encontrado en una o más fuentes válidas." : reliableCoreSource ? "Fuente confiable disponible, pero no se encontró TOUCHDOWN." : "No hay fuente suficiente para certificar TOUCHDOWN.",
      evaluable: reliableCoreSource || touchdownDetected,
      canPenalize: reliableCoreSource,
    }),
    buildSignal({
      key: "PARKED",
      label: "Parking / cierre en tierra",
      detected: eventTypes.some((item) => ["PARKED", "COLD_AND_DARK", "REPORT_SENT", "ENGINE_SHUTDOWN"].includes(item)) || /PARKED|COLD_AND_DARK|REPORT_SENT|ParkingBrakeON/i.test(corpus),
      status: "PARTIAL",
      confidence: "MEDIUM",
      sources: eventTypes.filter((item) => ["PARKED", "COLD_AND_DARK", "REPORT_SENT", "ENGINE_SHUTDOWN"].includes(item)),
      reason: "Cierre se valida con evento final, freno/ground y envío del reporte.",
      canPenalize: false,
    }),
    buildSignal({
      key: "FUEL",
      label: "Combustible",
      detected: fuel.fuelUsedKg !== null || fuel.fuelRemainingKg !== null,
      status: fuel.fuelInconsistent ? "PARTIAL" : fuel.fuelUsedKg !== null || fuel.fuelRemainingKg !== null ? "CERTIFIED" : "NOT_AVAILABLE",
      confidence: fuel.fuelInconsistent ? "LOW" : fuel.fuelUsedKg !== null || fuel.fuelRemainingKg !== null ? "MEDIUM" : "NONE",
      sources: [fuel.fuelUsedKg !== null ? "fuelUsed" : "", fuel.fuelRemainingKg !== null ? "fuelRemaining" : ""],
      reason: fuel.fuelInconsistent ? "Se detectó inconsistencia de unidades/cálculo; no usar para castigo económico estricto todavía." : "Combustible disponible para revisión operacional.",
      canPenalize: !fuel.fuelInconsistent && fuel.fuelUsedKg !== null,
    }),
    buildSignal({
      key: "TOUCHDOWN_VS",
      label: "Touchdown VS/G",
      detected: touchdownVs !== null || touchdownG !== null,
      status: touchdownVs !== null || touchdownG !== null ? "CERTIFIED" : "NOT_AVAILABLE",
      confidence: touchdownVs !== null ? "HIGH" : touchdownG !== null ? "MEDIUM" : "NONE",
      sources: [touchdownVs !== null ? `VS=${touchdownVs}` : "", touchdownG !== null ? `G=${touchdownG}` : ""],
      reason: "Métrica principal de performance de aterrizaje.",
      canPenalize: touchdownVs !== null || touchdownG !== null,
    }),
    buildSignal({
      key: "OVERSPEED",
      label: "Overspeed",
      detected: overspeedEvents > 0,
      status: "CERTIFIED",
      confidence: "HIGH",
      sources: [`overspeed=${overspeedEvents}`],
      reason: "Indicador crítico de seguridad disponible en resumen/indicadores.",
      canPenalize: true,
    }),
    buildSignal({
      key: "STALL",
      label: "Stall",
      detected: stallEvents > 0,
      status: "CERTIFIED",
      confidence: "HIGH",
      sources: [`stall=${stallEvents}`],
      reason: "Indicador crítico de seguridad disponible en resumen/indicadores.",
      canPenalize: true,
    }),
    buildSignal({
      key: "PIC_CHECK",
      label: "PIC check",
      detected: picFailed === 0,
      status: "PARTIAL",
      confidence: "MEDIUM",
      sources: [`PICsFailed=${picFailed}`],
      reason: "Señal operacional; puede penalizar leve cuando esté integrada al flujo completo.",
      canPenalize: false,
    }),
    buildSignal({
      key: "DOORS",
      label: "Puertas",
      detected: false,
      status: /DOOR STATE NOT RELIABLE|DOOR.*NOT RELIABLE|DOORS?.*UNRELIABLE/i.test(corpus) ? "UNRELIABLE" : "PARTIAL",
      confidence: "LOW",
      sources: /DOOR STATE NOT RELIABLE|DOOR.*NOT RELIABLE|DOORS?.*UNRELIABLE/i.test(corpus) ? ["aircraft-profile"] : [],
      reason: /DOOR STATE NOT RELIABLE|DOOR.*NOT RELIABLE|DOORS?.*UNRELIABLE/i.test(corpus) ? "Perfil declara puertas no confiables; no penalizar." : "Pendiente certificación por aeronave.",
      evaluable: false,
      canPenalize: false,
    }),
    buildSignal({
      key: "GEAR",
      label: "Tren de aterrizaje",
      detected: false,
      status: looksLikeC172(aircraftCode) || /FIXED GEAR|GEAR.*NOT APPLICABLE|TREN FIJO/i.test(corpus) ? "NOT_APPLICABLE" : "PARTIAL",
      confidence: "LOW",
      sources: looksLikeC172(aircraftCode) ? ["C172 fixed gear"] : [],
      reason: looksLikeC172(aircraftCode) ? "C172 tiene tren fijo; no corresponde penalizar gear." : "Pendiente certificación por aeronave.",
      evaluable: false,
      canPenalize: false,
    }),
    buildSignal({
      key: "LIGHTS",
      label: "Luces",
      detected: /Beacon|Landing|Taxi|Strobe|NavLights|LIGHTS/i.test(corpus),
      status: /Beacon|Landing|Taxi|Strobe|NavLights|LIGHTS/i.test(corpus) ? "PARTIAL" : "NOT_AVAILABLE",
      confidence: /Beacon|Landing|Taxi|Strobe|NavLights|LIGHTS/i.test(corpus) ? "MEDIUM" : "NONE",
      sources: /Beacon|Landing|Taxi|Strobe|NavLights|LIGHTS/i.test(corpus) ? ["telemetry-lights"] : [],
      reason: "Luces deben certificarse avión por avión antes de castigo estricto por fase.",
      canPenalize: false,
    }),
    buildSignal({
      key: "TRANSPONDER",
      label: "Transponder",
      detected: /Transponder|XPDR|Squawk/i.test(corpus),
      status: /Transponder|XPDR|Squawk/i.test(corpus) ? "PARTIAL" : "NOT_AVAILABLE",
      confidence: /Transponder|XPDR|Squawk/i.test(corpus) ? "MEDIUM" : "NONE",
      sources: /Transponder|XPDR|Squawk/i.test(corpus) ? ["telemetry-transponder"] : [],
      reason: "Transponder requiere normalización de modos antes de castigo fuerte.",
      canPenalize: false,
    }),
  ];

  return {
    signals,
    eventTypes,
    eventDetails: events,
    observations,
    warnings,
    rawFacts: {
      aircraftCode,
      origin: upper(payload.origin),
      destination: upper(payload.destination),
      blackboxFrameCount: frameCount,
      telemetrySamplesCount,
      hasPirepXml,
      takeoffDetected,
      touchdownDetected,
      takeoffSources,
      touchdownSources,
      touchdownVsFpm: touchdownVs,
      touchdownG,
      touchdownCount,
      overspeedEvents,
      stallEvents,
      picFailed,
      fuelPlannedKg: fuel.fuelPlannedKg,
      fuelUsedKg: fuel.fuelUsedKg,
      fuelRemainingKg: fuel.fuelRemainingKg,
      fuelInconsistent: fuel.fuelInconsistent,
    },
  };
}

export function signalByKey(report: AcarsEvidenceReport, key: TelemetrySignalKey): TelemetrySignal | undefined {
  return report.signals.find((signal) => signal.key === key);
}

export function canPenalizeMissing(report: AcarsEvidenceReport, key: TelemetrySignalKey): boolean {
  const signal = signalByKey(report, key);
  return Boolean(signal?.canPenalize && !signal.detected && signal.status === "NOT_AVAILABLE");
}
