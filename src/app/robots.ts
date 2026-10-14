import type { MetadataRoute } from "next";
import { languages, localeHref } from "@/components/web4/locale";
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  const publicPages = ["", "/copiloto-vector", "/versiones", "/soporte", "/privacidad", "/condiciones"].flatMap(path => languages.map(language => `${localeHref(language, path)}$`));
  return { rules: { userAgent: "*", allow: [...publicPages, "/_next/", "/vector/"], disallow: "/" }, sitemap: "https://www.patagoniaw.com/sitemap.xml" };
}
