"use client";

import { useEffect, useMemo, useState } from "react";
import type { CrewCenterData } from "@/components/dashboard/sur/DashboardClient";

type FleetAircraft = CrewCenterData["fleet"][number] & {
  currentAirportName?: string | null;
  homeAirport?: string | null;
  homeAirportName?: string | null;
  seats?: number | null;
  cargoKg?: number | null;
  allowedRankCodes?: string[];
  canFly?: boolean;
  overallHealth?: number | null;
  engineHealth?: number | null;
  fuselageHealth?: number | null;
  gearHealth?: number | null;
};

type FleetCatalogResponse = {
  ok: boolean;
  aircraft?: FleetAircraft[];
  error?: string;
};

type FleetFilter = "ALL" | "AVAILABLE" | "MAINTENANCE" | "ACTIVE" | "ENABLED" | "BLOCKED";

function normalizeStatus(value: string | null | undefined) {
  return String(value || "UNKNOWN").toUpperCase();
}

function statusLabel(value: string | null | undefined) {
  switch (normalizeStatus(value)) {
    case "AVAILABLE":
      return "Disponible";
    case "RESERVED":
    case "TEMP_RESERVED":
      return "Reservada";
    case "IN_FLIGHT":
      return "En vuelo";
    case "MAINTENANCE":
      return "Mantenimiento";
    case "UNAVAILABLE":
      return "No disponible";
    default:
      return value || "No disponible";
  }
}

function statusClass(value: string | null | undefined) {
  const status = normalizeStatus(value);
  if (status === "AVAILABLE") return "ok";
  if (["RESERVED", "TEMP_RESERVED", "IN_FLIGHT"].includes(status)) return "info";
  return "warn";
}

