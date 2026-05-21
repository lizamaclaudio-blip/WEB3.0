import { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 xl:px-8">{children}</div>;
}
