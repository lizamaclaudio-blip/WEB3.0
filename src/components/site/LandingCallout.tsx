import Link from "next/link";

export function LandingCallout() {
  return (
    <section className="pw-sur-callout">
      <h2>
        Patagonia Wings 3.0 <strong>presenta su nueva plataforma virtual</strong>
      </h2>
      <p>
        Conoce la aerolínea, revisa información pública de operación y postula como piloto virtual.
        Las herramientas internas quedan reservadas para usuarios con sesión iniciada.
      </p>
      <div className="pw-sur-callout-actions">
        <Link href="/register" className="pw-sur-btn pw-sur-btn-primary">
          Crear cuenta de piloto
        </Link>
        <a href="#operaciones" className="pw-sur-btn pw-sur-btn-light">
          Ver operaciones públicas
        </a>
        <Link href="/login" className="pw-sur-btn pw-sur-btn-outline">
          Iniciar sesión
        </Link>
      </div>
    </section>
  );
}
