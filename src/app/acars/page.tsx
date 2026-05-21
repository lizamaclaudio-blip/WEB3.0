"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { usePrivateApi } from "@/lib/supabase/use-private-api";

type AcarsResponse = {
  acars: {
    version: string;
    status: string;
    lastPirepStatus: string;
    pendingCloseout: boolean;
  } | null;
};

export default function AcarsPage() {
  const { data, loading, error } = usePrivateApi<AcarsResponse>("/api/acars/status");
  const acars = data?.acars;
  const actions = ["Descargar ACARS", "Ver guía de instalación", "Reenviar PIREP pendiente", "Diagnóstico de conexión"];

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">ACARS Patagonia Wings</h1></header>
        <section className="grid gap-4 xl:grid-cols-3">
          <Card><h2 className="text-base font-semibold">Estado actual</h2><div className="mt-2 space-y-1 text-sm text-slate-300"><p>Versión: {acars?.version || "No disponible"}</p><p>Estado: {loading ? "Cargando..." : acars?.status || error || "No disponible"}</p><p>Último PIREP: {acars?.lastPirepStatus || "Sin actividad reciente"}</p><p>Cierre pendiente: {acars?.pendingCloseout ? "Pendiente" : "No registrado"}</p></div></Card>
          <Card><h2 className="text-base font-semibold">Acciones</h2><div className="mt-3 grid gap-2">{actions.map((action) => (<button key={action} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200">{action}</button>))}</div></Card>
          <Card><h2 className="text-base font-semibold">Compatibilidad</h2><p className="mt-2 text-sm text-slate-300">No disponible.</p></Card>
        </section>
        <Card><p className="text-sm text-slate-300">ACARS funciona como caja negra operacional. Registra telemetría, fases de vuelo, eventos y cierre PIREP para evaluación server-side.</p></Card>
      </div>
    </AppShell>
  );
}
