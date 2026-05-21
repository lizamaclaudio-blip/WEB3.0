import { DispatchPageShell } from "@/components/dispatch/DispatchPageShell";

export default function DispatchPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="pw-sur-container py-8">
        <DispatchPageShell variant="full" />
      </div>
    </main>
  );
}
