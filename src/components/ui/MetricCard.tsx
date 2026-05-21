import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
}

export function MetricCard({ label, value, helper, icon }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#0b172a]/85 p-4 transition-colors hover:border-sky-400/35">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xl font-semibold text-slate-50">{value}</p>{icon}</div>
      {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
    </article>
  );
}
