import { CommunityLab } from "@/components/web4/CommunityLab";
import { Shell, marketingMetadata } from "@/components/web4/Marketing";
export const metadata = { ...marketingMetadata("es", "Comunidad de pilotos", "VECTOR COMMUNITY LAB: comparte ideas, vota propuestas moderadas y ayuda a definir el futuro de COPILOTO VECTOR.", "/comunidad") };
export default function Page() { return <Shell language="es"><CommunityLab language="es" readOnly={process.env.VECTOR_PUBLIC_READ_ONLY==="true"} /></Shell>; }
