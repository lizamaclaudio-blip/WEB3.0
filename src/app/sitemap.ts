import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  const base = "https://www.patagoniaw.com";
  return ["", "/copiloto-vector", "/versiones", "/soporte", "/privacidad", "/condiciones"].flatMap(path => [
    { url: `${base}${path || "/"}`, alternates: { languages: { es: `${base}${path || "/"}`, en: `${base}/en${path}` } } },
    { url: `${base}/en${path}`, alternates: { languages: { es: `${base}${path || "/"}`, en: `${base}/en${path}` } } },
  ]);
}
