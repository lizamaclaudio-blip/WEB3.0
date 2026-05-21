import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function FlightStatusCard() {
  return (
    <Card className="min-h-[240px]"><SectionHeader title="Próximo vuelo" subtitle="Operación en foco" /><p className="text-3xl font-bold text-white">No hay reserva activa</p><p className="mt-1 text-[15px] text-slate-300">Aeronave no registrada</p><div className="mt-3"><Badge tone="warning">Pendiente</Badge></div><div className="mt-5"><Link href="/dispatch" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 px-4 py-2.5 text-sm font-semibold text-white">Continuar despacho</Link></div></Card>
  );
}
