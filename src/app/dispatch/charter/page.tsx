import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function CharterPage() {
  const fields = ["Aeropuerto origen", "Aeropuerto destino", "Aeronave", "Pasajeros", "Carga", "Nivel de vuelo", "Alternativo", "Observaciones"];

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Operación Charter</h1></header>
        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field} className="text-sm text-slate-300">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">{field}</span>
                  <input readOnly value="" className="w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-slate-200" />
                </label>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-50">Estimación operacional</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>Distancia estimada: No disponible</p><p>Combustible estimado: No disponible</p>
              <p>Ingreso estimado: No disponible</p><p>Costo estimado: No disponible</p>
              <p>Utilidad estimada: No disponible</p><p>Estado: No disponible</p>
            </div>
            <div className="mt-4 grid gap-2">
              <button className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-100">Calcular estimación</button>
              <button className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950">Continuar a OFP</button>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}


