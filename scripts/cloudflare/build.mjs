import{spawn}from'node:child_process';
import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const cli=fileURLToPath(new URL('../cli/index.js',import.meta.resolve('@opennextjs/cloudflare')));
const args=process.platform==='win32'?['--import',new URL('./windows-junctions.mjs',import.meta.url).href]:[];
args.push(cli,'build',...process.argv.slice(2));
const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,VECTOR_HOSTING_PLATFORM:'cloudflare',VECTOR_DEPLOYMENT_STAGE:'preview',VECTOR_SITE_MODE:'preview',VECTOR_FORMS_ENABLED:'false',VECTOR_MAIL_ENABLED:'false'}});
child.on('error',()=>{console.error('CLOUDFLARE_BUILD_UNAVAILABLE');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
