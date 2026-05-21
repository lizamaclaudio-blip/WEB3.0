import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  title: "Patagonia Wings 3.0",
  description: "Nueva plataforma operacional en desarrollo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${rajdhani.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
