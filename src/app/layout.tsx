import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import { publicSiteEnabled,publicSiteOrigin } from '@/lib/web51/site-policy';
import "./globals.css";
import "./web4.css";
import "./web41.css";
import "./web50-home.css";
import "./web50-demo.css";
import "./web50-product.css";
import "./web50.css";
import "./web51-launch.css";
import "./web51-community.css";
import "./web51-roadmap.css";
import "./web51.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteOrigin()),
  title: { default: "COPILOTO VECTOR · Patagonia Wings", template: "%s | Patagonia Wings" },
  description: "COPILOTO VECTOR: prepara el OFP, sigue checklists y revisa tu aterrizaje. Software para Microsoft Flight Simulator, en desarrollo.",
  twitter: { card: "summary_large_image", images: ["/vector/m29/copilot.webp"] },
  robots: publicSiteEnabled() ? {index:true,follow:true} : { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${rajdhani.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
