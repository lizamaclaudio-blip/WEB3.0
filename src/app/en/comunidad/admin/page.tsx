import { CommunityAdmin } from "@/components/web4/CommunityAdmin";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
export const dynamic = "force-dynamic";
export const metadata = { ...marketingMetadata("en", "Private moderation", "Private VECTOR Community Lab administration.", "/comunidad/admin"), robots: { index: false, follow: false } };
export default function Page() { return <Shell language="en"><CommunityAdmin language="en" /></Shell>; }
