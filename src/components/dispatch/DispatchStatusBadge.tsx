"use client";

type DispatchStatusBadgeProps = {
  tone: "ready" | "blocked" | "warning" | "neutral";
  label: string;
};

const toneClass: Record<DispatchStatusBadgeProps["tone"], string> = {
  ready: "border-emerald-300/40 bg-emerald-500/15 text-emerald-200",
  blocked: "border-rose-300/40 bg-rose-500/15 text-rose-200",
  warning: "border-amber-300/40 bg-amber-500/15 text-amber-200",
  neutral: "border-slate-300/30 bg-slate-500/15 text-slate-200",
};

export function DispatchStatusBadge({ tone, label }: DispatchStatusBadgeProps) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}>{label}</span>;
}
