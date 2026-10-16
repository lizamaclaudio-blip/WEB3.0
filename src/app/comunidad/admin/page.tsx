import { CommunityAdmin } from "@/components/web4/CommunityAdmin";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
export const dynamic = "force-dynamic";
export const metadata = { ...marketingMetadata("es", "Moderación privada", "Administración privada de VECTOR Community Lab.", "/comunidad/admin"), robots: { index: false, follow: false } };
export default function Page() { return <Shell language="es"><CommunityAdmin language="es" /></Shell>; }
