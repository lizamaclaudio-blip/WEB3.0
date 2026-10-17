import {mkdir,cp,copyFile,writeFile} from 'node:fs/promises';

// Export only the public allowlist. No private HTML, RSC, API results or
// environment files may enter the asset-first directory.
export async function exportStaticSite(root,paths,origin) {
  const target=new URL('.open-next/public-site/',root);
  await mkdir(target,{recursive:true});
  for(const folder of ['vector','_next/static'])await cp(new URL('.open-next/assets/'+folder,root),new URL(folder,target),{recursive:true});
  for(const route of paths){
    const name=route==='/'?'index':route.slice(1);
    const destination=new URL(name+'.html',target);
    await mkdir(new URL('./',destination),{recursive:true});
    await copyFile(new URL('.next/server/app/'+name+'.html',root),destination);
  }
  for(const name of ['robots.txt','sitemap.xml'])await copyFile(new URL('.next/server/app/'+name+'.body',root),new URL(name,target));
  await writeFile(new URL('404.html',target),'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex"><title>404 · COPILOTO VECTOR</title><body style="background:#071824;color:#e7f4ff;font:20px system-ui;padding:10vw"><h1>404</h1><p>Página no encontrada · Page not found · Page introuvable</p><a style="color:#29e5cf" href="/">COPILOTO VECTOR</a></body></html>');
  const headers='/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Strict-Transport-Security: max-age=31536000\n  Cache-Control: public, max-age=0, must-revalidate\n  X-Vector-Delivery: static-assets-first\n/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable\n/404.html\n  X-Robots-Tag: noindex, nofollow\n';
  await writeFile(new URL('_headers',target),headers+'https://patagonia-wings-web54-public.lizamaclaudio.workers.dev/*\n  X-Robots-Tag: noindex, nofollow\nhttps://patagoniaw.com/*\n  X-Robots-Tag: noindex, follow\n');
  // Workers _redirects accepts relative sources only. Host canonicalization
  // remains in the Worker; do not install a global redirect loop here.
  await writeFile(new URL('_redirects',target),'');
}
