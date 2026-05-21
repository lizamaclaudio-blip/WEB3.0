import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-b from-sky-500 to-sky-700 text-white border border-sky-400/60 hover:from-sky-400 hover:to-sky-600",
  secondary: "bg-[#0b172a] text-slate-100 hover:bg-[#0f2742] border border-white/10 hover:border-sky-400/45",
  ghost: "bg-transparent text-slate-200 hover:bg-sky-900/25 border border-sky-500/30 hover:border-sky-400/60",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({ children, variant = "primary", className = "", fullWidth = false, ...props }: ButtonProps) {
  return <button className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${variantClass[variant]} ${fullWidth ? "w-full" : ""} ${className}`} {...props}>{children}</button>;
}
