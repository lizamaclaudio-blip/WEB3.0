import { CommunityAccount } from "@/components/web4/CommunityAccount";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { communityAuthConfigured,communityRegistrationConfigured } from "@/lib/web51/server";
export const dynamic = "force-dynamic";
export const metadata = { ...marketingMetadata("fr", "Accès au Community Lab", "Compte communautaire vérifié VECTOR.", "/comunidad/cuenta"), robots: { index: false, follow: false } };
export default function Page() { return <Shell language="fr"><CommunityAccount language="fr" enabled={communityAuthConfigured()} registrationEnabled={communityRegistrationConfigured()} /></Shell>; }
