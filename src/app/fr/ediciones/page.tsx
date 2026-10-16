import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("fr", launchPageCopy["ediciones"].title.fr, launchPageCopy["ediciones"].description.fr, "/ediciones");
export default function Page() { return <CommunityLaunchPage language="fr" page="ediciones" />; }
