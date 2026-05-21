"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { NearbyPlace } from "@/lib/places/types";

type Props = {
  lat: number;
  lng: number;
  radiusKm?: number;
  title?: string;
};

type ApiResponse = {
  places?: NearbyPlace[];
};

const categoryLabel: Record<string, string> = {
  attraction: "Atraccion",
  museum: "Museo",
  viewpoint: "Mirador",
  historic: "Historico",
  park: "Parque",
  beach: "Playa",
  peak: "Cumbre",
  other: "Interes",
};

function formatDistance(value: number) {
  return `${value.toFixed(1)} km`;
}

export function NearbyAttractionsPanel({ lat, lng, radiusKm = 20, title = "Atracciones cercanas" }: Props) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const url = `/api/places/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`;
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as ApiResponse;
        if (!mounted) return;
        setPlaces((payload.places ?? []).slice(0, 6));
      } catch {
        if (!mounted) return;
        setPlaces([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [lat, lng, radiusKm]);

  const visible = useMemo(() => places.slice(0, 6), [places]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">{title}</h3>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
          Radio {radiusKm} km
        </span>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Buscando lugares destacados...</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No hay atracciones cercanas disponibles por ahora.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((place) => (
            <article key={place.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
              {place.imageUrl ? (
                <Image
                  src={place.imageUrl}
                  alt={place.name}
                  className="h-28 w-full object-cover"
                  width={560}
                  height={224}
                  unoptimized
                />
              ) : null}
              <div className="p-3">
                <h4 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{place.name}</h4>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-sky-700 dark:text-sky-300">
                  {categoryLabel[place.category] ?? "Interes"} · {formatDistance(place.distanceKm)}
                </p>
                {place.description ? (
                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{place.description}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Datos: OpenStreetMap contributors / Wikimedia cuando aplique
      </p>
    </section>
  );
}
