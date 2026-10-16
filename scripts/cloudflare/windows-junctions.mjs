// Process-local Windows workaround for OpenNext's directory symlinks.
// Never changes OS privileges, vendor files, or links outside build/workspace.
import fs from 'node:fs';
import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
const original=fs.symlinkSync;
const workspace=fs.realpathSync.native(process.cwd());
const inside=(candidate,root)=>candidate.toLowerCase().startsWith((root+path.sep).toLowerCase());
fs.symlinkSync=function(target,destination,type){
 try{return original(target,destination,type);}catch(error){
  if(process.platform!=='win32'||error.code!=='EPERM')throw error;
  const output=path.join(workspace,'.open-next');
  const dest=path.resolve(destination);
  const resolved=fs.realpathSync.native(path.resolve(path.dirname(dest),target));
  if(!inside(dest,output)||!inside(resolved,workspace)||!inside(fs.realpathSync.native(path.dirname(dest)),output)||!fs.statSync(resolved).isDirectory())throw error;
  return original(resolved,dest,'junction');
 }
};
syncBuiltinESMExports();
