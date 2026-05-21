import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-sky-300/40 bg-[linear-gradient(120deg,#0b172a,#0f2742)] p-8 shadow-[0_30px_80px_-42px_rgba(14,165,233,0.75)] sm:min-h-[480px] sm:p-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.26),transparent_45%),repeating-linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.05)_1px,transparent_1px,transparent_26px),repeating-linear-gradient(0deg,rgba(255,255,255,0.04),rgba(255,255,255,0.04)_1px,transparent_1px,transparent_26px)]" />
      <div className="relative max-w-4xl">
        <h1 className="font-[family-name:var(--font-rajdhani)] text-6xl font-bold leading-none text-white sm:text-7xl">Patagonia Wings 3.0</h1>
        <p className="mt-5 text-2xl text-slate-100">Centro operacional virtual para pilotos, despacho, ACARS y economia aerea.</p>
        <p className="mt-3 text-[16px] text-slate-300">Vuela rutas en Chile, Patagonia y Latinoamerica con una plataforma operacional moderna.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard"><Button className="min-h-[46px] px-6">Entrar al Crew Center</Button></Link>
          <Link href="/flights"><Button variant="secondary" className="min-h-[46px] px-6">Buscar vuelos</Button></Link>
          <Link href="/acars"><Button variant="ghost" className="min-h-[46px] px-6">Descargar ACARS</Button></Link>
        </div>
      </div>
    </section>
  );
}
