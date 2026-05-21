import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function RecentFlightsPanel() {
  return (
    <Card className="min-h-[360px]"><SectionHeader title="Vuelos recientes" subtitle="Resumen de operaciones" /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[15px] text-slate-200"><thead className="text-sm font-semibold text-slate-300"><tr><th className="pb-3">Fecha</th><th className="pb-3">Ruta</th><th className="pb-3">Aeronave</th><th className="pb-3">Estado</th><th className="pb-3">Score</th><th className="pb-3">Resultado económico</th></tr></thead><tbody><tr className="border-t border-white/10"><td colSpan={6} className="py-4 text-center text-slate-300">No hay vuelos recientes.</td></tr></tbody></table></div></Card>
  );
}
