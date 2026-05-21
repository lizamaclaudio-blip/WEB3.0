import { Card } from "@/components/ui/Card";

export function OperationalMapPanel() {
  return (
    <Card className="min-h-[220px]"><p className="text-xl font-semibold text-white">Mapa operacional</p><div className="mt-4 rounded-xl border border-sky-400/30 bg-[#0b172a]/75 p-4"><div className="mb-4 h-20 rounded-lg bg-[repeating-linear-gradient(90deg,rgba(56,189,248,0.2),rgba(56,189,248,0.2)_1px,transparent_1px,transparent_22px)]" /><p className="text-2xl font-bold text-white">Sin datos</p><p className="mt-1 text-[15px] text-slate-300">Distancia estimada: No disponible</p><p className="mt-1 inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">Pendiente</p></div></Card>
  );
}
