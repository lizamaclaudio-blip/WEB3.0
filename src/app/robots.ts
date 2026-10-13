import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: ["/$", "/en$", "/copiloto-vector", "/en/copiloto-vector", "/versiones", "/en/versiones", "/soporte", "/en/soporte", "/privacidad", "/en/privacidad", "/condiciones", "/en/condiciones", "/_next/", "/vector/"], disallow: "/" }, sitemap: "https://www.patagoniaw.com/sitemap.xml" };
}
