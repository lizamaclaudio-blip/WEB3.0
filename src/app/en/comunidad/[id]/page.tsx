import { notFound } from "next/navigation";
import { CommunityLab } from "@/components/web4/CommunityLab";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { getPublicProposal } from "@/lib/web51/public-ideas";
export const dynamic = "force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const item=await getPublicProposal((await params).id);if(!item)return {robots:{index:false,follow:false}};return marketingMetadata("en", item.title+" · VECTOR Community Lab",item.description.slice(0,160),"/comunidad/"+item.id);}
export default async function Page({params}:{params:Promise<{id:string}>}){const item=await getPublicProposal((await params).id);if(!item)notFound();return <Shell language="en"><CommunityLab language="en" proposalId={item.id} initialItems={[item]} /></Shell>;}
