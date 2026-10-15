import type { Language } from "./locale";

type Copy = Record<Language, string>;
const copy = (es: string, en: string, fr: string): Copy => ({ es, en, fr });

// Implementation evidence is independent of commercial release and live validation.
// Reviewed against the M31–M34 development reports; later reports supersede earlier roadmaps.
export const developmentStatus = {
  implementedQa: copy("IMPLEMENTADO EN QA", "IMPLEMENTED IN QA", "IMPLÉMENTÉ EN QA"),
  livePending: copy("PENDIENTE DE VALIDACIÓN REAL", "LIVE VALIDATION PENDING", "VALIDATION RÉELLE À EFFECTUER"),
  future: copy("FUTURO", "FUTURE", "FUTUR"),
  scopeNote: copy(
    "Las pruebas virtuales verifican el desarrollo, no una disponibilidad comercial ni la validación con MSFS o GSX reales.",
    "Virtual tests verify development, not commercial availability or validation with live MSFS or GSX.",
    "Les tests virtuels vérifient le développement, sans constituer une disponibilité commerciale ni une validation avec MSFS ou GSX réels.",
  ),
};

export const developmentMilestones = [
  {
    id: "academy", milestone: "M31", status: "implemented_qa", liveValidation: "pending",
    name: "VECTOR ACADEMY", evidence: "M31-academy-performance.md",
    summary: copy("Tutoriales por aeronave y verificación de pasos, integrados con las checklists y COPILOTO.", "Aircraft tutorials and step verification, integrated with checklists and COPILOT.", "Tutoriels par aéronef et vérification des étapes, intégrés aux listes de vérification et au COPILOTE."),
    detail: copy("Perfiles incorporados y de usuario, rutas de aprendizaje y avance manual o mediante sensores. Implementado y probado virtualmente en QA, sin MSFS real.", "Built-in and user profiles, learning paths and manual or sensor-based progress. Implemented and tested virtually in QA, without live MSFS.", "Profils intégrés et utilisateur, parcours d’apprentissage et progression manuelle ou par capteurs. Implémenté et testé virtuellement en QA, sans MSFS réel."),
    limitation: copy("La documentación de cada procedimiento puede ser completa, parcial o pendiente. Confirmar un paso manualmente no equivale a observarlo en el simulador.", "Each procedure may have complete, partial or pending documentation. Manually confirming a step is not the same as observing it in the simulator.", "La documentation de chaque procédure peut être complète, partielle ou en attente. Confirmer manuellement une étape ne signifie pas l’avoir observée dans le simulateur."),
  },
  {
    id: "performance", milestone: "M31", status: "implemented_qa", liveValidation: "pending",
    name: "VECTOR PERFORMANCE", evidence: "M31-academy-performance.md",
    summary: copy("Componentes de viento, atmósfera y conversiones, con registro manual de valores del avión.", "Wind components, atmosphere and conversions, with manual recording of aircraft values.", "Composantes du vent, atmosphère et conversions, avec saisie manuelle des valeurs de l’aéronef."),
    detail: copy("Cálculos de viento por pista, altitud de presión, desviación ISA y conversiones. Registro persistente de velocidades introducidas por el piloto. Implementado y probado virtualmente en QA, sin MSFS real.", "Runway wind components, pressure altitude, ISA deviation and conversions. Persistent records of speeds entered by the pilot. Implemented and tested virtually in QA, without live MSFS.", "Composantes du vent par piste, altitude-pression, écart ISA et conversions. Enregistrement persistant des vitesses saisies par le pilote. Implémenté et testé virtuellement en QA, sans MSFS réel."),
    limitation: copy("No calcula V1, VR, V2, VREF, VAPP ni distancias de despegue o aterrizaje. No incluye un modelo de performance validado por fabricante.", "It does not calculate V1, VR, V2, VREF, VAPP or takeoff/landing distances. No manufacturer-validated performance model is included.", "Ne calcule ni V1, VR, V2, VREF, VAPP, ni les distances de décollage ou d’atterrissage. Aucun modèle de performances validé par un constructeur n’est inclus."),
  },
  {
    id: "aircraft-studio", milestone: "M32", status: "implemented_qa", liveValidation: "pending",
    name: "VECTOR AIRCRAFT STUDIO", evidence: "M32-aircraft-studio.md",
    summary: copy("Editor visual de layouts con persistencia e integración en CARGA Y CABINA.", "Visual layout editor with persistence and integration into LOAD & CABIN.", "Éditeur visuel de plans avec persistance et intégration à CHARGEMENT ET CABINE."),
    detail: copy("Edición de cabina, asientos, carga, puertas y áreas de servicio; deshacer/rehacer, guardado y paquetes de layouts. Integrado con CARGA Y CABINA conservando las animaciones de embarque. Implementado y probado virtualmente en QA, sin MSFS ni GSX reales.", "Edit cabins, seats, cargo, doors and service areas; undo/redo, saving and layout packages. Integrated with LOAD & CABIN while preserving boarding animations. Implemented and tested virtually in QA, without live MSFS or GSX.", "Édition des cabines, sièges, soutes, portes et zones de service ; annuler/rétablir, sauvegarde et paquets de plans. Intégré à CHARGEMENT ET CABINE en conservant les animations d’embarquement. Implémenté et testé virtuellement en QA, sans MSFS ni GSX réels."),
    limitation: copy("El layout puede ser de referencia, del usuario o documentado por su autor. La posición de cada pasajero es ilustrativa; no representa ocupación real por asiento ni emite comandos GSX.", "Layouts may be references, user-defined or documented by their authors. Individual passenger positions are illustrative; they neither establish real seat occupancy nor issue GSX commands.", "Les plans peuvent être de référence, définis par l’utilisateur ou documentés par leur auteur. La position des passagers est illustrative ; elle ne prouve aucune occupation réelle par siège et n’émet aucune commande GSX."),
  },
  {
    id: "career", milestone: "M33", status: "implemented_qa", liveValidation: "pending",
    name: "VECTOR CAREER LOCAL", evidence: "M33-vector-career.md",
    summary: copy("Piloto, aerolínea virtual personal, flota y misiones; economía y progreso vinculados al DIARIO.", "Pilot, personal virtual airline, fleet and missions; economy and progress linked to the LOGBOOK.", "Pilote, compagnie virtuelle personnelle, flotte et missions ; économie et progression liées au JOURNAL."),
    detail: copy("Creación de piloto y aerolínea virtual personal, flota, misiones, economía y progreso. Integración con DIARIO, PIREP y recompensas sin duplicados. Implementado y probado virtualmente en QA, sin MSFS real.", "Pilot and personal virtual airline creation, fleet, missions, economy and progress. LOGBOOK integration, PIREPs and rewards without duplicates. Implemented and tested virtually in QA, without live MSFS.", "Création du pilote et de sa compagnie virtuelle personnelle, flotte, missions, économie et progression. Intégration au JOURNAL, PIREP et récompenses sans doublons. Implémenté et testé virtuellement en QA, sans MSFS réel."),
    limitation: copy("Carrera local con créditos virtuales. Las aprobaciones manuales se identifican; pasajeros y carga no se verifican por misión. Pendiente de validación con MSFS real; no disponible comercialmente.", "Local career with virtual credits. Manual approvals are labelled; passengers and cargo are not verified per mission. Live MSFS validation pending; not commercially available.", "Carrière locale avec crédits virtuels. Les approbations manuelles sont identifiées ; passagers et fret ne sont pas vérifiés par mission. Validation avec MSFS réel à effectuer ; non disponible commercialement."),
  },
  {
    id: "acars", milestone: "M34", status: "implemented_qa", liveValidation: "pending",
    name: "VECTOR ACARS LOCAL", evidence: "M34-vector-acars.md",
    summary: copy("Registro de eventos, PIREP y cola local offline, con exportación e importación e integración con CAREER y DIARIO.", "Event recording, PIREPs and a local offline queue, with export/import and CAREER and LOGBOOK integration.", "Enregistrement des événements, PIREP et file locale hors ligne, avec export/import et intégration à CAREER et au JOURNAL."),
    detail: copy("Registro operacional y PIREP desde los eventos del DIARIO, con procedencia de cada dato. Cola local offline, exportación e importación de informes, integradas con CAREER y DIARIO sin duplicar vuelos ni recompensas. Implementado y probado virtualmente en QA, sin MSFS real.", "Operational recording and PIREPs from LOGBOOK events, with each data source identified. A local offline queue and report export/import integrate with CAREER and LOGBOOK without duplicating flights or rewards. Implemented and tested virtually in QA, without live MSFS.", "Enregistrement opérationnel et PIREP à partir des événements du JOURNAL, avec provenance des données. File locale hors ligne et export/import des rapports intégrés à CAREER et au JOURNAL sans dupliquer vols ni récompenses. Implémenté et testé virtuellement en QA, sans MSFS réel."),
    limitation: copy("Ningún PIREP se envía fuera del equipo: el transporte actual es offline y nunca simula una sincronización exitosa. La integridad de archivos no es un sistema antifraude. Pendiente de validación con MSFS real; no disponible comercialmente.", "No PIREP leaves the computer: the current transport is offline and never simulates a successful sync. File integrity is not an anti-fraud system. Live MSFS validation pending; not commercially available.", "Aucun PIREP ne quitte l’ordinateur : le transport actuel est hors ligne et ne simule jamais une synchronisation réussie. L’intégrité des fichiers n’est pas un système antifraude. Validation avec MSFS réel à effectuer ; non disponible commercialement."),
  },
] as const;

