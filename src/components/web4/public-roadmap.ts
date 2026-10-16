import type { Language } from "./locale";

export type RoadmapCopy = Record<Language, string>;
export type PublicRoadmapStatus = "completed" | "testing" | "development" | "upcoming" | "study";
export type PublicRoadmapItem = {
  id: string;
  title: RoadmapCopy;
  description: RoadmapCopy;
  status: PublicRoadmapStatus;
  evidenceNote: RoadmapCopy;
};
const copy = (es: string, en: string, fr: string): RoadmapCopy => ({ es, en, fr });

export const publicRoadmapStatuses: Record<PublicRoadmapStatus, RoadmapCopy> = {
  completed: copy("Completado", "Completed", "Terminé"),
  testing: copy("En pruebas", "In testing", "En test"),
  development: copy("En desarrollo", "In development", "En développement"),
  upcoming: copy("Próximamente", "Up next", "À venir"),
  study: copy("En estudio", "Under consideration", "À l’étude"),
};

const qa = copy(
  "Implementado y probado en QA. La validación con MSFS real sigue pendiente; aún no disponible comercialmente.",
  "Implemented and tested in QA. Live MSFS validation is still pending; not commercially available yet.",
  "Implémenté et testé en QA. La validation avec MSFS réel reste à effectuer ; pas encore disponible commercialement.",
);
const future = copy(
  "Trabajo futuro. Alcance y prioridades sujetos a revisión; sin fecha comprometida.",
  "Future work. Scope and priorities remain under review; no committed date.",
  "Travail futur. Périmètre et priorités à réexaminer ; aucune date engagée.",
);

