import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile('src/lib/web4/mail-templates.ts','utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {renderQaMail}=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
const message=renderQaMail({from:'patagonia@patagoniaw.com',internalTo:'patagonia@patagoniaw.com'});
await mkdir('artifacts/web53',{recursive:true});await writeFile('artifacts/web53/smtp-single-preview.html',message.html);
await writeFile('artifacts/web53/smtp-single-preview.txt','Para: '+message.to+'\nAsunto: '+message.subject+'\n\n'+message.text+'\n');
console.log('QA_PREVIEW_CREATED_NO_NETWORK_NO_SEND');
