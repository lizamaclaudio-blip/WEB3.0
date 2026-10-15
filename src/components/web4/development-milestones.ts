import type { Language } from "./locale";

type Copy = Record<Language, string>;
const copy = (es: string, en: string, fr: string): Copy => ({ es, en, fr });

// Implementation evidence is independent of commercial release and live validation.
// Reviewed against docs/M31-academy-performance.md and docs/M32-aircraft-studio.md.
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
    id: "career", milestone: "M33", status: "future", liveValidation: "not_applicable",
    name: "VECTOR CAREER", evidence: null,
    summary: copy("Desarrollo posterior. Funciones y alcance por definir.", "Later development. Features and scope remain to be defined.", "Développement ultérieur. Fonctions et périmètre à définir."),
    detail: copy("Área prevista para una etapa posterior. No se anuncia como implementada, probada ni disponible.", "An area planned for a later stage. It is not announced as implemented, tested or available.", "Un espace prévu pour une étape ultérieure. Il n’est annoncé ni comme implémenté, ni comme testé, ni comme disponible."),
    limitation: copy("Sin fecha de lanzamiento ni oferta comercial.", "No release date or commercial offer.", "Sans date de lancement ni offre commerciale."),
  },
] as const;
