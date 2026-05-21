"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import type { FleetAircraftPayload } from "@/lib/crew/server-data";
import { usePrivateApi } from "@/lib/supabase/use-private-api";

type FleetResponse = {
  aircraft: FleetAircraftPayload[];
};

export default function FleetPage() {
  const { data, loading, error } = usePrivateApi<FleetResponse>("/api/fleet/available");
  const fleet = data?.aircraft ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Flota</h1></header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fleet.length ? fleet.map((aircraft) => (
            <Card key={aircraft.id}>
              <h2 className="text-lg font-semibold text-slate-50">{aircraft.registration}</h2>
              <p className="text-sm text-slate-300">{aircraft.aircraftTypeCode} · {aircraft.modelDisplayName}</p>
              <div className="mt-2 space-y-1 text-sm text-slate-300">
                <p>Estado: {aircraft.status}</p><p>Rango requerido: {aircraft.rankRequired}</p>
                <p>Autonomía: {aircraft.rangeNm ? `${aircraft.rangeNm.toLocaleString("es-CL")} NM` : "No disponible"}</p><p>Uso recomendado: {aircraft.blockedReason || "No registrado"}</p>
              </div>
            </Card>
          )) : (
            <Card><h2 className="text-lg font-semibold text-slate-50">{loading ? "Cargando flota..." : "Flota no disponible"}</h2><p className="mt-2 text-sm text-slate-300">{error || "No hay aeronaves disponibles."}</p></Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
