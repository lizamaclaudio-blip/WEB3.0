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

function fieldValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "No registrado";
}

export default async function MisDatosPage() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) redirect("/login");

  const data = await buildCrewCenterPayload(user);
  const activeReservation = data.activeReservation ?? data.reservedFlight ?? null;
  const currentAirport = data.airport ?? data.hub;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <CrewHeader pilot={data.pilot} />

      <section className="pw-sur-page-header compact">
        <div className="pw-sur-container">
          <p className="pw-sur-eyebrow">Patagonia Wings 3.0 Crew Center</p>
          <h1>Mis datos</h1>
          <p>Informacion de cuenta, preferencias operacionales e integraciones futuras.</p>
        </div>
      </section>

      <div className="pw-sur-container py-8">
        <ConfirmedFlightCallout reservedFlight={activeReservation} />

        <section className="pw-profile-grid">
          <article className="pw-profile-card wide">
            <h3>Datos de cuenta</h3>
            <div className="pw-data-form-grid">
              <label><span>Nombre visible</span><input value={fieldValue(user.displayName || data.pilot.name)} readOnly /></label>
              <label><span>Correo electronico</span><input value={fieldValue(user.email)} readOnly /></label>
              <label><span>Callsign</span><input value={fieldValue(data.pilot.callsign)} readOnly /></label>
              <label><span>Rango</span><input value={fieldValue(data.pilot.rank)} readOnly /></label>
              <label><span>Estado piloto</span><input value={fieldValue(data.pilot.status)} readOnly /></label>
              <label><span>ID piloto</span><input value={fieldValue(data.pilot.id)} readOnly /></label>
            </div>
            <p className="pw-profile-note">La edicion directa de datos personales quedara habilitada cuando cerremos el panel de cuenta y validaciones de seguridad.</p>
          </article>

          <article className="pw-profile-card">
            <h3>Ubicacion</h3>
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
            </dl>
          </article>

          <article className="pw-profile-card">
            <h3>Integraciones</h3>
            <dl>
              <div><dt>ACARS</dt><dd>Pendiente de conectar al final</dd></div>
              <div><dt>SimBrief</dt><dd>Pendiente</dd></div>
              <div><dt>Navigraph</dt><dd>Pendiente</dd></div>
              <div><dt>SayIntentions</dt><dd>Pendiente / futuro ATC oficial</dd></div>
            </dl>
          </article>

          <article className="pw-profile-card wide">
            <h3>Preferencias operacionales</h3>
            <div className="pw-data-form-grid">
              <label><span>Simulador principal</span><input value="Microsoft Flight Simulator" readOnly /></label>
              <label><span>Red preferida</span><input value="Offline / SayIntentions / VATSIM futuro" readOnly /></label>
              <label><span>Idioma operacional</span><input value="Espanol" readOnly /></label>
              <label><span>Modo despacho</span><input value="Crew Center Patagonia Wings" readOnly /></label>
            </div>
            <div className="pw-profile-actions left mt-4">
              <Link href="/mi-perfil" className="pw-sur-btn pw-sur-btn-dark">Mi perfil</Link>
              <Link href="/dashboard" className="pw-sur-btn pw-sur-btn-primary">Volver al Crew Center</Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
