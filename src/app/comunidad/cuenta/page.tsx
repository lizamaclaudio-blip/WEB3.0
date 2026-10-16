import { CommunityAccount } from "@/components/web4/CommunityAccount";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { communityAuthConfigured,communityRegistrationConfigured } from "@/lib/web51/server";
export const dynamic = "force-dynamic";
export const metadata = { ...marketingMetadata("es", "Acceso al Community Lab", "Cuenta comunitaria verificada de VECTOR.", "/comunidad/cuenta"), robots: { index: false, follow: false } };
export default function Page() { return <Shell language="es"><CommunityAccount language="es" enabled={communityAuthConfigured()} registrationEnabled={communityRegistrationConfigured()} /></Shell>; }

