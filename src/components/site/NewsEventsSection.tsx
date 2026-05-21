const news = [
  ["16 MAY 2026", "Nueva plataforma Patagonia Wings 3.0 en desarrollo"],
  ["14 MAY 2026", "ACARS integrado al ecosistema operacional"],
  ["10 MAY 2026", "Proxima apertura de academia virtual"],
];

const events = [
  ["20 MAY 2026", "Vuelo inaugural Patagonia Norte"],
  ["24 MAY 2026", "Entrenamiento IFR basico"],
  ["28 MAY 2026", "Evento aproximacion austral"],
];

export function NewsEventsSection() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-2xl font-semibold text-slate-900">Ultimas noticias</h3>
        <ul className="mt-4 space-y-4 text-[15px] text-slate-700">{news.map(([d, t]) => <li key={t} className="border-b border-slate-200 pb-3 last:border-b-0"><p className="text-xs text-slate-500">{d}</p><p className="mt-1 font-medium">{t}</p><p className="mt-1 text-sky-600">Mas informacion</p></li>)}</ul>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-2xl font-semibold text-slate-900">Proximos eventos</h3>
        <ul className="mt-4 space-y-4 text-[15px] text-slate-700">{events.map(([d, t]) => <li key={t} className="border-b border-slate-200 pb-3 last:border-b-0"><p className="text-xs text-slate-500">{d}</p><p className="mt-1 font-medium">{t}</p><p className="mt-1 text-sky-600">Mas informacion</p></li>)}</ul>
      </div>
    </section>
  );
}
