"use client";

import { useEffect, useMemo, useState } from "react";
import type { CrewCenterData } from "@/components/dashboard/sur/DashboardClient";
import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";

type Pirep = CrewCenterData["recentPireps"][number];
type Movement = CrewCenterData["movements"][number];

type Requirement = {
  label: string;
  required: string;
  current: string;
  complete: boolean;
};

type RankAircraft = {
  code: string;
  name: string;
  rangeNm: number | null;
  seats: number | null;
  status: "AVAILABLE" | "LOCKED";
  label: string;
};

type OfficeRank = {
  rankCode: string;
  displayName: string;
  rankOrder: number;
  accent: "green" | "blue" | "red";
  state: "ACHIEVED" | "CURRENT" | "LOCKED";
  progressPercent: number;
  requirements: Requirement[];
  certifications: string[];
  ratings: string[];
  theoryExams: string[];
  aircraft: RankAircraft[];
  permissions: {
    training: boolean;
    schoolRoutes: boolean;
    commercialRoutes: boolean;
    charter: boolean;
    cargo: boolean;
    aircraftTransfer: boolean;
    pilotReposition: boolean;
    international: boolean;
    oceanic: boolean;
    longRange: boolean;
    widebody: boolean;
    instructor: boolean;
    admin: boolean;
  };
};

type OfficeRanksResponse = {
  ok: boolean;
  error?: string;
  pilot?: {
    callsign: string | null;
    displayName: string | null;
    rankCode: string;
    totalHours: number;
    totalFlights: number;
    score: number;
  };
  ranks?: OfficeRank[];
  updatedAt?: string;
};

const permissionLabels: { key: keyof OfficeRank["permissions"]; label: string }[] = [
  { key: "training", label: "Entrenamiento" },
  { key: "schoolRoutes", label: "Rutas escuela" },
  { key: "commercialRoutes", label: "Ruta oficial" },
  { key: "charter", label: "Charter" },
  { key: "cargo", label: "Carga" },
  { key: "aircraftTransfer", label: "Traslado aeronave" },
  { key: "pilotReposition", label: "Reposicionamiento" },
  { key: "international", label: "Internacional" },
  { key: "oceanic", label: "Oceánico" },
  { key: "widebody", label: "Widebody" },
];

function stateLabel(state: OfficeRank["state"]) {
  if (state === "CURRENT") return "Rango actual";
  if (state === "ACHIEVED") return "Cumplido";
  return "Pendiente";
}

function stateClass(state: OfficeRank["state"]) {
  if (state === "LOCKED") return "locked";
  if (state === "CURRENT") return "current";
  return "achieved";
}

