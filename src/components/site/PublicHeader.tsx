import Image from "next/image";
import Link from "next/link";

type PublicMenuItem = {
  label: string;
  href: string;
};

type PublicMenu = {
  label: string;
  items: PublicMenuItem[];
};

const publicMenus: PublicMenu[] = [
  {
    label: "La aerolínea",
    items: [
      { label: "Quiénes somos", href: "#informacion-publica" },
      { label: "Nuestra operación", href: "#operaciones" },
      { label: "Estadísticas públicas", href: "#estadisticas" },
      { label: "Contacto", href: "#contacto" },
    ],
  },
  {
    label: "Destinos",
    items: [
      { label: "Chile", href: "#operaciones" },
      { label: "Patagonia", href: "#operaciones" },
      { label: "Latinoamérica", href: "#operaciones" },
      { label: "Rutas destacadas", href: "#rutas-destacadas" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Rutas regulares", href: "#operaciones" },
      { label: "Charter", href: "#operaciones" },
      { label: "Eventos", href: "#noticias" },
      { label: "Formación", href: "#pilotos" },
    ],
  },
  {
    label: "Recursos",
    items: [
      { label: "ACARS Patagonia", href: "#acars-publico" },
      { label: "SimBrief", href: "#integraciones" },
      { label: "Navigraph", href: "#integraciones" },
      { label: "Guías públicas", href: "#informacion-publica" },
    ],
  },
];

function HeaderMenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (href.startsWith("/")) {
    return <Link href={href}>{children}</Link>;
  }

  return <a href={href}>{children}</a>;
}

export function PublicHeader() {
  return (
    <header className="pw-sur-header">
      <div className="pw-sur-header-inner">
        <Link href="/" className="pw-sur-brand" aria-label="Patagonia Wings inicio">
          <Image
            src="/branding/patagonia-logo.png"
            alt="Patagonia Wings"
            width={150}
            height={86}
            className="h-[58px] w-auto object-contain"
            priority
          />
          <span className="hidden sm:block">
            <strong>Patagonia Wings 3.0</strong>
            <small>Virtual Airline</small>
          </span>
        </Link>

        <nav className="pw-sur-nav hidden lg:flex" aria-label="Navegación pública">
          <Link href="/" className="pw-sur-nav-link">Home</Link>
          {publicMenus.map((menu) => (
            <div key={menu.label} className="pw-sur-nav-dropdown">
              <button className="pw-sur-nav-link" type="button">
                {menu.label} <span aria-hidden="true">▾</span>
              </button>
              <div className="pw-sur-dropdown-menu">
                {menu.items.map((item) => (
                  <HeaderMenuLink key={item.label} href={item.href}>
                    {item.label}
                  </HeaderMenuLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="pw-sur-account">
          <Link href="/register" className="pw-sur-account-button hidden sm:inline-flex">
            <span className="pw-sur-account-code">Crear cuenta</span>
          </Link>
          <Link href="/login" className="pw-sur-account-button">
            <span className="pw-sur-account-code">Acceso pilotos</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
