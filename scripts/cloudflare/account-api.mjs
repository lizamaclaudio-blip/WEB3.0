import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const qaAccount='3337f9cdece1105320a498285f9624c5';
export const qaWorker='patagonia-wings-web51-qa';
// Uses the already authorized official Wrangler session. Never exports, writes
// or prints its token, response headers or credential-bearing WebSocket URL.
export async function cloudflareApi(path,options={}) {
 const configuration=await readFile(join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml'),'utf8');
 const token=configuration.match(/^oauth_token\s*=\s*"([^"\r\n]+)"/m)?.[1];
 if(!token)throw Error('WRANGLER_SESSION_MISSING');
 const response=await fetch('https://api.cloudflare.com/client/v4'+path,{signal:AbortSignal.timeout(20000),...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
 const body=await response.json();
 if(!response.ok||body.success===false)throw Error('CLOUDFLARE_API_FAILED_'+response.status);
 return body.result;
}
