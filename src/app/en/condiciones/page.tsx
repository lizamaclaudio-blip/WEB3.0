import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("en", informationTitles.condiciones.en, informationTitles.condiciones.en + " · Copiloto Vector", "/condiciones");
export default function Page() { return <Information language="en" page="condiciones" />; }
