import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const nativeUrl=moduleUrl(await readFile(new URL('../../src/lib/web4/mail-native-socket.ts',import.meta.url),'utf8'));
const native=await import(nativeUrl);
const smtpUrl=moduleUrl((await readFile(new URL('../../src/lib/web4/mail-smtp.ts',import.meta.url),'utf8')).replace('import "server-only";','').replace('"nodemailer"',JSON.stringify(import.meta.resolve('nodemailer'))).replace('"./mail-native-socket"',JSON.stringify(nativeUrl)));
const{verifySmtp,sendSmtp}=await import(smtpUrl);
const config={host:'smtp.provider.invalid',port:465,user:'owner@provider.invalid',password:'synthetic-only-password',from:'owner@provider.invalid'};
function fakeConnector({tlsFailure=false,authFailure=false,dataDisconnect=false}={}){
 const commands=[];let closeCount=0,output,dataMode=false,data='';
 const encoder=new TextEncoder();
 const connect=(address,options)=>{
  assert.deepEqual(address,{hostname:config.host,port:465});assert.deepEqual(options,{secureTransport:'on'});
  const readable=new ReadableStream({start(controller){output=controller;if(!tlsFailure)controller.enqueue(encoder.encode('220 smtp.test ESMTP\r\n'));}});
  const writable=new WritableStream({write(chunk){const value=Buffer.from(chunk).toString();commands.push(value);
   if(dataMode){data+=value;if(data.endsWith('\r\n.\r\n')){dataMode=false;if(dataDisconnect)output.error(Error('synthetic disconnect'));else output.enqueue(encoder.encode('250 Queued\r\n'));}return;}
   if(value.startsWith('EHLO '))output.enqueue(encoder.encode('250-smtp.test\r\n250 AUTH PLAIN LOGIN\r\n'));
   else if(value.startsWith('AUTH PLAIN '))output.enqueue(encoder.encode(authFailure?'535 5.7.8 Authentication rejected\r\n':'235 2.7.0 Authenticated\r\n'));
   else if(value.startsWith('MAIL FROM:')||value.startsWith('RCPT TO:'))output.enqueue(encoder.encode('250 Accepted\r\n'));
   else if(value==='DATA\r\n'){dataMode=true;output.enqueue(encoder.encode('354 End with dot\r\n'));}
   else if(value==='QUIT\r\n')output.enqueue(encoder.encode('221 Bye\r\n'));
  }});
  return{opened:tlsFailure?Promise.reject(Error('synthetic certificate failure')):Promise.resolve({}),closed:Promise.resolve(),readable,writable,async close(){closeCount++;try{output.close();}catch{}}};
 };
 return{connect,commands,get closeCount(){return closeCount;}};
}
async function cloudflare(fake,action){const previous=process.env.VECTOR_HOSTING_PLATFORM;process.env.VECTOR_HOSTING_PLATFORM='cloudflare';globalThis[native.nativeSmtpConnector]=fake.connect;try{return await action();}finally{delete globalThis[native.nativeSmtpConnector];if(previous===undefined)delete process.env.VECTOR_HOSTING_PLATFORM;else process.env.VECTOR_HOSTING_PLATFORM=previous;}}
test('native TLS preflight authenticates with real Nodemailer without an SMTP message',async()=>{
 const fake=fakeConnector();const result=await cloudflare(fake,()=>verifySmtp(config));assert.deepEqual(result,{verified:true,errorCode:null});
 assert.ok(fake.commands.some(c=>c.startsWith('AUTH PLAIN ')));assert.ok(!fake.commands.some(c=>/^(MAIL|RCPT|DATA)/.test(c)));await new Promise(setImmediate);assert.ok(fake.closeCount>=1);
});
test('native certificate failure cannot reach AUTH or silently fall back to plaintext',async()=>{
 const fake=fakeConnector({tlsFailure:true});const result=await cloudflare(fake,()=>verifySmtp(config));assert.equal(result.verified,false);assert.deepEqual(fake.commands,[]);assert.ok(fake.closeCount>=1);
 await assert.rejects(native.openNativeSmtpSocket(fake.connect,config.host,587),/TLS_PORT_REQUIRED/);
});
test('native auth rejection is sanitized and cannot attempt delivery',async()=>{
 const fake=fakeConnector({authFailure:true});const result=await cloudflare(fake,()=>verifySmtp(config));assert.deepEqual(result,{verified:false,errorCode:'SMTP_AUTHENTICATION'});assert.ok(!fake.commands.some(c=>c.startsWith('MAIL')));
});
test('native delivery uses one envelope and retains its deterministic Message-ID',async()=>{
 const fake=fakeConnector();const message={from:config.from,to:config.from,subject:'QA fixture',html:'<p>Fixture</p>',text:'Fixture',messageId:'<qa-fixed@provider.invalid>'};
 const result=await cloudflare(fake,()=>sendSmtp(message,config));assert.equal(result.result,'sent');assert.equal(result.providerId,message.messageId);
 assert.equal(fake.commands.filter(c=>c.startsWith('MAIL FROM:')).length,1);assert.equal(fake.commands.filter(c=>c.startsWith('RCPT TO:')).length,1);assert.ok(fake.commands.join('').includes('Message-ID: <qa-fixed@provider.invalid>'));
});
test('native disconnect during DATA remains ambiguous and is never resent',async()=>{
 const fake=fakeConnector({dataDisconnect:true});const result=await cloudflare(fake,()=>sendSmtp({from:config.from,to:config.from,subject:'Fixture',html:'<p>Fixture</p>',text:'Fixture',messageId:'<qa-unknown@provider.invalid>'},config));
 assert.equal(result.result,'delivery_unknown');assert.equal(fake.commands.filter(c=>c==='DATA\r\n').length,1);
});
