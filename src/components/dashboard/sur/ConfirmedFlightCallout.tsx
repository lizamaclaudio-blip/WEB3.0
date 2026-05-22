"use client";

import { useEffect, useMemo, useState } from "react";

type ReservedFlight = {
  id?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  aircraft?: string;
  aircraftRegistration?: string;
  aircraftType?: string;
  registration?: string;
  status?: string;
  operationType?: string;
  scoreMode?: string;
  expiresAt?: string | null;
  acarsStatus?: string | null;
  canCancel?: boolean;
  canContinue?: boolean;
};

type ActiveReservationResponse = {
  ok?: boolean;
  hasActiveReservation?: boolean;
  reservation?: ReservedFlight | null;
  activeReservation?: ReservedFlight | null;
};

type ConfirmedFlightCalloutProps = {
  reservedFlight?: ReservedFlight | null;
};

function statusLabel(value?: string | null) {
  const status = String(value ?? "").trim().toUpperCase();
  const labels: Record<string, string> = {
    TEMP_RESERVED: "Despacho temporal",
    ACARS_READY: "Listo para ACARS",
    ACARS_CLAIMED: "Tomado por ACARS",
    IN_FLIGHT: "Vuelo en curso",
    LANDED: "Aterrizado",
    PENDING_EVALUATION: "Pendiente de evaluacion",
    EVALUATED: "Evaluado",
    RESERVED: "Reservado",
    DISPATCHED: "Despachado",
  };
  return labels[status] ?? (status ? status.replaceAll("_", " ") : "Despacho activo");
}

function operationLabel(value?: string | null, fallback?: string | null) {
  const code = String(value ?? "").trim().toUpperCase();
  const labels: Record<string, string> = {
    TRAINING_FREE: "Entrenamiento libre",
    SCHOOL_OFFICIAL_ROUTE: "Ruta oficial",
    COMMERCIAL_OFFICIAL_ROUTE: "Ruta oficial",
    CHARTER_OFFICIAL: "Charter",
    CARGO_OFFICIAL: "Carga",
    AIRCRAFT_TRANSFER: "Traslado de aeronave",
    EVENT_TOUR: "Evento / Tour",
  };
  return labels[code] ?? fallback ?? "Despacho activo";
}

function formatRemaining(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return null;
  const ms = expires - Date.now();
  if (ms <= 0) return "Por vencer";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ConfirmedFlightCallout({ reservedFlight }: ConfirmedFlightCalloutProps) {
  const [flight, setFlight] = useState<ReservedFlight | null>(reservedFlight ?? null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadActiveReservation() {
      try {
        const response = await fetch("/api/dispatch/active-reservation", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const json = (await response.json()) as ActiveReservationResponse;
        if (!cancelled) setFlight(json.reservation ?? json.activeReservation ?? null);
      } catch {
        // Non-blocking for dashboard rendering.
      }
    }

    void loadActiveReservation();
    const interval = window.setInterval(() => setNowTick((value) => value + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const remaining = useMemo(() => {
    void nowTick;
    return formatRemaining(flight?.expiresAt);
  }, [flight?.expiresAt, nowTick]);

  if (!flight) return null;

  const origin = flight.origin || "Origen";
  const destination = flight.destination || "Destino";
  const aircraft = flight.aircraftRegistration || flight.registration || flight.aircraft || "Aeronave pendiente";
  const canCancel = flight.canCancel !== false && Boolean(flight.id);

  async function cancelReservation() {
    if (!flight?.id || loading) return;
    const ok = window.confirm("Anular este despacho activo? Podras crear un nuevo despacho despues.");
    if (!ok) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dispatch/cancel-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reservationId: flight.id }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo anular el despacho.");
      }
      setMessage("Despacho anulado correctamente.");
      setFlight(null);
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo anular el despacho.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pw-active-reservation-banner" aria-live="polite">
      <div className="pw-active-reservation-main">
        <span className="pw-active-reservation-kicker">Despacho ACARS activo</span>
        <h2>
          {operationLabel(flight.operationType, flight.flightNumber)} - <strong>{origin}</strong> - <strong>{destination}</strong>
        </h2>
        <p>
          Aeronave <strong>{aircraft}</strong> - Estado <strong>{statusLabel(flight.status)}</strong>
          {remaining ? <> - Tiempo restante <strong>{remaining}</strong></> : null}
        </p>
        <small>
          No puedes crear otro despacho hasta continuar, finalizar o anular este despacho activo.
        </small>
        {message ? <p className="pw-active-reservation-message">{message}</p> : null}
      </div>
      <div className="pw-active-reservation-actions">
        <a href="/dashboard#despachos" className="pw-sur-btn pw-sur-btn-primary">Continuar despacho</a>
        {canCancel ? (
          <button type="button" className="pw-sur-btn pw-sur-btn-dark" onClick={cancelReservation} disabled={loading}>
            {loading ? "Anulando..." : "Anular despacho activo"}
          </button>
        ) : (
          <button type="button" className="pw-sur-btn pw-sur-btn-disabled" disabled>No anulable</button>
        )}
      </div>
    </section>
  );
}
