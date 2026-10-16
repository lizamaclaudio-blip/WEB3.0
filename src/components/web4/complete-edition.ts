import type { Language } from "./locale";

// Commercial intent only. QA implementation does not enable a purchasable offer.
export const completeEdition = {
  name: "VECTOR COMMANDER",
  status: "planned",
  licenceCount: 1,
  checkoutEnabled: false,
  price: null,
  areas: [
    { id: "local", name: "Vector", status: "development" },
    { id: "academy", name: "VECTOR ACADEMY", status: "implemented_qa" },
    { id: "performance", name: "VECTOR PERFORMANCE", status: "implemented_qa" },
    { id: "aircraft-studio", name: "VECTOR AIRCRAFT STUDIO", status: "implemented_qa" },
    { id: "career", name: "VECTOR CAREER LOCAL", status: "implemented_qa" },
    { id: "acars", name: "VECTOR ACARS LOCAL", status: "implemented_qa" },
  ],
} as const;

type EditionCopy = {
  label: string; title: string; introduction: string; scopeTitle: string;
  localTitle: string; localDescription: string; development: string;
  validationNote: string; licenceSummary: string;
  priceLabel: string; pricePending: string; pricingNote: string;
  waitlist: string; waitlistNote: string; statusLink: string;
};

export const completeEditionCopy: Record<Language, EditionCopy> = {
  es: {
    label: "UNA SUITE EN EVOLUCIÓN",
    title: "COMMANDER. La experiencia completa.",
    introduction: "COMMANDER, la edición completa de VECTOR, está diseñada para reunir todas las herramientas locales en una licencia: los módulos de vuelo, Academy, Performance, Aircraft Studio, Career Local y ACARS Local. Las áreas M31–M34 están implementadas en QA; su validación real sigue pendiente y no están disponibles comercialmente.",
    scopeTitle: "Alcance previsto de COMMANDER",
    localTitle: "Tu operación en Windows",
    localDescription: "Seis módulos locales para preparar, acompañar y revisar el vuelo. La aplicación sigue en beta; cada función conserva su estado de validación.",
    development: "Beta en desarrollo",
    validationNote: "Las pruebas virtuales no equivalen a validación con MSFS real ni a disponibilidad comercial.",
    licenceSummary: "COMMANDER está prevista para reunir todas las herramientas locales en una licencia: módulos de vuelo, Academy, Performance, Aircraft Studio, Career Local y ACARS Local. Implementación, validación real y lanzamiento comercial son etapas distintas.",
    priceLabel: "PRELANZAMIENTO",
    pricePending: "Por anunciar",
    pricingNote: "TAKEOFF, HORIZON y COMMANDER están en preparación. El alcance contractual se publicará antes del lanzamiento. Sin ventas, reservas ni pagos activos.",
    waitlist: "Unirme a la lista de espera",
    waitlistNote: "Registra tu interés sin comprar ni reservar una licencia. Recibir novedades por correo requiere tu consentimiento opcional independiente.",
    statusLink: "Revisar hitos y validación",
  },
  en: {
    label: "AN EVOLVING SUITE",
    title: "COMMANDER. The complete experience.",
    introduction: "COMMANDER, the complete VECTOR edition, is designed to bring all local tools together in one licence: flight modules, Academy, Performance, Aircraft Studio, Career Local and ACARS Local. The M31–M34 areas are implemented in QA; live validation is pending and they are not commercially available.",
    scopeTitle: "Planned COMMANDER scope",
    localTitle: "Your operation on Windows",
    localDescription: "Six local modules to prepare, accompany and review your flight. The application remains in beta; each feature retains its validation status.",
    development: "Beta in development",
    validationNote: "Virtual testing does not establish live MSFS validation or commercial availability.",
    licenceSummary: "COMMANDER is planned to include all local tools under one licence: flight modules, Academy, Performance, Aircraft Studio, Career Local and ACARS Local. Implementation, live validation and commercial release are separate stages.",
    priceLabel: "PRELAUNCH",
    pricePending: "To be announced",
    pricingNote: "TAKEOFF, HORIZON and COMMANDER are being prepared. Contractual scope will be published before launch. No sales, reservations or payments are active.",
    waitlist: "Join the waiting list",
    waitlistNote: "Register your interest without buying or reserving a licence. Email news requires your separate optional consent.",
    statusLink: "Review milestones and validation",
  },
  fr: {
    label: "UNE SUITE EN ÉVOLUTION",
    title: "COMMANDER. L’expérience complète.",
    introduction: "COMMANDER, l’édition complète de VECTOR, est conçue pour réunir tous les outils locaux dans une licence : modules de vol, Academy, Performance, Aircraft Studio, Career Local et ACARS Local. Les espaces M31–M34 sont implémentés en QA ; leur validation réelle reste à effectuer et ils ne sont pas disponibles commercialement.",
    scopeTitle: "Périmètre prévu de COMMANDER",
    localTitle: "Vos opérations sur Windows",
    localDescription: "Six modules locaux pour préparer, accompagner et analyser votre vol. L’application reste en bêta ; chaque fonction conserve son état de validation.",
    development: "Bêta en développement",
    validationNote: "Les tests virtuels ne constituent ni une validation avec MSFS réel ni une disponibilité commerciale.",
    licenceSummary: "COMMANDER est prévue pour réunir tous les outils locaux sous une seule licence : modules de vol, Academy, Performance, Aircraft Studio, Career Local et ACARS Local. Implémentation, validation réelle et lancement commercial sont des étapes distinctes.",
    priceLabel: "PRÉLANCEMENT",
    pricePending: "À annoncer",
    pricingNote: "La formule et les conditions de licence seront publiées avant le lancement. Aucune vente, réservation ni aucun paiement ne sont actifs.",
    waitlist: "Rejoindre la liste d’attente",
    waitlistNote: "Signalez votre intérêt sans achat ni réservation de licence. Les actualités par e-mail nécessitent votre consentement facultatif distinct.",
    statusLink: "Consulter les jalons et validations",
  },
};
