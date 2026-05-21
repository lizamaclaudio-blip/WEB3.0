import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmedFlightCallout } from "@/components/dashboard/sur/ConfirmedFlightCallout";
import { CrewHeader } from "@/components/layout/CrewHeader";
import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { buildCrewCenterPayload } from "@/lib/dispatch/neon-ops";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function valueOrDash(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "No registrado";
}

export default async function MiPerfilPage() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) redirect("/login");

  const data = await buildCrewCenterPayload(user);
  const currentAirport = data.airport ?? data.hub;
  const activeReservation = data.activeReservation ?? data.reservedFlight ?? null;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <CrewHeader pilot={data.pilot} />

      <section className="pw-sur-page-header compact">
        <div className="pw-sur-container">
          <p className="pw-sur-eyebrow">Patagonia Wings 3.0 Crew Center</p>
          <h1>Mi perfil</h1>
          <p>Resumen operacional, progreso, rango y estado actual del piloto.</p>
        </div>
      </section>

      <div className="pw-sur-container py-8">
        <ConfirmedFlightCallout reservedFlight={activeReservation} />

        <section className="pw-profile-hero-card">
          <div className="pw-profile-avatar" aria-hidden="true">
            {valueOrDash(data.pilot.callsign).slice(0, 2)}
          </div>
          <div>
            <span className="pw-profile-kicker">Piloto Patagonia Wings</span>
            <h2>{data.pilot.name}</h2>
            <p>
              <strong>{data.pilot.callsign}</strong> · {data.pilot.rank} · Estado {data.pilot.status}
            </p>
          </div>
          <div className="pw-profile-actions">
            <Link href="/dashboard" className="pw-sur-btn pw-sur-btn-primary">Volver al Crew Center</Link>
            <Link href="/mis-datos" className="pw-sur-btn pw-sur-btn-dark">Mis datos</Link>
          </div>
        </section>

        <section className="pw-profile-grid mt-6">
          <article className="pw-profile-card">
            <h3>Ubicacion operacional</h3>
            <dl>
              <div><dt>Base</dt><dd>{data.pilot.baseIcao}</dd></div>
              <div>
                <dt>Actual</dt>
                <dd>
                  {currentAirport ? (
                    <span className="pw-profile-airport-line">
                      <IcaoFlagBadge icao={currentAirport.icao} countryCode={currentAirport.countryCode} size="sm" />
                      {currentAirport.name} / {currentAirport.city}
                    </span>
                  ) : "No registrado"}
                </dd>
              </div>
              <div><dt>Rango tecnico</dt><dd>{data.pilot.rankCode}</dd></div>
            </dl>
          </article>

          <article className="pw-profile-card">
            <h3>Progreso</h3>
            <dl>
              <div><dt>Horas totales</dt><dd>{data.pilot.hours}</dd></div>
              <div><dt>PIREP reportados</dt><dd>{data.counters.totalPireps}</dd></div>
              <div><dt>PW Score</dt><dd>{data.counters.score}</dd></div>
              <div><dt>Coins</dt><dd>${data.counters.coins}</dd></div>
            </dl>
          </article>

          <article className="pw-profile-card">
            <h3>Habilitaciones</h3>
            {data.permissions?.permittedAircraftTypes.length ? (
              <div className="pw-profile-chip-list">
                {data.permissions.permittedAircraftTypes.map((item) => <span key={item}>{item}</span>)}
              </div>
            ) : (
              <p>No hay habilitaciones cargadas.</p>
            )}
          </article>

          <article className="pw-profile-card">
            <h3>Despacho</h3>
            <dl>
              <div><dt>Rutas disponibles</dt><dd>{data.dispatchSummary.routesAvailable}</dd></div>
              <div><dt>Aeronaves disponibles</dt><dd>{data.dispatchSummary.aircraftAvailable}</dd></div>
              <div><dt>Reserva activa</dt><dd>{data.dispatchSummary.activeReservation ? "Si" : "No"}</dd></div>
            </dl>
          </article>
        </section>
      </div>
    </main>
  );
}
