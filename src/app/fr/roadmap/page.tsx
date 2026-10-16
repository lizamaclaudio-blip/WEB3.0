import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { LivePublicRoadmap } from "@/components/web4/LivePublicRoadmap";
import { roadmapMetadata } from "@/components/web4/public-roadmap";

export const metadata = marketingMetadata("fr", roadmapMetadata.title.fr, roadmapMetadata.description.fr, "/roadmap");
export default function Page() { return <Shell language="fr"><LivePublicRoadmap language="fr" /></Shell>; }
