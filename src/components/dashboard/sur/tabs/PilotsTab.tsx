import type { CrewCenterData } from "@/components/dashboard/sur/DashboardClient";

type Pilot = CrewCenterData["pilots"][number];

export function PilotsTab({
  currentPilot,
  pilots = [],
}: {
  currentPilot?: CrewCenterData["pilot"];
  pilots?: Pilot[];
}) {
  const visiblePilots = pilots.length
    ? pilots
    : currentPilot?.callsign
      ? [{
          callsign: currentPilot.callsign,
          name: currentPilot.name || "No registrado",
          rank: currentPilot.rank || "No registrado",
          hours: currentPilot.hours ? String(currentPilot.hours) : "Sin datos",
          pireps: "Sin datos",
          score: currentPilot.progress ? String(currentPilot.progress) : "Sin datos",
        }]
      : [];

  return (
    <div className="pw-sur-tab-stack">
      <section className="pw-sur-featured-section pilots">
        <div className="pw-sur-section-banner">Nuestros Pilotos</div>
        <p>Listado operacional de pilotos Patagonia Wings.</p>
      </section>

      <section>
        <h3 className="pw-sur-heading">Listado de pilotos</h3>
        <div className="pw-sur-table-wrap">
          <table className="pw-sur-table compact">
            <thead><tr><th>Callsign</th><th>Nombre</th><th>Rango</th><th>Horas</th><th>PIREPs</th><th>PW Score</th></tr></thead>
            <tbody>
              {visiblePilots.length ? visiblePilots.map((row) => (
                <tr key={row.callsign}>
                  <td><span className="pw-sur-badge-info">{row.callsign}</span></td>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.rank}</td>
                  <td>{row.hours}</td>
                  <td>{row.pireps}</td>
                  <td><span className="pw-sur-badge-ok small">{row.score}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">Sin pilotos visibles.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
