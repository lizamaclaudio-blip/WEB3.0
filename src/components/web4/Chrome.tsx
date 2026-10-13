"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Glyph } from "./Glyph";

export type Language = "es" | "en";
export const localeHref = (language: Language, route = "") => `${language === "en" ? "/en" : ""}${route || "/"}`.replace(/\/$/, "") || "/";

export function WebHeader({ language = "es" }: { language?: Language }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const en = language === "en";
  const counterpart = en ? pathname.replace(/^\/en/, "") || "/" : `/en${pathname === "/" ? "" : pathname}`;
  const links = [
    ["Copiloto Vector", "/copiloto-vector"],
    [en ? "Virtual airline" : "Aerolínea virtual", "/patagonia-wings"],
    [en ? "Support" : "Soporte", "/soporte"],
  ];
  return <header className="pw4-header">
    <a className="pw4-skip" href="#main-content">{en ? "Skip to content" : "Saltar al contenido"}</a>
    <div className="pw4-wrap pw4-nav">
      <Link href={localeHref(language)} className="pw4-brand" aria-label="Patagonia Wings"><Glyph name="mountain" size={31} /><span>PATAGONIA <strong>WINGS</strong><small>FLIGHT OPERATIONS & TECHNOLOGY</small></span></Link>
      <button className="pw4-menu-button" type="button" aria-expanded={open} aria-controls="pw4-navigation" onClick={() => setOpen(!open)}>{open ? (en ? "Close" : "Cerrar") : (en ? "Menu" : "Menú")} <span aria-hidden="true">{open ? "−" : "+"}</span></button>
      <nav id="pw4-navigation" className={open ? "pw4-links is-open" : "pw4-links"} aria-label={en ? "Main navigation" : "Navegación principal"}>
        {links.map(([label, href]) => <Link key={href} href={localeHref(language, href)} aria-current={pathname === localeHref(language, href) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link href={counterpart} className="pw4-language" hrefLang={en ? "es" : "en"} onClick={() => setOpen(false)}>{en ? "ES" : "EN"}<span aria-hidden="true"> ↗</span></Link>
        <Link href="/login" className="pw4-pilot" onClick={() => setOpen(false)}>{en ? "Pilot access" : "Acceso pilotos"}<Glyph name="arrow" size={17} /></Link>
      </nav>
    </div>
  </header>;
}

export function WebFooter({ language = "es" }: { language?: Language }) {
  const en = language === "en";
  return <footer className="pw4-footer"><div className="pw4-wrap">
    <div className="pw4-footer-top"><Link href={localeHref(language)} className="pw4-brand"><Glyph name="mountain" size={35} /><span>PATAGONIA <strong>WINGS</strong><small>{en ? "FROM THE SOUTH. TOWARDS WHAT'S NEXT." : "DESDE EL SUR. HACIA LO QUE VIENE."}</small></span></Link><p>{en ? "A passion for flight. A new way to accompany it." : "Una pasión por volar. Una nueva forma de acompañarte."}</p></div>
    <div className="pw4-footer-links">
      <div><h3>COPILOTO VECTOR</h3><Link href={localeHref(language, "/copiloto-vector")}>{en ? "Explore the product" : "Conoce el producto"}</Link><Link href={localeHref(language, "/copiloto-vector#modulos")}>{en ? "Six modules" : "Seis módulos"}</Link><Link href={localeHref(language, "/versiones")}>{en ? "Versions & availability" : "Versiones y disponibilidad"}</Link></div>
      <div><h3>PATAGONIA WINGS</h3><Link href={localeHref(language, "/patagonia-wings")}>{en ? "The virtual airline" : "La aerolínea virtual"}</Link><Link href="/login">{en ? "Crew Center" : "Acceso de pilotos"}</Link><Link href="/register">{en ? "Apply as a pilot" : "Postula como piloto"}</Link></div>
      <div><h3>{en ? "INFORMATION" : "INFORMACIÓN"}</h3><Link href={localeHref(language, "/soporte")}>{en ? "Support & contact" : "Soporte y contacto"}</Link><Link href={localeHref(language, "/privacidad")}>{en ? "Privacy" : "Privacidad"}</Link><Link href={localeHref(language, "/condiciones")}>{en ? "Terms" : "Condiciones"}</Link></div>
      <div className="pw4-footer-state"><span className="pw4-dot" />{en ? "PRODUCT IN DEVELOPMENT" : "PRODUCTO EN DESARROLLO"}<p>{en ? "Flight simulation software. Not for real-world flight operations." : "Software para simulación de vuelo. No apto para operaciones aéreas reales."}</p></div>
    </div>
    <div className="pw4-colophon"><span>© {new Date().getFullYear()} Patagonia Wings</span><span>DESIGNED FOR THE JOURNEY · 41° S / 73° W</span></div>
  </div></footer>;
}
