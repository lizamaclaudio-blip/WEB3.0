import type { Language } from "./locale";

export type GalleryGroupId = "preparation" | "dispatch" | "ground" | "flight" | "copilot" | "landing" | "journal";
export type GalleryEvidence = "real" | "offline" | "fixture";
type Translation<T> = Record<Language, T>;
export type GalleryGroup = { id: GalleryGroupId; title: Translation<string> };
export type GalleryCapture = {
  key: string;
  group: GalleryGroupId;
  src: string;
  size: { width: number; height: number };
  evidence: GalleryEvidence;
  title: Translation<string>;
  description: Translation<string>;
  tags: Translation<string[]>;
};

const text = (es: string, en: string, fr: string): Translation<string> => ({ es, en, fr });
const tags = (es: string[], en: string[], fr: string[]): Translation<string[]> => ({ es, en, fr });
const size = { width: 1920, height: 1080 };

export const galleryGroups: readonly GalleryGroup[] = [
  { id: "preparation", title: text("Preparación", "Preparation", "Préparation") },
  { id: "dispatch", title: text("Despacho", "Dispatch", "Préparation du vol") },
  { id: "ground", title: text("En tierra", "On the ground", "Au sol") },
  { id: "flight", title: text("En vuelo", "In flight", "En vol") },
  { id: "copilot", title: text("Copiloto", "Copilot", "Copilote") },
  { id: "landing", title: text("Aterrizaje", "Landing", "Atterrissage") },
  { id: "journal", title: text("Diario", "Journal", "Journal") },
];

