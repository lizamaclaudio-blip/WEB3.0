"use client";

import { useEffect, useMemo, useState } from "react";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";

type AdvisoryResponse = {
  ok?: boolean;
  requestedIdent?: string;
  stationIdent?: string;
  isNearestStation?: boolean;
  distanceNm?: number;
  riskLevel?: RiskLevel;
  title?: string;
  updatedLabel?: string;
  summary?: string;
  operationalMessage?: string;
  runwayStatus?: {
    totalRunways?: number;
    openRunways?: number;
    closedRunways?: number;
    summary?: string;
  } | null;
  briefingText?: string;
  advisories?: string[];
  currentConditions?: {
    wind?: string;
    visibility?: string;
    ceiling?: string;
    qnh?: string;
    temperature?: string;
  };
  suggestedRunway?: {
    runwayIdent?: string;
    headwindKt?: number;
    crosswindKt?: number;
    tailwindKt?: number;
    label?: string;
    reason?: string;
  } | null;
  forecast?: {
    available?: boolean;
    summary?: string;
    rawTaf?: string | null;
  };
  nextUpdate?: string;
};

const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: "BAJO",
  MODERATE: "MODERADO",
  HIGH: "ALTO",
  CRITICAL: "CRITICO",
  UNKNOWN: "NO EVALUABLE",
};

function riskClass(level: RiskLevel) {
  if (level === "LOW") return "pw-sur-advisory-low";
  if (level === "MODERATE") return "pw-sur-advisory-moderate";
  if (level === "HIGH" || level === "CRITICAL") return "pw-sur-advisory-high";
  return "pw-sur-advisory-unknown";
}

export default function WeatherOperationalAdvisory({ ident }: { ident: string }) {
  const [payload, setPayload] = useState<AdvisoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const endpoint = useMemo(() => `/api/dispatch/weather-advisory?ident=${encodeURIComponent(ident)}`, [ident]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const data = (await response.json().catch(() => null)) as AdvisoryResponse | null;
        if (!controller.signal.aborted) {
          setPayload(response.ok ? data : null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setPayload(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [endpoint]);

  const level: RiskLevel = payload?.riskLevel ?? "UNKNOWN";
  const isUnavailable = !loading && !payload;
  const summary = loading
    ? "Evaluando condiciones meteorologicas..."
    : isUnavailable
      ? "Aviso operacional no disponible temporalmente."
      : payload?.summary ?? "No hay METAR disponible para generar aviso operacional.";
  const advisories = payload?.advisories ?? ["Revisar condiciones manualmente antes de despachar."];
  const stationLine = payload?.isNearestStation
    ? `Se utiliza METAR cercano ${payload?.stationIdent ?? "N/D"} para ${payload?.requestedIdent ?? ident}.`
    : `Se utiliza METAR directo ${payload?.stationIdent ?? ident}.`;
  const message = payload?.operationalMessage ?? summary;

  return (
    <article className={`pw-sur-weather-advisory ${riskClass(level)}`}>
      <header>
        <strong>Aviso operacional Patagonia Wings</strong>
        <span>Riesgo: {RISK_LABEL[level]}</span>
      </header>

      <p className="pw-sur-advisory-updated">{payload?.updatedLabel ?? "Actualizado N/D"}</p>
      {!isUnavailable && !payload?.operationalMessage ? <p>{stationLine}</p> : null}
      <p>{message}</p>
      {payload?.suggestedRunway ? (
        <p className="pw-sur-advisory-runway">
          <b>{payload.suggestedRunway.label ?? "Sin pista sugerida por viento"}</b>
          {payload.suggestedRunway.runwayIdent && payload.suggestedRunway.runwayIdent !== "N/A"
            ? ` · frente ${payload.suggestedRunway.headwindKt ?? 0} kt · cruzado ${payload.suggestedRunway.crosswindKt ?? 0} kt${(payload.suggestedRunway.tailwindKt ?? 0) > 0 ? ` · cola ${payload.suggestedRunway.tailwindKt ?? 0} kt` : ""}`
            : ""}
        </p>
      ) : null}
      <details className="pw-sur-advisory-details">
        <summary>Ver detalle operacional</summary>
        <div className="pw-sur-advisory-conditions">
          <span>Viento: <b>{payload?.currentConditions?.wind ?? "N/D"}</b></span>
          <span>Visibilidad: <b>{payload?.currentConditions?.visibility ?? "N/D"}</b></span>
          <span>Techo: <b>{payload?.currentConditions?.ceiling ?? "N/D"}</b></span>
          <span>QNH: <b>{payload?.currentConditions?.qnh ?? "N/D"}</b></span>
          <span>Temperatura: <b>{payload?.currentConditions?.temperature ?? "N/D"}</b></span>
        </div>
        <ul>
          {advisories.slice(0, 4).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </ul>
        <p className="pw-sur-advisory-forecast">Proximas horas: {payload?.forecast?.summary ?? "TAF no disponible en esta version."}</p>
        {payload?.runwayStatus?.summary ? <p className="pw-sur-advisory-forecast">Pistas: {payload.runwayStatus.summary}</p> : null}
        {payload?.nextUpdate ? <p className="pw-sur-advisory-forecast">{payload.nextUpdate}</p> : null}
        {payload?.forecast?.rawTaf ? <pre className="pw-sur-advisory-briefing">{payload.forecast.rawTaf}</pre> : null}
        {payload?.briefingText ? <pre className="pw-sur-advisory-briefing">{payload.briefingText}</pre> : null}
      </details>
      <small>Aviso operacional interno. No reemplaza NOTAM oficial ni informacion aeronautica oficial.</small>
    </article>
  );
}

