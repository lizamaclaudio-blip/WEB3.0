import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const metadata = marketingMetadata("en", informationTitles.soporte.en, informationTitles.soporte.en + " · Copiloto Vector", "/soporte");
export default function Page() { return <Information language="en" page="soporte" />; }
