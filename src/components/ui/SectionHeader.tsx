interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <header className="mb-5 border-b border-white/10 pb-3">
      <h3 className="text-xl font-semibold text-slate-50">{title}</h3>
      {subtitle ? <p className="mt-1 text-[15px] text-slate-300">{subtitle}</p> : null}
    </header>
  );
}
