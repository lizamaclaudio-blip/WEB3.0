import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { WebFooter, WebHeader } from "./Chrome";
import { Gallery } from "./Gallery";
import { Glyph } from "./Glyph";
import { modules } from "./modules";
import { Reveal } from "./Reveal";
import { capabilities, statusLabels } from "./capabilities";
import { galleryCaptures } from "./gallery-data";
import { localized, localeHref, type Language } from "./locale";

export function marketingMetadata(language: Language, title: string, description: string, route = ""): Metadata {
  const path = localeHref(language, route);
  return {
    title, description,
    alternates: { canonical: path, languages: { es: localeHref("es", route), en: localeHref("en", route), fr: localeHref("fr", route), "x-default": localeHref("es", route) } },
    openGraph: { title, description, url: path, siteName: "Copiloto Vector · Patagonia Project", locale: localized(language, "es_CL", "en_US", "fr_FR"), type: "website", images: [{ url: "/vector/current/monitor.webp", width: 1920, height: 1080, alt: "Copiloto Vector" }] },
  };
}
export function Shell({ language, children }: { language: Language; children: React.ReactNode }) {
  return <><WebHeader language={language} /><main id="main-content" className="pw4" lang={language}><Reveal />{children}</main><WebFooter language={language} /></>;
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="pw4-eyebrow"><span className="pw4-dot" />{children}</p>;
}
export function Action({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <Link className={"pw4-button" + (primary ? " pw4-button-primary" : "")} href={href}>{children}<Glyph name="arrow" size={18} /></Link>;
}
function Heading({ number, label, title, text }: { number: string; label: string; title: string; text?: string }) {
  return <div className="pw4-section-header"><div><Eyebrow>{number} / {label}</Eyebrow><h2>{title}</h2></div>{text && <p>{text}</p>}</div>;
}
const moduleIcons: Record<string, string> = { monitor: "monitor", dispatch: "ofp", cabin: "passengers", operations: "airport", copilot: "copilot", journal: "clock" };
function AppScreen({ name, language, eager = false }: { name: string; language: Language; eager?: boolean }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const captureTitle = galleryCaptures.find(capture => capture.key === name)?.title[language] || "Copiloto Vector";
  return <figure className="pv41-screen">
    <div className="pv41-screen-title"><span><i />COPILOTO VECTOR</span><span>{t("APLICACIÓN WPF REAL", "REAL WPF APPLICATION", "APPLICATION WPF RÉELLE")}</span></div>
    <Image src={"/vector/current/" + name + ".webp"} alt={captureTitle + " · " + t("Captura WPF, vuelo de demostración sin conexión", "WPF screenshot, offline demonstration flight", "Capture WPF, vol de démonstration hors ligne")} width={1920} height={1080} sizes="(max-width: 800px) 94vw, 70vw" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} />
    <figcaption>{t("Vuelo de demostración · Datos de prueba · Interfaz original en español", "Demonstration flight · Test data · Original Spanish interface", "Vol de démonstration · Données de test · Interface originale en espagnol")}</figcaption>
  </figure>;
}
function ModuleCards({ language }: { language: Language }) {
  return <div className="pv41-modules">{modules.map((module, index) => <Link className="pv41-module" key={module.id} href={localeHref(language, "/copiloto-vector#" + module.id)}>
    <div className="pv41-module-top"><span>0{index + 1}</span><Glyph name="arrow" size={19} /></div>
    <Image src={"/vector/current/icons/" + moduleIcons[module.id] + ".webp"} width={88} height={88} alt="" />
    <h3>{module[language][0]}</h3><p>{module[language][1]}</p>
  </Link>)}</div>;
}
function FeatureStory({ language, reverse = false, name, number, label, title, description, tags }: {
  language: Language; reverse?: boolean; name: string; number: string; label: string; title: string; description: string; tags: string[];
}) {
  return <section className={"pw4-section pv41-story" + (reverse ? " pv41-story-reverse" : "")}><div className="pw4-wrap">
    <div className="pv41-story-copy"><Eyebrow>{number} / {label}</Eyebrow><h2>{title}</h2><p>{description}</p><div className="pv41-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div><Action href={localeHref(language, "/copiloto-vector#galeria")}>{localized(language, "Explorar la interfaz", "Explore the interface", "Explorer l’interface")}</Action></div>
    <AppScreen name={name} language={language} />
  </div></section>;
}
function CapabilityStatus({ language }: { language: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  return <section className="pw4-section" id="funcionalidades"><div className="pw4-wrap">
    <Heading number="04" label={t("ESTADO DEL PRODUCTO", "PRODUCT STATUS", "ÉTAT DU PRODUIT")} title={t("Capacidades, con contexto.", "Capabilities, with context.", "Des capacités, avec du contexte.")}
      text={t("Revisado contra el código y las validaciones de la aplicación. Las pruebas de laboratorio y las sesiones reales se distinguen en cada función.", "Reviewed against application code and validation evidence. Lab tests and real sessions are distinguished for each capability.", "Vérifié à partir du code et des validations de l’application. Tests de laboratoire et sessions réelles sont distingués pour chaque fonction.")} />
    <div className="pv41-capabilities">{capabilities.map(feature => <details key={feature.id}><summary><span>{feature.title[language]}</span><span className={"pv41-status pv41-status-" + feature.status}>{statusLabels[feature.status][language]}</span><Glyph name="arrow" size={16} /></summary><p>{feature.detail[language]}</p></details>)}</div>
  </div></section>;
}
function Compatibility({ language }: { language: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const rows = [
    ["MSFS 2024", t("Verificado localmente", "Verified locally", "Vérifié localement"), t("Telemetría y sesiones locales con el King Air 350 original; la cobertura depende de cada aeronave.", "Telemetry and local sessions with the stock King Air 350; system coverage depends on the aircraft.", "Télémétrie et sessions locales avec le King Air 350 d’origine ; la couverture dépend de l’aéronef.")],
    ["MSFS 2020", t("Validación pendiente", "Validation pending", "Validation à venir"), t("La arquitectura contempla soporte genérico. La versión actual no está certificada completamente en este simulador.", "The architecture supports generic integration. The current version is not fully certified on this simulator.", "L’architecture prévoit une intégration générique. La version actuelle n’est pas entièrement validée sur ce simulateur.")],
    ["SimConnect", t("Adaptador implementado", "Adapter implemented", "Adaptateur implémenté"), t("Instrumentos y estados observados. Un dato ausente o caducado se identifica expresamente.", "Observed instruments and states. Missing or stale readings are explicitly identified.", "Instruments et états observés. Les données absentes ou périmées sont explicitement signalées.")],
    ["SimBrief / OpenStreetMap", t("Importación y mapas verificados", "Import and maps verified", "Import et cartes vérifiés"), t("OFP planificado, ruta y mapas. La posición observada requiere una sesión y un plan asociados.", "Planned OFP, route and maps. Observed position requires an associated session and plan.", "OFP planifié, itinéraire et cartes. La position observée exige une session et un plan associés.")],
    ["GSX Pro", t("Integración parcial", "Partial integration", "Intégration partielle"), t("Asociación y lectura de servicios. Recuentos agregados; sin control automático de pushback.", "Association and service observation. Aggregate counts; no automatic pushback control.", "Association et observation des services. Totaux agrégés ; sans commande automatique du repoussage.")],
    ["NOAA / Windows", t("Meteo y voz local", "Weather and local voice", "Météo et voix locale"), t("METAR/TAF reales y voces instaladas. Necesitan red o voces compatibles, respectivamente.", "Real-world METAR/TAF and installed voices. Network or compatible voices are required respectively.", "METAR/TAF réels et voix installées. Réseau ou voix compatibles requis, respectivement.")],
  ];
  return <section className="pw4-section" id="compatibilidad"><div className="pw4-wrap">
    <Heading number="05" label={t("CONEXIONES", "CONNECTIONS", "CONNEXIONS")} title={t("Tu simulador. Tus herramientas.", "Your simulator. Your tools.", "Votre simulateur. Vos outils.")}
      text={t("Integraciones reemplazables, sin depender de un único proveedor. Las marcas no implican asociación ni patrocinio.", "Replaceable integrations without dependence on a single provider. Brand names do not imply partnership or sponsorship.", "Des intégrations interchangeables, sans dépendance à un fournisseur unique. Les marques ne supposent ni partenariat ni parrainage.")} />
    <div className="pw4-compatibility">{rows.map(([name, status, detail]) => <article key={name}><div><h3>{name}</h3><span className="pv41-compat-state">{status}</span></div><p>{detail}</p></article>)}</div>
    <div className="pv41-requirements"><Glyph name="monitor" size={28} /><div><h3>{t("Un espacio dedicado en Windows.", "A dedicated space on Windows.", "Un espace dédié sur Windows.")}</h3><p>{t("Windows x64, .NET 10 y MSFS con SimConnect. GSX y SimBrief son opcionales. Mapas y meteorología en línea requieren internet. Requisitos finales de hardware e instalador público pendientes.", "Windows x64, .NET 10 and MSFS with SimConnect. GSX and SimBrief are optional. Online maps and weather require internet. Final hardware requirements and public installer are pending.", "Windows x64, .NET 10 et MSFS avec SimConnect. GSX et SimBrief sont facultatifs. Cartes et météo en ligne nécessitent internet. Configuration matérielle finale et installateur public à venir.")}</p></div></div>
  </div></section>;
}
function Questions({ language }: { language: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const items = [
    [t("¿Se puede comprar o descargar?", "Can I buy or download it?", "Puis-je l’acheter ou le télécharger ?"), t("El producto sigue en desarrollo. No hay instalador comercial público, precio ni pagos activos. La disponibilidad se publicará cuando esté validada.", "The product is still in development. There is no public commercial installer, price or active payment service. Availability will be announced once validated.", "Le produit est encore en développement. Il n’existe pas d’installateur commercial public, de prix ni de paiement actif. La disponibilité sera annoncée après validation.")],
    [t("¿Las capturas muestran un vuelo real?", "Do the screenshots show a real flight?", "Les captures montrent-elles un vol réel ?"), t("Son capturas auténticas de la aplicación WPF. La galería actual utiliza un vuelo de demostración sin conexión y datos de prueba identificados. La web no recibe telemetría en vivo.", "They are authentic WPF application screenshots. The current gallery uses an offline demonstration flight with labelled test data. The website does not receive live telemetry.", "Ce sont des captures authentiques de l’application WPF. La galerie actuelle utilise un vol de démonstration hors ligne et des données de test identifiées. Le site ne reçoit pas de télémétrie en direct.")],
    [t("¿El copiloto escucha o controla el avión?", "Does the copilot listen or control the aircraft?", "Le copilote écoute-t-il ou pilote-t-il l’avion ?"), t("Presenta respuestas contextuales, checklists y avisos de voz local. No dispone de reconocimiento de micrófono operativo ni controla automáticamente el avión o el pushback.", "It presents contextual responses, checklists and local spoken advisories. There is no operational microphone recognition and it does not automatically control the aircraft or pushback.", "Il propose des réponses contextuelles, des listes de vérification et des annonces vocales locales. Il ne reconnaît pas le microphone et ne commande pas automatiquement l’avion ni le repoussage.")],
    [t("¿Qué necesita Flight Replay?", "What does Flight Replay need?", "De quoi Flight Replay a-t-il besoin ?"), t("Un registro con posiciones. Los registros antiguos sin trayectoria no se pueden reproducir. Los valores proceden de las muestras guardadas y los huecos se conservan.", "A recording with positions. Older records without a track cannot be replayed. Readouts come from saved samples and recording gaps remain visible.", "Un enregistrement contenant des positions. Les anciens vols sans trajectoire ne peuvent pas être relus. Les valeurs proviennent des échantillons sauvegardés et les lacunes restent visibles.")],
    [t("¿Funciona con cualquier aeronave?", "Does it work with every aircraft?", "Fonctionne-t-il avec tous les aéronefs ?"), t("El soporte genérico es la base. Los sistemas personalizados requieren validación por aeronave; las distribuciones de cabina son referencias ilustrativas.", "Generic support is the foundation. Custom systems need aircraft-specific validation; cabin layouts are illustrative references.", "Le support générique constitue la base. Les systèmes personnalisés nécessitent une validation par aéronef ; les plans de cabine sont des références illustratives.")],
    [t("¿Necesito una aerolínea virtual?", "Do I need a virtual airline?", "Dois-je rejoindre une compagnie virtuelle ?"), t("No. Copiloto Vector se presenta como un producto independiente. Los servicios y cuentas previos de la aerolínea se conservan por separado.", "No. Copiloto Vector is presented as an independent product. Existing airline services and accounts are preserved separately.", "Non. Copiloto Vector est présenté comme un produit indépendant. Les anciens services et comptes de la compagnie restent conservés séparément.")],
  ];
  return <section className="pw4-section" id="preguntas"><div className="pw4-wrap"><Heading number="06" label={t("PREGUNTAS", "QUESTIONS", "QUESTIONS")} title={t("Antes de tu próxima salida.", "Before your next departure.", "Avant votre prochain départ.")} /><div className="pw4-faq">{items.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>;
}
export function Home({ language = "es" }: { language?: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  return <Shell language={language}>
    <section className="pv41-hero"><div className="pv41-horizon" aria-hidden="true" /><div className="pw4-wrap pv41-hero-grid">
      <div className="pv41-hero-copy"><Eyebrow>COPILOTO VECTOR · BY PATAGONIA PROJECT</Eyebrow><h1>{t("Todo tu vuelo.", "Your entire flight.", "Tout votre vol.")}<span>{t("En perspectiva.", "In perspective.", "En perspective.")}</span></h1>
        <p className="pv41-lead">{t("Tu primer oficial virtual. De la preparación al último repaso.", "Your virtual first officer. From preparation to the final review.", "Votre copilote virtuel. De la préparation au dernier bilan.")}</p>
        <p className="pv41-hero-description">{t("Planifica con SimBrief, observa tu aeronave y revisa cada etapa en una aplicación dedicada a Microsoft Flight Simulator.", "Plan with SimBrief, observe your aircraft and review every stage in a dedicated Microsoft Flight Simulator application.", "Préparez avec SimBrief, suivez votre aéronef et analysez chaque étape dans une application dédiée à Microsoft Flight Simulator.")}</p>
        <div className="pw4-actions"><Action href={localeHref(language, "/copiloto-vector")} primary>{t("Descubrir Vector", "Discover Vector", "Découvrir Vector")}</Action><Action href={localeHref(language, "/copiloto-vector#galeria")}>{t("Ver la aplicación", "See the application", "Voir l’application")}</Action></div>
        <div className="pv41-platform"><span className="pw4-dot" />{t("Windows x64 · Beta en desarrollo · ES / EN / FR", "Windows x64 · Beta in development · ES / EN / FR", "Windows x64 · Bêta en développement · ES / EN / FR")}</div>
      </div>
      <div className="pv41-hero-product"><div className="pv41-product-label"><span>{t("CENTRO DE OPERACIONES DE VUELO", "FLIGHT OPERATIONS SUITE", "CENTRE D’OPÉRATIONS DE VOL")}</span><span>{t("INTERFAZ ACTUAL", "CURRENT INTERFACE", "INTERFACE ACTUELLE")}</span></div><AppScreen name="monitor" language={language} eager />
        <div className="pv41-hero-caption"><span>{t("Una operación. Seis espacios conectados.", "One operation. Six connected workspaces.", "Une opération. Six espaces connectés.")}</span><Glyph name="compass" size={23} /></div>
      </div>
    </div></section>
    <div className="pw4-wrap pv41-signal-strip"><span>SIMCONNECT</span><span>SIMBRIEF / OFP</span><span>VECTOR WEATHER</span><span>GSX / VECTOR GROUND</span><span>FLIGHT REPLAY</span></div>
    <section className="pw4-section" id="modulos"><div className="pw4-wrap"><Heading number="01" label={t("LA APLICACIÓN", "THE APPLICATION", "L’APPLICATION")} title={t("Cada etapa tiene su espacio.", "A place for every stage.", "Un espace pour chaque étape.")}
      text={t("Seis módulos comparten el contexto de la operación. Los datos planificados, observados y ausentes permanecen claramente identificados.", "Six modules share the operation’s context. Planned, observed and missing data remain clearly identified.", "Six modules partagent le contexte de l’opération. Les données planifiées, observées et absentes restent clairement identifiées.")} /><ModuleCards language={language} /></div></section>
    <FeatureStory language={language} name="dispatch" number="02" label={t("PREPARAR", "PREPARE", "PRÉPARER")} title={t("Del OFP al mapa. Con una mirada.", "From OFP to map. At a glance.", "De l’OFP à la carte. D’un regard.")}
      description={t("Ruta, pesos, combustible y horarios del plan, junto a cartografía OpenStreetMap. VECTOR WEATHER aporta METAR, TAF original y cálculo de viento para preparar la operación.", "Planned route, weights, fuel and schedules alongside OpenStreetMap. VECTOR WEATHER brings METAR, raw TAF and wind calculations into preparation.", "Itinéraire, masses, carburant et horaires planifiés aux côtés d’OpenStreetMap. VECTOR WEATHER ajoute METAR, TAF brut et calculs de vent à la préparation.")}
      tags={["OFP", "OpenStreetMap", "METAR / TAF"]} />
    <FeatureStory language={language} name="replay" number="03" reverse label={t("COMPRENDER", "UNDERSTAND", "COMPRENDRE")} title={t("Vuelve al vuelo. Aprende del recorrido.", "Return to the flight. Understand the journey.", "Revenez au vol. Comprenez le parcours.")}
      description={t("El diario reúne el historial y los eventos. Flight Replay mueve el marcador sobre posiciones registradas y acompaña la revisión con gráficos. La medición de aterrizaje muestra su calidad; la validación real continúa.", "The logbook brings history and events together. Flight Replay follows recorded positions with charts to support review. Landing measurements show their quality; live validation continues.", "Le carnet de vol réunit historique et événements. Flight Replay suit les positions enregistrées avec des graphiques pour faciliter l’analyse. Les mesures d’atterrissage indiquent leur qualité ; la validation en vol se poursuit.")}
      tags={["Flight Replay", t("Historial", "History", "Historique"), "CSV / JSON"]} />
    <section className="pw4-section pv41-origin"><div className="pw4-wrap"><Glyph name="mountain" size={42} /><div><Eyebrow>BY PATAGONIA PROJECT</Eyebrow><h2>{t("Desde el sur. Para cada recorrido.", "From the south. For every journey.", "Depuis le Sud. Pour chaque voyage.")}</h2><p>{t("Una pasión por la aviación convertida en software. Diseñado para preparar, acompañar y comprender tu vuelo virtual.", "A passion for aviation, shaped into software. Designed to prepare, accompany and understand your virtual flight.", "La passion de l’aviation, devenue logiciel. Conçu pour préparer, accompagner et comprendre votre vol virtuel.")}</p></div><Action href={localeHref(language, "/versiones")}>{t("Estado del desarrollo", "Development status", "État du développement")}</Action></div></section>
    <InterestCallout language={language} />
  </Shell>;
}
export function Product({ language = "es" }: { language?: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const featureScreens: Record<string, string> = { monitor: "monitor", dispatch: "dispatch", cabin: "cabin", operations: "operations", copilot: "copilot", journal: "journal" };
  return <Shell language={language}>
    <section className="pw4-page-intro pv41-product-intro"><div className="pw4-wrap"><Eyebrow>COPILOTO VECTOR / {t("OPERACIONES DE VUELO", "FLIGHT OPERATIONS", "OPÉRATIONS DE VOL")}</Eyebrow><h1>{t("Un copiloto para todo el recorrido.", "A copilot for the entire journey.", "Un copilote pour tout le parcours.")}</h1><p>{t("Planificación, tierra, instrumentos y revisión postvuelo. Explora la aplicación actual con capturas WPF de un vuelo de demostración aislado.", "Planning, ground operations, instruments and postflight review. Explore the current application through WPF screenshots of an isolated demonstration flight.", "Préparation, opérations au sol, instruments et bilan après vol. Découvrez l’application actuelle grâce aux captures WPF d’un vol de démonstration isolé.")}</p><div className="pw4-actions"><Action href="#galeria" primary>{t("Explorar capturas", "Explore screenshots", "Explorer les captures")}</Action><Action href="#funcionalidades">{t("Estado de funciones", "Feature status", "État des fonctions")}</Action><Action href="#compatibilidad">{t("Compatibilidad", "Compatibility", "Compatibilité")}</Action></div></div></section>
    <section className="pw4-section pv41-gallery-section" id="galeria"><div className="pw4-wrap"><Heading number="01" label={t("DENTRO DE VECTOR", "INSIDE VECTOR", "AU CŒUR DE VECTOR")} title={t("Sigue una operación, pantalla a pantalla.", "Follow an operation, screen by screen.", "Suivez une opération, écran par écran.")}
      text={t("Capturas auténticas del software, organizadas por etapa. Amplía cada pantalla y navega con el teclado.", "Authentic software screenshots, organised by stage. Enlarge each screen and navigate with the keyboard.", "Captures authentiques du logiciel, organisées par étape. Agrandissez chaque écran et naviguez au clavier.")} /><Gallery language={language} /></div></section>
    <section className="pw4-section" id="modulos"><div className="pw4-wrap"><Heading number="02" label={t("LOS SEIS MÓDULOS", "THE SIX MODULES", "LES SIX MODULES")} title={t("El contexto te acompaña.", "Your context travels with you.", "Le contexte vous accompagne.")} />
      <div className="pv41-module-stories">{modules.map(module => <article key={module.id} id={module.id}><div><Image src={"/vector/current/icons/" + moduleIcons[module.id] + ".webp"} width={76} height={76} alt="" /><h3>{module[language][0]}</h3><p>{module[language][1]}</p><Link className="pw4-text-link" href="#galeria">{t("Ver en la galería", "View in the gallery", "Voir dans la galerie")}<Glyph name="arrow" size={17} /></Link></div><AppScreen name={featureScreens[module.id]} language={language} /></article>)}</div>
    </div></section>
    <FeatureStory language={language} name="weather" number="03" label="VECTOR WEATHER" title={t("El tiempo también es parte del plan.", "Weather is part of the plan.", "La météo fait aussi partie du plan.")}
      description={t("Consulta origen, destino y alternativo; revisa el METAR decodificado, el TAF original y componentes de viento calculados. Datos del mundo real, identificados por fuente y hora, sin confundirlos con el clima de MSFS.", "Review departure, destination and alternate; inspect decoded METAR, raw TAF and calculated wind components. Real-world data is labelled by source and time, separate from MSFS weather.", "Consultez départ, destination et dégagement ; examinez METAR décodé, TAF brut et composantes du vent calculées. Des données réelles identifiées par source et heure, distinctes de la météo MSFS.")}
      tags={["NOAA", "METAR", "TAF", t("Viento cruzado", "Crosswind", "Vent traversier")]} />
    <CapabilityStatus language={language} /><Compatibility language={language} /><Questions language={language} /><InterestCallout language={language} />
  </Shell>;
}
function InterestCallout({ language }: { language: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  return <section className="pw4-section"><div className="pw4-wrap pw4-cta"><div><Eyebrow>{t("EL PRÓXIMO TRAMO", "THE NEXT LEG", "LA PROCHAINE ÉTAPE")}</Eyebrow><h2>{t("Acompaña lo que viene.", "Follow what comes next.", "Suivez la suite.")}</h2><p>{t("Consulta el desarrollo, la disponibilidad y el canal de contacto. Sin preventas ni pagos activos.", "Check development, availability and the contact channel. No presales or active payments.", "Consultez le développement, la disponibilité et le contact. Sans prévente ni paiement actif.")}</p></div><Action href={localeHref(language, "/soporte#novedades")} primary>{t("Contacto y novedades", "Contact and updates", "Contact et actualités")}</Action></div></section>;
}
