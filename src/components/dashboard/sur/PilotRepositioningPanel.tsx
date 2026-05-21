"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./PilotRepositioningPanel.module.css";

type AirportSummary = {
  ident?: string | null;
  icao?: string | null;
  iata?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
};

type AuthMeResponse = {
  ok?: boolean;
  pilot?: {
    callsign?: string | null;
    rank_code?: string | null;
    pilot_status?: string | null;
  } | null;
  base_airport?: AirportSummary | null;
  current_airport?: AirportSummary | null;
};

type RepositionOption = {
  type: string;
  name: string;
  price: string;
  description: string;
};

function formatAirport(airport?: AirportSummary | null, isLoadingAirport = false) {
  if (!airport) return isLoadingAirport ? "Cargando ubicación operacional..." : "No configurado";

  const ident = airport.ident ?? airport.icao ?? airport.iata ?? "N/D";
  const location = [airport.city, airport.country].filter(Boolean).join(" / ");
  const name = airport.name ?? "Aeropuerto asignado";

  return location ? `${ident} - ${name} / ${location}` : `${ident} - ${name}`;
}

export function PilotRepositioningPanel({
  currentAirportFromHub,
  baseAirportFromHub,
  isCrewDataLoading = false,
}: {
  currentAirportFromHub?: AirportSummary | null;
  baseAirportFromHub?: AirportSummary | null;
  isCrewDataLoading?: boolean;
}) {
  const [data, setData] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as AuthMeResponse;
        if (active) setData(payload);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const currentAirport = currentAirportFromHub ?? data?.current_airport;
  const baseAirport = baseAirportFromHub ?? data?.base_airport;
  const isLoadingAirport = isCrewDataLoading || loading;
  const currentIdent = currentAirport?.ident ?? currentAirport?.icao ?? "actual";
  const baseIdent = baseAirport?.ident ?? baseAirport?.icao ?? "hub";

  const options = useMemo<RepositionOption[]>(
    () => [
      {
        type: "Taxi",
        name: "Reposicionamiento cercano",
        price: "$1",
        description: `Mueve solo tu ubicación como piloto desde ${currentIdent}. No mueve aeronaves.`,
      },
      {
        type: "Retorno",
        name: "Regreso a tu hub base",
        price: "$5",
        description: `Reposiciona tu piloto hacia ${baseIdent}. No afecta flota ni reservas.`,
      },
      {
        type: "Vuelo",
        name: "Reposicionamiento nacional",
        price: "$15",
        description: "Traslado personal por vuelo comercial ficticio. Función de cobro pendiente.",
      },
      {
        type: "Conexión",
        name: "Reposicionamiento remoto",
        price: "$30",
        description: "Para moverte a una base lejana cuando la operación lo permita. No mueve aeronaves.",
      },
      {
        type: "Internacional",
        name: "Conexión internacional",
        price: "$80",
        description: "Reposicionamiento personal internacional futuro. Quedará sujeto a reglas y costo.",
      },
      {
        type: "Pendiente",
        name: "Pago y confirmación",
        price: "N/D",
        description: "La transacción real se activará cuando se conecte wallet/economía del piloto.",
      },
    ],
    [baseIdent, currentIdent],
  );

  return (
    <section className={styles.panel} aria-label="Reposicionamiento del piloto">
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Hub Center</p>
          <h3 className={styles.title}>Reposicionamiento del piloto</h3>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.grid}>
          {options.map((option) => (
            <article className={styles.option} key={`${option.type}-${option.name}`}>
              <div className={styles.optionTop}>
                <div>
                  <div className={styles.optionType}>{option.type}</div>
                  <div className={styles.optionName}>{option.name}</div>
                </div>
                <span className={styles.price}>{option.price}</span>
              </div>
              <p className={styles.description}>{option.description}</p>
              <button className={styles.button} type="button" disabled>
                {loading ? "Cargando..." : "Pronto disponible"}
              </button>
            </article>
          ))}
        </div>

        <p className={styles.footer}>
          Ubicación actual: <strong>{formatAirport(currentAirport, isLoadingAirport)}</strong>. Hub base: <strong>{formatAirport(baseAirport, isLoadingAirport)}</strong>. Esta función quedará conectada a costos y wallet más adelante.
        </p>
      </div>
    </section>
  );
}
