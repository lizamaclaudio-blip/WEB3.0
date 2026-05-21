"use client";

import { useEffect, useMemo, useState } from "react";

type AirportHeroImageProps = {
  icao: string;
  airportName?: string;
  city?: string;
  country?: string;
  lat?: number | string;
  lng?: number | string;
  className?: string;
  subject?: "icao" | "airport" | "city" | "tourism" | "mixed";
};

type AirportHeroResponse = {
  imageUrl?: string;
  source?: "wikimedia" | "local" | "fallback" | "pexels" | "default";
  providerName?: string | null;
  placeName?: string | null;
  pageTitle?: string | null;
  pageUrl?: string | null;
  description?: string | null;
  attribution?: string | null;
  sourceUrl?: string | null;
  matchedIcao?: string;
  city?: string;
  country?: string;
  error?: string;
};

function sanitize(value: string | number | null | undefined) {
  return String(value ?? "").trim();
}

function buildTourismUrl({ icao, airportName, city, country, lat, lng }: AirportHeroImageProps) {
  const params = new URLSearchParams();
  params.set("icao", sanitize(icao).toUpperCase());
  if (airportName) params.set("airportName", airportName);
  if (city) params.set("city", city);
  if (country) params.set("country", country);
  if (lat !== undefined && lat !== null && sanitize(lat)) params.set("lat", sanitize(lat));
  if (lng !== undefined && lng !== null && sanitize(lng)) params.set("lng", sanitize(lng));
  return `/api/city-hero?${params.toString()}`;
}

async function fetchHeroPayload(endpoint: string, signal: AbortSignal) {
  const response = await fetch(endpoint, { cache: "no-store", signal });
  const data = (await response.json().catch(() => null)) as AirportHeroResponse | null;
  if (!response.ok || !data?.imageUrl) return null;
  return data;
}

export default function AirportHeroImage({
  icao,
  airportName,
  city,
  country,
  lat,
  lng,
  className = "",
}: AirportHeroImageProps) {
  const [payload, setPayload] = useState<AirportHeroResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const normalizedIcao = sanitize(icao).toUpperCase();
  const endpoint = useMemo(
    () => buildTourismUrl({ icao: normalizedIcao, airportName, city, country, lat, lng }),
    [normalizedIcao, airportName, city, country, lat, lng],
  );

  const subtitle = [airportName, city].filter(Boolean).join(" · ");
  const title = city || normalizedIcao;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFailed(false);

      try {
        const data = await fetchHeroPayload(endpoint, controller.signal);
        if (controller.signal.aborted) return;
        if (!data?.imageUrl) {
          setPayload(null);
          setFailed(true);
          return;
        }
        setPayload(data);
      } catch {
        if (!controller.signal.aborted) {
          setPayload(null);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [endpoint]);

  const backgroundStyle = payload?.imageUrl
    ? { backgroundImage: `url("${payload.imageUrl}")` }
    : undefined;

  return (
    <div className={`relative overflow-hidden rounded-md bg-sky-900 ${className}`.trim()}>
      {loading ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-sky-100 via-sky-200 to-sky-500" />
      ) : !failed && payload?.imageUrl ? (
        <div
          aria-label={`Zona turistica de ${city ?? "la ciudad"} vinculada al aeropuerto ${normalizedIcao}`}
          className="absolute inset-0 bg-cover bg-center"
          role="img"
          style={backgroundStyle}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-800 to-cyan-500" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 text-white drop-shadow-sm">
        <div className="text-xl font-black tracking-wide">{title}</div>
        {subtitle ? <div className="text-xs font-semibold opacity-95">{subtitle}</div> : null}
        {failed ? <div className="mt-1 text-[10px] font-semibold opacity-80">Imagen turistica no disponible para {city ?? normalizedIcao}</div> : null}
      </div>
    </div>
  );
}