// An online platform is separate from the implemented local career and the planned local licence.
export const futureOnlinePlatform = {
  id: "career-online", status: "future", liveValidation: "not_applicable", evidence: null,
  name: "VECTOR CAREER ONLINE",
  summary: copy("Plataforma online y aerolíneas multiusuario: desarrollo futuro, todavía no implementado.", "Online platform and multi-user airlines: future development, not implemented yet.", "Plateforme en ligne et compagnies multiutilisateurs : développement futur, pas encore implémenté."),
  detail: copy("CAREER LOCAL y ACARS LOCAL no ofrecen cuentas online, sincronización con servidor ni aerolíneas multiusuario. Esa futura plataforma todavía no está desarrollada.", "CAREER LOCAL and ACARS LOCAL do not provide online accounts, server synchronization or multi-user airlines. That future platform has not been developed yet.", "CAREER LOCAL et ACARS LOCAL ne proposent ni comptes en ligne, ni synchronisation serveur, ni compagnies multiutilisateurs. Cette future plateforme n’est pas encore développée."),
  limitation: copy("Sin fecha ni precio definitivo. Su modelo comercial no está definido; no se promete su inclusión en la licencia local.", "No definitive date or price. Its commercial model is undefined; inclusion in the local licence is not promised.", "Sans date ni tarif définitifs. Son modèle commercial reste à définir ; son inclusion dans la licence locale n’est pas promise."),
} as const;
