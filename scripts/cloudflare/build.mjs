import{spawn}from'node:child_process';
import{fileURLToPath}from'node:url';
import{sanitizeCloudflareBuildEnvironment}from'./sanitize-env.mjs';
import{exportPublicAssets}from'./public-assets.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const informational=process.argv.includes('--informational');
const official=process.argv.includes('--official');
if(official&&!informational)throw Error('OFFICIAL_REQUIRES_INFORMATIONAL_BUILD');
const cli=fileURLToPath(new URL('../cli/index.js',import.meta.resolve('@opennextjs/cloudflare')));
const args=process.platform==='win32'?['--import',new URL('./windows-junctions.mjs',import.meta.url).href]:[];
args.push(cli,'build',...process.argv.slice(2).filter(value=>!['--informational','--official'].includes(value)));
const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,VECTOR_HOSTING_PLATFORM:'cloudflare',VECTOR_DEPLOYMENT_STAGE:informational?'production':'preview',VECTOR_SITE_MODE:informational?'public':'preview',VECTOR_PUBLIC_READ_ONLY:informational?'true':'false',NEXT_PUBLIC_VECTOR_STATIC_NAVIGATION:informational?'true':'false',VECTOR_PUBLIC_ORIGIN:informational&&!official?'https://patagonia-wings-web54-public.lizamaclaudio.workers.dev':'https://www.patagoniaw.com',VECTOR_FORMS_ENABLED:'false',VECTOR_MAIL_ENABLED:'false'}});
child.on('error',()=>{console.error('CLOUDFLARE_BUILD_UNAVAILABLE');process.exitCode=1;});
child.on('exit',async code=>{
 process.exitCode=code??1;
 if(code===0)try{await sanitizeCloudflareBuildEnvironment(new URL('../../',import.meta.url));await exportPublicAssets(new URL('../../',import.meta.url),informational?'informational':'preview');}catch(error){console.error('CLOUDFLARE_BUILD_UNSAFE',error.message);process.exitCode=1;}
});
