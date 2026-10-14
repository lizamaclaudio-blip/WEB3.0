"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { galleryCaptures, galleryGroups, type GalleryEvidence, type GalleryGroupId } from "./gallery-data";
import { localized, type Language } from "./locale";
import "./gallery.css";

export function Gallery({ language, initialGroup = "preparation" }: { language: Language; initialGroup?: GalleryGroupId }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const [selected, setSelected] = useState(() => Math.max(0, galleryCaptures.findIndex(capture => capture.group === initialGroup)));
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const active = galleryCaptures[selected] ?? galleryCaptures[0];
  if (!active) return <p role="status">{t("No hay capturas disponibles.", "No screenshots are available.", "Aucune capture n’est disponible.")}</p>;
  const groupIndex = galleryGroups.findIndex(group => group.id === active.group);
  const group = galleryGroups[groupIndex];
  const groupItems = galleryCaptures.map((capture, index) => ({ capture, index })).filter(item => item.capture.group === active.group);
  const localIndex = groupItems.findIndex(item => item.index === selected);
  const evidence = (value: GalleryEvidence) => value === "real"
    ? t("Sesión real de desarrollo", "Real development session", "Session réelle de développement")
    : value === "fixture" ? t("Datos de prueba", "Test fixture data", "Données de test")
      : t("Sin sesión en vivo", "No live session", "Sans session en direct");
  const evidenceNote = active.evidence === "fixture"
    ? t("Controles WPF reales con datos sintéticos. No acredita un vuelo real.", "Real WPF controls with synthetic data. This is not evidence of a real flight.", "Véritables contrôles WPF avec des données synthétiques. Ce n’est pas la preuve d’un vol réel.")
    : active.evidence === "offline"
      ? t("Interfaz WPF mostrada fuera de una sesión de vuelo en vivo.", "WPF interface shown outside a live flight session.", "Interface WPF présentée en dehors d’une session de vol en direct.")
      : t("Captura de una sesión de desarrollo. Esta web no recibe telemetría en directo.", "A development-session screenshot. This website receives no live telemetry.", "Capture d’une session de développement. Ce site ne reçoit aucune télémétrie en direct.");
  const sourceNote = t("Interfaz capturada en español; las leyendas se traducen.", "The captured interface is in Spanish; captions are translated.", "L’interface capturée est en espagnol ; les légendes sont traduites.");
  const unavailable = t("Esta captura no está disponible. Puedes consultar las demás.", "This screenshot is unavailable. You can browse the others.", "Cette capture n’est pas disponible. Vous pouvez consulter les autres.");
  const previous = t("Captura anterior", "Previous screenshot", "Capture précédente");
  const next = t("Captura siguiente", "Next screenshot", "Capture suivante");
  const close = t("Cerrar vista ampliada", "Close enlarged view", "Fermer la vue agrandie");
  const selectGroup = (index: number, focus = false) => {
    const target = galleryCaptures.findIndex(capture => capture.group === galleryGroups[index].id);
    if (target < 0) return;
    setSelected(target);
    if (focus) tabButtons.current[index]?.focus();
  };
  const stepWithinGroup = (direction: number) => {
    const item = groupItems[(localIndex + direction + groupItems.length) % groupItems.length];
    if (item) setSelected(item.index);
  };
  const navigate = (event: KeyboardEvent, wholeGallery: boolean) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const last = wholeGallery ? galleryCaptures.length - 1 : groupItems.length - 1;
    let target: number | null = null;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = last;
    if (event.key === "ArrowRight") target = ((wholeGallery ? selected : localIndex) + 1) % (last + 1);
    if (event.key === "ArrowLeft") target = ((wholeGallery ? selected : localIndex) + last) % (last + 1);
    if (target === null) return;
    event.preventDefault();
    setSelected(wholeGallery ? target : groupItems[target].index);
  };
  const open = (button: HTMLButtonElement) => {
    opener.current = button;
    setExpanded(true);
    if (!dialog.current?.open) dialog.current?.showModal();
  };
  const image = (large: boolean) => failed[active.key]
    ? <div className="pw41-image-unavailable" role="img" aria-label={unavailable}><span aria-hidden="true">↗</span><p>{unavailable}</p></div>
    : <Image src={active.src} width={active.size.width} height={active.size.height} unoptimized={large} sizes={large ? "96vw" : "(max-width: 800px) 94vw, 88vw"}
        alt={t("Captura WPF: ", "WPF screenshot: ", "Capture WPF : ") + active.title[language]}
        onError={() => setFailed(current => ({ ...current, [active.key]: true }))} />;
  return <div className="pw4-gallery pw41-gallery">
    <div className="pw41-gallery-heading">
      <p>{t("EL RECORRIDO DE UNA OPERACIÓN", "THE COURSE OF AN OPERATION", "LE DÉROULEMENT D’UNE OPÉRATION")}</p>
      <span>{galleryGroups.length} {t("etapas", "stages", "étapes")} · {galleryCaptures.length} {t("capturas", "screenshots", "captures")}</span>
    </div>
    <div className="pw41-gallery-tabs" role="tablist" aria-label={t("Etapas de la operación", "Operation stages", "Étapes des opérations")}>
      {galleryGroups.map((item, index) => <button key={item.id} ref={button => { tabButtons.current[index] = button; }} id={id + "-tab-" + item.id} type="button" role="tab"
        aria-selected={index === groupIndex} aria-controls={id + "-panel"} tabIndex={index === groupIndex ? 0 : -1}
        onClick={() => selectGroup(index)} onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const target = event.key === "ArrowRight" ? (index + 1) % galleryGroups.length : event.key === "ArrowLeft" ? (index + galleryGroups.length - 1) % galleryGroups.length
            : event.key === "Home" ? 0 : event.key === "End" ? galleryGroups.length - 1 : null;
          if (target !== null) { event.preventDefault(); selectGroup(target, true); }
        }}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{item.title[language]}</button>)}
    </div>
    <div id={id + "-panel"} role="tabpanel" aria-labelledby={id + "-tab-" + active.group} tabIndex={0} onKeyDown={event => navigate(event, false)}>
      <div className="pw41-capture">
        <div className="pw41-capture-top">
          <span>COPILOTO VECTOR <span aria-hidden="true">/</span> {group.title[language]}</span>
          <span className={"pw41-evidence pw41-evidence-" + active.evidence}>{evidence(active.evidence)}</span>
        </div>
        <button className="pw41-photo" type="button" disabled={Boolean(failed[active.key])} onClick={event => open(event.currentTarget)}
          aria-label={t("Ampliar captura: ", "Enlarge screenshot: ", "Agrandir la capture : ") + active.title[language]}>
          {image(false)}
          {!failed[active.key] && <span className="pw41-enlarge" aria-hidden="true">{t("AMPLIAR", "ENLARGE", "AGRANDIR")} ↗</span>}
        </button>
        <div className="pw41-capture-bottom">
          <div className="pw41-caption" aria-live="polite" aria-atomic="true">
            <p className="pw41-caption-index">{String(localIndex + 1).padStart(2, "0")} / {String(groupItems.length).padStart(2, "0")}</p>
            <h3>{active.title[language]}</h3>
            <p>{active.description[language]}</p>
          </div>
          <div className="pw41-gallery-controls" role="group" aria-label={t("Navegar por las capturas", "Browse screenshots", "Parcourir les captures")}>
            <button type="button" onClick={() => stepWithinGroup(-1)} disabled={groupItems.length < 2} aria-label={previous}><span aria-hidden="true">←</span></button>
            <span aria-hidden="true">{localIndex + 1} / {groupItems.length}</span>
            <button type="button" onClick={() => stepWithinGroup(1)} disabled={groupItems.length < 2} aria-label={next}><span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
      <div className="pw41-capture-options" role="group" aria-label={t("Capturas de esta etapa", "Screenshots in this stage", "Captures de cette étape")}>
        {groupItems.map(({ capture, index }, position) => <button key={capture.key} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}>
          <span aria-hidden="true">{String(position + 1).padStart(2, "0")}</span>{capture.title[language]}
        </button>)}
      </div>
      <div className="pw41-gallery-footnote">
        <div className="pw41-capture-tags">{active.tags[language].map(tag => <span key={tag}>{tag}</span>)}</div>
        <p>{evidenceNote}<br />{sourceNote}</p>
      </div>
    </div>
    <dialog ref={dialog} className="pw41-lightbox" aria-labelledby={id + "-dialog-title"} aria-describedby={id + "-dialog-note"}
      onKeyDown={event => navigate(event, true)} onClose={() => { setExpanded(false); opener.current?.focus({ preventScroll: true }); }}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {expanded && <>
        <div className="pw41-lightbox-header">
          <div><p>{group.title[language]} · {selected + 1} / {galleryCaptures.length}</p><h2 id={id + "-dialog-title"}>{active.title[language]}</h2><a className="pw41-original" href={active.src} target="_blank" rel="noreferrer">{t("Abrir resolución original", "Open original resolution", "Ouvrir la résolution d’origine")} · {active.size.width} × {active.size.height} ↗</a></div>
          <button className="pw41-lightbox-close" type="button" autoFocus onClick={() => dialog.current?.close()} aria-label={close}>
            {t("Cerrar", "Close", "Fermer")} <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="pw41-lightbox-image">{image(true)}</div>
        <div className="pw41-lightbox-footer">
          <div id={id + "-dialog-note"} aria-live="polite" aria-atomic="true"><p>{active.description[language]}</p><p><span className={"pw41-evidence pw41-evidence-" + active.evidence}>{evidence(active.evidence)}</span> {sourceNote}</p></div>
          <div className="pw41-gallery-controls">
            <button type="button" onClick={() => setSelected((selected + galleryCaptures.length - 1) % galleryCaptures.length)} aria-label={previous}><span aria-hidden="true">←</span></button>
            <span aria-hidden="true">{selected + 1} / {galleryCaptures.length}</span>
            <button type="button" onClick={() => setSelected((selected + 1) % galleryCaptures.length)} aria-label={next}><span aria-hidden="true">→</span></button>
          </div>
        </div>
      </>}
    </dialog>
  </div>;
}
