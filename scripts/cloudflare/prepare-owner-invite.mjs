// QA-only invitation; unrelated to SMTP, subscription hashing or provider keys.
import {randomBytes} from 'node:crypto';
import {readFile,appendFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const file='.dev.vars.web53';
const existing=await readFile(file,'utf8');
if(!/^VECTOR_COMMUNITY_QA_INVITE_SECRET=.+$/m.test(existing)){
 const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','list','--name','patagonia-wings-web51-qa'],{stdio:['ignore','pipe','ignore']});
 let output='';child.stdout.on('data',data=>output+=data);
 if(await new Promise(resolve=>child.on('exit',resolve))!==0)throw Error('INVENTORY_FAILED');
 if(JSON.parse(output).some(item=>item.name==='VECTOR_COMMUNITY_QA_INVITE_SECRET'))throw Error('EXISTING_INVITATION_REQUIRES_LOCAL_FILE');
 const secret=randomBytes(48).toString('base64url');
 const install=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk','--name','patagonia-wings-web51-qa'],{stdio:['pipe','ignore','ignore']});
 install.stdin.end(JSON.stringify({VECTOR_COMMUNITY_QA_INVITE_SECRET:secret}));
 if(await new Promise(resolve=>install.on('exit',resolve))!==0)throw Error('INSTALL_FAILED');
 await appendFile(file,'VECTOR_COMMUNITY_QA_INVITE_SECRET='+secret+'\n');
}
console.log('QA_INVITATION_PREPARED_WITHOUT_DISCLOSURE');
