"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Glyph } from "./Glyph";

import { languageNames, languages, localeHref, localized, unlocalizedPath, type Language } from "./locale";

export function WebHeader({ language = "es" }: { language?: Language }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function closeMenu() {
    setOpen(false);
    if (open) menuButton.current?.focus();
  }
  const t = <T,>(es: T, en: T, fr: T) => localized(language, es, en, fr);
  const links = [
    ["Copiloto Vector", "/copiloto-vector"],
    [t("Galería", "Gallery", "Galerie"), "/copiloto-vector#galeria"],
    [t("Disponibilidad", "Availability", "Disponibilité"), "/versiones"],
    [t("Soporte", "Support", "Assistance"), "/soporte"],
  ];
  return <header className="pw4-header" lang={language} onKeyDown={event => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }}>
    <a className="pw4-skip" href="#main-content">{t("Saltar al contenido", "Skip to content", "Aller au contenu")}</a>
    <div className="pw4-wrap pw4-nav">
      <Link href={localeHref(language)} className="pw4-brand" aria-label="COPILOTO VECTOR COMPLETE"><Glyph name="mountain" size={31} /><span>COPILOTO <strong>VECTOR</strong><small>COMPLETE · BY PATAGONIA PROJECT</small></span></Link>
      <button ref={menuButton} className="pw4-menu-button" type="button" aria-expanded={open} aria-controls="pw4-navigation" onClick={() => setOpen(!open)}>{open ? t("Cerrar", "Close", "Fermer") : t("Menú", "Menu", "Menu")} <span aria-hidden="true">{open ? "−" : "+"}</span></button>
      <nav id="pw4-navigation" className={open ? "pw4-links is-open" : "pw4-links"} aria-label={t("Navegación principal", "Main navigation", "Navigation principale")}>
        {links.map(([label, href]) => <Link key={href} href={localeHref(language, href)} aria-current={pathname === localeHref(language, href) ? "page" : undefined} onClick={closeMenu}>{label}</Link>)}
        <span className="pw4-languages" role="group" aria-label={t("Idioma", "Language", "Langue")}>
          {languages.map(item => <Link key={item} href={localeHref(item, unlocalizedPath(pathname))} className="pw4-language" hrefLang={item} lang={item} title={languageNames[item]} aria-label={languageNames[item]} aria-current={language === item ? "page" : undefined} onClick={closeMenu}>{item.toUpperCase()}</Link>)}
        </span>
        <Link href={localeHref(language, "/soporte#novedades")} className="pw4-pilot" onClick={closeMenu}>{t("Recibir novedades", "Stay informed", "Recevoir les actualités")}<Glyph name="arrow" size={17} /></Link>
      </nav>
    </div>
  </header>;
}

export function WebFooter({ language = "es" }: { language?: Language }) {
  const t = <T,>(es: T, en: T, fr: T) => localized(language, es, en, fr);
  return <footer className="pw4-footer" lang={language}><div className="pw4-wrap">
    <div className="pw4-footer-top"><Link href={localeHref(language)} className="pw4-brand"><Glyph name="mountain" size={35} /><span>COPILOTO <strong>VECTOR</strong><small>{t("DESDE EL SUR. HACIA LO QUE VIENE.", "FROM THE SOUTH. TOWARDS WHAT'S NEXT.", "DEPUIS LE SUD. VERS L’AVENIR.")}</small></span></Link><p>{t("Una pasión por volar. Una nueva forma de acompañarte.", "A passion for flight. A new way to accompany it.", "La passion du vol. Une nouvelle façon de vous accompagner.")}</p></div>
    <div className="pw4-footer-links">
      <div><h3>COPILOTO VECTOR COMPLETE</h3><Link href={localeHref(language, "/copiloto-vector")}>{t("Conoce el producto", "Explore the product", "Découvrir le produit")}</Link><Link href={localeHref(language, "/copiloto-vector#modulos")}>{t("Seis módulos", "Six modules", "Six modules")}</Link><Link href={localeHref(language, "/versiones#complete")}>{t("COMPLETE y disponibilidad", "COMPLETE & availability", "COMPLETE et disponibilité")}</Link></div>
      <div><h3>{t("EXPLORAR", "EXPLORE", "EXPLORER")}</h3><Link href={localeHref(language, "/copiloto-vector#galeria")}>{t("Capturas reales", "Real screenshots", "Captures réelles")}</Link><Link href={localeHref(language, "/copiloto-vector#compatibilidad")}>{t("Compatibilidad", "Compatibility", "Compatibilité")}</Link><Link href={localeHref(language, "/copiloto-vector#preguntas")}>{t("Preguntas frecuentes", "Frequently asked questions", "Questions fréquentes")}</Link></div>
      <div><h3>{t("INFORMACIÓN", "INFORMATION", "INFORMATIONS")}</h3><Link href={localeHref(language, "/soporte")}>{t("Soporte y contacto", "Support & contact", "Assistance et contact")}</Link><Link href={localeHref(language, "/privacidad")}>{t("Privacidad", "Privacy", "Confidentialité")}</Link><Link href={localeHref(language, "/condiciones")}>{t("Condiciones", "Terms", "Conditions d’utilisation")}</Link></div>
      <div className="pw4-footer-state"><span className="pw4-dot" />{t("PRODUCTO EN DESARROLLO", "PRODUCT IN DEVELOPMENT", "PRODUIT EN DÉVELOPPEMENT")}<p>{t("Software para simulación de vuelo. No apto para operaciones aéreas reales.", "Flight simulation software. Not for real-world flight operations.", "Logiciel de simulation de vol. Non destiné aux opérations aériennes réelles.")}</p></div>
    </div>
    <div className="pw4-colophon"><span>© {new Date().getFullYear()} Patagonia Wings</span><span>{t("DISEÑADO PARA EL VIAJE", "DESIGNED FOR THE JOURNEY", "CONÇU POUR LE VOYAGE")} · 41° S / 73° W</span></div>
  </div></footer>;
}

