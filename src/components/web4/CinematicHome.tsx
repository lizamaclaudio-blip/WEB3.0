import Image from "next/image";
import Link from "next/link";
import { CinematicDemo } from "./CinematicDemo";
import { CommunityInvitation } from "./CommunityInvitation";
import { galleryCaptures } from "./gallery-data";
import { Glyph } from "./Glyph";
import { localized, localeHref, type Language } from "./locale";

type LocalizedText = [string, string, string];
const choose = (language: Language, values: LocalizedText) => localized(language, ...values);

function InterestLink({ language, className = "" }: { language: Language; className?: string }) {
  return <Link className={"pv50-cta " + className} href={localeHref(language, "/soporte#novedades")}>
    {choose(language, ["Quiero ser de los primeros", "Be among the first", "Faire partie des premiers"]) }
    <Glyph name="arrow" size={20} />
  </Link>;
}

function EvidenceScreen({ name, language, className = "", hero = false }: { name: string; language: Language; className?: string; hero?: boolean }) {
  const capture = galleryCaptures.find(item => item.key === name);
  if (!capture) return <figure className={"pv50-screen pv50-screen-unavailable " + className}>
    <div><Glyph name="monitor" size={28} /><p>{choose(language, ["Material visual todavía no disponible", "Visual material is not available yet", "Contenu visuel pas encore disponible"])}</p></div>
    <figcaption>{choose(language, ["Esta sección espera una captura verificada del producto.", "This section is awaiting a verified product screenshot.", "Cette section attend une capture vérifiée du produit."])}</figcaption>
  </figure>;
  const evidence = capture.evidence === "real"
    ? choose(language, ["Captura de la aplicación · sesión observada", "Application capture · observed session", "Capture de l’application · session observée"])
    : capture.evidence === "offline"
      ? choose(language, ["Aplicación real · sin conexión", "Real application · offline", "Application réelle · hors ligne"])
      : choose(language, ["Aplicación real · demostración QA", "Real application · QA demonstration", "Application réelle · démonstration QA"]);
  return <figure className={"pv50-screen " + className}>
      <Link href={localeHref(language, "/copiloto-vector#galeria")} aria-label={choose(language, ["Explorar capturas de ", "Explore screenshots of ", "Voir les captures de "]) + capture.title[language]}>
      <Image src={capture.src} alt={capture.title[language]} width={capture.size.width} height={capture.size.height}
        sizes={hero ? "(max-width: 700px) 80vw, 35vw" : "(max-width: 760px) 94vw, (max-width: 1100px) 85vw, 70vw"}
        loading="lazy" />
    </Link>
    <figcaption><span className="pv50-evidence-dot" />{evidence}{capture.evidence === "fixture" && <span className="pv50-test-data">{choose(language, ["Datos de prueba", "Test data", "Données de test"])}</span>}
      {name === "studio" && <span className="pv50-capture-context">{choose(language, ["Layout de Studio aplicado a CARGA Y CABINA", "Studio layout applied in LOAD & CABIN", "Plan Studio appliqué dans CHARGEMENT ET CABINE"])}</span>}
      {name === "academy" && <span className="pv50-capture-context">{choose(language, ["Academy integrada en COPILOTO", "Academy integrated into COPILOT", "Academy intégrée au COPILOTE"])}</span>}
    </figcaption>
  </figure>;
}

