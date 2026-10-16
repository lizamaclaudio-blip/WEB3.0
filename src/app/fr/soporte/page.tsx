import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const metadata = marketingMetadata("fr", informationTitles.soporte.fr, informationTitles.soporte.fr + " · Copiloto Vector", "/soporte");
export default function Page() { return <Information language="fr" page="soporte" />; }
