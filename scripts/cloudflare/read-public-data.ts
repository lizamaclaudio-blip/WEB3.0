// Production read-only adapter: uses the publishable key and existing table RLS.
// Never reads authors, votes, accounts, private schemas or service credentials.
import {validRoadmap,validLaunchDate,uuid} from '../../src/lib/web51/validation';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
async function rows(path:string){
 if(process.env.SUPABASE_URL!=='https://donguccheqjqyzudowuy.supabase.co'||!process.env.VECTOR_COMMUNITY_PUBLIC_KEY?.startsWith('sb_publishable_'))throw Error('UNAVAILABLE');
 const response=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:process.env.VECTOR_COMMUNITY_PUBLIC_KEY},redirect:'manual',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('UNAVAILABLE');const data:unknown=await response.json();if(!Array.isArray(data))throw Error('UNAVAILABLE');return data;
}
export async function readRoadmap(){try{
 const result=await rows('vector_public_roadmap?select=items,launch_date&singleton=eq.true&limit=1');
 const value=result[0];if(!value||!validRoadmap(value.items)||!validLaunchDate(value.launch_date))throw Error('UNAVAILABLE');
 return Response.json({ok:true,items:value.items,launchDate:value.launch_date,source:'database'},{headers});
}catch{return Response.json({ok:false,code:'SERVICE_UNAVAILABLE'},{status:503,headers});}}
export async function readProposals(){try{
 const result=await rows('vector_community_proposals?select=id,title,description,category,alias,created_at,votes,status,developer_response,featured&published=eq.true&hidden=eq.false&merged_into=is.null&order=featured.desc,votes.desc,created_at.desc&limit=100');
 const items=result.filter(row=>uuid(row.id)&&typeof row.title==='string'&&typeof row.description==='string'&&Number.isInteger(row.votes)&&row.votes>=0).map(row=>({id:row.id,title:row.title,description:row.description,category:row.category,alias:row.alias,createdAt:row.created_at,votes:row.votes,status:row.status,response:row.developer_response,featured:row.featured,voted:false}));
 return Response.json({ok:true,items,authenticated:false,admin:false,readOnly:true},{headers});
}catch{return Response.json({ok:false,code:'SERVICE_UNAVAILABLE'},{status:503,headers});}}
