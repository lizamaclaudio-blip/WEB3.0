import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("es", launchPageCopy["ediciones"].title.es, launchPageCopy["ediciones"].description.es, "/ediciones");
export default function Page() { return <CommunityLaunchPage language="es" page="ediciones" />; }
