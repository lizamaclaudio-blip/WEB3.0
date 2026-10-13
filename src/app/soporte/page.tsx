import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("es", informationTitles.soporte.es, informationTitles.soporte.es + " · Copiloto Vector", "/soporte");
export default function Page() { return <Information language="es" page="soporte" />; }
