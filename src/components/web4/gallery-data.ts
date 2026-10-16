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
  sourceLanguage?: Language;
  title: Translation<string>;
  description: Translation<string>;
  tags: Translation<string[]>;
};

const text = (es: string, en: string, fr: string): Translation<string> => ({ es, en, fr });
const tags = (es: string[], en: string[], fr: string[]): Translation<string[]> => ({ es, en, fr });
const size = { width: 1920, height: 1080 };
const qaTourSize = { width: 1616, height: 868 };

export const galleryGroups: readonly GalleryGroup[] = [
  { id: "preparation", title: text("Preparación", "Preparation", "Préparation") },
  { id: "dispatch", title: text("Despacho", "Dispatch", "Préparation du vol") },
  { id: "ground", title: text("En tierra", "On the ground", "Au sol") },
  { id: "flight", title: text("En vuelo", "In flight", "En vol") },
  { id: "copilot", title: text("Copiloto", "Copilot", "Copilote") },
  { id: "landing", title: text("Landing Lab", "Landing Lab", "Landing Lab") },
  { id: "journal", title: text("Diario", "Journal", "Journal") },
];

// These are screenshots of WPF controls, not live web instruments. Evidence describes the captured session;
// it does not certify every feature shown. Keep original source-language text and disclose fixtures visibly.
export const galleryCaptures: readonly GalleryCapture[] = [
  {
    key: "academy", group: "preparation", src: "/vector/web50/academy.webp", size: { width: 1920, height: 1061 }, evidence: "fixture", sourceLanguage: "en",
    title: text("Academy, junto a tu Copiloto", "Academy, alongside your Copilot", "Academy, aux côtés du Copilote"),
    description: text("Recorrido de aprendizaje integrado en COPILOTO, con instrucciones y checklist de una sesión QA. No muestra el editor completo de Academy ni acredita un vuelo real.", "A learning path integrated into COPILOT, with instructions and a checklist from a QA session. This does not show the full Academy editor or verify a real flight.", "Parcours d’apprentissage intégré au COPILOTE, avec instructions et liste de vérification d’une session QA. Cette vue ne présente pas l’éditeur complet d’Academy et ne valide pas un vol réel."),
    tags: tags(["Academy integrada", "Validación real pendiente"], ["Integrated Academy", "Live validation pending"], ["Academy intégrée", "Validation réelle à effectuer"]),
  },
  {
    key: "performance", group: "preparation", src: "/vector/web50/performance.webp", size: { width: 1920, height: 1061 }, evidence: "fixture", sourceLanguage: "en",
    title: text("Más contexto para cada pista", "More context for every runway", "Plus de contexte pour chaque piste"),
    description: text("Performance reúne viento, atmósfera y referencias manuales de la aeronave. Datos sintéticos de QA; no calcula velocidades certificadas ni valida una operación real.", "Performance brings together wind, atmosphere and manual aircraft references. Synthetic QA data; it does not calculate certified speeds or validate a real operation.", "Performance rassemble vent, atmosphère et références manuelles de l’appareil. Données QA synthétiques ; aucun calcul de vitesses certifiées ni validation d’une opération réelle."),
    tags: tags(["Performance", "Referencias manuales"], ["Performance", "Manual references"], ["Performance", "Références manuelles"]),
  },
  {
    key: "studio", group: "ground", src: "/vector/web50/studio.webp", size: { width: 1920, height: 1061 }, evidence: "fixture", sourceLanguage: "en",
    title: text("Tu layout, aplicado a la cabina", "Your layout, applied to the cabin", "Votre aménagement, appliqué à la cabine"),
    description: text("CARGA Y CABINA utiliza un layout de Aircraft Studio durante una sesión QA. Esta captura muestra el resultado integrado, no los controles del editor. Las posiciones de pasajeros son ilustrativas.", "LOAD & CABIN uses an Aircraft Studio layout during a QA session. This screenshot shows the integrated result, not the editor controls. Passenger positions are illustrative.", "CHARGEMENT ET CABINE utilise un aménagement d’Aircraft Studio pendant une session QA. La capture montre le résultat intégré, pas les commandes de l’éditeur. Les positions des passagers sont illustratives."),
    tags: tags(["Layout de Studio", "Integración con cabina"], ["Studio layout", "Cabin integration"], ["Aménagement Studio", "Intégration cabine"]),
  },
  {
    key: "career", group: "journal", src: "/vector/web50/career.webp", size: { width: 1920, height: 1061 }, evidence: "fixture", sourceLanguage: "en",
    title: text("Una historia que continúa: Career Local", "A continuing story: Career Local", "Une histoire qui continue : Career Local"),
    description: text("Piloto de prueba, aerolínea personal, misiones y progreso del MVP local implementado en QA. No hay plataforma online ni pilotos conectados; validación con MSFS real pendiente.", "A test pilot, personal airline, missions and progress in the local MVP implemented in QA. No online platform or connected pilots; live MSFS validation is pending.", "Pilote de test, compagnie personnelle, missions et progression du MVP local implémenté en QA. Aucune plateforme en ligne ni pilotes connectés ; validation avec MSFS réel à effectuer."),
    tags: tags(["Career Local", "Implementado en QA"], ["Career Local", "Implemented in QA"], ["Career Local", "Implémenté en QA"]),
  },
  {
    key: "acars", group: "journal", src: "/vector/web50/acars.webp", size: { width: 1600, height: 829 }, evidence: "fixture", sourceLanguage: "en",
    title: text("ACARS Local: conservar la operación", "ACARS Local: keep the operation", "ACARS Local : conserver les opérations"),
    description: text("PIREP y eventos de una sesión sintética, integrados con Career y Diario. Registro y cola offline locales implementados en QA; no es un servicio online ni evidencia de MSFS real.", "A synthetic-session PIREP and events, integrated with Career and Logbook. Local recording and offline queue implemented in QA; this is not an online service or live MSFS evidence.", "PIREP et événements d’une session synthétique, intégrés à Career et au Journal. Enregistrement et file hors ligne locaux implémentés en QA ; aucun service en ligne ni preuve de MSFS réel."),
    tags: tags(["ACARS Local", "PIREP de prueba"], ["ACARS Local", "Test PIREP"], ["ACARS Local", "PIREP de test"]),
  },
  {
    key: "home", group: "preparation", src: "/vector/m29/home.webp", size: qaTourSize, evidence: "fixture", sourceLanguage: "en",
    title: text("Tu operación, desde el inicio", "Your operation, from the start", "Vos opérations dès le départ"),
    description: text("Inicio reúne el contexto de la sesión y los accesos a cada etapa del vuelo.", "Home brings together session context and access to each stage of flight.", "L’accueil rassemble le contexte de la session et les accès à chaque étape du vol."),
    tags: tags(["Inicio", "Contexto de sesión"], ["Home", "Session context"], ["Accueil", "Contexte de la session"]),
  },
  {
    key: "settings", group: "preparation", src: "/vector/m29/settings.webp", size: qaTourSize, evidence: "fixture", sourceLanguage: "en",
    title: text("Un espacio para tus preferencias", "A place for your preferences", "Un espace pour vos préférences"),
    description: text("Configuración agrupa las preferencias del producto y el estado de sus conexiones.", "Settings groups product preferences and connection status.", "Les réglages regroupent les préférences du produit et l’état de ses connexions."),
    tags: tags(["Configuración", "Preferencias"], ["Settings", "Preferences"], ["Réglages", "Préférences"]),
  },
  {
    key: "dispatch", group: "dispatch", src: "/vector/m29/dispatch.webp", size: qaTourSize, evidence: "fixture", sourceLanguage: "en",
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
    key: "operations", group: "flight", src: "/vector/m29/operations.webp", size: qaTourSize, evidence: "fixture", sourceLanguage: "en",
    title: text("El hilo de la operación", "The thread of the operation", "Le fil des opérations"),
    description: text("Una vista del desarrollo reúne fases, hitos y eventos de la sesión, con la procedencia de sus datos.", "A development view brings together phases, milestones and session events, with data provenance.", "Une vue de développement rassemble les phases, les jalons et les événements de la session, avec la provenance des données."),
    tags: tags(["Operaciones", "Fases y eventos"], ["Operations", "Phases and events"], ["Opérations", "Phases et événements"]),
  },
  {
    key: "copilot", group: "copilot", src: "/vector/m29/copilot.webp", size: qaTourSize, evidence: "fixture", sourceLanguage: "en",
    title: text("Una ayuda junto al piloto", "Support beside the pilot", "Une aide aux côtés du pilote"),
    description: text("Checklists, avisos y consultas contextuales acompañan el flujo de trabajo. Las decisiones siguen a cargo del piloto.", "Checklists, advisories and contextual questions accompany the workflow. Decisions remain with the pilot.", "Les listes de vérification, les alertes et les questions contextuelles accompagnent le travail. Les décisions restent celles du pilote."),
    tags: tags(["Copiloto", "Checklists"], ["Copilot", "Checklists"], ["Copilote", "Listes de vérification"]),
  },
  {
    key: "landing", group: "landing", src: "/vector/current/landing.webp", size, evidence: "fixture",
    title: text("Landing Lab · Analizar el aterrizaje", "Landing Lab · Review the landing", "Landing Lab · Analyser l’atterrissage"),
    description: text("Vista DIARIO → ATERRIZAJE M27.2, presentada aquí como Landing Lab. Gráficos, compresión relativa y secuencia de contacto de un vuelo de prueba. La validación real por aeronave sigue pendiente.", "The JOURNAL → LANDING M27.2 view, presented here as Landing Lab. Charts, relative compression and contact sequence from a test flight. Real-flight validation by aircraft remains pending.", "La vue JOURNAL → ATTERRISSAGE M27.2, présentée ici sous le nom Landing Lab. Graphiques, compression relative et séquence de contact d’un vol de test. La validation en vol réel par appareil reste à effectuer."),
    tags: tags(["Diario → Aterrizaje", "Validación real pendiente"], ["Journal → Landing", "Real-flight validation pending"], ["Journal → Atterrissage", "Validation en vol réel à venir"]),
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
