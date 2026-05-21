import { Card } from "@/components/ui/Card";

export function NetworkStatusPanel() {
  const rows = [["Rutas activas", "Sin datos"], ["Aeropuertos", "Sin datos"], ["Vuelos hoy", "Sin datos"], ["Pilotos activos", "Sin datos"]];
  return (
    <Card className="min-h-[220px]"><p className="text-xl font-semibold text-white">Red Patagonia</p><div className="mt-4 grid grid-cols-2 gap-3 text-[15px]">{rows.map(([label, value]) => <div key={label} className="rounded-lg border border-white/10 bg-[#0b172a]/75 p-3"><p className="text-slate-400">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div>)}</div></Card>
  );
}
