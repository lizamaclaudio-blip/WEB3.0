export type Language = "es" | "en";
export const localeHref = (language: Language, route = "") => `${language === "en" ? "/en" : ""}${route || "/"}`.replace(/\/$/, "") || "/";
