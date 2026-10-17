import { CommunityLab } from "@/components/web4/CommunityLab";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
export const metadata = { ...marketingMetadata("fr", "Communauté de pilotes", "VECTOR COMMUNITY LAB : partagez vos idées, votez pour des propositions modérées et contribuez à l’avenir de COPILOTO VECTOR.", "/comunidad") };
export default function Page() { return <Shell language="fr"><CommunityLab language="fr" readOnly={process.env.VECTOR_PUBLIC_READ_ONLY==="true"} /></Shell>; }
