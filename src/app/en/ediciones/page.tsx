import { CommunityLaunchPage, launchPageCopy } from "@/components/web4/CommunityLaunchPages";
import { marketingMetadata } from "@/components/web4/Marketing";

export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("en", launchPageCopy["ediciones"].title.en, launchPageCopy["ediciones"].description.en, "/ediciones");
export default function Page() { return <CommunityLaunchPage language="en" page="ediciones" />; }
