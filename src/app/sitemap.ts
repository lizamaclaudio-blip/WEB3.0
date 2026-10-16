import type { MetadataRoute } from "next";
import { languages, localeHref } from "@/components/web4/locale";
import { publicMarketingRoutes } from '@/components/web4/public-routes';
import { getPublicProposalIds } from '@/lib/web51/public-ideas';
import { publicSiteEnabled } from '@/lib/web51/site-policy';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!publicSiteEnabled()) return [];
  const base = "https://www.patagoniaw.com";
  const paths=[...publicMarketingRoutes,...(await getPublicProposalIds()).map(id=>'/comunidad/'+id)];
  return paths.flatMap(path => languages.map(language => ({
    url: `${base}${localeHref(language, path)}`,
    alternates: { languages: Object.fromEntries(languages.map(item => [item, `${base}${localeHref(item, path)}`])) },
  })));
}
