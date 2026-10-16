import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { LivePublicRoadmap } from "@/components/web4/LivePublicRoadmap";
import { roadmapMetadata } from "@/components/web4/public-roadmap";

export const metadata = marketingMetadata("es", roadmapMetadata.title.es, roadmapMetadata.description.es, "/roadmap");
export default function Page() { return <Shell language="es"><LivePublicRoadmap language="es" /></Shell>; }
