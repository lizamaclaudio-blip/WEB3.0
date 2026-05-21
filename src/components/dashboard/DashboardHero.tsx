import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function DashboardHero() {
  return (
    <Card className="min-h-[360px] border-sky-300/45 bg-[linear-gradient(122deg,rgba(11,23,42,0.96),rgba(15,39,66,0.86))]">
      <div className="grid gap-7 lg:grid-cols-[1.5fr_0.95fr]">
        <div className="relative overflow-hidden rounded-xl p-1">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.3),transparent_44%),repeating-linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.06)_1px,transparent_1px,transparent_26px),repeating-linear-gradient(0deg,rgba(255,255,255,0.05),rgba(255,255,255,0.05)_1px,transparent_1px,transparent_26px)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Crew Center</p>
            <h1 className="mt-2 font-[family-name:var(--font-rajdhani)] text-6xl font-bold leading-none text-white">Crew Center Patagonia Wings</h1>
            <p className="mt-4 text-[18px] text-slate-100">Gestiona tus vuelos, despacho, progreso, ACARS y economía virtual desde un solo lugar.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="warning">Perfil pendiente</Badge>
              <Badge tone="warning">ACARS sin actividad reciente</Badge>
              <Badge tone="neutral">No registrado</Badge>
              <Badge tone="info">Próxima operación no disponible</Badge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dispatch"><Button className="min-h-[46px] px-6">Continuar despacho</Button></Link>
              <Link href="/flights"><Button variant="secondary" className="min-h-[46px] px-6">Buscar vuelos</Button></Link>
              <Link href="/acars"><Button variant="ghost" className="min-h-[46px] px-6">Abrir ACARS</Button></Link>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-cyan-300/45 bg-[#0b172a]/65 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Próxima operación</p>
          <p className="mt-3 text-5xl font-bold text-white">Sin datos</p>
          <p className="mt-2 text-[16px] text-slate-100">Aeropuerto no configurado</p>
          <p className="mt-1 text-[16px] text-slate-100">Aeronave no registrada</p>
          <p className="mt-3 inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">Estado: Pendiente</p>
          <div className="mt-5"><Link href="/dispatch"><Button className="w-full min-h-[46px]">Continuar despacho</Button></Link></div>
        </aside>
      </div>
    </Card>
  );
}
