import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const metadata = marketingMetadata("es", informationTitles.condiciones.es, informationTitles.condiciones.es + " · Copiloto Vector", "/condiciones");
export default function Page() { return <Information language="es" page="condiciones" />; }
