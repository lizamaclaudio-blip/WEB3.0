import type { CrewCenterData } from "@/components/dashboard/sur/DashboardClient";

export function MainOperationsBanner({ data }: { data?: CrewCenterData | null }) {
  const origin = data?.activeReservation?.origin || data?.hub?.icao || "No configurado";

  return (
    <section className="pw-sur-featured-box">
      <div className="pw-sur-banner">
        <div>
          <span>Patagonia Wings Operations</span>
          <h2>Chile · Patagonia · Latinoamérica</h2>
          <p>Despachos, rutas activas, entrenamiento y seguimiento operacional para pilotos virtuales.</p>
          <p className="pw-sur-note">Origen operativo actual: {origin}</p>
        </div>
      </div>
    </section>
  );
}
