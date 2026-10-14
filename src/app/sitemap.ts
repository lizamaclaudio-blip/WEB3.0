import type { MetadataRoute } from "next";
import { languages, localeHref } from "@/components/web4/locale";
export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  const base = "https://www.patagoniaw.com";
  return ["", "/copiloto-vector", "/versiones", "/soporte", "/privacidad", "/condiciones"].flatMap(path => languages.map(language => ({
    url: `${base}${localeHref(language, path)}`,
    alternates: { languages: Object.fromEntries(languages.map(item => [item, `${base}${localeHref(item, path)}`])) },
  })));
}
