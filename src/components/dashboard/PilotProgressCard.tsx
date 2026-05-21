import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function PilotProgressCard() {
  return (
    <Card className="min-h-[240px]"><SectionHeader title="Progreso del piloto" subtitle="Rango: No registrado" /><p className="text-3xl font-bold text-white">0 h</p><p className="mt-2 text-[15px] text-slate-300">Próximo rango: No disponible</p><div className="mt-5"><div className="h-3 w-full rounded-full bg-slate-700"><div className="h-3 rounded-full bg-gradient-to-r from-sky-700 to-sky-400" style={{ width: "0%" }} /></div><p className="mt-2 text-sm text-slate-300">Progreso 0%</p></div></Card>
  );
}
