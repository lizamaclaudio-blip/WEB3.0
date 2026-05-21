import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function AcarsStatusCard() {
  return (
    <Card className="min-h-[240px]"><SectionHeader title="Estado ACARS" /><div className="space-y-3 text-[15px] text-slate-200"><p className="flex items-center gap-2"><span className="text-slate-400">Estado:</span><Badge tone="warning">No conectado</Badge></p><p><span className="text-slate-400">Versión:</span> No disponible</p><p><span className="text-slate-400">Último PIREP:</span> Sin actividad reciente</p></div><div className="mt-5 grid gap-2"><Link href="/acars" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b172a] border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100">Abrir ACARS</Link><Link href="/acars" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-900/25 border border-sky-400/40 px-4 py-2 text-sm font-semibold text-sky-100">Diagnóstico</Link></div></Card>
  );
}
