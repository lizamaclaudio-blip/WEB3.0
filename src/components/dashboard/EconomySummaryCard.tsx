import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function EconomySummaryCard() {
  return (
    <Card className="min-h-[240px]"><SectionHeader title="Economía virtual" /><p className="mb-3 text-3xl font-bold text-white">No disponible</p><div className="grid gap-3 sm:grid-cols-2"><MetricCard label="Salario devengado" value="No disponible" helper="Liquidación pendiente" /><MetricCard label="Gasto progresión" value="No disponible" /></div><div className="mt-4"><Link href="/economy" className="text-sm text-sky-300">Revisar economía</Link></div></Card>
  );
}
