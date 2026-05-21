"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { usePrivateApi } from "@/lib/supabase/use-private-api";

type PermissionsResponse = {
  permissions: {
    permittedAircraftTypes: string[];
  } | null;
};

export default function TrainingPage() {
  const { data, loading, error } = usePrivateApi<PermissionsResponse>("/api/pilot/permissions");
  const modules = data?.permissions?.permittedAircraftTypes ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Entrenamiento Operacional</h1></header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.length ? modules.map((module) => (
            <Card key={module}>
              <h2 className="text-lg font-semibold text-slate-50">{module}</h2>
              <div className="mt-2 space-y-1 text-sm text-slate-300">
                <p>Duración estimada: Sin datos</p><p>Aeronave sugerida: {module}</p>
                <p>Costo virtual: No disponible</p><p className="text-emerald-400">Registrada</p>
              </div>
            </Card>
          )) : (
            <Card><h2 className="text-lg font-semibold text-slate-50">Entrenamiento no disponible</h2><p className="mt-2 text-sm text-slate-300">{loading ? "Cargando..." : error || "No hay entrenamientos disponibles."}</p></Card>
          )}
        </section>
        <Card><p className="text-sm text-slate-300">Los entrenamientos pueden generar gastos de progresión en la economía virtual del piloto cuando el sistema real esté configurado.</p></Card>
      </div>
    </AppShell>
  );
}
