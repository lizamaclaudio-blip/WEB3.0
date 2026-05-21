import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function FlightDetailPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Detalle de Vuelo</h1></header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card><h2 className="text-base font-semibold">Resumen operacional</h2><p className="mt-2 text-sm text-slate-300">Estado: No disponible · Score: N/D · Tiempo: Sin datos</p></Card>
          <Card><h2 className="text-base font-semibold">Ruta</h2><p className="mt-2 text-sm text-slate-300">Sin datos</p></Card>
          <Card><h2 className="text-base font-semibold">Aeronave</h2><p className="mt-2 text-sm text-slate-300">Sin datos</p></Card>
          <Card><h2 className="text-base font-semibold">ACARS / PIREP</h2><p className="mt-2 text-sm text-slate-300">Sin actividad reciente.</p></Card>
          <Card><h2 className="text-base font-semibold">Planificado vs real</h2><p className="mt-2 text-sm text-slate-300">Combustible planificado: Sin datos<br />Combustible real: Sin datos</p></Card>
          <Card><h2 className="text-base font-semibold">Economía</h2><p className="mt-2 text-sm text-slate-300">Utilidad estimada: No disponible<br />Utilidad real: No disponible<br />Devengo piloto: No disponible<br />Ledger aerolínea: No disponible</p></Card>
        </section>
        <Card><h2 className="text-base font-semibold">Eventos operacionales</h2><p className="mt-2 text-sm text-slate-300">Sin datos.</p></Card>
      </div>
    </AppShell>
  );
}
