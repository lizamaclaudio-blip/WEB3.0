// Indexing requires an explicit production release decision. Missing platform
// variables must never make a Preview or a local build publicly indexable.
export function publicSiteEnabled(env:Record<string,string|undefined>=process.env){
 return env.VECTOR_SITE_MODE==='public' && env.VERCEL_ENV==='production';
}
