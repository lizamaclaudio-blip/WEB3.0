import { RegularFlightsView } from "@/components/airline/RegularFlightsView";

export default function RoutesPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <section className="pw-sur-page-header">
        <div className="pw-sur-container">
          <p className="pw-sur-eyebrow">Patagonia Wings 3.0</p>
          <h1>Vuelos Regulares</h1>
          <p>Red operacional de pasajeros y carga.</p>
        </div>
      </section>
      <div className="pw-sur-container py-8">
        <RegularFlightsView />
      </div>
    </main>
  );
}
