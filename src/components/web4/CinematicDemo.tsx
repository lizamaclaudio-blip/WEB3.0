"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { galleryCaptures } from "./gallery-data";
import { localized, type Language } from "./locale";

type Translation = Record<Language, string>;
type DemoScene = { key: string; capture?: string; title: Translation; description: Translation };
export type DemoPlayback = { seconds: number; playing: boolean };
const text = (es: string, en: string, fr: string): Translation => ({ es, en, fr });

// This is a timed screenshot tour, not a recording of a flight or of software interaction.
export const demoSceneSeconds = 4;
export const demoScenes: readonly DemoScene[] = [
  { key: "preparation", capture: "home", title: text("Empieza a imaginar tu vuelo.", "Start picturing your flight.", "Imaginez déjà votre prochain vol."), description: text("El contexto de tu operación, antes de empezar.", "Your operation in context, before you begin.", "Le contexte de vos opérations, avant le départ.") },
  { key: "dispatch", capture: "dispatch", title: text("Todo comienza con un buen plan.", "Every flight begins with a good plan.", "Tout commence par un bon plan de vol."), description: text("DESPACHO reúne la ruta y los datos planificados del OFP.", "DISPATCH brings the route and planned OFP data together.", "La préparation du vol rassemble l’itinéraire et les données planifiées de l’OFP.") },
  { key: "cabin", capture: "cabin", title: text("Prepara lo que va contigo.", "Prepare what travels with you.", "Préparez ce qui vous accompagne."), description: text("Una vista de CARGA Y CABINA, con posiciones ilustrativas de pasajeros.", "A view of LOAD & CABIN, with illustrative passenger positions.", "Une vue du chargement et de la cabine, avec des positions de passagers illustratives.") },
  { key: "copilot", capture: "copilot", title: text("Una ayuda a tu lado.", "Support at your side.", "Une aide à vos côtés."), description: text("COPILOTO acompaña el flujo de trabajo con checklists y contexto.", "COPILOT supports your workflow with checklists and context.", "COPILOTE accompagne votre travail avec des listes de vérification et du contexte.") },
  { key: "flight", capture: "monitor", title: text("Mantén el vuelo en perspectiva.", "Keep your flight in perspective.", "Gardez une vue d’ensemble du vol."), description: text("Instrumentos reales de la aplicación con datos de prueba; no es una aproximación grabada.", "Actual application instruments with test data; this is not a recorded approach.", "Véritables instruments de l’application avec des données de test ; ce n’est pas une approche filmée.") },
  { key: "landing", capture: "landing", title: text("Cada aterrizaje cuenta una historia.", "Every landing tells a story.", "Chaque atterrissage raconte une histoire."), description: text("LANDING LAB permite revisar trazas de una sesión de prueba.", "LANDING LAB lets you review traces from a test session.", "LANDING LAB permet d’examiner les traces d’une session de test.") },
  { key: "career", capture: "career", title: text("Haz que el siguiente vuelo signifique más.", "Give your next flight a new purpose.", "Donnez un nouveau sens au prochain vol."), description: text("CAREER LOCAL: piloto, flota y misiones en una demostración QA, sin operaciones online.", "CAREER LOCAL: pilot, fleet and missions in a QA demonstration, with no online operations.", "CAREER LOCAL : pilote, flotte et missions dans une démonstration QA, sans opérations en ligne.") },
  { key: "complete", title: text("Todas tus etapas. Una experiencia.", "Every stage. One experience.", "Toutes les étapes. Une seule expérience."), description: text("La futura edición COMMANDER de COPILOTO VECTOR está diseñada para reunir las herramientas locales en una sola licencia.", "The future COMMANDER edition of COPILOTO VECTOR is designed to bring the local tools together under one licence.", "La future édition COMMANDER de COPILOTO VECTOR est conçue pour réunir les outils locaux sous une seule licence.") },
  { key: "coming", title: text("Tu próximo capítulo está por llegar.", "Your next chapter is coming.", "Votre prochain chapitre se prépare."), description: text("Próximamente · En desarrollo. Sin venta ni descarga pública todavía.", "Coming soon · In development. Not yet available to buy or download publicly.", "Prochainement · En développement. Ni vente ni téléchargement public pour le moment.") },
];
export const demoDuration = demoScenes.length * demoSceneSeconds;

