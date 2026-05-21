import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

const quickActions = [
  { id: "dispatch", label: "Despacho", description: "Buscar rutas disponibles.", tag: "Operación", href: "/dispatch" },
  { id: "fleet", label: "Flota", description: "Ver aeronaves reales disponibles.", tag: "Hangar", href: "/fleet" },
  { id: "flights", label: "Vuelos", description: "Revisar historial real.", tag: "Historial", href: "/flights" },
];

export function QuickActionsPanel() {
  return (
    <Card>
      <SectionHeader title="Accesos rápidos" subtitle="Acciones principales del portal" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.id} href={action.href} className="group min-h-[120px] rounded-xl border border-white/10 bg-[#0b172a]/80 p-4 transition-colors hover:border-sky-400/45 hover:bg-[#0f2742]/70">
            <div className="flex items-start justify-between"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/40 bg-sky-500/15 text-sm font-semibold text-sky-200">{action.label.slice(0,2).toUpperCase()}</span><span className="text-sky-300">→</span></div>
            <p className="mt-3 text-lg font-semibold text-white">{action.label}</p>
            <p className="mt-1 text-[15px] text-slate-300">{action.description}</p>
            <p className="mt-2 inline-flex rounded-full border border-sky-400/35 bg-sky-900/20 px-2.5 py-1 text-xs text-sky-200">{action.tag}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
