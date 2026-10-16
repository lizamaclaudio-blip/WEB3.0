import type { MetadataRoute } from "next";
import { languages, localeHref } from "@/components/web4/locale";
import { publicMarketingRoutes } from '@/components/web4/public-routes';
import { publicSiteEnabled } from '@/lib/web51/site-policy';
export default function robots(): MetadataRoute.Robots {
  if (!publicSiteEnabled()) return { rules: { userAgent: "*", disallow: "/" } };
  const publicPages = publicMarketingRoutes.flatMap(path => languages.map(language => `${localeHref(language, path)}$`));
  const excluded=['/api/','/dashboard','/login','/register',...['','/en','/fr'].flatMap(prefix=>['/comunidad/admin','/comunidad/cuenta','/confirmar-novedades','/cancelar-novedades'].map(path=>prefix+path))];
  return { rules: { userAgent: "*", allow: [...publicPages,...['','/en','/fr'].map(prefix=>prefix+'/comunidad/'), "/_next/", "/vector/"], disallow: ['/',...excluded] }, sitemap: "https://www.patagoniaw.com/sitemap.xml" };
}