function formatNm(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString("es-CL")} NM` : "N/D";
}

function normalizeText(value: string | null | undefined, fallback = "No registrado") {
  return value && value.trim() ? value.trim() : fallback;
}

function RequirementTable({ requirements }: { requirements: Requirement[] }) {
  return (
    <div className="pw-office-requirement-table-wrap">
      <table className="pw-office-requirement-table">
        <thead>
          <tr>
            <th>Requisito</th>
            <th>Objetivo</th>
            <th>Progreso</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((item) => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>{item.required}</td>
              <td>{item.current}</td>
              <td>
                <span className={`pw-office-status-dot ${item.complete ? "ok" : "pending"}`}>{item.complete ? "OK" : "Pendiente"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PillList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="pw-office-pill-box">
      <h5>{title}</h5>
      <div className="pw-office-pill-list">
        {items.length ? items.map((item) => <span key={item}>{item}</span>) : <span className="muted">No requerido</span>}
      </div>
    </div>
  );
}

function AircraftList({ aircraft }: { aircraft: RankAircraft[] }) {
  return (
    <div className="pw-office-aircraft-grid">
      {aircraft.length ? aircraft.map((item) => (
        <article className={`pw-office-aircraft-card ${item.status === "AVAILABLE" ? "ok" : "locked"}`} key={item.code}>
          <div className="pw-office-aircraft-art">
            <span>{item.code}</span>
          </div>
          <div className="pw-office-aircraft-body">
            <strong>{item.code}</strong>
            <small>{item.name}</small>
            <b>{item.label}</b>
            <em>{formatNm(item.rangeNm)} · {item.seats ?? "N/D"} asientos</em>
          </div>
        </article>
      )) : (
        <article className="pw-office-aircraft-empty">Sin aeronaves asociadas a este rango.</article>
      )}
    </div>
  );
}

function PermissionStrip({ permissions }: { permissions: OfficeRank["permissions"] }) {
  return (
    <div className="pw-office-permission-strip">
      {permissionLabels.map((item) => (
        <span key={item.key} className={permissions[item.key] ? "ok" : "no"}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function RankPanel({ rank }: { rank: OfficeRank }) {
  return (
    <details className={`pw-office-rank-panel ${rank.accent} ${stateClass(rank.state)}`} open={rank.state === "CURRENT"}>
      <summary>
        <span>{rank.displayName}</span>
        <b>{stateLabel(rank.state)}</b>
      </summary>
      <div className="pw-office-rank-content">
        <div className="pw-office-rank-left">
          <div className="pw-office-progress-row">
            <div>
              <strong>Progreso para este rango</strong>
              <span>{rank.progressPercent}%</span>
            </div>
            <div className="pw-office-progress-track"><i style={{ width: `${Math.max(0, Math.min(100, rank.progressPercent))}%` }} /></div>
          </div>
          <RequirementTable requirements={rank.requirements} />
          <PermissionStrip permissions={rank.permissions} />
          <div className="pw-office-three-cols">
            <PillList title="Certificaciones" items={rank.certifications} />
            <PillList title="Habilitaciones" items={rank.ratings} />
            <PillList title="Teóricos" items={rank.theoryExams} />
          </div>
        </div>
        <div className="pw-office-rank-right">
          <h4>Aeronaves disponibles / habilitables</h4>
          <p>Listado por tipo de aeronave, conectado a permisos de rango en Neon.</p>
          <AircraftList aircraft={rank.aircraft} />
        </div>
      </div>
    </details>
  );
}

export function OfficeTab({
  recentPireps = [],
  movements = [],
}: {
  recentPireps?: Pirep[];
  movements?: Movement[];
}) {
  const [career, setCareer] = useState<OfficeRanksResponse | null>(null);
  const [careerError, setCareerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCareer() {
      try {
        const response = await fetch("/api/office/ranks", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as OfficeRanksResponse | null;

        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo cargar la progresión de rangos.");
        if (!cancelled) {
          setCareer(payload);
          setCareerError(null);
        }
      } catch (error) {
        if (!cancelled) setCareerError(error instanceof Error ? error.message : "No se pudo cargar la progresión de rangos.");
      }
    }

    void loadCareer();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentRank = useMemo(
    () => career?.ranks?.find((rank) => rank.state === "CURRENT") ?? career?.ranks?.[0] ?? null,
    [career],
  );

  return (
    <div className="pw-sur-tab-stack">
      <section className="pw-sur-featured-section office">
        <div className="pw-sur-section-banner">Oficina de Operaciones</div>
        <p>Revisa tu carrera, rangos, requisitos, certificaciones, habilitaciones y actividad operacional.</p>
      </section>

      <section className="pw-office-summary-card">
        <div>
          <span>Licencia Regular</span>
          <h3>{normalizeText(currentRank?.displayName, "Perfil operacional")}</h3>
          <p>
            {normalizeText(career?.pilot?.callsign, "PWG")} · {normalizeText(career?.pilot?.displayName, "Piloto Patagonia Wings")}
          </p>
        </div>
        <div className="pw-office-summary-metrics">
          <strong>{career?.pilot?.totalHours?.toLocaleString("es-CL") ?? "0"}<small>h</small></strong>
          <span>Horas registradas</span>
        </div>
        <div className="pw-office-summary-metrics">
          <strong>{career?.pilot?.totalFlights ?? 0}</strong>
          <span>PIREPs / vuelos</span>
        </div>
        <div className="pw-office-summary-metrics">
          <strong>{career?.pilot?.score ?? 0}</strong>
          <span>PW Score</span>
        </div>
      </section>

      <section>
        <h3 className="pw-sur-heading">Rangos, requisitos y aeronaves</h3>
        {careerError && <p className="pw-office-warning">{careerError}</p>}
        <p className="pw-office-note">
          Los rangos se leen desde Neon. Las aeronaves se muestran por tipo/modelo y no por matrícula; el despacho seguirá filtrando por ubicación, ruta y disponibilidad real.
        </p>
        <div className="pw-office-rank-list">
          {career?.ranks?.length ? career.ranks.map((rank) => <RankPanel key={rank.rankCode} rank={rank} />) : (
            <article className="pw-office-empty">Cargando matriz de rangos y requisitos...</article>
          )}
        </div>
      </section>

      <section>
        <h3 className="pw-sur-heading">Tus últimos 10 PIREPs</h3>
        <div className="pw-sur-table-wrap">
          <table className="pw-sur-table compact">
            <thead>
              <tr><th>Avión</th><th>Origen</th><th>Destino</th><th>Score</th><th>Proced.</th><th>Performance</th><th>Tipo</th><th>Computa</th><th>Ver</th></tr>
            </thead>
            <tbody>
              {recentPireps.length ? recentPireps.map((row) => (
                <tr key={`${row.aircraft}-${row.origin}-${row.destination}-${row.score}`}>
                  <td>{row.aircraft}</td><td><IcaoFlagBadge code={row.origin} /></td><td><IcaoFlagBadge code={row.destination} /></td>
                  <td><span className="pw-sur-badge-info">{row.score}</span></td>
                  <td><span className="pw-sur-badge-ok small">{row.procedures}</span></td>
                  <td><span className="pw-sur-badge-ok small">{row.performance}</span></td>
                  <td>{row.type}</td>
                  <td><span className={row.computes === "Computa" ? "pw-sur-compute yes" : "pw-sur-compute no"}>{row.computes}</span></td>
                  <td>→</td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="p-4 text-center text-slate-500">No hay vuelos recientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="pw-sur-note">* El PW Score se calcula en base al promedio de los últimos vuelos computables.</p>
      </section>

      <section>
        <h3 className="pw-sur-heading">Tu Economía</h3>
        <details className="pw-sur-toggle" open>
          <summary>Registro de Movimientos</summary>
          <div className="pw-sur-table-wrap">
            <table className="pw-sur-table compact">
              <thead><tr><th>Fecha</th><th>Descripción</th><th>Coins</th><th>Balance</th></tr></thead>
              <tbody>
                {movements.length ? movements.map((row) => (
                  <tr key={`${row.date}-${row.description}`}><td>{row.date}</td><td>{row.description}</td><td>{row.amount}</td><td><span className="pw-sur-badge-ok small">{row.balance}</span></td></tr>
                )) : (
                  <tr><td colSpan={4} className="p-4 text-center text-slate-500">Sin movimientos registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section>
        <h3 className="pw-sur-heading">Licencia Ejecutiva</h3>
        <article className="pw-sur-license-card">
          <div className="pw-sur-license-icon">VIP</div>
          <div>
            <h4>Próximamente</h4>
            <p>Las licencias ejecutivas se habilitarán cuando activemos economía avanzada, wallet y vuelos corporativos.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
