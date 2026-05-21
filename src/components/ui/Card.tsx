import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <section className={`rounded-2xl border border-[color:var(--pw-border-soft)] bg-[linear-gradient(160deg,rgba(11,23,42,0.9),rgba(15,39,66,0.82))] p-7 shadow-[0_24px_60px_-38px_rgba(14,165,233,0.7)] transition-colors hover:border-[color:var(--pw-border-brand)] ${className}`}>
      {children}
    </section>
  );
}
