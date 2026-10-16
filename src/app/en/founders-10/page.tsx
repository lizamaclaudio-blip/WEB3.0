import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("en", launchPageCopy["founders-10"].title.en, launchPageCopy["founders-10"].description.en, "/founders-10");
export default function Page() { return <CommunityLaunchPage language="en" page="founders-10" />; }
