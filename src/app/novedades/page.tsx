import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("es", launchPageCopy["novedades"].title.es, launchPageCopy["novedades"].description.es, "/novedades");
export default function Page() { return <CommunityLaunchPage language="es" page="novedades" />; }
