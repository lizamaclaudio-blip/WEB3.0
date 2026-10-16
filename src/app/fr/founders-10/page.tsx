import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const metadata = marketingMetadata("fr", launchPageCopy["founders-10"].title.fr, launchPageCopy["founders-10"].description.fr, "/founders-10");
export default function Page() { return <CommunityLaunchPage language="fr" page="founders-10" />; }
