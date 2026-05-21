import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PublicFooter } from "@/components/site/PublicFooter";
import { PublicHeader } from "@/components/site/PublicHeader";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  sideTitle: string;
  sideItems: string[];
};

export function AuthShell({ eyebrow, title, description, children, sideTitle, sideItems }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950">
      <PublicHeader />

      <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#061225,#0B4F8A_58%,#0EA5E9)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-14">
          <div className="text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-100">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-8 text-sky-50">{description}</p>
            <div className="mt-7 rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-sky-100">{sideTitle}</p>
              <ul className="mt-4 grid gap-3 text-[15px] leading-6 text-white sm:grid-cols-2 lg:grid-cols-1">
                {sideItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10 sm:p-8">
            <div className="mb-6 flex items-center gap-4 border-b border-slate-200 pb-5">
              <Image
                src="/branding/patagonia-logo.png"
                alt="Patagonia Wings"
                width={120}
                height={69}
                className="h-14 w-auto object-contain"
                priority
              />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0B4F8A]">Patagonia Wings 3.0</p>
                <p className="text-sm font-semibold text-slate-500">Acceso privado de pilotos</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>El Crew Center, despachos, PIREPs, economía y progresión son herramientas privadas.</span>
          <Link href="/" className="font-extrabold text-[#0B4F8A] hover:text-sky-600">
            Volver a la página principal
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
