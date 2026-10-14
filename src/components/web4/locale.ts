export const languages = ["es", "en", "fr"] as const;
export type Language = (typeof languages)[number];
export const languageNames: Record<Language, string> = { es: "Español", en: "English", fr: "Français" };
export const localized = <T,>(language: Language, es: T, en: T, fr: T): T => ({ es, en, fr })[language];
export const localeHref = (language: Language, route = "") => `${language === "es" ? "" : `/${language}`}${route || "/"}`.replace(/\/$/, "") || "/";
export const unlocalizedPath = (pathname: string) => pathname.replace(/^\/(?:en|fr)(?=\/|$)/, "") || "/";
