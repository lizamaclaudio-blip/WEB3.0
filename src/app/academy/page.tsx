import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function AcademyPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Academia</h1></header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <h2 className="text-lg font-semibold text-slate-50">Academia no disponible</h2>
            <div className="mt-2 space-y-1 text-sm text-slate-300"><p>Duración: Sin datos</p><p>Estado: No disponible</p><p>Costo virtual: No disponible</p></div>
            <button className="mt-4 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100">Ver módulo</button>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
