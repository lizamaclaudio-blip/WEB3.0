import { CommunityLab } from "@/components/web4/CommunityLab";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
export const dynamic = "force-dynamic";
export const metadata = { ...marketingMetadata("en", "Pilot community", "VECTOR COMMUNITY LAB: share ideas, vote on moderated proposals and help shape the future of COPILOTO VECTOR.", "/comunidad") };
export default function Page() { return <Shell language="en"><CommunityLab language="en" /></Shell>; }

