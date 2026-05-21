import Link from "next/link";

const highlights = [
  {
    id: "informacion-publica",
    title: "Somos Patagonia Wings",
    text: "Una aerolínea virtual enfocada en operaciones regionales, formación de pilotos y vuelos en Chile, Patagonia y Latinoamérica.",
    action: "Conocer la aerolínea",
  },
  {
    id: "flota-publica",
    title: "Flota operacional",
    text: "Aeronaves organizadas por categoría, autonomía y tipo de misión para proyectar una experiencia de vuelo ordenada.",
    action: "Ver información pública",
  },
  {
    id: "acars-publico",
    title: "ACARS Patagonia",
    text: "Cliente operacional de registro de vuelo para pilotos autorizados. En la landing solo se muestra información general del sistema.",
    action: "Conocer ACARS",
  },
];

const operations = [
  ["Rutas regulares", "Operaciones programadas dentro de la red Patagonia Wings."],
  ["Charter", "Vuelos personalizados y misiones especiales según planificación."],
  ["Formación", "Proceso de aprendizaje, habilitaciones y progresión de pilotos."],
  ["Eventos", "Vuelos grupales y operaciones especiales de la comunidad."],
  ["Academia", "Módulos teóricos y material formativo para pilotos virtuales."],
  ["Red Patagonia", "Conexión operacional entre Chile, Patagonia y la región."],
];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#0B4F8A]">{eyebrow}</p>
      <h2 className="mt-1 text-3xl font-extrabold text-slate-950 sm:text-4xl">{title}</h2>
      {text ? <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-600">{text}</p> : null}
    </div>
  );
}

export function LandingPublicOverview() {
  return (
    <div id="informacion-publica" className="space-y-8">
      <section id="pilotos" className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-7 sm:p-9">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#0B4F8A]">Pilotos virtuales</p>
          <h2 className="mt-2 text-4xl font-extrabold text-slate-950">¿Quieres ser parte de nuestra tripulación?</h2>
          <p className="mt-4 text-[16px] leading-7 text-slate-600">
            Únete como piloto virtual, progresa por rangos, opera rutas en Chile, Patagonia y Latinoamérica,
            y accede al área privada cuando tu cuenta sea aprobada.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pw-sur-btn pw-sur-btn-primary" href="/register">Solicitar acceso</Link>
            <a className="pw-sur-btn pw-sur-btn-outline" href="#operaciones">Ver tipos de operación</a>
          </div>
        </div>
        <div id="rutas-destacadas" className="min-h-[260px] bg-[radial-gradient(circle_at_30%_35%,rgba(56,189,248,0.42),transparent_50%),linear-gradient(135deg,#073763,#0B4F8A_48%,#020617)] p-8 text-white">
          <div className="flex h-full flex-col justify-between rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-100">Red operacional</p>
              <h3 className="mt-3 text-4xl font-black">Rutas reales</h3>
              <p className="mt-2 text-sky-50">Disponibles para pilotos autorizados según rango, licencia y aeronave.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-white/20 bg-white/10 p-3"><strong>Supabase</strong><br />Fuente operacional</div>
              <div className="rounded border border-white/20 bg-white/10 p-3"><strong>Sin datos</strong><br />Métricas públicas</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
        <SectionTitle
          eyebrow="Patagonia Wings"
          title="El momento de volar es hoy"
          text="Información pública de la aerolínea. Los módulos internos del piloto, reportes, economía, progreso y operación activa quedan dentro del área privada."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {highlights.map((item) => (
            <article id={item.id} key={item.title} className="scroll-mt-24 overflow-hidden rounded-lg border border-slate-200 bg-[#f8fafc] shadow-sm">
              <div className="h-28 bg-[linear-gradient(135deg,#0B4F8A,#38BDF8)]" />
              <div className="p-5">
                <h3 className="text-xl font-extrabold text-slate-950">{item.title}</h3>
                <p className="mt-2 min-h-[84px] text-[15px] leading-6 text-slate-600">{item.text}</p>
                <p className="mt-4 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0B4F8A]">{item.action}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="operaciones" className="scroll-mt-24 rounded-lg border border-slate-200 bg-[#f8fafc] p-7 shadow-sm">
        <SectionTitle
          eyebrow="Operaciones"
          title="Las mejores opciones para volar están aquí"
          text="Tipos de operación de la red Patagonia Wings. La planificación, reserva, despacho y seguimiento real se realizan solo dentro del área privada."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {operations.map(([title, text]) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md">
              <h3 className="text-lg font-extrabold text-[#0B4F8A]">{title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="noticias" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle eyebrow="Noticias" title="Últimas novedades" />
          <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-sm text-slate-600">Sin comunicados activos.</div>
        </div>
        <div id="acceso-privado" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle eyebrow="Acceso privado" title="Área de pilotos" />
          <p className="text-[15px] leading-7 text-slate-600">
            El Crew Center, HUB Center, reservas, reportes PIREP, economía virtual, progreso, flota asignada y herramientas de despacho
            se muestran únicamente a pilotos con sesión iniciada.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login" className="pw-sur-btn pw-sur-btn-primary">Iniciar sesión</Link>
            <Link href="/register" className="pw-sur-btn pw-sur-btn-outline">Solicitar cuenta</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
