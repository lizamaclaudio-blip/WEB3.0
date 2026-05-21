import Link from "next/link";

const links = [
  ["Buscar vuelos", "Explora rutas operativas disponibles."],
  ["Vuelos actuales", "Consulta estado de operaciones activas."],
  ["Ayuda y soporte", "Accede a guias y asistencia operacional."],
  ["Unirme como piloto", "Postula para integrarte a la tripulacion virtual."],
];

export function QuickLinks() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {links.map(([title, text]) => (
          <Link key={title} href="/dashboard" className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-sky-400/55 hover:bg-white">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-300 bg-sky-100 text-sm font-semibold text-sky-700">{title.slice(0, 2).toUpperCase()}</div>
            <p className="text-lg font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-[15px] text-slate-600">{text}</p>
            <p className="mt-2 text-sm text-sky-600">Ver mas →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
