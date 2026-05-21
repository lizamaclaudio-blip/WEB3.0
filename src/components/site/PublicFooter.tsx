import Link from "next/link";

const cols = [
  {
    title: "Patagonia Wings Virtual",
    items: [
      { label: "Información general", href: "#informacion-publica" },
      { label: "Normativa pública", href: "#informacion-publica" },
      { label: "Noticias", href: "#noticias" },
      { label: "Postulación pilotos", href: "/register" },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { label: "Destinos", href: "#operaciones" },
      { label: "Rutas públicas", href: "#rutas-destacadas" },
      { label: "Eventos", href: "#noticias" },
      { label: "Red Patagonia", href: "#operaciones" },
    ],
  },
  {
    title: "Pilotos",
    items: [
      { label: "Postulación", href: "/register" },
      { label: "Rangos y carrera", href: "#pilotos" },
      { label: "Academia", href: "#pilotos" },
      { label: "Preguntas frecuentes", href: "#contacto" },
    ],
  },
  {
    title: "Integraciones",
    items: [
      { label: "ACARS", href: "#acars-publico" },
      { label: "SimBrief", href: "#integraciones" },
      { label: "Navigraph", href: "#integraciones" },
      { label: "VATSIM / IVAO", href: "#integraciones" },
    ],
  },
  {
    title: "Contacto",
    items: [
      { label: "Centro de ayuda", href: "#contacto" },
      { label: "Soporte público", href: "#contacto" },
      { label: "Acceso pilotos", href: "/login" },
    ],
  },
];

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = "transition hover:text-white hover:underline";

  if (href.startsWith("/")) {
    return <Link href={href} className={className}>{children}</Link>;
  }

  return <a href={href} className={className}>{children}</a>;
}

export function PublicFooter() {
  return (
    <footer id="contacto" className="border-t border-white/10 bg-[#061225]">
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 xl:grid-cols-5 xl:px-8">
        {cols.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-white">{col.title}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {col.items.map((item) => (
                <li key={item.label}>
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