export function demoSceneIndex(seconds: number): number {
  const bounded = Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, demoDuration)) : 0;
  return Math.min(demoScenes.length - 1, Math.floor(bounded / demoSceneSeconds));
}

export function advanceDemo(playback: DemoPlayback, elapsed: number): DemoPlayback {
  if (!playback.playing || !Number.isFinite(elapsed) || elapsed <= 0) return playback;
  const seconds = Math.min(demoDuration, Math.max(0, playback.seconds) + Math.min(elapsed, 0.3));
  return { seconds, playing: seconds < demoDuration };
}

export function demoNavigationIndex(key: string, from: number): number | null {
  if (key === "Home") return 0;
  if (key === "End") return demoScenes.length - 1;
  if (key !== "ArrowRight" && key !== "ArrowLeft") return null;
  const current = Number.isInteger(from) ? Math.max(0, Math.min(demoScenes.length - 1, from)) : 0;
  return (current + (key === "ArrowRight" ? 1 : demoScenes.length - 1)) % demoScenes.length;
}

const clock = (seconds: number) => "0:" + String(Math.floor(seconds)).padStart(2, "0");

export function CinematicDemo({ language }: { language: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const [playback, setPlayback] = useState<DemoPlayback>({ seconds: 0, playing: false });
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const section = useRef<HTMLElement>(null);
  const theatre = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const chapterButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const index = demoSceneIndex(playback.seconds);
  const scene = demoScenes[index];
  const capture = galleryCaptures.find(item => item.key === scene.capture);
  const isImage = Boolean(capture && !failed[capture.key]);
  const availableFrames = demoScenes.filter(item => item.capture && galleryCaptures.some(capture => capture.key === item.capture)).length;
  const qa = t("Captura QA · Datos de prueba", "QA screenshot · Test data", "Capture QA · Données de test");

  useEffect(() => {
    const pause = () => setPlayback(current => current.playing ? { ...current, playing: false } : current);
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", visibility);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChanged = () => { if (motion.matches) pause(); };
    motion.addEventListener("change", motionChanged);
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) pause();
    }, { threshold: 0.05 });
    if (section.current) observer.observe(section.current);
    return () => { document.removeEventListener("visibilitychange", visibility); motion.removeEventListener("change", motionChanged); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!playback.playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previous) / 1000;
      previous = now;
      setPlayback(current => advanceDemo(current, elapsed));
    }, 100);
    return () => window.clearInterval(timer);
  }, [playback.playing]);

  const select = (target: number, focus = false) => {
    const bounded = Math.max(0, Math.min(demoScenes.length - 1, target));
    setPlayback({ seconds: bounded * demoSceneSeconds, playing: false });
    if (focus) chapterButtons.current[bounded]?.focus();
  };
  const toggle = () => setPlayback(current => ({ seconds: current.seconds >= demoDuration ? 0 : current.seconds, playing: !current.playing }));
  const open = (button: HTMLButtonElement) => {
    setPlayback(current => ({ ...current, playing: false }));
    opener.current = button;
    setExpanded(true);
    dialog.current?.showModal();
  };
  const navigate = (event: KeyboardEvent, focus = false, from = index) => {
    if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).tagName === "INPUT") return;
    const target = demoNavigationIndex(event.key, from);
    if (target !== null) { event.preventDefault(); select(target, focus); }
    if (!focus && event.key === " " && event.target === event.currentTarget && !expanded) { event.preventDefault(); toggle(); }
  };
  const visual = (large = false) => capture && !failed[capture.key]
    ? <Image key={capture.key} src={capture.src} width={capture.size.width} height={capture.size.height} alt={capture.title[language] + " · " + qa}
        sizes={large ? "96vw" : "(max-width: 760px) 94vw, (max-width: 1200px) 78vw, 1100px"} unoptimized={large}
        onError={() => setFailed(current => ({ ...current, [capture.key]: true }))} />
    : <div className="pv50-demo-brand">
        <span className="pv50-demo-brand-mark" aria-hidden="true">V</span><span>COPILOTO VECTOR</span><strong>COMPLETE</strong>
        <p>{scene.capture ? t("La captura se está preparando.", "This screenshot is being prepared.", "Cette capture est en préparation.") : index === demoScenes.length - 1 ? t("PRÓXIMAMENTE", "COMING SOON", "PROCHAINEMENT") : t("UNA EXPERIENCIA PARA CADA ETAPA", "ONE EXPERIENCE FOR EVERY STAGE", "UNE EXPÉRIENCE POUR CHAQUE ÉTAPE")}</p>
      </div>;

  return <section className="pv50-demo" id="demostracion" ref={section} aria-labelledby={id + "-title"}>
    <div className="pv50-demo-intro"><div><p className="pv50-demo-eyebrow">{t("MIRA LO QUE VIENE", "SEE WHAT’S COMING", "DÉCOUVREZ CE QUI SE PRÉPARE")}</p>
      <h2 id={id + "-title"}>{t("Un vistazo a tu próximo vuelo.", "A glimpse of your next flight.", "Un aperçu de votre prochain vol.")}</h2></div>
      <p>{t("36 segundos para recorrer Vector. Capturas auténticas de la aplicación, con datos QA. Tú eliges cuándo empezar.", "36 seconds to explore Vector. Authentic application screenshots with QA data. You choose when to begin.", "36 secondes pour explorer Vector. De véritables captures de l’application avec des données QA. À vous de lancer la découverte.")}</p>
    </div>
    <div className="pv50-demo-theatre" role="group" ref={theatre} tabIndex={0} onKeyDown={event => navigate(event)} aria-label={t("Recorrido de capturas. Espacio para reproducir o pausar; flechas para cambiar de escena.", "Screenshot tour. Space to play or pause; arrow keys to change scenes.", "Parcours de captures. Espace pour lancer ou mettre en pause ; flèches pour changer de scène.")}>
      <div className="pv50-demo-top"><span><i aria-hidden="true" />COPILOTO VECTOR COMPLETE</span><span>{capture ? qa : t("Presentación del producto", "Product presentation", "Présentation du produit")}</span></div>
      <div className="pv50-demo-stage">
        <div className="pv50-demo-screen">{visual()}
          {!playback.playing && playback.seconds === 0 && <button className="pv50-demo-poster-play" type="button" onClick={toggle} aria-label={t("Reproducir recorrido de capturas de 36 segundos", "Play the 36-second screenshot tour", "Lancer le parcours de captures de 36 secondes")}><span aria-hidden="true">▶</span><span>{t("INICIAR RECORRIDO", "START THE TOUR", "LANCER LE PARCOURS")}</span></button>}
          {isImage && <button className="pv50-demo-expand" type="button" onClick={event => open(event.currentTarget)} aria-label={t("Ampliar captura actual", "Enlarge current screenshot", "Agrandir la capture actuelle")}><span aria-hidden="true">↗</span>{t("Ampliar", "Enlarge", "Agrandir")}</button>}
        </div>
        <div className="pv50-demo-story" aria-live="polite" aria-atomic="true"><span className="pv50-demo-scene-number">{String(index + 1).padStart(2, "0")}<span> / 09</span></span><h3>{scene.title[language]}</h3><p>{scene.description[language]}</p>
          <span className="pv50-demo-story-note">{capture ? t("Aplicación en QA · Validación real pendiente", "Application in QA · Real-flight validation pending", "Application en QA · Validation en vol réel à venir") : t("En desarrollo · Sin oferta comercial activa", "In development · No active commercial offer", "En développement · Aucune offre commerciale active")}</span>
        </div>
      </div>
      <div className="pv50-demo-controls">
        <button className="pv50-demo-play" type="button" onClick={toggle} aria-label={playback.playing ? t("Pausar recorrido", "Pause tour", "Mettre le parcours en pause") : t("Reproducir recorrido", "Play tour", "Lancer le parcours")}><span aria-hidden="true">{playback.playing ? "Ⅱ" : "▶"}</span><span>{playback.playing ? t("Pausar", "Pause", "Pause") : t("Reproducir", "Play", "Lancer")}</span></button>
        <label className="pv50-demo-timeline"><span className="pv50-demo-sr">{t("Posición en el recorrido", "Tour position", "Position dans le parcours")}</span><input type="range" min="0" max={demoDuration} step="0.1" value={playback.seconds} style={{ "--demo-progress": playback.seconds / demoDuration * 100 + "%" } as CSSProperties}
          aria-valuetext={clock(playback.seconds) + " / " + clock(demoDuration) + " · " + scene.title[language]}
          onChange={event => setPlayback({ seconds: Number(event.currentTarget.value), playing: false })} /></label>
        <span className="pv50-demo-clock" aria-hidden="true">{clock(playback.seconds)} <span>/ {clock(demoDuration)}</span></span>
        <button className="pv50-demo-restart" type="button" onClick={() => select(0)} aria-label={t("Volver al inicio", "Return to the start", "Revenir au début")}><span aria-hidden="true">↺</span></button>
      </div>
    </div>
    <div className="pv50-demo-chapters" role="group" aria-label={t("Elegir una escena del recorrido", "Choose a tour scene", "Choisir une scène du parcours")}>
      {demoScenes.map((item, position) => <button key={item.key} type="button" ref={button => { chapterButtons.current[position] = button; }} aria-pressed={index === position} tabIndex={index === position ? 0 : -1} onClick={() => select(position)} onKeyDown={event => navigate(event, true, position)}>
        <span>{String(position + 1).padStart(2, "0")}<small>{clock(position * demoSceneSeconds)}</small></span><strong>{item.capture === "home" ? t("Preparación", "Preparation", "Préparation") : item.capture === "dispatch" ? t("Despacho", "Dispatch", "Plan de vol") : item.capture === "cabin" ? t("Cabina", "Cabin", "Cabine") : item.capture === "copilot" ? t("Copiloto", "Copilot", "Copilote") : item.capture === "monitor" ? t("En vuelo", "In flight", "En vol") : item.capture === "landing" ? "Landing Lab" : item.capture === "career" ? "Career Local" : item.key === "complete" ? "Complete" : t("Próximamente", "Coming soon", "Prochainement")}</strong>
      </button>)}
    </div>
    <p className="pv50-demo-disclosure">{t("Recorrido de capturas QA; no es un vídeo de vuelo real. Sin pista de audio. Puedes pausar, desplazarte por la línea de tiempo o ampliar cada captura.", "A QA screenshot tour, not a real-flight video. No audio track. Pause, scrub the timeline or enlarge any screenshot.", "Un parcours de captures QA, pas une vidéo de vol réel. Sans piste audio. Mettez en pause, parcourez la chronologie ou agrandissez une capture.")} {availableFrames < 7 && t("Algunas escenas están pendientes de material verificado.", "Some scenes are awaiting verified material.", "Certaines scènes attendent des contenus vérifiés.")}</p>
    <dialog className="pv50-demo-dialog" ref={dialog} aria-labelledby={id + "-expanded-title"} aria-describedby={id + "-expanded-note"} onKeyDown={event => navigate(event)}
      onClose={() => { setExpanded(false); (opener.current?.isConnected ? opener.current : theatre.current)?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {expanded && <><div className="pv50-demo-dialog-header"><div><h2 id={id + "-expanded-title"}>{scene.title[language]}</h2><p id={id + "-expanded-note"}>{capture ? qa : t("Presentación del producto", "Product presentation", "Présentation du produit")}</p></div><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label={t("Cerrar captura ampliada", "Close enlarged screenshot", "Fermer la capture agrandie")}>{t("Cerrar", "Close", "Fermer")} ×</button></div>
        <div className="pv50-demo-dialog-image">{visual(true)}</div><div className="pv50-demo-dialog-footer"><button type="button" onClick={() => select((index + demoScenes.length - 1) % demoScenes.length)} aria-label={t("Escena anterior", "Previous scene", "Scène précédente")}>←</button><p>{scene.description[language]}</p><button type="button" onClick={() => select((index + 1) % demoScenes.length)} aria-label={t("Escena siguiente", "Next scene", "Scène suivante")}>→</button></div></>}
    </dialog>
  </section>;
}
