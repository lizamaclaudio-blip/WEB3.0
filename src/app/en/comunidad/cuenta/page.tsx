import { CommunityAccount } from "@/components/web4/CommunityAccount";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { communityAuthConfigured,communityRegistrationConfigured } from "@/lib/web51/server";
export const dynamic = "force-dynamic";
export const metadata = { ...marketingMetadata("en", "Community Lab access", "Verified VECTOR community account.", "/comunidad/cuenta"), robots: { index: false, follow: false } };
export default function Page() { return <Shell language="en"><CommunityAccount language="en" enabled={communityAuthConfigured()} registrationEnabled={communityRegistrationConfigured()} /></Shell>; }

