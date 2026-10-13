import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const dynamic = "force-dynamic";
export const metadata = marketingMetadata("en", informationTitles.versiones.en, informationTitles.versiones.en + " · Copiloto Vector", "/versiones");
export default function Page() { return <Information language="en" page="versiones" />; }
