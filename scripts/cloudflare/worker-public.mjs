import publicAssets from '../../.open-next/public-assets.mjs';
import buildProfile,{publicOrigin as buildOrigin} from '../../.open-next/build-profile.mjs';
const temporary='patagonia-wings-web54-public.lizamaclaudio.workers.dev';
const legacyPages=new Set(['/login','/register','/dashboard','/dispatch','/academy','/routes','/fleet','/flights','/acars','/downloads','/profile','/settings','/mi-perfil','/mis-datos','/economy']);
let initialized=false;
function reply(request,body,status=200,type='application/json; charset=utf-8',privateResponse=true){
 const host=new URL(request.url).hostname;
 return new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':privateResponse?'no-store':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Strict-Transport-Security':'max-age=31536000',...(![temporary,'www.patagoniaw.com'].includes(host)||privateResponse?{'X-Robots-Tag':'noindex, nofollow'}:{})}});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),host=url.hostname;
  if(buildProfile!=='informational'||env.VECTOR_SITE_MODE!=='public'||env.VECTOR_DEPLOYMENT_STAGE!=='production')return reply(request,'{"ok":false,"code":"PROFILE_MISMATCH"}',503);
  const official=buildOrigin==='https://www.patagoniaw.com'&&env.VECTOR_PUBLIC_ORIGIN===buildOrigin;
  if(![temporary,...(official?['www.patagoniaw.com','patagoniaw.com']:[])].includes(host))return reply(request,'{"ok":false}',421);
  if((official&&(host==='patagoniaw.com'||(host===temporary&&env.VECTOR_CANONICAL_REDIRECT_ENABLED==='true')))||url.protocol!=='https:'){
   if(official)url.hostname='www.patagoniaw.com';
   url.protocol='https:';
   return new Response(null,{status:308,headers:{Location:url.href,'Cache-Control':'no-store'}});
  }
  if(!initialized){for(const [key,value]of Object.entries(env))if(typeof value==='string')process.env[key]=value;initialized=true;}
  if(url.pathname.startsWith('/_vector-public/'))return reply(request,'Not found',404,'text/plain');
  if(request.method==='GET'&&url.pathname==='/api/vector/community/session')return reply(request,JSON.stringify({ok:true,authenticated:false,admin:false,configured:false}));
  const apiKeys=new Set(['GET /api/vector/availability','GET /api/vector/community/roadmap','GET /api/vector/community/proposals']);
  const apiKey=request.method+' '+url.pathname;
  if(apiKeys.has(apiKey)){
   try{
    const {publicHandlers}=await import('../../.open-next/vector-public-api.mjs');
    const result=await publicHandlers[apiKey](request);
    const response=reply(request,result.body,result.status,result.headers.get('content-type')||'application/json');
    return response;
   }catch{return reply(request,'{"ok":false,"code":"SERVICE_UNAVAILABLE"}',503);}
  }
  if(url.pathname.startsWith('/api/'))return reply(request,'{"ok":false,"code":"FEATURE_PAUSED"}',403);
  if(/^(?:\/(?:en|fr))?\/comunidad\/(?:cuenta|admin|qa)$/.test(url.pathname)){
   const prefix=url.pathname.startsWith('/en/')?'/en':url.pathname.startsWith('/fr/')?'/fr':'';
   return new Response(null,{status:303,headers:{Location:prefix+'/comunidad','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }
  if(legacyPages.has(url.pathname)||/^\/(?:dispatch|training|downloads)\//.test(url.pathname))return reply(request,'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Aerolínea en pausa · Patagonia Wings</title><body style="background:#071824;color:#e7f4ff;font:18px system-ui;padding:8vw;max-width:800px"><h1>La aerolínea virtual está en pausa.</h1><p>Conservamos sus datos y el despliegue anterior. Patagonia Wings presenta ahora COPILOTO VECTOR.</p><p><a style="color:#29e5cf" href="/">Conocer COPILOTO VECTOR</a></p><p>Virtual airline access is paused. Existing data is retained.</p><p>Les accès à la compagnie virtuelle sont en pause. Les données sont conservées.</p></body></html>',200,'text/html; charset=utf-8');
  let target=publicAssets[url.pathname];
  let type=request.headers.get('rsc')==='1'?'text/x-component; charset=utf-8':'text/html; charset=utf-8';
  if(target)target+=request.headers.get('rsc')==='1'?'.rsc':'.html';
  if(['/robots.txt','/sitemap.xml'].includes(url.pathname)){target='/_vector-public'+url.pathname;type=url.pathname==='/robots.txt'?'text/plain; charset=utf-8':'application/xml; charset=utf-8';}
  if(target&&['GET','HEAD'].includes(request.method)){
   const result=await env.ASSETS.fetch(new Request(new URL(target,url.origin),{method:request.method}));
   if(result.status===200){const response=reply(request,result.body,200,type,false);response.headers.set('X-Vector-Delivery','informational-assets');response.headers.set('Vary','RSC, Next-Router-State-Tree, Next-Router-Prefetch');return response;}
  }
  if(['GET','HEAD'].includes(request.method)&&/^\/(?:_next\/static|vector)\//.test(url.pathname)){
   const asset=await env.ASSETS.fetch(request);
   // Conditional requests and ranges are valid asset responses. Turning a 304
   // into a branded 404 breaks cached images/styles after a browser reload.
   if([200,206,304,416].includes(asset.status)){const headers=new Headers(asset.headers);headers.set('X-Content-Type-Options','nosniff');headers.delete('set-cookie');return new Response(asset.body,{status:asset.status,headers});}
  }
  return reply(request,'<!doctype html><html lang="es"><meta charset="utf-8"><title>404 · COPILOTO VECTOR</title><body style="background:#071824;color:#e7f4ff;font:20px system-ui;padding:10vw"><h1>404</h1><p>Página no encontrada · Page not found · Page introuvable</p><a style="color:#29e5cf" href="/">COPILOTO VECTOR</a></body></html>',404,'text/html; charset=utf-8');
 }
};
