"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityItem = {
  flightNumber?: string | null;
};

type AirportActivityResponse = {
  ok?: boolean;
  departures?: ActivityItem[];
  arrivals?: ActivityItem[];
};

function normalizeCallsign(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

export default function AirportPilotsBadge({ ident, icon }: { ident: string; icon: string }) {
  const [count, setCount] = useState<number | null>(null);

  const endpoint = useMemo(() => `/api/airport-activity?ident=${encodeURIComponent(ident)}`, [ident]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as AirportActivityResponse | null;
        if (controller.signal.aborted || !response.ok || !payload?.ok) {
          setCount(0);
          return;
        }

        const callsigns = new Set<string>();
        for (const item of payload.departures ?? []) {
          const callsign = normalizeCallsign(item.flightNumber);
          if (callsign) callsigns.add(callsign);
        }
        for (const item of payload.arrivals ?? []) {
          const callsign = normalizeCallsign(item.flightNumber);
          if (callsign) callsigns.add(callsign);
        }

        setCount(callsigns.size);
      } catch {
        if (!controller.signal.aborted) setCount(0);
      }
    }

    void load();
    return () => controller.abort();
  }, [endpoint]);

  return (
    <div className="pw-sur-airport-pill">
      {icon} <span>Pilotos en aeropuerto</span><strong>{count === null ? "..." : String(count)}</strong>
    </div>
  );
}