const chapters: {
  id: string;
  label: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  module: LocalizedText;
  capture: string;
  support: string;
  supportTitle: LocalizedText;
  supportText: LocalizedText;
}[] = [
  {
    id: "antes", label: ["ANTES DEL VUELO", "BEFORE THE FLIGHT", "AVANT LE VOL"],
    title: ["Todo comienza\ncon un buen plan.", "Every great flight\nstarts with a plan.", "Tout commence\npar un bon plan."],
    description: ["Ese momento en que la ruta deja de ser una idea. Reúne tu plan, encuentra el contexto y disfruta de preparar lo que viene.", "That moment when a route becomes more than an idea. Bring your plan together, find your bearings and enjoy what comes next.", "Ce moment où l’itinéraire devient plus qu’une idée. Rassemblez votre plan, prenez vos repères et savourez les préparatifs."],
    module: ["DESPACHO", "DISPATCH", "PRÉPARATION DU VOL"], capture: "dispatch", support: "cabin",
    supportTitle: ["Una operación que toma forma.", "Watch your operation take shape.", "Votre vol prend forme."],
    supportText: ["De la ruta a la cabina: una vista para cada parte de la preparación.", "From the route to the cabin: a place for every part of the preparation.", "De l’itinéraire à la cabine : un espace pour chaque étape de la préparation."],
  },
  {
    id: "durante", label: ["DURANTE EL VUELO", "DURING THE FLIGHT", "PENDANT LE VOL"],
    title: ["Tu primer oficial virtual,\na tu lado.", "Your virtual first officer.\nRight beside you.", "Votre copilote virtuel.\nÀ vos côtés."],
    description: ["Tú llevas el mando. COPILOTO pone el contexto a tu alcance: checklists, avisos y asistencia para acompañar el ritmo de tu vuelo.", "You have control. COPILOT keeps context close, with checklists, advisories and assistance that follow the rhythm of your flight.", "Vous gardez les commandes. Le COPILOTE met le contexte à portée de main : listes de vérification, alertes et assistance au rythme de votre vol."],
    module: ["COPILOTO", "COPILOT", "COPILOTE"], capture: "copilot", support: "monitor",
    supportTitle: ["Menos buscar. Más disfrutar.", "Less searching. More flying.", "Moins chercher. Mieux profiter."],
    supportText: ["El estado de tu aeronave y de la operación, en un espacio pensado para volar.", "Aircraft and operation context, in a workspace designed around the flight.", "Le contexte de votre appareil et de vos opérations, dans un espace conçu pour le vol."],
  },
  {
    id: "despues", label: ["DESPUÉS DEL ATERRIZAJE", "AFTER TOUCHDOWN", "APRÈS L’ATTERRISSAGE"],
    title: ["El vuelo termina.\nLo que aprendes permanece.", "The flight ends.\nThe learning stays with you.", "Le vol s’achève.\nL’expérience vous reste."],
    description: ["Cada aproximación tiene su historia. Vuelve sobre lo registrado, descubre la secuencia de tu aterrizaje y encuentra algo que llevar al próximo vuelo.", "Every approach has a story. Revisit the recording, discover the sequence behind your landing and take something into your next flight.", "Chaque approche a son histoire. Retrouvez les données enregistrées, découvrez la séquence de votre atterrissage et enrichissez votre prochain vol."],
    module: ["LANDING LAB", "LANDING LAB", "LANDING LAB"], capture: "landing", support: "journal",
    supportTitle: ["Descubre la historia de cada aterrizaje.", "Discover the story behind every landing.", "Découvrez l’histoire de chaque atterrissage."],
    supportText: ["Un diario para conservar el recorrido. Una mirada más profunda para seguir aprendiendo.", "A logbook to keep the journey. A closer look to keep learning.", "Un journal pour conserver le parcours. Un regard plus précis pour continuer à apprendre."],
  },
];

