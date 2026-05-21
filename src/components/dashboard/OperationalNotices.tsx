import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function OperationalNotices() {
  return (
    <Card className="min-h-[360px]"><SectionHeader title="Comunicados operacionales" subtitle="Noticias internas de operación" /><div className="rounded-lg border border-white/10 bg-[#0b172a]/80 p-3 text-[15px] text-slate-200">Sin comunicados activos.</div></Card>
  );
}
