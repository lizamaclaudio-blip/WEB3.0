import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("en", launchPageCopy["novedades"].title.en, launchPageCopy["novedades"].description.en, "/novedades");
export default function Page() { return <CommunityLaunchPage language="en" page="novedades" />; }
