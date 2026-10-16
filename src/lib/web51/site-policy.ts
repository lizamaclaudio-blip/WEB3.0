// Indexing requires an explicit production release decision. Missing platform
// variables must never make a Preview or a local build publicly indexable.
export function publicSiteEnabled(env:Record<string,string|undefined>=process.env){
 if(env.VECTOR_SITE_MODE!=='public')return false;
 return env.VECTOR_HOSTING_PLATFORM==='cloudflare'
  ? env.VECTOR_DEPLOYMENT_STAGE==='production'
  : env.VERCEL_ENV==='production';
}
