import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,readFile,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sanitizeCloudflareBuildEnvironment} from '../../scripts/cloudflare/sanitize-env.mjs';

async function fixture(t,source){
 const parent=await realpath(tmpdir()),root=await mkdtemp(join(parent,'pv-web52-env-'));
 assert.equal(dirname(root),parent);
 t.after(async()=>{assert.equal(dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});});
 const file=join(root,'.open-next/cloudflare/next-env.mjs');await mkdir(dirname(file),{recursive:true});await writeFile(file,source);
 return {root:new URL('./',pathToFileURL(root+'/')),file};
}
test('Workers build strips private local defaults and retains only public environment keys',async t=>{
 const{root,file}=await fixture(t,'export const production = {"SUPABASE_SECRET_KEY":"synthetic-private","NEXT_PUBLIC_LABEL":"Vector"};\nexport const development = {"VERCEL_OIDC_TOKEN":"synthetic-token"};\nexport const test = {};\n');
 await sanitizeCloudflareBuildEnvironment(root);const value=await readFile(file,'utf8');
 assert.ok(value.includes('NEXT_PUBLIC_LABEL'));assert.ok(value.includes('Vector'));assert.ok(!value.includes('synthetic-'));assert.ok(!value.includes('SUPABASE_SECRET_KEY'));assert.ok(!value.includes('VERCEL_OIDC_TOKEN'));
});
test('unexpected adapter environment format fails without overwriting its input',async t=>{
 const source='export const production = {};\n';const{root,file}=await fixture(t,source);
 await assert.rejects(sanitizeCloudflareBuildEnvironment(root),/FORMAT_UNEXPECTED/);assert.equal(await readFile(file,'utf8'),source);
});