function formatNm(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("es-CL")} NM`
    : "No disponible";
}

function matchesFilter(aircraft: FleetAircraft, filter: FleetFilter) {
  const status = normalizeStatus(aircraft.status);
  const enabled = aircraft.canFly ?? aircraft.enabled;

  if (filter === "AVAILABLE") return status === "AVAILABLE";
  if (filter === "MAINTENANCE") return status === "MAINTENANCE";
  if (filter === "ACTIVE") return ["RESERVED", "TEMP_RESERVED", "IN_FLIGHT"].includes(status);
  if (filter === "ENABLED") return enabled;
  if (filter === "BLOCKED") return !enabled;

  return true;
}

export function FleetTab({ fleet = [] }: { fleet?: FleetAircraft[] }) {
  const [catalogFleet, setCatalogFleet] = useState<FleetAircraft[]>(fleet);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<FleetFilter>("ALL");
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const displayFleet = catalogFleet.length ? catalogFleet : fleet;
  const filteredFleet = useMemo(
    () => displayFleet.filter((aircraft) => matchesFilter(aircraft, filter)),
    [displayFleet, filter],
  );

  const photoKeys = useMemo(
    () =>
      displayFleet
        .map((aircraft) => ({
          key: `${aircraft.aircraftTypeCode}|${aircraft.modelDisplayName || ""}`,
          code: aircraft.aircraftTypeCode || "",
          name: aircraft.modelDisplayName || aircraft.aircraftType || "",
        }))
        .filter((item) => item.code),
    [displayFleet],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFleetCatalog() {
      try {
        const response = await fetch("/api/fleet/catalog", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as FleetCatalogResponse | null;

        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo cargar la flota completa.");
        if (!cancelled) {
          setCatalogFleet(payload.aircraft ?? []);
          setCatalogError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : "No se pudo cargar la flota completa.");
        }
      }
    }

    void loadFleetCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPhotos() {
      const nextMap: Record<string, string> = {};
      await Promise.all(
        photoKeys.map(async (item) => {
          try {
            const params = new URLSearchParams();
            params.set("code", item.code);
            if (item.name) params.set("name", item.name);
            const response = await fetch(`/api/aircraft-photo?${params.toString()}`, { cache: "force-cache" });
            const payload = (await response.json().catch(() => null)) as { imageUrl?: string | null } | null;
            if (payload?.imageUrl) nextMap[item.key] = payload.imageUrl;
          } catch {}
        }),
      );

      if (!cancelled) setPhotoMap(nextMap);
    }

    if (photoKeys.length) void loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [photoKeys]);

  const filterItems: { code: FleetFilter; label: string }[] = [
    { code: "ALL", label: "Todas" },
    { code: "AVAILABLE", label: "Disponibles" },
    { code: "MAINTENANCE", label: "Mantenimiento" },
    { code: "ACTIVE", label: "Reservadas / En vuelo" },
    { code: "ENABLED", label: "Habilitadas para mi rango" },
    { code: "BLOCKED", label: "No habilitadas" },
  ];

  return (
    <div className="pw-sur-tab-stack">
      <section className="pw-sur-featured-section fleet">
        <div className="pw-sur-section-banner">Flota / Hangar</div>
        <p>Consulta el inventario completo de Patagonia Wings. El despacho filtra después por rango, ubicación y ruta.</p>
      </section>

      <div className="pw-fleet-toolbar" role="group" aria-label="Filtros de flota">
        {filterItems.map((item) => (
          <button
            key={item.code}
            type="button"
            className={filter === item.code ? "active" : ""}
            onClick={() => setFilter(item.code)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="pw-fleet-note">
        Mostrando {filteredFleet.length} de {displayFleet.length} aeronaves cargadas en la flota. Esta vista no valida despacho operacional.
      </p>

      {catalogError && <p className="pw-fleet-warning">{catalogError}. Se muestra la flota operativa disponible como respaldo.</p>}

      <div className="pw-sur-fleet-grid">
        {filteredFleet.length ? filteredFleet.map((aircraft) => {
          const photoKey = `${aircraft.aircraftTypeCode}|${aircraft.modelDisplayName || ""}`;
          const photoUrl = photoMap[photoKey];
          const enabled = aircraft.canFly ?? aircraft.enabled;
          const homeAirport = aircraft.homeAirport || "No registrado";
          const currentAirport = aircraft.locationAirport || "No registrado";

          return (
            <article className="pw-sur-fleet-card" key={aircraft.id}>
              <div
                className="pw-sur-aircraft-art"
                style={
                  photoUrl
                    ? {
                        backgroundImage: `linear-gradient(140deg, rgba(7,55,99,.82), rgba(14,165,233,.08)), url('${photoUrl}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
              <div className="pw-sur-fleet-body">
                <h3>{aircraft.registration} · {aircraft.aircraftTypeCode}</h3>
                <p>{aircraft.modelDisplayName}</p>
                <div><span>Estado</span><b className={statusClass(aircraft.status)}>{statusLabel(aircraft.status)}</b></div>
                <div><span>Rango requerido</span><b>{aircraft.rankRequired}</b></div>
                <div><span>Ubicación actual</span><b>{currentAirport}</b></div>
                <div><span>Hub / Base</span><b>{homeAirport}</b></div>
                <div><span>Autonomía</span><b>{formatNm(aircraft.rangeNm)}</b></div>
                <div><span>Permiso piloto</span><b className={enabled ? "ok" : "warn"}>{enabled ? "Habilitada" : "No habilitada"}</b></div>
                {typeof aircraft.overallHealth === "number" && <div><span>Condición</span><b>{aircraft.overallHealth}%</b></div>}
                {aircraft.blockedReason && <div><span>Motivo</span><b>{aircraft.blockedReason}</b></div>}
              </div>
            </article>
          );
        }) : (
          <article className="pw-sur-fleet-card">
            <div className="pw-sur-aircraft-art" />
            <div className="pw-sur-fleet-body">
              <h3>No hay aeronaves para este filtro</h3>
              <p>La flota completa existe separada del despacho. Cambia el filtro para ver otras aeronaves.</p>
              <div><span>Estado</span><b className="warn">Sin resultados</b></div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
