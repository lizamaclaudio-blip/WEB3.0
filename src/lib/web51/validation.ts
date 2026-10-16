export const categories = ['copilot','navigation','planning','aircraft','systems','ground','career','acars','landing','performance','interface','other'] as const;
export const proposalStatuses = ['propuesta','evaluacion','planificada','desarrollo','implementada','no_planificada'] as const;
export const isRecord = (value: unknown): value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);
export const uuid = (value: unknown): value is string => typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export const cleanText = (value: unknown,min: number,max: number): value is string => typeof value==='string' && value.trim().length>=min && value.trim().length<=max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
export const locale = (value: unknown): value is 'es'|'en'|'fr' => value==='es'||value==='en'||value==='fr';
export const email = (value: unknown): value is string => typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
export function validProposal(value: unknown): value is {title:string;description:string;category:string;alias?:string;consent:true;website?:string} {
 return isRecord(value)&&value.consent===true&&!value.website&&cleanText(value.title,8,140)&&cleanText(value.description,30,4000)&&categories.some(c=>c===value.category)&&(value.alias===undefined||cleanText(value.alias,0,60));
}
export function validFounder(value: unknown): value is {name:string;email:string;locale:'es'|'en'|'fr';country?:string;noticeConsent:true;newsletterConsent?:boolean} {
 return isRecord(value)&&!value.website&&value.noticeConsent===true&&cleanText(value.name,1,100)&&email(value.email)&&locale(value.locale)&&(value.country===undefined||cleanText(value.country,0,80))&&(value.newsletterConsent===undefined||typeof value.newsletterConsent==='boolean');
}
export function validRoadmap(items: unknown): items is Record<string,unknown>[] {
 if(!Array.isArray(items)||items.length<1||items.length>40) return false;
 const ids=new Set<string>();
 for(const item of items){
  if(!isRecord(item)||typeof item.id!=='string'||!/^[a-z][a-z0-9-]{1,79}$/.test(item.id)||ids.has(item.id)||!['completed','testing','development','upcoming','study'].includes(String(item.status))) return false;
  ids.add(item.id);
  for(const language of ['es','en','fr']) for(const [field,max] of [['title',180],['description',1500],['evidenceNote',800]] as const) if(!isRecord(item[field])||!cleanText(item[field][language],1,max)) return false;
 }
 return true;
}
export function validLaunchDate(value: unknown): boolean {
 return value===null || (typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
}
export function validModeration(body: unknown): body is Record<string,unknown> {
 if(!isRecord(body)) return false;
 if(body.action==='roadmap') return validRoadmap(body.items)&&validLaunchDate(body.launchDate);
 if(!uuid(body.id)) return false;
 if(body.action==='merge') return uuid(body.targetId)&&body.id!==body.targetId;
 if(body.action==='report') return typeof body.hidden==='boolean';
 return body.action==='moderate'&&proposalStatuses.some(s=>s===body.status)&&cleanText(body.response??'',0,3000)&&typeof body.published==='boolean'&&typeof body.hidden==='boolean'&&typeof body.featured==='boolean';
}
