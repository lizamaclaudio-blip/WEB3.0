import type { MetadataRoute } from "next";
import { languages, localeHref } from "@/components/web4/locale";
import { publicMarketingRoutes } from '@/components/web4/public-routes';
import { publicSiteEnabled,publicSiteOrigin } from '@/lib/web51/site-policy';
export default function robots(): MetadataRoute.Robots {
  if (!publicSiteEnabled()) return { rules: { userAgent: "*", disallow: "/" } };
  const publicPages = publicMarketingRoutes.flatMap(path => languages.map(language => `${localeHref(language, path)}$`));
  const excluded=['/api/','/dashboard','/login','/register',...['','/en','/fr'].flatMap(prefix=>['/comunidad/admin','/comunidad/cuenta','/confirmar-novedades','/cancelar-novedades'].map(path=>prefix+path))];
  return { rules: { userAgent: "*", allow: [...publicPages, "/_next/", "/vector/"], disallow: ['/',...excluded] }, sitemap: publicSiteOrigin()+"/sitemap.xml" };
}