// These are screenshots of WPF controls, not live web instruments. Evidence describes the captured session;
// it does not certify every feature shown. Keep original source-language text and disclose fixtures visibly.
export const galleryCaptures: readonly GalleryCapture[] = [
  {
    key: "home", group: "preparation", src: "/vector/current/home.webp", size, evidence: "fixture",
    title: text("Tu operación, desde el inicio", "Your operation, from the start", "Vos opérations dès le départ"),
    description: text("Inicio reúne el contexto de la sesión y los accesos a cada etapa del vuelo.", "Home brings together session context and access to each stage of flight.", "L’accueil rassemble le contexte de la session et les accès à chaque étape du vol."),
    tags: tags(["Inicio", "Contexto de sesión"], ["Home", "Session context"], ["Accueil", "Contexte de la session"]),
  },
  {
    key: "settings", group: "preparation", src: "/vector/current/settings.webp", size, evidence: "offline",
    title: text("Un espacio para tus preferencias", "A place for your preferences", "Un espace pour vos préférences"),
    description: text("Configuración agrupa las preferencias del producto y el estado de sus conexiones.", "Settings groups product preferences and connection status.", "Les réglages regroupent les préférences du produit et l’état de ses connexions."),
    tags: tags(["Configuración", "Preferencias"], ["Settings", "Preferences"], ["Réglages", "Préférences"]),
  },
  {
    key: "dispatch", group: "dispatch", src: "/vector/current/dispatch.webp", size, evidence: "fixture",
    title: text("El OFP, de un vistazo", "The flight plan, at a glance", "Le plan de vol en un coup d’œil"),
    description: text("Ruta, horarios, pesos y combustible de un OFP de ejemplo. Los datos planificados conservan su identificación.", "Route, schedule, weights and fuel from an example OFP. Planned values remain clearly identified.", "Itinéraire, horaires, masses et carburant d’un exemple d’OFP. Les valeurs planifiées restent clairement identifiées."),
    tags: tags(["OFP planificado", "Mapa de ruta"], ["Planned OFP", "Route map"], ["OFP planifié", "Carte de l’itinéraire"]),
  },
  {
    key: "weather", group: "dispatch", src: "/vector/current/weather.webp", size, evidence: "fixture",
    title: text("El contexto meteorológico", "The weather context", "Le contexte météorologique"),
    description: text("Vector Weather muestra un boletín NOAA archivado para pruebas: METAR, TAF en texto original y componentes de viento calculados. No es meteorología actual.", "Vector Weather shows an archived NOAA bulletin used for testing: METAR, original TAF text and calculated wind components. This is not current weather.", "Vector Weather affiche un bulletin NOAA archivé utilisé pour les tests : METAR, texte original des TAF et composantes de vent calculées. Il ne s’agit pas de la météo actuelle."),
    tags: tags(["Vector Weather", "METAR/TAF de ejemplo"], ["Vector Weather", "Example METAR/TAF"], ["Vector Weather", "Exemples de METAR/TAF"]),
  },
  {
    key: "cabin", group: "ground", src: "/vector/current/cabin.webp", size, evidence: "fixture",
    title: text("La cabina en perspectiva", "A view of the cabin", "La cabine en perspective"),
    description: text("Layout de referencia del King Air y figuras ilustrativas. Ninguna fuente identifica el asiento individual de cada pasajero.", "King Air reference layout with illustrative figures. No source identifies each passenger’s individual seat.", "Aménagement de référence du King Air avec personnages illustratifs. Aucune source n’identifie le siège individuel de chaque passager."),
    tags: tags(["Cabina de referencia", "Posiciones ilustrativas"], ["Reference cabin", "Illustrative positions"], ["Cabine de référence", "Positions illustratives"]),
  },
  {
    key: "ground", group: "ground", src: "/vector/current/ground.webp", size, evidence: "fixture",
    title: text("Servicios en tierra, con su origen", "Ground services, with their source", "Les services au sol et leur source"),
    description: text("Ejemplo de la presentación de estados de servicios GSX y combustible en Vector Ground. Los servicios se muestran en solo lectura.", "An example of how Vector Ground presents GSX service states and fuel. Services are shown read-only.", "Un exemple de présentation des états des services GSX et du carburant dans Vector Ground. Les services sont affichés en lecture seule."),
    tags: tags(["Vector Ground", "Solo lectura"], ["Vector Ground", "Read-only"], ["Vector Ground", "Lecture seule"]),
  },
  {
    key: "monitor", group: "flight", src: "/vector/current/monitor.webp", size, evidence: "fixture",
    title: text("La aeronave, en una sola vista", "The aircraft, in one view", "L’appareil en une seule vue"),
    description: text("Instrumentos, horizonte, navegación, motores, combustible y sistemas comparten el espacio de Monitor en Vivo.", "Instruments, attitude, navigation, engines, fuel and systems share the Live Monitor workspace.", "Instruments, horizon, navigation, moteurs, carburant et systèmes partagent l’espace du Moniteur en direct."),
    tags: tags(["Monitor en Vivo", "Instrumentos WPF"], ["Live Monitor", "WPF instruments"], ["Moniteur en direct", "Instruments WPF"]),
  },
  {
    key: "operations", group: "flight", src: "/vector/current/operations.webp", size, evidence: "fixture",
    title: text("El hilo de la operación", "The thread of the operation", "Le fil des opérations"),
    description: text("Una vista del desarrollo reúne fases, hitos y eventos de la sesión, con la procedencia de sus datos.", "A development view brings together phases, milestones and session events, with data provenance.", "Une vue de développement rassemble les phases, les jalons et les événements de la session, avec la provenance des données."),
    tags: tags(["Operaciones", "Fases y eventos"], ["Operations", "Phases and events"], ["Opérations", "Phases et événements"]),
  },
  {
    key: "copilot", group: "copilot", src: "/vector/current/copilot.webp", size, evidence: "fixture",
    title: text("Una ayuda junto al piloto", "Support beside the pilot", "Une aide aux côtés du pilote"),
    description: text("Checklists, avisos y consultas contextuales acompañan el flujo de trabajo. Las decisiones siguen a cargo del piloto.", "Checklists, advisories and contextual questions accompany the workflow. Decisions remain with the pilot.", "Les listes de vérification, les alertes et les questions contextuelles accompagnent le travail. Les décisions restent celles du pilote."),
    tags: tags(["Copiloto", "Checklists"], ["Copilot", "Checklists"], ["Copilote", "Listes de vérification"]),
  },
  {
    key: "landing", group: "landing", src: "/vector/current/landing.webp", size, evidence: "fixture",
    title: text("Revisar la llegada", "Review the arrival", "Revoir l’arrivée"),
    description: text("Análisis de aterrizaje de un vuelo de prueba dentro del informe de sesión. La interfaz sigue en desarrollo y no acredita validación en un vuelo real.", "Landing analysis for a test flight within the session report. The interface remains in development and does not demonstrate real-flight validation.", "Analyse de l’atterrissage d’un vol de test dans le rapport de session. L’interface reste en développement et ne démontre pas une validation en vol réel."),
    tags: tags(["Revisión de aterrizaje", "En desarrollo"], ["Landing review", "In development"], ["Bilan de l’atterrissage", "En développement"]),
  },
  {
    key: "journal", group: "journal", src: "/vector/current/journal.webp", size, evidence: "fixture",
    title: text("Lo ocurrido, en contexto", "What happened, in context", "Les événements dans leur contexte"),
    description: text("El diario reúne sesiones y su secuencia de eventos para revisarlas después del vuelo. La captura corresponde a un vuelo de prueba.", "The journal brings together sessions and their event sequence for review after the flight. The screenshot shows a test flight.", "Le journal rassemble les sessions et leur succession d’événements pour les revoir après le vol. La capture présente un vol de test."),
    tags: tags(["Diario", "Historial de sesiones"], ["Journal", "Session history"], ["Journal", "Historique des sessions"]),
  },
  {
    key: "report", group: "journal", src: "/vector/current/report.webp", size, evidence: "fixture",
    title: text("El informe de la sesión", "The session report", "Le rapport de session"),
    description: text("Informe de un vuelo de prueba con resumen de sesión y análisis de aterrizaje en desarrollo. Los resultados no pertenecen a un vuelo real.", "A test-flight report with a session summary and landing analysis in development. Results do not belong to a real flight.", "Rapport d’un vol de test avec bilan de session et analyse de l’atterrissage en développement. Les résultats ne proviennent pas d’un vol réel."),
    tags: tags(["Informe de vuelo", "Vuelo de prueba"], ["Flight report", "Test flight"], ["Rapport de vol", "Vol de test"]),
  },
  {
    key: "statistics", group: "journal", src: "/vector/current/statistics.webp", size, evidence: "fixture",
    title: text("Una mirada al historial", "A view of the history", "Un regard sur l’historique"),
    description: text("Resumen y tendencias calculados sobre sesiones de prueba. No son estadísticas de usuarios ni operaciones reales.", "Summaries and trends calculated from test sessions. These are not statistics from real users or operations.", "Bilans et tendances calculés à partir de sessions de test. Il ne s’agit pas de statistiques d’utilisateurs ou d’opérations réels."),
    tags: tags(["Estadísticas de ejemplo", "Sesiones de prueba"], ["Example statistics", "Test sessions"], ["Exemples de statistiques", "Sessions de test"]),
  },
  {
    key: "replay", group: "journal", src: "/vector/current/replay.webp", size, evidence: "fixture",
    title: text("Volver sobre la secuencia", "Revisit the sequence", "Revenir sur la séquence"),
    description: text("Vista experimental para revisar la secuencia registrada. No representa un vuelo en directo.", "An experimental view for reviewing the recorded sequence. It does not represent a live flight.", "Une vue expérimentale pour revoir la séquence enregistrée. Elle ne représente pas un vol en direct."),
    tags: tags(["Revisión retrospectiva", "Experimental"], ["Retrospective review", "Experimental"], ["Relecture", "Expérimental"]),
  },
];
