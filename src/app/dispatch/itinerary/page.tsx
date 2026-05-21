"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import type { DispatchRoutePayload } from "@/lib/crew/server-data";
import { usePrivateApi } from "@/lib/supabase/use-private-api";

type RoutesResponse = {
  routes: DispatchRoutePayload[];
};

export default function ItineraryPage() {
  const { data, loading, error } = usePrivateApi<RoutesResponse>("/api/routes/available");
  const routes = data?.routes ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Reserva de Itinerario</h1></header>
        <Card>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {["Origen", "Destino", "Aeronave", "Rango requerido", "Duración"].map((filter) => (
              <div key={filter} className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-300">{filter}</div>
            ))}
          </div>
        </Card>
        <section className="grid gap-4">
          {routes.length ? routes.map((route) => {
            const available = route.active;
            return (
              <Card key={route.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{route.flightNumber}</p>
                    <h2 className="text-lg font-semibold text-slate-50">{route.origin} → {route.destination}</h2>
                    <p className="text-sm text-slate-300">{route.originAirport} → {route.destinationAirport}</p>
                    <p className="mt-1 text-sm text-slate-400">{route.aircraftTypeRequired}</p>
                  </div>
                  <div className="space-y-2 lg:text-right">
                    <p className={`text-sm font-semibold ${available ? "text-emerald-400" : "text-amber-300"}`}>{available ? "Disponible" : route.blockedReason || "No disponible"}</p>
                    <p className="text-sm text-slate-300">Ganancia estimada: No disponible</p>
                    <button className={`rounded-xl px-4 py-2 text-sm font-semibold ${available ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>{available ? "Seleccionar" : "Bloqueado"}</button>
                  </div>
                </div>
              </Card>
            );
          }) : (
            <Card><p className="text-sm text-slate-300">{loading ? "Cargando rutas..." : error || "No hay rutas disponibles para tu perfil."}</p></Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
