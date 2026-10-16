import Link from "next/link";
import { Glyph } from "./Glyph";
import { localized, localeHref, type Language } from "./locale";
import { publicRoadmapSeed, publicRoadmapStatuses, type PublicRoadmapItem, type PublicRoadmapStatus } from "./public-roadmap";

export function PublicRoadmap({ language, items = publicRoadmapSeed, launchDate = null, source = "reviewed-seed" }: {
  language: Language; items?: PublicRoadmapItem[]; launchDate?: string | null; source?: "database" | "reviewed-seed";
}) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const date = launchDate && /^\d{4}-\d{2}-\d{2}$/.test(launchDate) ? new Date(`${launchDate}T12:00:00Z`) : null;
  const announcedDate = date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" }).format(date) : null;
  return <div className="pv51-roadmap">
    <section className="pv51-roadmap-hero" aria-labelledby="roadmap-title">
      <div><p className="pw4-eyebrow">VECTOR / {t("EL CAMINO HACIA EL DESPEGUE", "THE ROAD TO TAKEOFF", "LE CHEMIN VERS LE DÉCOLLAGE")}</p>
        <h1 id="roadmap-title">{t("El próximo capítulo", "The next chapter", "Le prochain chapitre")}<br /><em>{t("se construye contigo.", "is built with you.", "se construit avec vous.")}</em></h1>
        <p>{t("Una mirada honesta a lo que estamos probando, lo que estamos construyendo y las ideas que podrían venir después.", "An honest look at what we are testing, what we are building and the ideas that might come next.", "Un regard transparent sur ce que nous testons, ce que nous construisons et les idées qui pourraient suivre.")}</p>
        <nav className="pv51-roadmap-jump" aria-label={t("Explorar el roadmap", "Explore the roadmap", "Explorer la feuille de route")}>
          <a href="#roadmap-timeline">{t("Explorar etapas", "Explore the stages", "Explorer les étapes")}<Glyph name="arrow" size={16} /></a>
          <a href="#roadmap-launch">{t("El lanzamiento", "The launch", "Le lancement")}</a>
        </nav>
      </div>
      <aside className="pv51-roadmap-beacon"><Glyph name="compass" size={64} /><span>{t("RUMBO A VECTOR", "HEADING TOWARDS VECTOR", "CAP SUR VECTOR")}</span><strong>{t("Calidad antes que una fecha.", "Quality before a date.", "La qualité avant une date.")}</strong><p>{t("Sin porcentajes artificiales ni fechas prometidas.", "No artificial progress percentages or promised dates.", "Sans pourcentages artificiels ni dates promises.")}</p></aside>
    </section>
    <section className="pv51-roadmap-key" aria-label={t("Cómo leer los estados", "How to read the statuses", "Comment lire les statuts")}>
      <p>{t("Cada estado cuenta algo distinto.", "Each status means something different.", "Chaque statut a son sens.")}</p>
      <ul>{Object.entries(publicRoadmapStatuses).map(([status, label]) => <li key={status}><span className={`pv51-roadmap-status pv51-roadmap-status-${status}`}>{label[language]}</span></li>)}</ul>
      <small>{t("En pruebas puede incluir funciones implementadas en QA. Eso no confirma validación con MSFS real ni disponibilidad comercial. Solo marcamos completado cuando existe evidencia suficiente.", "In testing can include features implemented in QA. This does not confirm live MSFS validation or commercial availability. Completed requires sufficient evidence.", "En test peut inclure des fonctionnalités implémentées en QA. Cela ne confirme ni la validation avec MSFS réel ni la disponibilité commerciale. Le statut terminé nécessite des preuves suffisantes.")}</small>
    </section>
    <section className="pv51-roadmap-timeline" id="roadmap-timeline" aria-labelledby="roadmap-stages">
      <div className="pv51-roadmap-section-heading"><div><p className="pw4-eyebrow">{t("PASO A PASO", "STEP BY STEP", "ÉTAPE PAR ÉTAPE")}</p><h2 id="roadmap-stages">{t("Así va tomando forma.", "See it taking shape.", "Le projet prend forme.")}</h2></div><p>{t("Abre cada etapa para conocer su alcance y sus límites.", "Open each stage to discover its scope and limitations.", "Ouvrez chaque étape pour découvrir son périmètre et ses limites.")}</p></div>
      <ol>{items.map((item, index) => <li key={item.id} id={`roadmap-${item.id}`}>
        <span className="pv51-roadmap-node" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <details className={`pv51-roadmap-stage pv51-roadmap-stage-${item.status}`}>
          <summary><span className={`pv51-roadmap-status pv51-roadmap-status-${item.status}`}>{publicRoadmapStatuses[item.status as PublicRoadmapStatus][language]}</span><h3>{item.title[language]}</h3><span className="pv51-roadmap-expand" aria-hidden="true">+</span></summary>
          <div className="pv51-roadmap-stage-body"><p>{item.description[language]}</p><div><Glyph name="check" size={15} /><small>{item.evidenceNote[language]}</small></div><a href={`#roadmap-${item.id}`}>{t("Enlace a esta etapa", "Link to this stage", "Lien vers cette étape")}</a></div>
        </details>
      </li>)}</ol>
      {source === "reviewed-seed" && <p className="pv51-roadmap-source">{t("Contenido inicial revisado a partir de las entregas documentadas. Los estados se actualizan tras revisión, no automáticamente desde el simulador.", "Initial content reviewed against documented deliveries. Statuses change after review, not automatically from the simulator.", "Contenu initial vérifié à partir des livraisons documentées. Les statuts évoluent après examen, pas automatiquement depuis le simulateur.")}</p>}
    </section>
    <section className="pv51-roadmap-launch" id="roadmap-launch" aria-labelledby="roadmap-launch-title"><Glyph name="plane" size={45} />
      <div><p className="pw4-eyebrow">{t("EL MOMENTO DEL DESPEGUE", "THE MOMENT OF TAKEOFF", "LE MOMENT DU DÉCOLLAGE")}</p><h2 id="roadmap-launch-title">{announcedDate || t("Fecha de lanzamiento: por confirmar", "Launch date: to be confirmed", "Date de lancement : à confirmer")}</h2><p>{t("Estamos preparando COPILOTO VECTOR para ofrecer una experiencia estable y confiable. Anunciaremos la fecha cuando finalicen las pruebas de calidad y compatibilidad.", "We are preparing COPILOTO VECTOR to offer a stable, reliable experience. We will announce a date when quality and compatibility testing is complete.", "Nous préparons COPILOTO VECTOR pour offrir une expérience stable et fiable. Nous annoncerons une date lorsque les tests de qualité et de compatibilité seront terminés.")}</p></div>
      <Link className="pw4-button pw4-button-primary" href={localeHref(language, "/novedades")}>{t("Recibir novedades", "Receive updates", "Recevoir les nouvelles")}<Glyph name="arrow" size={17} /></Link>
    </section>
    <section className="pv51-roadmap-ideas"><p className="pw4-eyebrow">VECTOR COMMUNITY LAB</p><h2>{t("La próxima idea puede ser tuya.", "The next idea could be yours.", "La prochaine idée pourrait être la vôtre.")}</h2><p>{t("Comparte lo que te gustaría vivir en tu próximo vuelo. Cada propuesta publicada pasa por moderación; votar no garantiza su desarrollo.", "Share what you would love to experience on your next flight. Published proposals are moderated; a vote does not guarantee development.", "Partagez ce que vous aimeriez vivre lors de votre prochain vol. Les propositions publiées sont modérées ; un vote ne garantit pas leur développement.")}</p><Link className="pw4-button" href={localeHref(language, "/comunidad")}>{t("Proponer una idea", "Propose an idea", "Proposer une idée")}<Glyph name="arrow" size={17} /></Link></section>
  </div>;
}
