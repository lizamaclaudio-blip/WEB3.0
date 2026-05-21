"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityItem = {
  flightNumber: string;
  aircraft: string;
  registration: string;
  origin: string;
  destination: string;
  status: string;
  operationType: string;
  updatedAt: string | null;
};

type AirportActivityResponse = {
  ok?: boolean;
  ident?: string;
  atcStatus?: string;
  departures?: ActivityItem[];
  arrivals?: ActivityItem[];
};

function Row({ item }: { item: ActivityItem }) {
  return (
    <div className="pw-sur-act-row">
      <span>{item.flightNumber}</span>
      <span>{item.aircraft}</span>
      <span>{item.origin} - {item.destination}</span>
      <span>{item.operationType}</span>
      <span className="pw-sur-state warning">{item.status}</span>
    </div>
  );
}

export default function AirportActivityPanel({ ident, icons }: { ident: string; icons: { antenna: string; departure: string; arrival: string } }) {
  const [data, setData] = useState<AirportActivityResponse | null>(null);

  const endpoint = useMemo(() => `/api/airport-activity?ident=${encodeURIComponent(ident)}`, [ident]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as AirportActivityResponse | null;
        if (!controller.signal.aborted) setData(response.ok ? payload : null);
      } catch {
        if (!controller.signal.aborted) setData(null);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint]);

  const departures = (data?.departures ?? []).slice(0, 5);
  const arrivals = (data?.arrivals ?? []).slice(0, 5);

  return (
    <article className="pw-sur-activity-card">
      <header>{icons.antenna} Actividad del Aeropuerto</header>
      <div className="pw-sur-atc"><strong>ATC</strong><span>{data?.atcStatus || "No disponible"}</span></div>
      <div className="pw-sur-activity-grid">
        <section>
          <h4>{icons.departure} Partidas <span>{departures.length}</span></h4>
          {departures.length ? departures.map((item, idx) => <Row key={`${item.flightNumber}-${item.registration}-${idx}`} item={item} />) : <p className="p-3 text-sm text-slate-600">No hay salidas registradas.</p>}
        </section>
        <section>
          <h4>{icons.arrival} Arribos <span>{arrivals.length}</span></h4>
          {arrivals.length ? arrivals.map((item, idx) => <Row key={`${item.flightNumber}-${item.registration}-${idx}`} item={item} />) : <p className="p-3 text-sm text-slate-600">No hay arribos registrados.</p>}
        </section>
      </div>
    </article>
  );
}
