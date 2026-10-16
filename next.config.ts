import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const excluded=['/api/:path*',...['','/en','/fr'].flatMap(prefix=>['/comunidad/admin','/comunidad/cuenta','/confirmar-novedades','/cancelar-novedades'].map(path=>prefix+path))];
    const rules=excluded.map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Referrer-Policy',value:'no-referrer'}]}));
    if(process.env.VERCEL_ENV==='preview')rules.push({source:'/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Referrer-Policy',value:'no-referrer'}]});
    return rules;
  },
  async redirects() {
    const pausedDownloads=[{source:'/downloads',destination:'/versiones',permanent:false},{source:'/downloads/acars/:path*',destination:'/api/vector/downloads-unavailable',permanent:false}];
    return process.env.VERCEL_ENV==='production'?[{source:'/:path*',has:[{type:'host' as const,value:'patagoniaw.com'}],destination:'https://www.patagoniaw.com/:path*',permanent:true},...pausedDownloads]:pausedDownloads;
  },
};

export default nextConfig;
