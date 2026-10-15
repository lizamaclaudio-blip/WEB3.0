import type { Language } from "./locale";

// Commercial intent only. No price, release date or purchasable offer is published.
export const completeEdition = {
  name: "COPILOTO VECTOR COMPLETE",
  status: "planned",
  licenceCount: 1,
  checkoutEnabled: false,
  price: null,
  areas: [
    { id: "local", name: "Vector", status: "development" },
    { id: "academy", name: "Academy", status: "planned" },
    { id: "performance", name: "Performance", status: "planned" },
  ],
} as const;

type EditionCopy = {
  label: string; title: string; introduction: string; scopeTitle: string;
  localTitle: string; localDescription: string; development: string;
  planned: string; academyDescription: string; performanceDescription: string;
  priceLabel: string; pricePending: string; pricingNote: string;
  waitlist: string; waitlistNote: string; statusLink: string;
};

export const completeEditionCopy: Record<Language, EditionCopy> = {
  es: {
    label: "EL FUTURO DE VECTOR",
    title: "Una licencia. Toda tu operación.",
    introduction: "COMPLETE reunirá los módulos locales, Academy y Performance en una sola licencia. Las áreas futuras se incorporarán cuando estén implementadas y validadas.",
    scopeTitle: "Alcance previsto de COMPLETE",
    localTitle: "Tu operación en Windows",
    localDescription: "Seis módulos locales para preparar, acompañar y revisar el vuelo. La aplicación sigue en beta; cada función conserva su estado de validación.",
    development: "Beta en desarrollo",
    planned: "Planificado · Aún no disponible",
    academyDescription: "Área de aprendizaje prevista dentro de COMPLETE. Contenido y funciones todavía por implementar.",
    performanceDescription: "Área de performance prevista dentro de COMPLETE. Funciones todavía por implementar y validar por aeronave.",
    priceLabel: "PRECIO Y LANZAMIENTO",
    pricePending: "Por anunciar",
    pricingNote: "La modalidad y las condiciones de licencia se publicarán antes del lanzamiento. Sin ventas, reservas ni pagos activos.",
    waitlist: "Unirme a la lista de espera",
    waitlistNote: "Registra tu interés sin comprar ni reservar una licencia. Recibir novedades por correo requiere tu consentimiento opcional independiente.",
    statusLink: "Revisar estado de funciones",
  },
  en: {
    label: "THE FUTURE OF VECTOR",
    title: "One licence. Your whole operation.",
    introduction: "COMPLETE will bring the local modules, Academy and Performance together under one licence. Future areas will be included once implemented and validated.",
    scopeTitle: "Planned COMPLETE scope",
    localTitle: "Your operation on Windows",
    localDescription: "Six local modules to prepare, accompany and review your flight. The application remains in beta; each feature retains its validation status.",
    development: "Beta in development",
    planned: "Planned · Not yet available",
    academyDescription: "A learning area planned for COMPLETE. Content and features still need to be implemented.",
    performanceDescription: "A performance area planned for COMPLETE. Features still need implementation and aircraft-specific validation.",
    priceLabel: "PRICING & RELEASE",
    pricePending: "To be announced",
    pricingNote: "The licence model and terms will be published before launch. No sales, reservations or payments are active.",
    waitlist: "Join the waiting list",
    waitlistNote: "Register your interest without buying or reserving a licence. Email news requires your separate optional consent.",
    statusLink: "Review feature status",
  },
  fr: {
    label: "L’AVENIR DE VECTOR",
    title: "Une licence. Toutes vos opérations.",
    introduction: "COMPLETE réunira les modules locaux, Academy et Performance sous une seule licence. Les futurs espaces seront inclus une fois implémentés et validés.",
    scopeTitle: "Périmètre prévu de COMPLETE",
    localTitle: "Vos opérations sur Windows",
    localDescription: "Six modules locaux pour préparer, accompagner et analyser votre vol. L’application reste en bêta ; chaque fonction conserve son état de validation.",
    development: "Bêta en développement",
    planned: "Prévu · Pas encore disponible",
    academyDescription: "Un espace d’apprentissage prévu dans COMPLETE. Le contenu et les fonctions restent à implémenter.",
    performanceDescription: "Un espace de performances prévu dans COMPLETE. Les fonctions restent à implémenter et à valider par aéronef.",
    priceLabel: "TARIF ET LANCEMENT",
    pricePending: "À annoncer",
    pricingNote: "La formule et les conditions de licence seront publiées avant le lancement. Aucune vente, réservation ni aucun paiement ne sont actifs.",
    waitlist: "Rejoindre la liste d’attente",
    waitlistNote: "Signalez votre intérêt sans achat ni réservation de licence. Les actualités par e-mail nécessitent votre consentement facultatif distinct.",
    statusLink: "Consulter l’état des fonctions",
  },
};
