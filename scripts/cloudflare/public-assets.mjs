import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
// Explicit allowlist: never export authenticated pages, private APIs or proposal
// details from .next. No crawl of arbitrary server output is permitted.
export const publicPages = ['', '/copiloto-vector', '/ediciones', '/versiones', '/soporte', '/privacidad', '/condiciones', '/founders-10', '/novedades', '/descubre', '/roadmap', '/comunidad'];
export const publicPaths = ['', '/en', '/fr'].flatMap(prefix => publicPages.map(page => prefix + page || '/'));
export async function exportPublicAssets(root) {
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
      if (extension === 'html' && !(await readFile(source, 'utf8')).includes('noindex')) throw Error('QA_HTML_REQUIRES_NOINDEX');
      await copyFile(source, new URL(base.href + '.' + extension));
    }
    exported[route] = '/_vector-public/' + name;
  }
  await writeFile(new URL('.open-next/public-assets.mjs', root), 'export default ' + JSON.stringify(exported) + ';\n');
  await writeFile(new URL('.open-next/server-only-empty.mjs', root), 'export {};\n');
  await build({ entryPoints: [fileURLToPath(new URL('scripts/cloudflare/api-entry.ts', root))], outfile: fileURLToPath(new URL('.open-next/vector-api.mjs', root)), bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', packages: 'external', alias: { 'server-only': fileURLToPath(new URL('.open-next/server-only-empty.mjs', root)) }, tsconfig: fileURLToPath(new URL('tsconfig.json', root)) });
  console.log(JSON.stringify({ publicAssetsExported: Object.keys(exported).length, privatePagesExported: 0 }));
}
