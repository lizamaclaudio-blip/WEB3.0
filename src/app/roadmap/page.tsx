import { Shell, marketingMetadata } from "@/components/web4/Marketing";
import { PublicRoadmap } from "@/components/web4/PublicRoadmap";
import { roadmapMetadata } from "@/components/web4/public-roadmap";

import { loadPublicRoadmap } from "@/lib/web51/roadmap";
export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("es", roadmapMetadata.title.es, roadmapMetadata.description.es, "/roadmap");
export default async function Page() { return <Shell language="es"><PublicRoadmap language="es" {...await loadPublicRoadmap()} /></Shell>; }
