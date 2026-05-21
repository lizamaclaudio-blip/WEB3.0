export type AdvisoryRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type RunwayCandidate = {
  runwayIdent: string;
  runwayHeadingDeg: number;
  isClosed?: boolean;
  lengthFt?: number | null;
  surface?: string | null;
  lighted?: boolean | null;
};

export type RunwaySuggestion = {
  runwayIdent: string;
  runwayHeadingDeg: number;
  headwindKt: number;
  crosswindKt: number;
  tailwindKt: number;
  label: string;
  reason: string;
};

export type BuildOperationalAdvisoryInput = {
  requestedIdent?: string | null;
  airportName?: string | null;
  city?: string | null;
  stationIdent?: string | null;
  isNearestStation?: boolean | null;
  distanceNm?: number | null;
  rawMetar?: string | null;
  rawTaf?: string | null;
  windDirectionDeg?: number | null;
  windSpeedKt?: number | null;
  windGustKt?: number | null;
  visibilityMeters?: number | null;
  ceilingFt?: number | null;
  temperatureC?: number | null;
  qnhHpa?: number | null;
  runways?: RunwayCandidate[];
  includeRunwayDetails?: boolean | null;
};

export type OperationalAdvisory = {
  riskLevel: AdvisoryRiskLevel;
  title: string;
  updatedLabel: string;
  summary: string;
  advisories: string[];
  briefingText: string;
  blocking: boolean;
  source: "METAR_RULES";
  generatedAt: string;
  currentConditions: {
    wind: string;
    visibility: string;
    ceiling: string;
    qnh: string;
    temperature: string;
  };
  operationalMessage: string;
  runwayStatus: {
    totalRunways: number;
    openRunways: number;
    closedRunways: number;
    summary: string;
  } | null;
  suggestedRunway: RunwaySuggestion | null;
  forecast: {
    available: boolean;
    summary: string;
    rawTaf: string | null;
  };
  nextUpdate: string;
};

