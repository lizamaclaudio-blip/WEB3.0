"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type AirportMetarPanelProps = {
  icao: string;
  footerAside?: ReactNode;
};

type AirportMetarResponse = {
  requested_ident?: string;
  station_ident?: string;
  is_nearest_station?: boolean;
  distance_nm?: number;
  message?: string | null;
  raw_metar?: string | null;
  raw?: string | null;
  observedAt?: string | null;
  updatedAt?: string;
  clouds?: string;
  wind?: string;
  visibility?: string;
  temperature?: string;
  dewpoint?: string;
  qnh?: string;
  flightCategory?: string | null;
  weather?: string | null;
  source?: "aviationweather";
  ok?: boolean;
  error?: string;
};

function buildUrl(icao: string) {
  const params = new URLSearchParams();
  params.set("icao", icao.trim().toUpperCase());
  return `/api/airport-metar?${params.toString()}`;
}

function MetarValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value || "N/D"}</strong>
    </div>
  );
}

export default function AirportMetarPanel({ icao, footerAside }: AirportMetarPanelProps) {
  const [payload, setPayload] = useState<AirportMetarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const endpoint = useMemo(() => buildUrl(icao), [icao]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFailed(false);

      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const data = (await response.json().catch(() => null)) as AirportMetarResponse | null;

        if (controller.signal.aborted) return;

        if (!response.ok || !data || data.error || data.ok === false) {
          setFailed(true);
          setPayload(data);
          return;
        }

        setPayload(data);
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [endpoint]);

  const metar = failed || !payload ? null : payload;
  const loadingText = loading ? "Cargando METAR real..." : failed ? payload?.message ?? payload?.error ?? "METAR no disponible" : null;
  const station = metar?.station_ident ?? icao.toUpperCase();
  const metarRaw = metar?.raw_metar || metar?.raw || station;

  return (
    <>
      <div className="pw-sur-metar-grid" aria-busy={loading}>
        <MetarValue label="Nubes" value={loading ? "..." : metar?.clouds} />
        <MetarValue label="Viento" value={loading ? "..." : metar?.wind} />
        <MetarValue label="Visibilidad" value={loading ? "..." : metar?.visibility} />
      </div>

      <div className="pw-sur-metar-extra">
        <span><b>Temperatura</b> {loading ? "..." : metar?.temperature ?? "N/D"}</span>
        <span><b>Rocio</b> {loading ? "..." : metar?.dewpoint ?? "N/D"}</span>
        <span><b>QNH</b> {loading ? "..." : metar?.qnh ?? "N/D"}</span>
      </div>

      <div className="pw-sur-metar-foot">
        <div className="pw-sur-metar-note">
          {loadingText ? (
            <span>{loadingText}</span>
          ) : (
            <>
              <span className="text-slate-900">{metarRaw}</span>
            </>
          )}
        </div>
        {footerAside ? <div className="pw-sur-metar-side">{footerAside}</div> : null}
      </div>
    </>
  );
}
