import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const metadata = marketingMetadata("fr", launchPageCopy["novedades"].title.fr, launchPageCopy["novedades"].description.fr, "/novedades");
export default function Page() { return <CommunityLaunchPage language="fr" page="novedades" />; }
