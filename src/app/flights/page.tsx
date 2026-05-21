"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import type { PirepPayload } from "@/lib/crew/server-data";
import { usePrivateApi } from "@/lib/supabase/use-private-api";

type FlightsResponse = {
  recentFlights: PirepPayload[];
};

export default function FlightsPage() {
  const { data, loading, error } = usePrivateApi<FlightsResponse>("/api/reservations/recent");
  const flights = data?.recentFlights ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Historial de Vuelos</h1></header>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
              <thead className="text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-2">Fecha</th><th className="pb-2">Ruta</th><th className="pb-2">Aeronave</th><th className="pb-2">Tipo</th><th className="pb-2">Estado</th><th className="pb-2">Score</th><th className="pb-2">Resultado económico</th><th className="pb-2">Acción</th></tr></thead>
              <tbody>
                {flights.length ? flights.map((flight) => (
                  <tr key={`${flight.date}-${flight.origin}-${flight.destination}-${flight.aircraft}`} className="border-t border-white/10">
                    <td className="py-3">{flight.date}</td><td className="py-3">{flight.origin} → {flight.destination}</td><td className="py-3">{flight.aircraft}</td><td className="py-3">{flight.type}</td><td className="py-3">{flight.computes}</td><td className="py-3">{flight.score}</td><td className="py-3">No disponible</td>
                    <td className="py-3"><span className="text-slate-400">Sin detalle</span></td>
                  </tr>
                )) : (
                  <tr className="border-t border-white/10"><td colSpan={8} className="py-4 text-center">{loading ? "Cargando..." : error || "No hay vuelos recientes."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
