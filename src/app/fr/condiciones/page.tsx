import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("fr", informationTitles.condiciones.fr, informationTitles.condiciones.fr + " · Copiloto Vector", "/condiciones");
export default function Page() { return <Information language="fr" page="condiciones" />; }
