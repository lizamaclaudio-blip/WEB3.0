import Link from "next/link";
import Image from "next/image";

const navGroups = [
  {
    label: "Patagonia Wings",
    items: ["Noticias modo carrera", "Aeronaves certificadas", "Staff", "Nuestros héroes", "Estadísticas", "Contacto"],
  },
  {
    label: "Operaciones",
    items: ["Reglas y procedimientos", "Hangar", "Nuestros pilotos", "Salón de la fama"],
  },
  {
    label: "Recursos",
    items: ["Centro de entrenamiento", "Route Finder", "SimBrief despachador", "SkyVector rutas", "Aeropuertos", "Manuales"],
  },
  {
    label: "Menú del Piloto",
    items: ["Ver mis PIREPs", "Vuelos regulares", "Vuelo de la semana", "Despachos", "Patagonia ACARS", "Descargas", "Sala de pilotos"],
  },
];

type CrewHeaderProps = {
  pilot?: { name?: string; callsign?: string; rank?: string };
};

const bellIcon = String.fromCodePoint(0x1f514);
const chevronDownIcon = String.fromCodePoint(0x25be);

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PW";
}

export function CrewHeader({ pilot }: CrewHeaderProps) {
  const pilotName = pilot?.name || "Claudio Lizama";
  const callsign = pilot?.callsign || "PWG001";
  const rank = pilot?.rank || "First Officer";
  return (
    <header className="pw-sur-header">
      <div className="pw-sur-header-inner">
        <Link href="/" className="pw-sur-brand" aria-label="Patagonia Wings Home">
          <span className="pw-sur-brand-logo-shell">
            <span className="pw-sur-brand-logo">
              <Image src="/branding/patagonia-logo.png" alt="Patagonia Wings Virtual Airline" width={220} height={58} priority />
            </span>
          </span>
        </Link>

        <nav className="pw-sur-nav" aria-label="Navegación principal">
          <Link href="/" className="pw-sur-nav-link">Home</Link>
          {navGroups.map((group) => (
            <div className="pw-sur-nav-dropdown" key={group.label}>
              <button type="button" className="pw-sur-nav-link">
                {group.label} <span aria-hidden="true">{chevronDownIcon}</span>
              </button>
              <div className="pw-sur-dropdown-menu">
                {group.items.map((item) => (
                  <a href="#" key={item}>{item}</a>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="pw-sur-account">
          <button className="pw-sur-bell" type="button" aria-label="Notificaciones">{bellIcon}</button>
          <div className="pw-sur-account-menu">
            <button type="button" className="pw-sur-account-button">
              <span className="pw-sur-account-code">{callsign}</span>
              <span>{pilotName}</span>
              <span aria-hidden="true">{chevronDownIcon}</span>
            </button>
            <div className="pw-sur-account-dropdown">
              <div className="pw-sur-account-card">
                <div className="pw-sur-avatar">{initials(pilotName)}</div>
                <div style={{ color: "#ffffff" }}>
                  <strong style={{ color: "#ffffff" }}>{pilotName}</strong>
                  <small style={{ color: "rgba(255,255,255,0.9)" }}>{rank}</small>
                </div>
              </div>
              <Link href="/mi-perfil">Mi perfil</Link>
              <Link href="/mis-datos">Mis datos</Link>
              <a href="/api/auth/logout">Salir</a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
