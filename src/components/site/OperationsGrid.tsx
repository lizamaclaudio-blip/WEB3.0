const items = [
  "Vuela rutas regulares",
  "Charter y operaciones especiales",
  "Entrenamiento y academia",
  "Carga futura",
  "Eventos operacionales",
  "Red Patagonia",
];

export function OperationsGrid() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
      <h2 className="text-3xl font-semibold text-slate-900">Las mejores opciones para volar estan aqui</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-[15px] font-medium text-slate-700">{item}</article>
        ))}
      </div>
    </section>
  );
}
