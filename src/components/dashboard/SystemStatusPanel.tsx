import { Card } from "@/components/ui/Card";

export function SystemStatusPanel() {
  const rows = [["ACARS", "No conectado"], ["SimBrief", "No disponible"], ["Economía", "No disponible"], ["Dispatch", "Pendiente"]];
  return (
    <Card className="min-h-[220px]"><p className="text-xl font-semibold text-white">Estado de sistemas</p><div className="mt-4 space-y-2 text-[15px]">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b172a]/75 px-3 py-2"><span className="text-slate-300">{label}</span><span className="font-semibold text-white">{value}</span></div>)}</div></Card>
  );
}
