import FlightEvaluationSummary from "@/components/acars/FlightEvaluationSummary";
import { DispatchPageShell } from "@/components/dispatch/DispatchPageShell";

export const dynamic = "force-dynamic";

type DispatchPageProps = {
  searchParams?: Promise<{ summary?: string | string[] }> | { summary?: string | string[] };
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  const params = searchParams ? await searchParams : {};
  const summaryId = firstParam(params.summary).trim();

  if (summaryId) {
    return <FlightEvaluationSummary reservationId={summaryId} />;
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="pw-sur-container py-8">
        <DispatchPageShell variant="full" />
      </div>
    </main>
  );
}
