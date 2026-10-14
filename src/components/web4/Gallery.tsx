"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { modules } from "./modules";
import { Glyph } from "./Glyph";
import { localized, type Language } from "./locale";

export function Gallery({ language }: { language: Language }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = modules[selected];
  const captureHeight = ({ monitor: 829, dispatch: 859, cabin: 859, operations: 900, copilot: 900, journal: 829 } as Record<string, number>)[active.id];
  const fixture = active.id === "operations" || active.id === "copilot";
  return <div className="pw4-gallery">
    <div className="pw4-gallery-tabs" role="tablist" aria-label={localized(language, "Capturas del producto", "Product screenshots", "Captures du produit")}>
      {modules.map((item, index) => <button key={item.id} id={`tab-${item.id}`} type="button" role="tab" aria-selected={index === selected} aria-controls="vector-gallery-panel" tabIndex={index === selected ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % modules.length : event.key === "ArrowLeft" ? (index + modules.length - 1) % modules.length : event.key === "Home" ? 0 : event.key === "End" ? modules.length - 1 : null;
        if (next !== null) { event.preventDefault(); setSelected(next); document.getElementById(`tab-${modules[next].id}`)?.focus(); }
      }}><Glyph name={item.id} size={18} />{item[language][0]}</button>)}
    </div>
    <div id="vector-gallery-panel" role="tabpanel" aria-labelledby={`tab-${active.id}`} tabIndex={0}>
      <button className="pw4-screen pw4-gallery-open" type="button" onClick={() => dialog.current?.showModal()} aria-label={`${localized(language, "Ampliar captura", "Enlarge screenshot", "Agrandir la capture")}: ${active[language][0]}`}>
        <span className="pw4-screen-bar"><span>COPILOTO VECTOR / {active[language][0].toUpperCase()}</span><span>{localized(language, "AMPLIAR ↗", "ENLARGE ↗", "AGRANDIR ↗")}</span></span>
        <Image src={`/vector/${active.image}-v2.webp`} width={1600} height={captureHeight} sizes="(max-width: 800px) 94vw, 88vw" alt={`${localized(language, "Captura real de la aplicación WPF", "Real WPF application screenshot", "Capture réelle de l’application WPF")}: ${active[language][0]}`} />
      </button>
      <p className="pw4-screen-caption"><span>{active[language][1]}</span><span>{fixture ? (localized(language, "Interfaz WPF real · Datos de prueba, no de un vuelo en vivo.", "Real WPF interface · Test fixture data, not a live flight.", "Interface WPF réelle · Données de test, sans vol en direct.")) : (localized(language, "Sesión real de desarrollo · Sin telemetría en vivo en la web.", "Real development session · Not live web telemetry.", "Session réelle de développement · Sans télémétrie en direct sur le site."))}</span></p>
    </div>
    <dialog ref={dialog} className="pw4-lightbox" aria-label={localized(language, "Captura ampliada de la aplicación", "Enlarged application screenshot", "Capture agrandie de l’application")} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <button type="button" autoFocus onClick={() => dialog.current?.close()}>{localized(language, "Cerrar", "Close", "Fermer")} ×</button>
      <Image src={`/vector/${active.image}-v2.webp`} width={1600} height={captureHeight} sizes="96vw" alt={active[language][0]} />
    </dialog>
  </div>;
}



