import type { FinalizeSummary } from "@/lib/acars/finalize-types";

export function buildFinalizeSummary(input: Omit<FinalizeSummary, "success">): FinalizeSummary {
  return {
    success: true,
    ...input,
  };
}

export function buildSummaryUrl(reservationId: string) {
  return `/dispatch?summary=${encodeURIComponent(reservationId)}`;
}