function formatZulu(value: Date) {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const year = String(value.getUTCFullYear()).slice(-2);
  const hh = String(value.getUTCHours()).padStart(2, "0");
  const mm = String(value.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hh}:${mm}Z`;
}

function parseRawWind(rawMetar?: string | null) {
  const raw = (rawMetar ?? "").toUpperCase();
  const match = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (!match) return { direction: null as number | null, speed: null as number | null, gust: null as number | null, variable: false };
  return {
    direction: match[1] === "VRB" ? null : Number(match[1]),
    speed: Number(match[2]),
    gust: match[3] ? Number(match[3]) : null,
    variable: match[1] === "VRB",
  };
}

function parseVisibilityMeters(rawMetar?: string | null, fallback?: number | null) {
  if (typeof fallback === "number") return fallback;
  const raw = (rawMetar ?? "").toUpperCase();
  if (!raw) return null;
  if (/\bCAVOK\b/.test(raw)) return 10000;
  const m = raw.match(/\b(\d{4})\b/);
  return m ? Number(m[1]) : null;
}

function parseCeilingFeet(rawMetar?: string | null, fallback?: number | null) {
  if (typeof fallback === "number") return fallback;
  const raw = (rawMetar ?? "").toUpperCase();
  const layers = [...raw.matchAll(/\b(BKN|OVC|VV)(\d{3})\b/g)];
  if (!layers.length) return null;
  return Math.min(...layers.map((layer) => Number(layer[2]) * 100));
}

function parseTemperatureC(rawMetar?: string | null, fallback?: number | null) {
  if (typeof fallback === "number") return fallback;
  const raw = (rawMetar ?? "").toUpperCase();
  const m = raw.match(/\s(M?\d{2})\/(M?\d{2})\s/);
  if (!m) return null;
  const v = m[1].startsWith("M") ? -Number(m[1].slice(1)) : Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

function parseQnhHpa(rawMetar?: string | null, fallback?: number | null) {
  if (typeof fallback === "number") return fallback;
  const raw = (rawMetar ?? "").toUpperCase();
  const q = raw.match(/\bQ(\d{4})\b/);
  if (q) return Number(q[1]);
  const a = raw.match(/\bA(\d{4})\b/);
  if (!a) return null;
  return Math.round((Number(a[1]) / 100) * 33.8639);
}

function hasWx(raw: string, token: string) {
  return new RegExp(`(?:^|\\s)${token}(?:\\s|$)`).test(raw);
}

function angleDelta(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function suggestRunwayByWind(runways: RunwayCandidate[], windDirectionDeg: number | null, windSpeedKt: number | null): RunwaySuggestion | null {
  if (!runways.length) {
    return {
      runwayIdent: "N/A",
      runwayHeadingDeg: 0,
      headwindKt: 0,
      crosswindKt: 0,
      tailwindKt: 0,
      label: "Sin pista sugerida por viento",
      reason: "No hay pistas cargadas para calcular sugerencia.",
    };
  }

  if (windDirectionDeg === null || !windSpeedKt || windSpeedKt <= 1) {
    return {
      runwayIdent: "N/A",
      runwayHeadingDeg: 0,
      headwindKt: 0,
      crosswindKt: 0,
      tailwindKt: 0,
      label: "Sin pista sugerida por viento",
      reason: "Sin pista sugerida por viento; viento calmo o variable.",
    };
  }

  let best: RunwaySuggestion | null = null;

  for (const runway of runways) {
    const delta = angleDelta(windDirectionDeg, runway.runwayHeadingDeg);
    const rad = (delta * Math.PI) / 180;
    const signedHeadwind = windSpeedKt * Math.cos(rad);
    const crosswind = Math.abs(windSpeedKt * Math.sin(rad));
    const headwind = signedHeadwind > 0 ? signedHeadwind : 0;
    const tailwind = signedHeadwind < 0 ? Math.abs(signedHeadwind) : 0;

    const candidate: RunwaySuggestion = {
      runwayIdent: runway.runwayIdent,
      runwayHeadingDeg: runway.runwayHeadingDeg,
      headwindKt: Math.round(headwind),
      crosswindKt: Math.round(crosswind),
      tailwindKt: Math.round(tailwind),
      label: `RWY ${runway.runwayIdent} sugerida por viento`,
      reason: "Mejor componente de viento de frente segun METAR disponible.",
    };

    if (!best) {
      best = candidate;
      continue;
    }

    const bestScore = best.headwindKt - best.tailwindKt;
    const candScore = candidate.headwindKt - candidate.tailwindKt;
    if (candScore > bestScore || (candScore === bestScore && candidate.crosswindKt < best.crosswindKt)) {
      best = candidate;
    }
  }

  return best;
}

function buildBriefingText(input: {
  requested: string;
  airportLabel: string;
  station: string;
  isNearest: boolean;
  distanceNm: number | null;
  windLabel: string;
  ceilingLabel: string;
  visibilityLabel: string;
  runway: RunwaySuggestion | null;
  includeRunwayDetails: boolean;
  summary: string;
  advisories: string[];
  updatedLabel: string;
  forecastSummary: string;
  runwayStatusSummary: string | null;
}) {
  const lines: string[] = [];
  lines.push(`Aviso operacional ${input.requested}`);
  lines.push(input.updatedLabel);
  lines.push("");

  if (input.isNearest) {
    const dist = typeof input.distanceNm === "number" ? input.distanceNm.toFixed(1) : "N/D";
    lines.push(`Se utiliza METAR cercano ${input.station}, ubicado a ${dist} NM, debido a que ${input.airportLabel} no dispone de estacion METAR propia.`);
  } else {
    lines.push(`Se utiliza METAR directo de ${input.station} para la evaluacion operacional.`);
  }

  lines.push("");
  lines.push("Condicion operacional actual:");
  lines.push(`${input.windLabel}, techo estimado ${input.ceilingLabel}, visibilidad ${input.visibilityLabel}.`);

  if (input.includeRunwayDetails) {
    lines.push("");
    lines.push("Pista sugerida por viento:");
    if (input.runway) {
      lines.push(`${input.runway.label}. Componente aproximado: viento de frente ${input.runway.headwindKt} kt, viento cruzado ${input.runway.crosswindKt} kt${input.runway.tailwindKt > 0 ? `, viento de cola ${input.runway.tailwindKt} kt` : ""}.`);
      lines.push("Confirmar pista activa con ATC/simulador antes del rodaje.");
    } else {
      lines.push("Sin pista sugerida por viento.");
    }
  } else {
    lines.push("");
    lines.push("Alcance del aviso:");
    lines.push("El METAR usado corresponde a una estacion cercana, por lo que el aviso queda limitado a condiciones climaticas del sector.");
  }

  lines.push("");
  lines.push("Proximas horas:");
  lines.push(input.forecastSummary);

  lines.push("");
  lines.push(`Recomendacion: ${input.summary}`);
  if (input.runwayStatusSummary) lines.push(input.runwayStatusSummary);
  if (input.advisories[0]) lines.push(input.advisories[0]);

  lines.push("");
  lines.push("Aviso operacional interno. No reemplaza NOTAM oficial ni informacion aeronautica oficial.");
  return lines.join("\n");
}

export function buildOperationalAdvisory(input: BuildOperationalAdvisoryInput): OperationalAdvisory {
  const requested = (input.requestedIdent ?? "").trim().toUpperCase() || "----";
  const airportLabel = (input.airportName ?? input.city ?? requested).trim() || requested;
  const station = (input.stationIdent ?? "").trim().toUpperCase() || "----";
  const now = new Date();
  const generatedAt = now.toISOString();
  const updatedLabel = `Actualizado ${formatZulu(now)}`;
  const includeRunwayDetails = Boolean(input.rawMetar) && Boolean(input.includeRunwayDetails ?? !input.isNearestStation);

  const allRunways = includeRunwayDetails ? input.runways ?? [] : [];
  const openRunways = allRunways.filter((runway) => !runway.isClosed);
  const closedRunways = allRunways.length - openRunways.length;
  const runwayStatusSummary = includeRunwayDetails
    ? !allRunways.length
      ? "No hay pistas cargadas para este aeropuerto en la base local."
      : closedRunways > 0
        ? `La base local marca ${closedRunways} cabecera(s) o superficie(s) cerrada(s); se evaluan solo pistas disponibles.`
        : "Las pistas cargadas en la base local no figuran marcadas como cerradas."
    : null;
  const forecastSummary = input.rawTaf
    ? `TAF disponible para ${station}. Revisar cambios temporales de viento, techo y visibilidad antes del despacho.`
    : "TAF no disponible para esta estacion en este momento. Mantener monitoreo de viento, techo y visibilidad antes de enviar a ACARS.";
  const nextUpdate = "Actualizacion automatica: cada 10 minutos o cuando cambie el METAR/TAF consultado.";

  if (!input.rawMetar) {
    return {
      riskLevel: "UNKNOWN",
      title: `Aviso operacional ${requested}`,
      updatedLabel,
      summary: "No hay METAR disponible para evaluar condiciones operacionales.",
      advisories: ["Revisar condiciones manualmente antes de despachar."],
      briefingText: `Aviso operacional ${requested}\n${updatedLabel}\n\nNo hay METAR disponible para evaluar condiciones operacionales.\n\nAviso operacional interno. No reemplaza NOTAM oficial ni informacion aeronautica oficial.`,
      blocking: false,
      source: "METAR_RULES",
      generatedAt,
      currentConditions: {
        wind: "N/D",
        visibility: "N/D",
        ceiling: "N/D",
        qnh: "N/D",
        temperature: "N/D",
      },
      operationalMessage: `Para ${airportLabel} no hay METAR disponible en este momento. La recomendacion es revisar condiciones manualmente antes de despachar y confirmar informacion oficial local.`,
      runwayStatus: includeRunwayDetails ? {
        totalRunways: allRunways.length,
        openRunways: openRunways.length,
        closedRunways,
        summary: runwayStatusSummary ?? "",
      } : null,
      suggestedRunway: null,
      forecast: {
        available: Boolean(input.rawTaf),
        summary: forecastSummary,
        rawTaf: input.rawTaf ?? null,
      },
      nextUpdate,
    };
  }

  const raw = input.rawMetar.toUpperCase();
  const rawWind = parseRawWind(input.rawMetar);
  const windDirectionDeg = input.windDirectionDeg ?? rawWind.direction;
  const windSpeedKt = input.windSpeedKt ?? rawWind.speed;
  const windGustKt = input.windGustKt ?? rawWind.gust;
  const visibilityMeters = parseVisibilityMeters(input.rawMetar, input.visibilityMeters);
  const ceilingFt = parseCeilingFeet(input.rawMetar, input.ceilingFt);
  const temperatureC = parseTemperatureC(input.rawMetar, input.temperatureC);
  const qnhHpa = parseQnhHpa(input.rawMetar, input.qnhHpa);

  const windLabel = windDirectionDeg === null || windSpeedKt === null
    ? "Viento no disponible"
    : `${String(windDirectionDeg).padStart(3, "0")}/${windSpeedKt}KT${windGustKt ? ` G${windGustKt}` : ""}`;
  const visibilityLabel = visibilityMeters === null ? "N/D" : visibilityMeters >= 9999 ? ">10 km" : `${(visibilityMeters / 1000).toFixed(1)} km`;
  const ceilingLabel = ceilingFt === null ? "N/D" : `${ceilingFt} ft`;
  const temperatureLabel = temperatureC === null ? "N/D" : `${temperatureC} C`;
  const qnhLabel = qnhHpa === null ? "N/D" : `${qnhHpa} hPa`;

  const advisories: string[] = [];
  let score = 0;

  if (input.isNearestStation) {
    const dist = typeof input.distanceNm === "number" ? input.distanceNm.toFixed(1) : "N/D";
    advisories.push(`El aeropuerto solicitado no posee METAR propio; se usa la estacion cercana ${station} a ${dist} NM como referencia meteorologica del sector.`);
  }

  if (typeof windSpeedKt === "number") {
    if (windSpeedKt >= 35) score = Math.max(score, 4);
    else if (windSpeedKt >= 25) score = Math.max(score, 3);
    else if (windSpeedKt >= 15) score = Math.max(score, 2);
  }

  if (typeof windGustKt === "number") {
    if (windGustKt >= 35) score = Math.max(score, 4);
    else if (windGustKt >= 25) score = Math.max(score, 3);
    if (windGustKt >= 25) advisories.push(`Rafagas reportadas hasta ${windGustKt} kt.`);
  }

  if (typeof visibilityMeters === "number") {
    if (visibilityMeters < 1500) score = Math.max(score, 4);
    else if (visibilityMeters < 5000) score = Math.max(score, 3);
    else if (visibilityMeters < 8000) score = Math.max(score, 2);
    if (visibilityMeters < 8000) advisories.push("Visibilidad reducida. Revisar minimos de salida y llegada.");
  }

  if (typeof ceilingFt === "number") {
    if (ceilingFt < 500) score = Math.max(score, 4);
    else if (ceilingFt < 1500) score = Math.max(score, 3);
    else if (ceilingFt < 3000) score = Math.max(score, 2);
    if (ceilingFt < 3000) advisories.push("Techo bajo reportado. Revisar minimos y condiciones de aproximacion.");
  }

  for (const token of ["TS", "CB", "+RA", "SN", "FG", "FZ"]) {
    if (!hasWx(raw, token)) continue;
    if (token === "TS" || token === "CB" || token === "FZ") score = Math.max(score, 4);
    else score = Math.max(score, 3);
    advisories.push(`Fenomeno meteorologico relevante detectado: ${token}.`);
  }

  let riskLevel: AdvisoryRiskLevel = "LOW";
  if (score >= 4) riskLevel = "CRITICAL";
  else if (score >= 3) riskLevel = "HIGH";
  else if (score >= 2) riskLevel = "MODERATE";

  const runway = includeRunwayDetails ? suggestRunwayByWind(openRunways, windDirectionDeg, windSpeedKt) : null;
  if (includeRunwayDetails) {
    if (runway?.reason) advisories.push(runway.reason);
    advisories.push("Confirmar pista activa con ATC/simulador antes del rodaje.");
  } else if (input.isNearestStation) {
    advisories.push("El aviso se limita a condiciones climaticas del sector; confirmar operacion local con fuentes oficiales, ATC o simulador.");
  }
  advisories.push("Considerar combustible alternativo si las condiciones se deterioran.");

  const summaryByLevel: Record<AdvisoryRiskLevel, string> = {
    LOW: "Condiciones favorables. Continuar con monitoreo normal de salida y destino.",
    MODERATE: "Condiciones con impacto moderado. Verificar minimos, alterno y performance antes del despacho.",
    HIGH: "Condiciones adversas. Aplicar plan conservador y revisar alternos operativos.",
    CRITICAL: "Condiciones criticas. Evaluar demora o cancelacion operativa.",
    UNKNOWN: "No hay METAR disponible para evaluar condiciones operacionales.",
  };

  const summary = input.isNearestStation
    ? `Se utiliza METAR cercano ${station} para estimar condiciones climaticas del sector.`
    : summaryByLevel[riskLevel];

  const sourceText = input.isNearestStation
    ? `Se utiliza METAR cercano ${station} para estimar condiciones climaticas del sector de ${requested}.`
    : `Se utiliza METAR directo ${station}.`;
  const runwayText = includeRunwayDetails
    ? runway && runway.runwayIdent !== "N/A"
      ? `Pista sugerida por viento: RWY ${runway.runwayIdent}. Confirmar pista activa con ATC/simulador antes del rodaje.`
      : "Sin pista sugerida por viento; confirmar pista activa con ATC/simulador antes del rodaje."
    : "El aviso queda limitado a condiciones climaticas del sector.";
  const recommendationText = includeRunwayDetails
    ? "Recomendacion: revisar pista activa, minimos y combustible alternativo antes del despacho."
    : "Recomendacion: usar esta informacion como referencia climatica del sector, revisar evolucion del tiempo, visibilidad, techo y combustible alternativo antes del despacho.";
  const runwayStatusText = runwayStatusSummary ? ` ${runwayStatusSummary}` : "";
  const operationalMessage = `${sourceText} Condicion actual: ${windLabel}, visibilidad ${visibilityLabel}, techo ${ceilingLabel}. ${runwayText} ${recommendationText}${runwayStatusText} ${forecastSummary}`;

  const briefingText = buildBriefingText({
    requested,
    airportLabel,
    station,
    isNearest: Boolean(input.isNearestStation),
    distanceNm: input.distanceNm ?? null,
    windLabel,
    ceilingLabel,
    visibilityLabel,
    runway,
    includeRunwayDetails,
    summary,
    advisories,
    updatedLabel,
    forecastSummary,
    runwayStatusSummary,
  });

  return {
    riskLevel,
    title: `Aviso operacional ${requested}`,
    updatedLabel,
    summary,
    advisories,
    briefingText,
    blocking: false,
    source: "METAR_RULES",
    generatedAt,
    currentConditions: {
      wind: windLabel,
      visibility: visibilityLabel,
      ceiling: ceilingLabel,
      qnh: qnhLabel,
      temperature: temperatureLabel,
    },
    operationalMessage,
    runwayStatus: includeRunwayDetails ? {
      totalRunways: allRunways.length,
      openRunways: openRunways.length,
      closedRunways,
      summary: runwayStatusSummary ?? "",
    } : null,
    suggestedRunway: runway,
    forecast: {
      available: Boolean(input.rawTaf),
      summary: forecastSummary,
      rawTaf: input.rawTaf ?? null,
    },
    nextUpdate,
  };
}
