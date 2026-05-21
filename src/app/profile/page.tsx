"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import type { CrewCenterPayload } from "@/lib/crew/server-data";
import { usePrivateApi } from "@/lib/supabase/use-private-api";

type ProfileResponse = {
  pilot: CrewCenterPayload["pilot"];
};

export default function ProfilePage() {
  const { data, loading, error } = usePrivateApi<ProfileResponse>("/api/pilot/profile");
  const pilot = data?.pilot;

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Perfil del Piloto</h1></header>
        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p>Nombre: {pilot?.name || (loading ? "Cargando..." : error || "Perfil pendiente")}</p><p>Callsign: {pilot?.callsign || "No registrado"}</p><p>Rango: {pilot?.rank || "No registrado"}</p><p>Horas totales: {pilot?.hours ?? "Sin datos"}</p>
              <p>Base: {pilot?.baseIcao || "No registrado"}</p><p>Licencias: {pilot?.licenses.length ? pilot.licenses.join(", ") : "No registrado"}</p><p>Habilitaciones: {pilot?.ratings.length ? pilot.ratings.join(", ") : "No registrado"}</p><p>Próximo rango: No disponible</p>
            </div>
            <div className="mt-4"><div className="h-2 w-full rounded-full bg-slate-700"><div className="h-2 rounded-full bg-sky-400" style={{ width: `${pilot?.progress ?? 0}%` }} /></div><p className="mt-2 text-xs text-slate-400">Progreso: {pilot?.progress ?? 0}%</p></div>
          </Card>
          <Card><h2 className="text-base font-semibold">Integraciones</h2><ul className="mt-2 space-y-1 text-sm text-slate-300"><li>ACARS: No disponible</li><li>SimBrief: No disponible</li></ul></Card>
        </section>
      </div>
    </AppShell>
  );
}
