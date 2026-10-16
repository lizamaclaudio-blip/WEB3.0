import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const metadata = marketingMetadata("es", launchPageCopy["founders-10"].title.es, launchPageCopy["founders-10"].description.es, "/founders-10");
export default function Page() { return <CommunityLaunchPage language="es" page="founders-10" />; }
