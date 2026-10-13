"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { modules } from "./modules";
import { Glyph } from "./Glyph";
import type { Language } from "./locale";

export function Gallery({ language }: { language: Language }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const en = language === "en";
  const active = modules[selected];
  const captureHeight = ({ monitor: 829, dispatch: 859, cabin: 859, operations: 900, copilot: 900, journal: 829 } as Record<string, number>)[active.id];
  const fixture = active.id === "operations" || active.id === "copilot";
  return <div className="pw4-gallery">
    <div className="pw4-gallery-tabs" role="tablist" aria-label={en ? "Product screenshots" : "Capturas del producto"}>
      {modules.map((item, index) => <button key={item.id} id={`tab-${item.id}`} type="button" role="tab" aria-selected={index === selected} aria-controls="vector-gallery-panel" tabIndex={index === selected ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % modules.length : event.key === "ArrowLeft" ? (index + modules.length - 1) % modules.length : event.key === "Home" ? 0 : event.key === "End" ? modules.length - 1 : null;
        if (next !== null) { event.preventDefault(); setSelected(next); document.getElementById(`tab-${modules[next].id}`)?.focus(); }
      }}><Glyph name={item.id} size={18} />{item[language][0]}</button>)}
    </div>
    <div id="vector-gallery-panel" role="tabpanel" aria-labelledby={`tab-${active.id}`} tabIndex={0}>
      <button className="pw4-screen pw4-gallery-open" type="button" onClick={() => dialog.current?.showModal()} aria-label={`${en ? "Enlarge screenshot" : "Ampliar captura"}: ${active[language][0]}`}>
        <span className="pw4-screen-bar"><span>COPILOTO VECTOR / {active[language][0].toUpperCase()}</span><span>{en ? "ENLARGE ↗" : "AMPLIAR ↗"}</span></span>
        <Image src={`/vector/${active.image}-v2.webp`} width={1600} height={captureHeight} sizes="(max-width: 800px) 94vw, 88vw" alt={`${en ? "Real WPF application screenshot" : "Captura real de la aplicación WPF"}: ${active[language][0]}`} />
      </button>
      <p className="pw4-screen-caption"><span>{active[language][1]}</span><span>{fixture ? (en ? "Real WPF interface · Test fixture data, not a live flight." : "Interfaz WPF real · Datos de prueba, no de un vuelo en vivo.") : (en ? "Real development session · Not live web telemetry." : "Sesión real de desarrollo · Sin telemetría en vivo en la web.")}</span></p>
    </div>
    <dialog ref={dialog} className="pw4-lightbox" aria-label={en ? "Enlarged application screenshot" : "Captura ampliada de la aplicación"} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <button type="button" autoFocus onClick={() => dialog.current?.close()}>{en ? "Close" : "Cerrar"} ×</button>
      <Image src={`/vector/${active.image}-v2.webp`} width={1600} height={captureHeight} sizes="96vw" alt={active[language][0]} />
    </dialog>
  </div>;
}



