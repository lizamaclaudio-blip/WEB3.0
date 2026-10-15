import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import "./web4.css";
import "./web41.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.patagoniaw.com"),
  title: { default: "COPILOTO VECTOR COMPLETE · Patagonia Wings", template: "%s | Patagonia Wings" },
  description: "COPILOTO VECTOR COMPLETE: prepara el OFP, sigue checklists y revisa tu aterrizaje. Software para Microsoft Flight Simulator, en desarrollo.",
  twitter: { card: "summary_large_image", images: ["/vector/m29/copilot.webp"] },
  robots: process.env.VERCEL_ENV === "preview" ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${rajdhani.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