export function CinematicHome({ language = "es" }: { language?: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  return <div className="pv50-home">
    <section className="pv50-hero" aria-labelledby="pv50-hero-title">
      <div className="pv50-hero-scene" aria-hidden="true"><Image src="/vector/web50/hero-aviation.webp" alt="" fill preload sizes="100vw" /></div>
      <div className="pv50-hero-shade" aria-hidden="true" />
      <svg className="pv50-sky-route" viewBox="0 0 1200 680" fill="none" aria-hidden="true"><path className="pv50-route-halo" d="M30 560C340 580 410 180 795 220S1070 155 1180 85" /><path className="pv50-route-stroke" d="M30 560C340 580 410 180 795 220S1070 155 1180 85" /><circle cx="30" cy="560" r="5" /><circle cx="1180" cy="85" r="5" /></svg>
      <div className="pv50-container pv50-hero-content">
        <p className="pv50-wordmark">COPILOTO VECTOR <span>TAKEOFF · HORIZON · COMMANDER</span></p>
        <h1 id="pv50-hero-title"><span>{t("NO SOLO VUELES.", "DON’T JUST FLY.", "PLUS QU’UN VOL.")}</span><em>{t("VIVE CADA ETAPA.", "LIVE THE JOURNEY.", "TOUTE UNE AVENTURE.")}</em></h1>
        <p className="pv50-hero-description">{t("Preparación, asistencia, aprendizaje y análisis. Una experiencia diseñada para vivir Microsoft Flight Simulator de principio a fin.", "Preparation, flight assistance, learning and analysis. One experience designed to bring every stage of Microsoft Flight Simulator to life.", "Préparation, assistance en vol, apprentissage et analyse. Une expérience conçue pour vivre Microsoft Flight Simulator, du départ à l’arrivée.")}</p>
        <div className="pv50-hero-actions"><InterestLink language={language} /><Link className="pv50-play-link" href="#demostracion"><span className="pv50-play-icon" aria-hidden="true">▶</span>{t("Descubre cómo funciona", "See how it works", "Découvrez l’expérience")}</Link></div>
        <p className="pv50-availability"><span />{t("Próximamente · En desarrollo", "Coming soon · In development", "À venir · En développement")}</p>
      </div>
      <div className="pv50-hero-product"><div className="pv50-product-annotation"><span>COPILOTO VECTOR</span><span>{t("UNA NUEVA PERSPECTIVA", "A NEW PERSPECTIVE", "UN NOUVEAU REGARD")}</span></div><EvidenceScreen name="copilot" language={language} hero /></div>
      <p className="pv50-art-caption">{t("Escena aeronáutica conceptual", "Conceptual aviation artwork", "Scène aéronautique conceptuelle")}</p>
      <a className="pv50-scroll-cue" href="#el-viaje"><span>{t("EL VIAJE EMPIEZA AQUÍ", "THE JOURNEY STARTS HERE", "LE VOYAGE COMMENCE ICI")}</span><span aria-hidden="true">↓</span></a>
    </section>

    <section className="pv50-introduction pw4-section" id="el-viaje"><div className="pv50-container pw4-wrap">
      <p className="pv50-kicker">{t("POR LA PASIÓN DE VOLAR", "FOR THE LOVE OF FLIGHT", "POUR LE PLAISIR DE VOLER")}</p>
      <h2>{t("Hay mucho más\nentre dos aeropuertos.", "There’s so much more\nbetween two airports.", "Entre deux aéroports,\ntout un monde à vivre.")}</h2>
      <div className="pv50-intro-bottom"><p>{t("El plan que preparas. La cabina que cobra vida. Ese aterrizaje que quieres entender. Vector conecta esos momentos para que cada vuelo tenga más sentido.", "The plan you prepare. The cabin coming to life. The landing you want to understand. Vector brings those moments together, giving every flight more meaning.", "Le plan que vous préparez. La cabine qui s’anime. Cet atterrissage que vous voulez comprendre. Vector relie ces moments pour donner plus de sens à chaque vol.")}</p><nav aria-label={t("Etapas del vuelo", "Stages of flight", "Étapes du vol")}>{chapters.map((chapter, index) => <Link key={chapter.id} href={"#" + chapter.id}><span>0{index + 1}</span>{choose(language, chapter.label)}<Glyph name="arrow" size={16} /></Link>)}</nav></div>
    </div></section>

    {chapters.map((chapter, index) => <section className={"pv50-chapter pv50-chapter-" + chapter.id + " pw4-section"} id={chapter.id} key={chapter.id} aria-labelledby={"pv50-title-" + chapter.id}>
      <div className="pv50-container pw4-wrap">
        <div className="pv50-chapter-heading"><p className="pv50-kicker"><span>0{index + 1}</span>{choose(language, chapter.label)}</p><h2 id={"pv50-title-" + chapter.id}>{choose(language, chapter.title)}</h2><p className="pv50-chapter-description">{choose(language, chapter.description)}</p></div>
        <div className="pv50-chapter-stage"><div className="pv50-chapter-module"><span>{choose(language, chapter.module)}</span><Link href={localeHref(language, "/copiloto-vector#" + (chapter.capture === "landing" ? "landing-lab" : chapter.capture))}>{t("Explorar el producto", "Explore the product", "Explorer le produit")}<Glyph name="arrow" size={17} /></Link></div><EvidenceScreen name={chapter.capture} language={language} /></div>
        <div className="pv50-chapter-after"><div><h3>{choose(language, chapter.supportTitle)}</h3><p>{choose(language, chapter.supportText)}</p></div><EvidenceScreen name={chapter.support} language={language} className="pv50-support-screen" /></div>
      </div>
    </section>)}

    <CinematicDemo language={language} />

    <section className="pv50-growth pw4-section" id="mas-posibilidades"><div className="pv50-container pw4-wrap">
      <div className="pv50-section-heading"><p className="pv50-kicker">{t("DA EL SIGUIENTE PASO", "TAKE THE NEXT STEP", "ALLEZ PLUS LOIN")}</p><h2>{t("Crece con cada vuelo.", "Grow with every flight.", "Progressez à chaque vol.")}</h2><p>{t("El placer de aprender algo nuevo. La confianza de preparar mejor. Un espacio para hacer tuya cada aeronave.", "The pleasure of learning something new. The confidence of better preparation. A space to make each aircraft your own.", "Le plaisir d’apprendre. La confiance d’une meilleure préparation. Un espace pour personnaliser chaque aéronef.")}</p></div>
      <div className="pv50-learning-pair">
        <article className="pv50-learning-feature"><p className="pv50-module-label">VECTOR ACADEMY</p><h3>{t("Acércate al avión\nque siempre quisiste dominar.", "Get to know the aircraft\nyou’ve always wanted to master.", "Apprivoisez l’appareil\nqui vous fait rêver.")}</h3><p>{t("Tutoriales y recorridos de aprendizaje para descubrir tus aeronaves, paso a paso.", "Tutorials and learning paths to discover your aircraft, one step at a time.", "Des tutoriels et des parcours d’apprentissage pour découvrir vos appareils, étape par étape.")}</p><EvidenceScreen name="academy" language={language} /></article>
        <article className="pv50-learning-feature pv50-learning-offset"><p className="pv50-module-label">VECTOR PERFORMANCE</p><h3>{t("Prepara cada pista\ncon más información.", "Prepare for every runway\nwith more insight.", "Abordez chaque piste\nmieux informé.")}</h3><p>{t("Viento, atmósfera y referencias del avión, reunidos para revisar tu preparación.", "Wind, atmosphere and aircraft references, together to support your preparation.", "Vent, atmosphère et références de l’appareil, réunis pour préparer votre vol.")}</p><EvidenceScreen name="performance" language={language} /></article>
      </div>
      <article className="pv50-studio"><div className="pv50-studio-copy"><p className="pv50-module-label">VECTOR AIRCRAFT STUDIO</p><h3>{t("Tu aeronave.\nTu manera de imaginarla.", "Your aircraft.\nYour way to imagine it.", "Votre aéronef.\nVotre vision.")}</h3><p>{t("Da forma a la cabina con un editor visual y lleva tus layouts a CARGA Y CABINA.", "Shape the cabin in a visual editor and bring your layouts into LOAD & CABIN.", "Façonnez la cabine dans un éditeur visuel et retrouvez vos plans dans CHARGEMENT ET CABINE.")}</p><Link className="pv50-inline-link" href={localeHref(language, "/copiloto-vector#funcionalidades")}>{t("Conoce las herramientas", "Meet the tools", "Découvrir les outils")}<Glyph name="arrow" size={18} /></Link></div><EvidenceScreen name="studio" language={language} /></article>
      <p className="pv50-scope-note">{t("Herramientas implementadas y probadas en QA. Validación con MSFS real pendiente; todavía sin disponibilidad comercial.", "Tools implemented and tested in QA. Live MSFS validation pending; not commercially available yet.", "Outils implémentés et testés en QA. Validation avec MSFS réel à effectuer ; pas encore disponibles commercialement.")} <Link href={localeHref(language, "/versiones#hitos")}>{t("Consulta su alcance", "See their scope", "Consulter leur portée")}<Glyph name="arrow" size={13} /></Link></p>
    </div></section>

    <section className="pv50-local pw4-section"><div className="pv50-container pw4-wrap">
      <div className="pv50-local-heading"><p className="pv50-kicker">{t("TU HISTORIA SIGUE", "YOUR STORY CONTINUES", "VOTRE HISTOIRE CONTINUE")}</p><h2>{t("Cada vuelo puede ser\nel comienzo de algo más grande.", "Every flight can be\nthe start of something bigger.", "Chaque vol peut ouvrir\nun nouvel horizon.")}</h2></div>
      <div className="pv50-career-layout"><article><p className="pv50-module-label">VECTOR CAREER LOCAL</p><p className="pv50-career-lead">{t("Crea tu piloto, imagina tu aerolínea personal y encuentra una razón más para tu próxima ruta.", "Create your pilot, imagine your personal airline and find one more reason for your next route.", "Créez votre pilote, imaginez votre compagnie personnelle et trouvez une nouvelle raison de prendre les airs.")}</p><EvidenceScreen name="career" language={language} /></article><article className="pv50-acars"><EvidenceScreen name="acars" language={language} /><p className="pv50-module-label">VECTOR ACARS LOCAL</p><h3>{t("Tus operaciones,\nde principio a fin.", "Your operations.\nFrom start to finish.", "Vos opérations.\nDu départ à l’arrivée.")}</h3><p>{t("Eventos, informes y una cola offline para conservar el recorrido, vinculados con CAREER y DIARIO.", "Events, reports and an offline queue to keep the journey, connected to CAREER and your LOGBOOK.", "Événements, rapports et file hors ligne pour conserver le parcours, reliés à CAREER et au JOURNAL.")}</p></article></div>
      <p className="pv50-scope-note">{t("CAREER y ACARS LOCAL están implementados en QA. Funcionan en el equipo, sin plataforma online. Pendientes de validación real y no disponibles comercialmente.", "CAREER and ACARS LOCAL are implemented in QA. They run locally, without an online platform. Live validation is pending; neither is commercially available.", "CAREER et ACARS LOCAL sont implémentés en QA. Ils fonctionnent sur votre ordinateur, sans plateforme en ligne. Validation réelle à effectuer ; aucune disponibilité commerciale.")} <Link href={localeHref(language, "/versiones#hitos")}>{t("Estado del producto", "Product status", "État du produit")}<Glyph name="arrow" size={13} /></Link></p>
    </div></section>

    <section className="pv50-future pw4-section" id="career-online"><div className="pv50-future-rings" aria-hidden="true"><i /><i /><i /></div><div className="pv50-container pw4-wrap">
      <div className="pv50-future-top"><p className="pv50-kicker">{t("EL HORIZONTE DE VECTOR", "VECTOR’S NEXT HORIZON", "L’HORIZON DE VECTOR")}</p><span className="pv50-future-label">{t("VISIÓN FUTURA · SIN IMPLEMENTAR", "FUTURE VISION · NOT BUILT YET", "VISION FUTURE · NON DÉVELOPPÉE")}</span></div>
      <p className="pv50-module-label">VECTOR CAREER ONLINE</p><h2>{t("El cielo se disfruta.\nImagina compartir el viaje.", "The sky is yours to enjoy.\nImagine sharing the journey.", "Le ciel se savoure.\nImaginez le partager.")}</h2>
      <p className="pv50-future-description">{t("Una carrera propia. Aerolíneas creadas por pilotos. Rutas y operaciones compartidas. La visión de una comunidad internacional con la misma pasión por volar.", "A career of your own. Airlines created by pilots. Shared routes and operations. The vision of an international community with the same love of flight.", "Une carrière à soi. Des compagnies créées par les pilotes. Des itinéraires et des opérations partagés. La vision d’une communauté internationale unie par la passion du vol.")}</p>
      <div className="pv50-future-bottom"><p>{t("La plataforma online aún no está desarrollada. Es distinta de CAREER y ACARS LOCAL. Sin fecha, precio ni inclusión en la licencia local confirmados.", "The online platform has not been developed yet. It is separate from CAREER and ACARS LOCAL. No date, price or inclusion in the local licence has been confirmed.", "La plateforme en ligne n’est pas encore développée. Elle est distincte de CAREER et ACARS LOCAL. Aucune date, aucun tarif ni inclusion dans la licence locale ne sont confirmés.")}</p><Link className="pv50-inline-link" href={localeHref(language, "/versiones#career-online-heading")}>{t("Conoce la visión", "Explore the vision", "Découvrir la vision")}<Glyph name="arrow" size={19} /></Link></div>
    </div></section>

    <CommunityInvitation language={language} />
    <section className="pv50-complete pw4-section" id="complete"><div className="pv50-container pw4-wrap">
      <Glyph name="mountain" size={54} /><p className="pv50-wordmark">COPILOTO VECTOR <span>COMMANDER</span></p><h2>{t("Todo tu recorrido.\nUna sola experiencia.", "Your whole journey.\nOne complete experience.", "Tout votre parcours.\nUne seule expérience.")}</h2><p className="pv50-complete-lead">{t("COMMANDER está diseñada para reunir todas las herramientas locales en una sola licencia. Del primer plan al próximo desafío.", "COMMANDER is designed to bring all local tools together under one licence. From the first plan to your next challenge.", "COMMANDER est conçue pour réunir tous les outils locaux dans une seule licence. Du premier plan au prochain défi.")}</p><InterestLink language={language} /><p className="pv50-complete-note">{t("Recibe novedades sobre la beta y el lanzamiento. Sin compra ni descarga pública por ahora. Sin fechas ni precios definitivos.", "Get beta and launch updates. No purchase or public download yet. No final dates or prices announced.", "Recevez les actualités de la bêta et du lancement. Aucun achat ni téléchargement public pour le moment. Aucune date ni aucun tarif définitifs.")}</p><Link className="pv50-inline-link" href={localeHref(language, "/copiloto-vector")}>{t("Explora COPILOTO VECTOR", "Explore COPILOTO VECTOR", "Explorez COPILOTO VECTOR")}<Glyph name="arrow" size={18} /></Link>
      <div className="pv50-beta-note"><span className="pv50-beta-symbol" aria-hidden="true">“</span><div><h3>{t("El próximo capítulo lo escribirán los pilotos.", "Pilots will write the next chapter.", "Les pilotes écriront le prochain chapitre.")}</h3><p>{t("Este espacio está reservado para futuras demostraciones y experiencias verificadas de beta testers. Todavía no publicamos testimonios.", "This space is reserved for future demonstrations and verified beta-tester experiences. No testimonials have been published yet.", "Cet espace est réservé aux futures démonstrations et aux expériences vérifiées des bêta-testeurs. Aucun témoignage n’est encore publié.")}</p></div></div>
    </div></section>
  </div>;
}
