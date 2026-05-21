import { ReactNode } from "react";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClass: Record<BadgeTone, string> = {
  neutral: "border border-slate-500/40 bg-slate-700/25 text-slate-100",
  info: "border border-sky-400/45 bg-sky-500/15 text-sky-200",
  success: "border border-emerald-500/45 bg-emerald-500/15 text-emerald-200",
  warning: "border border-amber-500/45 bg-amber-500/15 text-amber-200",
  danger: "border border-red-500/45 bg-red-500/15 text-red-200",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${toneClass[tone]}`}>{children}</span>;
}
