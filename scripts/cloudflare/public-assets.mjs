import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { exportStaticSite } from './static-site.mjs';
// Explicit allowlist: never export authenticated pages, private APIs or proposal
// details from .next. No crawl of arbitrary server output is permitted.
export const publicPages = ['', '/copiloto-vector', '/ediciones','/integraciones', '/versiones', '/soporte', '/privacidad', '/condiciones', '/founders-10', '/novedades', '/descubre', '/roadmap', '/comunidad'];
export const publicPaths = ['', '/en', '/fr'].flatMap(prefix => publicPages.map(page => prefix + page || '/'));
export async function exportPublicAssets(root,profile='preview') {
  if(!['preview','informational'].includes(profile))throw Error('INVALID_BUILD_PROFILE');
  const manifest = JSON.parse(await readFile(new URL('.next/prerender-manifest.json', root), 'utf8'));
  const exported = {};
  for (const route of publicPaths) {
    const entry = manifest.routes[route];
    if (!entry || entry.initialRevalidateSeconds !== false || entry.srcRoute?.includes('[')) throw Error('PUBLIC_PAGE_NOT_STATIC:' + route);
    const name = route === '/' ? 'index' : route.slice(1);
    const base = new URL('.open-next/assets/_vector-public/' + name, root);
    await mkdir(new URL('./', base), { recursive: true });
    for (const extension of ['html', 'rsc']) {
      const source = new URL('.next/server/app/' + name + '.' + extension, root);
      if (extension === 'html') {
        const noindex=(await readFile(source,'utf8')).includes('noindex');
        if(profile==='preview'&&!noindex)throw Error('QA_HTML_REQUIRES_NOINDEX');
        if(profile==='informational'&&noindex)throw Error('PUBLIC_HTML_MUST_BE_INDEXABLE:'+route);
      }
      await copyFile(source, new URL(base.href + '.' + extension));
    }
    exported[route] = '/_vector-public/' + name;
  }
  await writeFile(new URL('.open-next/public-assets.mjs', root), 'export default ' + JSON.stringify(exported) + ';\n');
  const home=await readFile(new URL('.next/server/app/index.html',root),'utf8');
  const origin=new URL(home.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'https://www.patagoniaw.com').origin;
  await writeFile(new URL('.open-next/build-profile.mjs',root),'export default '+JSON.stringify(profile)+';\nexport const publicOrigin='+JSON.stringify(origin)+';\n');
  await writeFile(new URL('.open-next/server-only-empty.mjs', root), 'export {};\n');
  await build({ entryPoints: [fileURLToPath(new URL('scripts/cloudflare/api-entry.ts', root))], outfile: fileURLToPath(new URL('.open-next/vector-api.mjs', root)), bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', packages: 'external', alias: { 'server-only': fileURLToPath(new URL('.open-next/server-only-empty.mjs', root)) }, tsconfig: fileURLToPath(new URL('tsconfig.json', root)) });
  if(profile==='informational') {
    await exportStaticSite(root,publicPaths,origin);
    for(const name of ['robots.txt','sitemap.xml'])await copyFile(new URL('.next/server/app/'+name+'.body',root),new URL('.open-next/assets/_vector-public/'+name,root));
    await build({entryPoints:[fileURLToPath(new URL('scripts/cloudflare/api-public.ts',root))],outfile:fileURLToPath(new URL('.open-next/vector-public-api.mjs',root)),bundle:true,format:'esm',platform:'neutral',target:'es2022',packages:'external',tsconfig:fileURLToPath(new URL('tsconfig.json',root)),alias:{'server-only':fileURLToPath(new URL('.open-next/server-only-empty.mjs',root))}});
  }
  console.log(JSON.stringify({ publicAssetsExported: Object.keys(exported).length, privatePagesExported: 0 }));
}
