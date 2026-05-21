"use client";

import { useEffect, useState } from "react";

type PublicStats = {
  pilots: number;
  totalFlights: number;
  transportedPassengers: number;
  flownHours: number;
  todayFlights: number;
};

const fallback: PublicStats = {
  pilots: 0,
  totalFlights: 0,
  transportedPassengers: 0,
  flownHours: 0,
  todayFlights: 0,
};

function format(value: number, decimals = 0) {
  return value.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function LandingCounters() {
  const [stats, setStats] = useState<PublicStats>(fallback);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/public/stats", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as PublicStats;
        if (!cancelled) setStats({ ...fallback, ...data });
      } catch {
        // keep zero values
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const counters = [
    [format(stats.pilots), "Pilotos"],
    [format(stats.totalFlights), "Vuelos totales"],
    [format(stats.transportedPassengers), "Pasajeros transportados"],
    [format(stats.flownHours, 1), "Horas voladas"],
    [format(stats.todayFlights), "Vuelos de hoy"],
  ];

  return (
    <section className="pw-sur-counters-wrap">
      <div className="pw-sur-container pw-sur-counters">
        {counters.map(([value, label]) => (
          <div className="pw-sur-counter" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
