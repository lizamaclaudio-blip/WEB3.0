import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { LivePublicRoadmap } from "@/components/web4/LivePublicRoadmap";
import { roadmapMetadata } from "@/components/web4/public-roadmap";

export const metadata = marketingMetadata("en", roadmapMetadata.title.en, roadmapMetadata.description.en, "/roadmap");
export default function Page() { return <Shell language="en"><LivePublicRoadmap language="en" /></Shell>; }
