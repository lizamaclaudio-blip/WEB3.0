// Authenticates only; never claims outbox work or sends MAIL/RCPT/DATA.
// QA-only generated authorization is kept in an ignored local environment file.
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const name='patagonia-wings-web51-qa';
let workerKey;
try{workerKey=(await readFile('.dev.vars.web53','utf8')).match(/^VECTOR_MAIL_WORKER_SECRET=(.+)$/m)?.[1];}catch{}
if(!workerKey){
 const list=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','list','--name',name],{stdio:['ignore','pipe','ignore']});
 let listed='';list.stdout.on('data',chunk=>listed+=String(chunk));
 if(await new Promise(resolve=>list.on('exit',resolve))!==0)throw Error('QA_SECRET_INVENTORY_FAILED');
 const existing=JSON.parse(listed);
 if(existing.some(value=>['VECTOR_MAIL_WORKER_SECRET','VECTOR_MAIL_TOKEN_SECRET'].includes(value.name)))throw Error('EXISTING_QA_SECRETS_REQUIRE_LOCAL_AUTHORIZATION_FILE');
 workerKey=randomBytes(48).toString('base64url');
 const values={VECTOR_MAIL_WORKER_SECRET:workerKey,VECTOR_MAIL_TOKEN_SECRET:randomBytes(48).toString('base64url')};
 // Do not run this against a worker with an established token secret. This
 // initializer is exclusively for the new QA SMTP installation of Web 5.3.
 const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk','--name',name],{stdio:['pipe','ignore','ignore']});
 child.stdin.end(JSON.stringify(values));
 if(await new Promise(resolve=>child.on('exit',resolve))!==0)throw Error('QA_SECRET_INSTALL_FAILED');
 await writeFile('.dev.vars.web53','VECTOR_MAIL_WORKER_SECRET='+workerKey+'\n',{flag:'wx',mode:0o600});
}
const response=await fetch('https://'+name+'.lizamaclaudio.workers.dev/api/vector/mail/verify',{method:'POST',headers:{authorization:'Bearer '+workerKey},redirect:'manual',signal:AbortSignal.timeout(20000)});
const result=await response.json();
const safe={checkedAt:new Date().toISOString(),status:response.status,code:typeof result.code==='string'?result.code:'INVALID_RESPONSE',deliveryEnabled:false,messagesSent:0};
await mkdir('artifacts/web53',{recursive:true});await writeFile('artifacts/web53/smtp-preflight.json',JSON.stringify(safe,null,2));console.log(JSON.stringify(safe));
if(response.status!==200)process.exitCode=1;
