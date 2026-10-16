import { Information, informationTitles } from "@/components/web4/Information";
import { marketingMetadata } from "@/components/web4/Marketing";
export const metadata = marketingMetadata("en", informationTitles.privacidad.en, informationTitles.privacidad.en + " · Copiloto Vector", "/privacidad");
export default function Page() { return <Information language="en" page="privacidad" />; }
