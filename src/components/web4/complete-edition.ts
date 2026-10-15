import type { Language } from "./locale";

// Commercial intent only. QA implementation does not enable a purchasable offer.
export const completeEdition = {
  name: "COPILOTO VECTOR COMPLETE",
  status: "planned",
  licenceCount: 1,
  checkoutEnabled: false,
  price: null,
  areas: [
    { id: "local", name: "Vector", status: "development" },
    { id: "academy", name: "VECTOR ACADEMY", status: "implemented_qa" },
    { id: "performance", name: "VECTOR PERFORMANCE", status: "implemented_qa" },
    { id: "aircraft-studio", name: "VECTOR AIRCRAFT STUDIO", status: "implemented_qa" },
    { id: "career", name: "VECTOR CAREER", status: "future" },
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
    title: "Una licencia. Toda tu operación.",
    introduction: "La licencia única prevista de COMPLETE abarca los módulos locales, Academy, Performance y Aircraft Studio. Estas tres áreas ya están implementadas en QA; su validación real sigue pendiente. Career queda para una etapa futura.",
    scopeTitle: "Alcance previsto de COMPLETE",
    localTitle: "Tu operación en Windows",
    localDescription: "Seis módulos locales para preparar, acompañar y revisar el vuelo. La aplicación sigue en beta; cada función conserva su estado de validación.",
    development: "Beta en desarrollo",
    validationNote: "Las pruebas virtuales no equivalen a validación con MSFS real ni a disponibilidad comercial.",
    licenceSummary: "Una licencia prevista para los módulos locales, Academy, Performance y Aircraft Studio. Implementación, validación real y lanzamiento comercial son etapas distintas.",
    priceLabel: "PRECIO Y LANZAMIENTO",
    pricePending: "Por anunciar",
    pricingNote: "La modalidad y las condiciones de licencia se publicarán antes del lanzamiento. Sin ventas, reservas ni pagos activos.",
    waitlist: "Unirme a la lista de espera",
    waitlistNote: "Registra tu interés sin comprar ni reservar una licencia. Recibir novedades por correo requiere tu consentimiento opcional independiente.",
    statusLink: "Revisar hitos y validación",
  },
  en: {
    label: "AN EVOLVING SUITE",
    title: "One licence. Your whole operation.",
    introduction: "The planned single COMPLETE licence covers the local modules, Academy, Performance and Aircraft Studio. These three areas are already implemented in QA; live validation is pending. Career is a future stage.",
    scopeTitle: "Planned COMPLETE scope",
    localTitle: "Your operation on Windows",
    localDescription: "Six local modules to prepare, accompany and review your flight. The application remains in beta; each feature retains its validation status.",
    development: "Beta in development",
    validationNote: "Virtual testing does not establish live MSFS validation or commercial availability.",
    licenceSummary: "One planned licence for local modules, Academy, Performance and Aircraft Studio. Implementation, live validation and commercial release are separate stages.",
    priceLabel: "PRICING & RELEASE",
    pricePending: "To be announced",
    pricingNote: "The licence model and terms will be published before launch. No sales, reservations or payments are active.",
    waitlist: "Join the waiting list",
    waitlistNote: "Register your interest without buying or reserving a licence. Email news requires your separate optional consent.",
    statusLink: "Review milestones and validation",
  },
  fr: {
    label: "UNE SUITE EN ÉVOLUTION",
    title: "Une licence. Toutes vos opérations.",
    introduction: "La licence unique prévue de COMPLETE couvre les modules locaux, Academy, Performance et Aircraft Studio. Ces trois espaces sont déjà implémentés en QA ; leur validation réelle reste à effectuer. Career relève d’une étape future.",
    scopeTitle: "Périmètre prévu de COMPLETE",
    localTitle: "Vos opérations sur Windows",
    localDescription: "Six modules locaux pour préparer, accompagner et analyser votre vol. L’application reste en bêta ; chaque fonction conserve son état de validation.",
    development: "Bêta en développement",
    validationNote: "Les tests virtuels ne constituent ni une validation avec MSFS réel ni une disponibilité commerciale.",
    licenceSummary: "Une licence prévue pour les modules locaux, Academy, Performance et Aircraft Studio. Implémentation, validation réelle et lancement commercial sont des étapes distinctes.",
    priceLabel: "TARIF ET LANCEMENT",
    pricePending: "À annoncer",
    pricingNote: "La formule et les conditions de licence seront publiées avant le lancement. Aucune vente, réservation ni aucun paiement ne sont actifs.",
    waitlist: "Rejoindre la liste d’attente",
    waitlistNote: "Signalez votre intérêt sans achat ni réservation de licence. Les actualités par e-mail nécessitent votre consentement facultatif distinct.",
    statusLink: "Consulter les jalons et validations",
  },
};
