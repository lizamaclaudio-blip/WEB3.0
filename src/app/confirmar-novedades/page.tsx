import type { Metadata } from "next";
import { NewsletterPage } from "@/components/web4/NewsletterPage";
export const metadata: Metadata = { title: "Confirmar novedades · COPILOTO VECTOR", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <NewsletterPage language="es" action="confirm" />; }
