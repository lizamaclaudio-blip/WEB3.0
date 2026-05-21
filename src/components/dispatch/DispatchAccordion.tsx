"use client";

import { ReactNode } from "react";

type DispatchAccordionProps = {
  id: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
};

export function DispatchAccordion({ id, title, subtitle, open, onToggle, children }: DispatchAccordionProps) {
  return (
    <section className="rounded-2xl border border-sky-100 bg-white">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        <span className="text-sky-700">{open ? "Ocultar" : "Mostrar"}</span>
      </button>
      {open ? <div className="border-t border-sky-100 px-5 py-4">{children}</div> : null}
    </section>
  );
}
