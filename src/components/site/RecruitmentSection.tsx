import { Button } from "@/components/ui/Button";

export function RecruitmentSection() {
  return (
    <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-7 lg:grid-cols-2">
      <div>
        <h2 className="text-4xl font-semibold text-slate-950">Quieres ser parte de nuestra tripulacion?</h2>
        <p className="mt-4 text-[16px] text-slate-600">Unete como piloto virtual, progresa por rangos, opera rutas en Chile, Patagonia y Latinoamerica, y registra tus vuelos con ACARS.</p>
        <div className="mt-6"><Button className="min-h-[46px] px-6">Unirme como piloto</Button></div>
      </div>
      <div className="min-h-[220px] rounded-xl border border-sky-300/35 bg-[radial-gradient(circle_at_30%_35%,rgba(56,189,248,0.36),transparent_50%),linear-gradient(120deg,#0f2742,#0b172a)]" />
    </section>
  );
}