// Reviewed initial content, not live progress telemetry. Administration may replace
// these published records. No fabricated dates, percentages or completion claims.
export const publicRoadmapSeed: PublicRoadmapItem[] = [
  { id: "vector-core", status: "testing", title: copy("El corazón de VECTOR", "The heart of VECTOR", "Le cœur de VECTOR"),
    description: copy("Una base local que reúne el estado del avión, las fases del vuelo y su diario en una misma experiencia.", "A local foundation bringing aircraft state, flight phases and your logbook into one experience.", "Une base locale qui réunit l’état de l’aéronef, les phases du vol et votre journal dans une seule expérience."), evidenceNote: qa },
  { id: "flight-planning", status: "testing", title: copy("Prepara tu próxima ruta", "Prepare your next route", "Préparez votre prochain itinéraire"),
    description: copy("DESPACHO reúne el plan de vuelo, la importación de SimBrief, los pesos y el combustible planificado, con acceso al OFP completo.", "DISPATCH brings together the flight plan, SimBrief import, weights and planned fuel, with access to the full OFP.", "DISPATCH réunit le plan de vol, l’import SimBrief, les masses et le carburant prévu, avec accès à l’OFP complet."), evidenceNote: qa },
  { id: "operational-copilot", status: "testing", title: copy("Un copiloto durante cada etapa", "A copilot for every stage", "Un copilote à chaque étape"),
    description: copy("Checklists, supervisión operacional y ayuda contextual que distinguen lo observado de lo confirmado por el piloto.", "Checklists, operational monitoring and contextual guidance distinguish observations from pilot confirmations.", "Les checklists, le suivi opérationnel et l’aide contextuelle distinguent les observations des confirmations du pilote."), evidenceNote: qa },
  { id: "flight-monitor", status: "testing", title: copy("Tu vuelo, de un vistazo", "Your flight at a glance", "Votre vol en un coup d’œil"),
    description: copy("MONITOR EN VIVO reúne instrumentos y estados del avión cuando el simulador entrega esos datos.", "LIVE MONITOR brings together instruments and aircraft states when the simulator provides those data.", "LIVE MONITOR réunit les instruments et les états de l’aéronef lorsque le simulateur fournit ces données."), evidenceNote: qa },
  { id: "vector-academy", status: "testing", title: copy("Aprende con VECTOR ACADEMY", "Learn with VECTOR ACADEMY", "Apprenez avec VECTOR ACADEMY"),
    description: copy("Tutoriales por aeronave y rutas de aprendizaje integrados con las checklists y el copiloto.", "Aircraft tutorials and learning paths integrated with checklists and the copilot.", "Tutoriels par aéronef et parcours d’apprentissage intégrés aux checklists et au copilote."), evidenceNote: qa },
  { id: "vector-performance", status: "testing", title: copy("Prepara las condiciones del vuelo", "Prepare for the flight conditions", "Préparez les conditions du vol"),
    description: copy("VECTOR PERFORMANCE calcula componentes de viento y conversiones. Las velocidades introducidas por el piloto se identifican como manuales.", "VECTOR PERFORMANCE calculates wind components and conversions. Pilot-entered speeds are identified as manual.", "VECTOR PERFORMANCE calcule les composantes du vent et les conversions. Les vitesses saisies par le pilote sont identifiées comme manuelles."), evidenceNote: copy("Implementado en QA; no calcula velocidades ni distancias de fabricante. Pendiente de validación real.", "Implemented in QA; does not calculate manufacturer speeds or distances. Live validation pending.", "Implémenté en QA ; ne calcule pas les vitesses ou distances constructeur. Validation réelle à effectuer.") },
  { id: "aircraft-studio", status: "testing", title: copy("Una cabina a tu medida", "A cabin of your own", "Une cabine à votre mesure"),
    description: copy("AIRCRAFT STUDIO permite editar y guardar layouts e integrarlos con CARGA Y CABINA.", "AIRCRAFT STUDIO lets you edit and save layouts and integrate them with LOAD & CABIN.", "AIRCRAFT STUDIO permet de modifier et enregistrer des plans, puis de les intégrer à CHARGEMENT ET CABINE."), evidenceNote: copy("Implementado en QA. La posición de pasajeros es ilustrativa; MSFS y GSX reales pendientes de validación.", "Implemented in QA. Passenger positions are illustrative; live MSFS and GSX validation pending.", "Implémenté en QA. La position des passagers est illustrative ; validation réelle MSFS et GSX à effectuer.") },
  { id: "career-acars-local", status: "testing", title: copy("Construye tu carrera local", "Build your local career", "Construisez votre carrière locale"),
    description: copy("CAREER LOCAL y ACARS LOCAL reúnen piloto, aerolínea personal, misiones, progreso y PIREP, con cola offline y DIARIO.", "CAREER LOCAL and ACARS LOCAL bring together your pilot, personal airline, missions, progress and PIREPs, with an offline queue and LOGBOOK.", "CAREER LOCAL et ACARS LOCAL réunissent pilote, compagnie personnelle, missions, progression et PIREP, avec file hors ligne et JOURNAL."), evidenceNote: copy("Implementados en QA. Sin sincronización online ni aerolíneas multiusuario; validación con MSFS real pendiente.", "Implemented in QA. No online sync or multi-user airlines; live MSFS validation pending.", "Implémentés en QA. Sans synchronisation en ligne ni compagnies multiutilisateurs ; validation MSFS réelle à effectuer.") },
  { id: "real-flight-validation", status: "upcoming", title: copy("La prueba del vuelo real", "The real-flight test", "L’épreuve du vol réel"),
    description: copy("Validar sesiones completas con MSFS y las aeronaves compatibles antes de confirmar disponibilidad comercial.", "Validate full sessions with MSFS and supported aircraft before confirming commercial availability.", "Valider des sessions complètes avec MSFS et les aéronefs compatibles avant de confirmer la disponibilité commerciale."), evidenceNote: future },
  { id: "vector-live-panel", status: "study", title: copy("VECTOR LIVE PANEL", "VECTOR LIVE PANEL", "VECTOR LIVE PANEL"),
    description: copy("Evaluar nuevas formas de consultar la operación en paneles complementarios. La experiencia final aún está por definir.", "Explore new ways to follow operations in companion panels. The final experience is still to be defined.", "Explorer de nouvelles façons de suivre les opérations dans des panneaux complémentaires. L’expérience finale reste à définir."), evidenceNote: future },
  { id: "live-flight-map", status: "study", title: copy("LIVE FLIGHT MAP", "LIVE FLIGHT MAP", "LIVE FLIGHT MAP"),
    description: copy("Estudiar una vista de seguimiento del vuelo, diferenciada del mapa del plan que ya existe en DESPACHO.", "Study a flight-tracking view, separate from the existing planned-route map in DISPATCH.", "Étudier une vue de suivi du vol, distincte de la carte de l’itinéraire prévu déjà présente dans DISPATCH."), evidenceNote: future },
  { id: "landing-analysis", status: "testing", title: copy("Aprende de cada aterrizaje", "Learn from every landing", "Apprenez de chaque atterrissage"),
    description: copy("LANDING LAB permite revisar la aproximación, los contactos y el replay, con la procedencia y los límites de cada dato.", "LANDING LAB lets you review the approach, touchdown sequence and replay, with each data source and its limits identified.", "LANDING LAB permet de revoir l’approche, les contacts et le replay, avec la provenance et les limites de chaque donnée."), evidenceNote: copy("Implementado en QA. Captura avanzada y correspondencia de sensores por aeronave pendientes de validación real.", "Implemented in QA. Advanced recording and aircraft-specific sensor mapping await live validation.", "Implémenté en QA. L’enregistrement avancé et la correspondance des capteurs par aéronef attendent la validation réelle.") },
  { id: "commercial-editions", status: "development", title: copy("Licencias y ediciones", "Licensing and editions", "Licences et éditions"),
    description: copy("Preparar TAKEOFF, HORIZON y COMMANDER, la edición completa, junto al futuro sistema seguro de cuentas y licencias.", "Prepare TAKEOFF, HORIZON and COMMANDER, the complete edition, alongside a future secure account and licensing system.", "Préparer TAKEOFF, HORIZON et COMMANDER, l’édition complète, ainsi qu’un futur système sécurisé de comptes et licences."), evidenceNote: copy("Preparación técnica interna. Contrato de activación pendiente; no hay precios, ventas ni instalador público.", "Internal technical preparation. Activation contract pending; no prices, sales or public installer.", "Préparation technique interne. Contrat d’activation en attente ; aucun prix, vente ou installateur public.") },
  { id: "stability-validation", status: "upcoming", title: copy("Estabilidad y compatibilidad", "Stability and compatibility", "Stabilité et compatibilité"),
    description: copy("Revisar rendimiento, recuperación y compatibilidad a lo largo de vuelos completos y diferentes equipos.", "Review performance, recovery and compatibility throughout complete flights and across different computers.", "Examiner les performances, la reprise et la compatibilité sur des vols complets et différents ordinateurs."), evidenceNote: future },
  { id: "commercial-launch", status: "upcoming", title: copy("El primer despegue comercial", "The first commercial takeoff", "Le premier décollage commercial"),
    description: copy("Anunciaremos la apertura cuando finalicen las pruebas de calidad y compatibilidad. Fecha de lanzamiento por confirmar.", "We will announce availability when quality and compatibility testing is complete. Launch date to be confirmed.", "Nous annoncerons l’ouverture lorsque les tests de qualité et de compatibilité seront terminés. Date de lancement à confirmer."), evidenceNote: copy("No abierto. No se aceptan compras ni se distribuye la aplicación.", "Not open. Purchases are not accepted and the application is not distributed.", "Non ouvert. Aucun achat accepté et aucune distribution de l’application.") },
  { id: "community-future", status: "study", title: copy("El futuro, con los pilotos", "The future, with pilots", "L’avenir, avec les pilotes"),
    description: copy("Propuestas de Community Lab y una futura plataforma CAREER ONLINE. Las prioridades podrán evolucionar con la comunidad.", "Community Lab ideas and a future CAREER ONLINE platform. Priorities can evolve with the community.", "Les idées du Community Lab et une future plateforme CAREER ONLINE. Les priorités pourront évoluer avec la communauté."), evidenceNote: copy("CAREER ONLINE y las aerolíneas multiusuario no están desarrolladas. No se promete su inclusión en una licencia local.", "CAREER ONLINE and multi-user airlines are not developed. Inclusion in a local licence is not promised.", "CAREER ONLINE et les compagnies multiutilisateurs ne sont pas développés. Leur inclusion dans une licence locale n’est pas promise.") },
];

export const roadmapMetadata = {
  title: copy("Roadmap de COPILOTO VECTOR", "COPILOTO VECTOR roadmap", "Feuille de route de COPILOTO VECTOR"),
  description: copy("Descubre qué está en pruebas y qué viene después en COPILOTO VECTOR. Desarrollo transparente, comunidad de pilotos y lanzamiento por confirmar.", "Discover what is in testing and what comes next for COPILOTO VECTOR. Transparent development, a pilot community and a launch date to be confirmed.", "Découvrez les fonctionnalités en test et la suite de COPILOTO VECTOR. Développement transparent, communauté de pilotes et lancement à confirmer."),
};
