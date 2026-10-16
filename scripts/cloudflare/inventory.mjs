import{readdir,readFile,mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
const entries=[];
async function walk(directory){for(const item of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory())await walk(file);else if(item.name==='page.tsx'||item.name==='route.ts'){const source=await readFile(file,'utf8');const route='/'+path.relative('src/app',path.dirname(file)).split(path.sep).join('/');entries.push({route,source:file.split(path.sep).join('/'),kind:item.name==='route.ts'?'handler':'page',methods:[...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)].map(m=>m[1]),runtime:source.includes("runtime='nodejs'")||source.includes('runtime = "nodejs"')?'nodejs':'default',dynamic:/force-dynamic/.test(source)});}}}
await walk('src/app');entries.sort((a,b)=>a.route.localeCompare(b.route));
await mkdir('artifacts/web51-cloudflare',{recursive:true});
await writeFile('artifacts/web51-cloudflare/routes.json',JSON.stringify(entries,null,2));
console.log(JSON.stringify({pages:entries.filter(e=>e.kind==='page').length,handlers:entries.filter(e=>e.kind==='handler').length,vectorHandlers:entries.filter(e=>e.kind==='handler'&&e.route.startsWith('/api/vector/')).length,total:entries.length}));
